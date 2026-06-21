import { describe, expect, it } from "vitest";
import { isHealthy, type ServiceHealth } from "../src/index.js";

describe("isHealthy", () => {
  it("returns true only for ok services", () => {
    const health: ServiceHealth = {
      service: "api",
      status: "ok",
      uptimeSeconds: 1,
      checkedAt: new Date().toISOString(),
      checks: {}
    };

    expect(isHealthy(health)).toBe(true);
    expect(isHealthy({ ...health, status: "degraded" })).toBe(false);
  });
});
