import { access } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { getBrowserRuntimeConfig } from "@travel-quote/browser-core";
import type { ComponentHealth, HealthStatus, ServiceHealth } from "@travel-quote/domain";
import { checkRedisHealth, type RedisHealthClient } from "@travel-quote/queue";

export type WorkerHealthDependencies = {
  redis: RedisHealthClient;
};

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

const checkArtifactStorage = async (path: string): Promise<ComponentHealth> => {
  try {
    await access(path);
    return { status: "ok", message: path };
  } catch (error) {
    return {
      status: "down",
      message: error instanceof Error ? error.message : "Artifact storage is unavailable"
    };
  }
};

export const collectWorkerHealth = async (
  dependencies: WorkerHealthDependencies
): Promise<ServiceHealth> => {
  const browserConfig = getBrowserRuntimeConfig();
  const checks = {
    process: { status: "ok", message: `pid=${process.pid}` } satisfies ComponentHealth,
    redis: await checkRedisHealth(dependencies.redis),
    artifacts: await checkArtifactStorage(browserConfig.artifactStoragePath)
  };

  return {
    service: "worker",
    status: aggregateStatus(checks),
    uptimeSeconds: Math.round(process.uptime()),
    checkedAt: new Date().toISOString(),
    checks
  };
};

export const registerHealthRoutes = (
  app: FastifyInstance,
  dependencies: WorkerHealthDependencies
): void => {
  app.get("/health", async (_request, reply) => {
    const health = await collectWorkerHealth(dependencies);

    return reply.status(health.status === "ok" ? 200 : 503).send(health);
  });
};
