import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = process.env.STORAGE_BUCKET || "openband-assets";

const mockStore = new Map<string, Buffer>();

export interface PresignResult {
  url: string;
  key: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface PresignGetResult {
  url: string;
  method: "GET";
}

export type StorageMode = "s3" | "supabase" | "mock";

export function getStorageMode(): StorageMode {
  const hasS3 =
    process.env.S3_ENDPOINT &&
    process.env.S3_BUCKET &&
    process.env.S3_REGION &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY;
  if (hasS3) return "s3";

  if (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL) {
    return "supabase";
  }
  return "mock";
}

export function getMockStore(): Map<string, Buffer> {
  return mockStore;
}

function getSupabaseClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(url, key);
}

export interface Presigner {
  mode: StorageMode;
  presignPut(key: string, contentType?: string): Promise<PresignResult>;
  presignGet(key: string): Promise<PresignGetResult>;
  head(key: string): Promise<boolean>;
}

export async function createPresigner(): Promise<Presigner> {
  const mode = getStorageMode();

  if (mode === "supabase") {
    const client = getSupabaseClient();
    return {
      mode,
      async presignPut(key, contentType) {
        const { data, error } = await client.storage
          .from(BUCKET)
          .createSignedUploadUrl(key);
        if (error) throw error;
        const headers: Record<string, string> = {};
        if (contentType) headers["Content-Type"] = contentType;
        return { url: data!.signedUrl, key, method: "PUT", headers };
      },
      async presignGet(key) {
        const { data, error } = await client.storage
          .from(BUCKET)
          .createSignedUrl(key, 3600);
        if (error) throw error;
        return { url: data!.signedUrl, method: "GET" };
      },
      async head(key) {
        const { data } = await client.storage.from(BUCKET).list(undefined, {
          search: key,
          limit: 1,
        });
        return Array.isArray(data) && data.some((f) => f.name === key);
      },
    };
  }

  if (mode === "s3") {
    throw new Error(
      "S3 storage mode requires @aws-sdk/client-s3 which is not installed. " +
        "Set STORAGE_BUCKET/Supabase env or use mock mode. Enabled behind S3_* env vars only after approval.",
    );
  }

  return {
    mode: "mock",
    async presignPut(key, contentType) {
      const headers: Record<string, string> = {};
      if (contentType) headers["Content-Type"] = contentType;
      return { url: `/api/storage/mock/${key}`, key, method: "PUT", headers };
    },
    async presignGet(key) {
      return { url: `/api/storage/mock/${key}`, method: "GET" };
    },
    async head(key) {
      return mockStore.has(key);
    },
  };
}
