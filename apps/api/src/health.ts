import type { FastifyInstance } from "fastify";
import { checkDatabaseHealth, type DatabaseHealthClient } from "@travel-quote/database";
import type { ComponentHealth, HealthStatus, ServiceHealth } from "@travel-quote/domain";
import { checkRedisHealth, type RedisHealthClient } from "@travel-quote/queue";

export type ApiHealthDependencies = {
  database: DatabaseHealthClient;
  redis: RedisHealthClient;
};

const processHealth = (): ComponentHealth => ({
  status: "ok",
  message: `pid=${process.pid}`
});

const aggregateStatus = (checks: Record<string, ComponentHealth>): HealthStatus => {
  const statuses = Object.values(checks).map((check) => check.status);

  if (statuses.includes("down")) {
    return "down";
  }

  if (statuses.includes("degraded")) {
    return "degraded";
  }

  return "ok";
};

export const collectApiHealth = async (
  dependencies: ApiHealthDependencies
): Promise<ServiceHealth> => {
  const checks = {
    process: processHealth(),
    database: await checkDatabaseHealth(dependencies.database),
    redis: await checkRedisHealth(dependencies.redis)
  };

  return {
    service: "api",
    status: aggregateStatus(checks),
    uptimeSeconds: Math.round(process.uptime()),
    checkedAt: new Date().toISOString(),
    checks
  };
};

export const registerHealthRoutes = (
  app: FastifyInstance,
  dependencies: ApiHealthDependencies
): void => {
  app.get("/health", async (_request, reply) => {
    const health = await collectApiHealth(dependencies);

    return reply.status(health.status === "ok" ? 200 : 503).send(health);
  });
};
