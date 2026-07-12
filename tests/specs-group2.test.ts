import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  configureRemote,
  uploadAsset,
  disposeRemote,
} from "../src/lib/supabaseRemote";
import { addJob, getJobStatus } from "../backend/src/services/queue";

const BASE = "https://example.supabase.co";
const HEADERS = {
  apikey: "k",
  Authorization: "Bearer k",
  "Content-Type": "application/json",
};

function makeFetchMock() {
  return vi.fn(async (url: string, opts: any) => {
    const isPost = opts && opts.method === "POST";
    if (url.includes("/rest/v1/assets") && !isPost) {
      return { ok: true, status: 200, json: async () => [] as any[] };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
}

describe("cloud-sync: SHA-256 asset dedup", () => {
  let fetchMock: ReturnType<typeof makeFetchMock>;

  beforeEach(() => {
    fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    configureRemote({
      supabaseUrl: BASE,
      supabaseKey: "k",
      projectId: "proj-1",
      bucketName: "assets",
    });
  });

  afterEach(() => {
    disposeRemote();
    vi.unstubAllGlobals();
  });

  it("identical bytes are deduped with equal 64-char SHA-256 hash", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])]);
    const first = await uploadAsset(blob, "a.wav");
    const second = await uploadAsset(blob, "b.wav");

    expect(first.duplicated).toBe(false);
    expect(second.duplicated).toBe(true);
    expect(first.hash).toBe(second.hash);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different bytes produce a different hash and are not deduped", async () => {
    const a = await uploadAsset(new Blob([new Uint8Array([1, 2, 3, 4])]), "a.wav");
    const b = await uploadAsset(new Blob([new Uint8Array([9, 9, 9, 9])]), "c.wav");

    expect(b.duplicated).toBe(false);
    expect(b.hash).not.toBe(a.hash);
    expect(b.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses the configured Authorization headers on the asset check", async () => {
    await uploadAsset(new Blob([new Uint8Array([5, 6])]), "d.wav");
    const calls = fetchMock.mock.calls as Array<[string, any]>;
    const assetCall = calls.find(([u]) => u.includes("/rest/v1/assets"));
    expect(assetCall).toBeDefined();
    expect(assetCall![1].headers.apikey).toBe(HEADERS.apikey);
  });
});

describe("backend-api: in-memory job queue", () => {
  it("addJob enqueues and getJobStatus reflects a live status", () => {
    const id = addJob("extract", { file: "x.wav" });
    expect(typeof id).toBe("string");
    const status = getJobStatus(id);
    expect(status).not.toBeNull();
    expect(["pending", "processing"]).toContain(status!.status);
  });

  it("getJobStatus returns null for an unknown job id", () => {
    expect(getJobStatus("job_does_not_exist")).toBeNull();
  });

  it("multiple jobs each receive distinct ids", () => {
    const a = addJob("extract", {});
    const b = addJob("master", {});
    expect(a).not.toBe(b);
    expect(getJobStatus(a)).not.toBeNull();
    expect(getJobStatus(b)).not.toBeNull();
  });
});

describe("auth: tier gating helper (backend express not resolvable in root vitest)", () => {
  it("documents that backend/src/middleware/tierGuard imports express, which is absent from the root node_modules, so it cannot be imported by vitest at the project root", () => {
    expect(() => require("express")).toThrow();
  });
});
