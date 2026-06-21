import { describe, expect, it } from "vitest";
import { buildApi } from "../src/server.js";
import { createFakePrisma, validQuotePayload } from "./fake-prisma.js";

describe("quote request routes", () => {
  it("authenticates and creates a queued quote request", async () => {
    const { prisma, state } = await createFakePrisma();
    const publishedJobs: unknown[] = [];
    const app = await buildApi({
      dependencies: {
        database: { $queryRaw: () => Promise.resolve([{ value: 1 }]) },
        redis: { ping: () => Promise.resolve("PONG") }
      },
      prisma,
      publisher: {
        publishCarrierExecution: (input) => {
          publishedJobs.push(input);
          return Promise.resolve();
        }
      }
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "operador@corretora.test",
        password: "dev-password"
      }
    });
    const token = loginResponse.json<{ accessToken: string }>().accessToken;
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/quote-requests",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: validQuotePayload
    });
    await app.close();

    expect(loginResponse.statusCode).toBe(200);
    expect(createResponse.statusCode).toBe(202);
    expect(createResponse.json()).toMatchObject({
      status: "QUEUED",
      originCountry: "BR",
      executions: [
        { carrierSlug: "carrier-a", status: "QUEUED" },
        { carrierSlug: "carrier-b", status: "QUEUED" },
        { carrierSlug: "carrier-c", status: "QUEUED" }
      ]
    });
    expect(publishedJobs).toHaveLength(3);
    expect(state.quoteRequests).toHaveLength(1);
    expect(state.auditLogs).toHaveLength(1);
  });

  it("exports a quote request as JSON", async () => {
    const { prisma } = await createFakePrisma();
    const app = await buildApi({
      dependencies: {
        database: { $queryRaw: () => Promise.resolve([{ value: 1 }]) },
        redis: { ping: () => Promise.resolve("PONG") }
      },
      prisma,
      publisher: {
        publishCarrierExecution: () => Promise.resolve()
      }
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "operador@corretora.test",
        password: "dev-password"
      }
    });
    const token = loginResponse.json<{ accessToken: string }>().accessToken;
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/quote-requests",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: validQuotePayload
    });
    const quote = createResponse.json<{ id: string }>();
    const exportResponse = await app.inject({
      method: "GET",
      url: `/api/v1/quote-requests/${quote.id}/export?format=json`,
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    await app.close();

    expect(exportResponse.statusCode).toBe(200);
    expect(JSON.parse(exportResponse.body)).toMatchObject({ id: quote.id });
  });

  it("rejects invalid quote dates", async () => {
    const { prisma } = await createFakePrisma();
    const app = await buildApi({
      dependencies: {
        database: { $queryRaw: () => Promise.resolve([{ value: 1 }]) },
        redis: { ping: () => Promise.resolve("PONG") }
      },
      prisma
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "operador@corretora.test",
        password: "dev-password"
      }
    });
    const token = loginResponse.json<{ accessToken: string }>().accessToken;
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/quote-requests",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        ...validQuotePayload,
        departureDate: "2026-09-25",
        returnDate: "2026-09-10"
      }
    });
    await app.close();

    expect(createResponse.statusCode).toBe(400);
    expect(createResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });
});
