import { describe, expect, it } from "vitest";
import {
  checkRedisHealth,
  createQueueConnectionOptions,
  getCarrierExecutionJobId,
  QUEUE_NAMES,
  type RedisHealthClient
} from "../src/index.js";

describe("queue foundation", () => {
  it("defines the carrier execution queue name", () => {
    expect(QUEUE_NAMES.carrierExecutions).toBe("carrier-executions");
  });

  it("returns ok when Redis responds with PONG", async () => {
    const client: RedisHealthClient = { ping: () => Promise.resolve("PONG") };
    await expect(checkRedisHealth(client)).resolves.toMatchObject({ status: "ok" });
  });

  it("builds BullMQ connection options from REDIS_URL", () => {
    expect(createQueueConnectionOptions("redis://localhost:6379/2")).toMatchObject({
      host: "localhost",
      port: 6379,
      db: 2,
      maxRetriesPerRequest: null
    });
  });

  it("uses stable carrier execution job ids", () => {
    expect(getCarrierExecutionJobId("execution-1")).toBe("carrier-execution-execution-1");
  });
});
