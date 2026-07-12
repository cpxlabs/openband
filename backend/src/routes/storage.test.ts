import { createPresigner, getStorageMode, getMockStore } from "../lib/objectStorage";
import assert from "assert";

async function main() {
  delete process.env.SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.S3_ENDPOINT;

  assert.strictEqual(getStorageMode(), "mock", "default mode should be mock");

  const presigner = await createPresigner();
  assert.strictEqual(presigner.mode, "mock");

  const key = "user-1/abcd1234_drum.wav";
  const put = await presigner.presignPut(key, "application/octet-stream");
  assert.strictEqual(put.method, "PUT");
  assert.strictEqual(put.key, key);
  assert.ok(put.url.startsWith("/api/storage/mock/"));

  assert.strictEqual(await presigner.head(key), false);

  getMockStore().set(key, Buffer.from([1, 2, 3, 4]));
  assert.strictEqual(await presigner.head(key), true);

  const get = await presigner.presignGet(key);
  assert.strictEqual(get.method, "GET");
  assert.ok(get.url.startsWith("/api/storage/mock/"));

  console.log("backend storage presigner: OK");
}

main().catch((e) => {
  console.error("backend storage test failed:", e);
  process.exit(1);
});
