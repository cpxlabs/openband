import { describe, it, expect, beforeEach } from "vitest";
import {
  saveAsset,
  resolveAssetUrl,
  resolveAssetUrlSync,
  revokeAssetCache,
  deleteAssetUrl,
  ASSET_PREFIX,
} from "../src/lib/assetStore";

let counter = 0;
if (typeof (globalThis.URL as any).createObjectURL !== "function") {
  (globalThis.URL as any).createObjectURL = () => "blob:live-" + counter++;
}
if (typeof (globalThis.URL as any).revokeObjectURL !== "function") {
  (globalThis.URL as any).revokeObjectURL = () => {};
}

function makeBlob(): Blob {
  return new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" });
}

describe("assetStore", () => {
  beforeEach(() => {
    revokeAssetCache();
    counter = 0;
  });

  it("saveAsset returns asset:// pointer and resolveAssetUrl returns blob url", async () => {
    const pointer = await saveAsset(makeBlob());
    expect(pointer.startsWith(ASSET_PREFIX)).toBe(true);
    const live = await resolveAssetUrl(pointer);
    expect(live.startsWith("blob:")).toBe(true);
  });

  it("resolveAssetUrl passes through https url unchanged", async () => {
    const out = await resolveAssetUrl("https://x/y.wav");
    expect(out).toBe("https://x/y.wav");
  });

  it("resolveAssetUrl passes through blob url unchanged", async () => {
    const out = await resolveAssetUrl("blob:https://x/abc");
    expect(out).toBe("blob:https://x/abc");
  });

  it("resolveAssetUrl reuses cached url", async () => {
    const pointer = await saveAsset(makeBlob());
    const a = await resolveAssetUrl(pointer);
    const b = await resolveAssetUrl(pointer);
    expect(a).toBe(b);
  });

  it("revokeAssetCache clears cache without throwing", async () => {
    const pointer = await saveAsset(makeBlob());
    await resolveAssetUrl(pointer);
    expect(() => revokeAssetCache()).not.toThrow();
    expect(resolveAssetUrlSync(pointer)).toBe(pointer);
  });

  it("deleteAssetUrl removes cached pointer and frees it", async () => {
    const pointer = await saveAsset(makeBlob());
    const live = await resolveAssetUrl(pointer);
    expect(live.startsWith("blob:")).toBe(true);
    deleteAssetUrl(pointer);
    expect(resolveAssetUrlSync(pointer)).toBe(pointer);
  });
});
