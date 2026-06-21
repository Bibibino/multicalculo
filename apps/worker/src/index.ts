import { buildWorker } from "./server.js";
import { createWorkerRuntime } from "./consumer.js";

const host = process.env.WORKER_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.WORKER_PORT ?? "3002", 10);

const app = await buildWorker();
const runtime = createWorkerRuntime();

const shutdown = async (): Promise<void> => {
  await app.close();
  await runtime.close();
};

process.once("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});

process.once("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error({ error }, "Failed to start worker");
  process.exit(1);
}
