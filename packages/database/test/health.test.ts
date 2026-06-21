import { describe, expect, it } from "vitest";
import { checkDatabaseHealth, type DatabaseHealthClient } from "../src/index.js";

describe("checkDatabaseHealth", () => {
  it("returns ok when the probe query succeeds", async () => {
    const client: DatabaseHealthClient = {
      $queryRaw: () => Promise.resolve([{ "?column?": 1 }])
    };

    await expect(checkDatabaseHealth(client)).resolves.toMatchObject({ status: "ok" });
  });

  it("returns down when the probe query fails", async () => {
    const client: DatabaseHealthClient = {
      $queryRaw: () => Promise.reject(new Error("connection refused"))
    };

    await expect(checkDatabaseHealth(client)).resolves.toMatchObject({
      status: "down",
      message: "connection refused"
    });
  });
});
