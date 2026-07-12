import { API_BASE_URL } from "./apiUrl";
import { supabase } from "./supabase";

export interface PresignedUpload {
  url: string;
  key: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface PresignedDownload {
  url: string;
  method: "GET";
}

export interface ObjectStorageClient {
  readonly kind: "mock" | "supabase" | "s3";
  requestUploadUrl(
    hash: string,
    filename: string,
    contentType?: string,
  ): Promise<PresignedUpload>;
  requestDownloadUrl(key: string): Promise<PresignedDownload>;
  headAsset(key: string): Promise<boolean>;
  upload(
    key: string,
    data: ArrayBuffer | Blob,
    headers?: Record<string, string>,
  ): Promise<void>;
  download(key: string): Promise<ArrayBuffer>;
}

const ASSET_BUCKET = "openband-assets";

function keyFor(hash: string, filename: string): string {
  return `${hash.slice(0, 16)}_${filename}`;
}

export class MockStorageBackend implements ObjectStorageClient {
  readonly kind = "mock" as const;
  private store = new Map<string, ArrayBuffer>();

  async requestUploadUrl(
    hash: string,
    filename: string,
    contentType?: string,
  ): Promise<PresignedUpload> {
    const key = keyFor(hash, filename);
    const headers: Record<string, string> = {};
    if (contentType) headers["Content-Type"] = contentType;
    return { url: `mock://${ASSET_BUCKET}/${key}`, key, method: "PUT", headers };
  }

  async requestDownloadUrl(key: string): Promise<PresignedDownload> {
    return { url: `mock://${ASSET_BUCKET}/${key}`, method: "GET" };
  }

  async headAsset(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async upload(
    key: string,
    data: ArrayBuffer | Blob,
    _headers?: Record<string, string>,
  ): Promise<void> {
    const buf = data instanceof Blob ? await data.arrayBuffer() : data;
    this.store.set(key, buf);
  }

  async download(key: string): Promise<ArrayBuffer> {
    const buf = this.store.get(key);
    if (!buf) throw new Error(`Asset not found: ${key}`);
    return buf;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  } catch {
    /* ignore */
  }
  return {};
}

class SupabaseStorageBackend implements ObjectStorageClient {
  readonly kind = "supabase" as const;
  private baseUrl = `${API_BASE_URL}/api/storage`;
  private presigns = new Map<string, PresignedUpload>();

  async requestUploadUrl(
    hash: string,
    filename: string,
    contentType?: string,
  ): Promise<PresignedUpload> {
    const res = await fetch(`${this.baseUrl}/presign-upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({ hash, filename, contentType }),
    });
    if (!res.ok) {
      throw new Error(`presign-upload failed: ${res.status}`);
    }
    const presign = (await res.json()) as PresignedUpload;
    this.presigns.set(presign.key, presign);
    return presign;
  }

  async requestDownloadUrl(key: string): Promise<PresignedDownload> {
    const res = await fetch(
      `${this.baseUrl}/presign-download?key=${encodeURIComponent(key)}`,
      { headers: await authHeaders() },
    );
    if (!res.ok) {
      throw new Error(`presign-download failed: ${res.status}`);
    }
    return (await res.json()) as PresignedDownload;
  }

  async headAsset(key: string): Promise<boolean> {
    const res = await fetch(
      `${this.baseUrl}/head?key=${encodeURIComponent(key)}`,
      { headers: await authHeaders() },
    );
    if (!res.ok) return false;
    const body = (await res.json()) as { exists: boolean };
    return body.exists;
  }

  async upload(
    key: string,
    data: ArrayBuffer | Blob,
    headers?: Record<string, string>,
  ): Promise<void> {
    const presign = this.presigns.get(key);
    if (!presign) throw new Error(`No presigned upload for key: ${key}`);
    const body = data instanceof Blob ? await data.arrayBuffer() : data;
    const res = await fetch(presign.url, {
      method: "PUT",
      headers: presign.headers ?? headers,
      body,
    });
    if (!res.ok) {
      throw new Error(`Object upload failed: ${res.status}`);
    }
  }

  async download(key: string): Promise<ArrayBuffer> {
    const { url } = await this.requestDownloadUrl(key);
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`Object download failed: ${res.status}`);
    return await res.arrayBuffer();
  }
}

let instance: ObjectStorageClient | null = null;

export function getObjectStorage(): ObjectStorageClient {
  if (instance) return instance;
  const hasSupabase =
    typeof process !== "undefined" &&
    !!process.env &&
    !!process.env.EXPO_PUBLIC_SUPABASE_URL;
  const hasS3 =
    typeof process !== "undefined" &&
    !!process.env &&
    !!process.env.S3_ENDPOINT &&
    !!process.env.S3_BUCKET;
  if (hasS3) {
    console.warn(
      "S3_* env vars detected but @aws-sdk/client-s3 is not installed; " +
        "the S3 back-end is documented as optional/gated. Using the default stand-in.",
    );
  }
  instance = hasSupabase
    ? new SupabaseStorageBackend()
    : new MockStorageBackend();
  return instance;
}

export function resetObjectStorage(): void {
  instance = null;
}
