import { PrismaClient } from "@prisma/client";
import type { ComponentHealth } from "@travel-quote/domain";

export type DatabaseHealthClient = {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
};

export const createPrismaClient = (): PrismaClient => new PrismaClient();

export const checkDatabaseHealth = async (
  client: DatabaseHealthClient
): Promise<ComponentHealth> => {
  const startedAt = performance.now();

  try {
    await client.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      latencyMs: Math.round(performance.now() - startedAt)
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Math.round(performance.now() - startedAt),
      message: error instanceof Error ? error.message : "Unknown database error"
    };
  }
};
