import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { createPrismaClient } from "@travel-quote/database";
import { createLoggerOptions } from "@travel-quote/observability";
import {
  createCarrierExecutionQueue,
  createQueueConnectionOptions,
  createRedisConnection,
  enqueueCarrierExecution,
  removeCarrierExecutionJob
} from "@travel-quote/queue";
import { registerHealthRoutes, type ApiHealthDependencies } from "./health.js";
import { registerApiRoutes } from "./routes.js";
import type { AppPrismaClient, QuoteJobPublisher } from "./service.js";

export type BuildApiOptions = {
  dependencies?: ApiHealthDependencies;
  prisma?: AppPrismaClient;
  publisher?: QuoteJobPublisher;
};

export const buildApi = async (options: BuildApiOptions = {}): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: createLoggerOptions("api")
  });

  await app.register(cors, {
    origin: true
  });

  const dependencies: ApiHealthDependencies =
    options.dependencies ??
    ({
      database: createPrismaClient(),
      redis: createRedisConnection()
    } satisfies ApiHealthDependencies);
  const prisma = options.prisma ?? createPrismaClient();
  const publisher = options.publisher ?? createBullMqQuoteJobPublisher();

  registerHealthRoutes(app, dependencies);
  registerApiRoutes(app, { prisma, publisher });

  return app;
};

const createBullMqQuoteJobPublisher = (): QuoteJobPublisher => {
  let queue: ReturnType<typeof createCarrierExecutionQueue> | null = null;

  const getQueue = (): ReturnType<typeof createCarrierExecutionQueue> => {
    queue ??= createCarrierExecutionQueue(createQueueConnectionOptions());
    return queue;
  };

  return {
    publishCarrierExecution: (input) => enqueueCarrierExecution(getQueue(), input),
    cancelCarrierExecution: (carrierExecutionId) =>
      removeCarrierExecutionJob(getQueue(), carrierExecutionId)
  };
};
