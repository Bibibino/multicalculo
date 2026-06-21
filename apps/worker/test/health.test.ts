import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { buildWorker } from "../src/server.js";

const artifactPath = join(tmpdir(), "travel-quote-worker-health-test");

afterEach(async () => {
  delete process.env.ARTIFACT_STORAGE_PATH;
  await rm(artifactPath, { recursive: true, force: true });
});

describe("GET /health", () => {
  it("returns ok when Redis and artifact storage are healthy", async () => {
    process.env.ARTIFACT_STORAGE_PATH = artifactPath;
    await mkdir(artifactPath, { recursive: true });

    const app = await buildWorker({
      dependencies: {
        redis: { ping: () => Promise.resolve("PONG") }
      }
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: "worker",
      status: "ok",
      checks: {
        redis: { status: "ok" },
        artifacts: { status: "ok" }
      }
    });
  });
});
