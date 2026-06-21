import { describe, expect, it } from "vitest";
import { createAccessToken, hashPassword, verifyAccessToken, verifyPassword } from "../src/auth.js";

describe("auth helpers", () => {
  it("hashes and verifies passwords without storing plain text", async () => {
    const hash = await hashPassword("dev-password");

    expect(hash).not.toContain("dev-password");
    await expect(verifyPassword("dev-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("creates and verifies signed access tokens", () => {
    const token = createAccessToken(
      {
        id: "user-1",
        name: "Operador",
        email: "operador@corretora.test",
        role: "OPERATOR"
      },
      { now: new Date("2026-06-20T19:00:00.000Z"), ttlSeconds: 60 }
    );

    expect(verifyAccessToken(token, new Date("2026-06-20T19:00:30.000Z"))).toMatchObject({
      sub: "user-1",
      email: "operador@corretora.test",
      role: "OPERATOR"
    });
    expect(verifyAccessToken(token, new Date("2026-06-20T19:02:00.000Z"))).toBeNull();
  });
});
