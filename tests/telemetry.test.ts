import { describe, it, expect, afterAll, beforeAll } from "vitest";
import type { Server } from "http";
import app from "../backend/src/app";
import { validateTelemetryPayload } from "../backend/src/routes/telemetry";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (addr && typeof addr === "object") {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
});

const validMetrics = {
  underruns: 0,
  droppedFrames: 0,
  cpuLoad: 12,
  peakCpu: 34,
  timestamp: Date.now(),
};

describe("validateTelemetryPayload", () => {
  it("accepts a well-formed payload", () => {
    expect(
      validateTelemetryPayload({ metrics: validMetrics, platform: "web" }),
    ).toBe(true);
  });

  it("rejects a missing metrics object", () => {
    expect(validateTelemetryPayload({ platform: "web" })).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(validateTelemetryPayload(null)).toBe(false);
    expect(validateTelemetryPayload("nope")).toBe(false);
  });

  it("rejects when a required numeric field is missing", () => {
    const bad = { ...validMetrics, cpuLoad: undefined };
    expect(validateTelemetryPayload({ metrics: bad })).toBe(false);
  });
});

describe("POST /api/telemetry", () => {
  it("accepts a valid payload with 200 { ok: true }", async () => {
    const resp = await fetch(`${baseUrl}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metrics: validMetrics,
        userAgent: "vitest",
        platform: "web",
        projectId: "test-project",
      }),
    });
    const json = await resp.json();
    expect(resp.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("rejects a malformed payload with 400", async () => {
    const resp = await fetch(`${baseUrl}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics: { underruns: "not-a-number" } }),
    });
    expect(resp.status).toBe(400);
  });

  it("does not throw when no telemetry table is provisioned", async () => {
    const resp = await fetch(`${baseUrl}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics: validMetrics }),
    });
    expect(resp.status).toBe(200);
  });
});
