import { describe, expect, it } from "vitest";
import { createAdapterRegistry, getAdapter } from "../src/registry.js";

describe("adapter registry", () => {
  it("registers all phase 3 mock adapters", () => {
    const registry = createAdapterRegistry();

    expect([...registry.keys()]).toEqual(["carrier-a", "carrier-b", "carrier-c"]);
    expect(getAdapter(registry, "carrier-a").metadata.version).toBe("0.1.0-mock");
  });

  it("throws for an unknown carrier", () => {
    const registry = createAdapterRegistry();

    expect(() => getAdapter(registry, "carrier-x")).toThrow("Adapter not registered");
  });
});
