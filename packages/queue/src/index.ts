import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import { Redis } from "ioredis";
import type { ComponentHealth } from "@travel-quote/domain";

export const QUEUE_NAMES = {
  carrierExecutions: "carrier-executions"
} as const;

export type RedisHealthClient = {
  ping(): Promise<string>;
};

export type CarrierExecutionJob = {
  quoteRequestId: string;
  carrierExecutionId: string;
  carrierSlug: string;
};

export type QueueConnectionOptions = ConnectionOptions;

export type CarrierExecutionQueue = Queue<CarrierExecutionJob>;

export const createRedisConnection = (redisUrl = process.env.REDIS_URL): Redis => {
  if (!redisUrl) {
    throw new Error("REDIS_URL is required");
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
};

export const createQueueConnectionOptions = (
  redisUrl = process.env.REDIS_URL
): QueueConnectionOptions => {
  if (!redisUrl) {
    throw new Error("REDIS_URL is required");
  }

  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: Number.parseInt(url.port || "6379", 10),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname ? Number.parseInt(url.pathname.slice(1) || "0", 10) : 0,
    maxRetriesPerRequest: null
  };
};

export const createCarrierExecutionQueue = (
  connection: QueueConnectionOptions,
  options: { defaultJobOptions?: JobsOptions } = {}
): CarrierExecutionQueue =>
  new Queue<CarrierExecutionJob>(QUEUE_NAMES.carrierExecutions, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 500,
      removeOnFail: 500,
      ...options.defaultJobOptions
    }
  });

export const getCarrierExecutionJobId = (carrierExecutionId: string): string =>
  `carrier-execution-${carrierExecutionId}`;

export const enqueueCarrierExecution = async (
  queue: CarrierExecutionQueue,
  job: CarrierExecutionJob
): Promise<void> => {
  await queue.add("run-carrier-execution", job, {
    jobId: getCarrierExecutionJobId(job.carrierExecutionId)
  });
};

export const removeCarrierExecutionJob = async (
  queue: CarrierExecutionQueue,
  carrierExecutionId: string
): Promise<void> => {
  const job = await queue.getJob(getCarrierExecutionJobId(carrierExecutionId));

  if (job) {
    await job.remove();
  }
};

export const checkRedisHealth = async (client: RedisHealthClient): Promise<ComponentHealth> => {
  const startedAt = performance.now();

  try {
    const response = await client.ping();

    return {
      status: response === "PONG" ? "ok" : "degraded",
      latencyMs: Math.round(performance.now() - startedAt),
      ...(response === "PONG" ? {} : { message: `Unexpected Redis ping response: ${response}` })
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Math.round(performance.now() - startedAt),
      message: error instanceof Error ? error.message : "Unknown Redis error"
    };
  }
};
