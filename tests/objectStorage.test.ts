import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createProject,
  addTrackToState,
  registerAsset,
  getAssetRefs,
  resolveAssetRef,
  commitState,
} from "../src/lib/stateAssetSeparation";
import {
  getObjectStorage,
  MockStorageBackend,
  resetObjectStorage,
} from "../src/lib/objectStorage";

describe("objectStorage: mock backend round-trip + dedup", () => {
  beforeEach(() => resetObjectStorage());
  afterEach(() => resetObjectStorage());

  it("selects mock backend when no creds are present", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(getObjectStorage().kind).toBe("mock");
  });

  it("selects supabase backend when Supabase env is present", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(getObjectStorage().kind).toBe("supabase");
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    resetObjectStorage();
  });

  it("presign -> upload -> download returns identical bytes", async () => {
    const client = new MockStorageBackend();
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 255]).buffer;
    const presign = await client.requestUploadUrl(
      "deadbeef",
      "drum.wav",
      "application/octet-stream",
    );
    expect(presign.method).toBe("PUT");
    expect(presign.key).toContain("drum.wav");

    await client.upload(presign.key, bytes, presign.headers);
    expect(await client.headAsset(presign.key)).toBe(true);

    const dl = await client.download(presign.key);
    expect(Array.from(new Uint8Array(dl))).toEqual(
      Array.from(new Uint8Array(bytes)),
    );
  });

  it("identical hash + filename yields the same resolved key/url (dedup)", async () => {
    const client = new MockStorageBackend();
    const a = await client.requestUploadUrl("hashxyz", "a.wav");
    const b = await client.requestUploadUrl("hashxyz", "a.wav");
    expect(a.key).toBe(b.key);
    expect(a.url).toBe(b.url);
  });

  it("different filename yields a different key for the same hash", async () => {
    const client = new MockStorageBackend();
    const a = await client.requestUploadUrl("hashxyz", "a.wav");
    const b = await client.requestUploadUrl("hashxyz", "b.wav");
    expect(a.key).not.toBe(b.key);
  });
});

describe("stateAssetSeparation: asset registration via object storage", () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    resetObjectStorage();
    vi.unstubAllGlobals();
  });
  afterEach(() => resetObjectStorage());

  it("registerAsset stores a resolvable audioAssetRef and getAssetRefs returns it", async () => {
    await createProject(120, 44100, "S3 Project");
    addTrackToState({
      id: "trk-1",
      name: "Audio 1",
      type: "audio",
      muted: false,
      solo: false,
      volume: 1,
      pan: 0,
      outputBus: "master",
      pluginChain: [],
    });

    const blob = new Blob([new Uint8Array([9, 8, 7, 6, 5])], {
      type: "audio/wav",
    });
    const ref = await registerAsset("trk-1", blob, "guitar.wav");

    expect(ref).toBeTruthy();
    const refs = getAssetRefs();
    expect(refs).toContain(ref);

    const resolved = await resolveAssetRef(ref);
    expect(resolved).toBeTruthy();

    const commit = await commitState("init");
    expect(commit?.assetRefs).toContain(ref);
  });

  it("resolveAssetRef returns a data URL containing the uploaded bytes (mock)", async () => {
    await createProject(120, 44100, "S3 Project 2");
    addTrackToState({
      id: "trk-2",
      name: "Audio 2",
      type: "audio",
      muted: false,
      solo: false,
      volume: 1,
      pan: 0,
      outputBus: "master",
      pluginChain: [],
    });

    const payload = [11, 22, 33, 44];
    const ref = await registerAsset(
      "trk-2",
      new Blob([new Uint8Array(payload)]),
      "bass.wav",
    );

    const resolved = await resolveAssetRef(ref);
    expect(resolved.startsWith("data:application/octet-stream;base64,")).toBe(
      true,
    );
    const b64 = resolved.split(",")[1];
    const decoded = Array.from(
      Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
    );
    expect(decoded).toEqual(payload);
  });
});
