import Fastify, { type FastifyInstance } from "fastify";
import { createLoggerOptions } from "@travel-quote/observability";
import { createRedisConnection } from "@travel-quote/queue";
import { registerHealthRoutes, type WorkerHealthDependencies } from "./health.js";

export type BuildWorkerOptions = {
  dependencies?: WorkerHealthDependencies;
};

export const buildWorker = async (
  options: BuildWorkerOptions = {}
): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: createLoggerOptions("worker")
  });

  const dependencies: WorkerHealthDependencies =
    options.dependencies ??
    ({
      redis: createRedisConnection()
    } satisfies WorkerHealthDependencies);

  registerHealthRoutes(app, dependencies);

  return app;
};
