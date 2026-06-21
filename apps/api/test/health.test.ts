import { describe, expect, it } from "vitest";
import { buildApi } from "../src/server.js";

describe("GET /health", () => {
  it("returns ok when database and Redis are healthy", async () => {
    const app = await buildApi({
      dependencies: {
        database: { $queryRaw: () => Promise.resolve([{ value: 1 }]) },
        redis: { ping: () => Promise.resolve("PONG") }
      }
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: "api",
      status: "ok",
      checks: {
        database: { status: "ok" },
        redis: { status: "ok" }
      }
    });
  });

  it("returns 503 when Redis is down", async () => {
    const app = await buildApi({
      dependencies: {
        database: { $queryRaw: () => Promise.resolve([{ value: 1 }]) },
        redis: {
          ping: () => Promise.reject(new Error("redis unavailable"))
        }
      }
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      service: "api",
      status: "down",
      checks: {
        redis: { status: "down", message: "redis unavailable" }
      }
    });
  });
});
