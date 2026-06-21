import { Worker, type Job } from "bullmq";
import { createPrismaClient } from "@travel-quote/database";
import { createLogger } from "@travel-quote/observability";
import {
  QUEUE_NAMES,
  createQueueConnectionOptions,
  type CarrierExecutionJob,
  type QueueConnectionOptions
} from "@travel-quote/queue";
import { createCarrierExecutionProcessor } from "./processor.js";
import { createAdapterRegistry } from "./registry.js";

export type WorkerRuntime = {
  close(): Promise<void>;
};

export const createWorkerRuntime = (): WorkerRuntime => {
  const logger = createLogger("worker.runtime");
  const connection: QueueConnectionOptions = createQueueConnectionOptions();
  const prisma = createPrismaClient();
  const registry = createAdapterRegistry();
  const processor = createCarrierExecutionProcessor({ prisma, registry });
  const worker = new Worker<CarrierExecutionJob>(
    QUEUE_NAMES.carrierExecutions,
    async (job: Job<CarrierExecutionJob>) => processor(job.data),
    {
      connection,
      concurrency: Number.parseInt(process.env.WORKER_CONCURRENCY ?? "3", 10)
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, carrierExecutionId: job.data.carrierExecutionId }, "Job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, carrierExecutionId: job?.data.carrierExecutionId, error },
      "Job failed"
    );
  });

  return {
    async close(): Promise<void> {
      await worker.close();
      await prisma.$disconnect();
    }
  };
};
