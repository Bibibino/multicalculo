import pino, { type Logger, type LoggerOptions } from "pino";

const redactPaths = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "authorization",
  "cookie",
  "*.password",
  "*.token",
  "*.accessToken",
  "*.authorization",
  "*.cookie"
];

export type StructuredLogger = Logger;

export const createLoggerOptions = (service: string, options: LoggerOptions = {}): LoggerOptions => ({
    name: service,
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: redactPaths,
      censor: "[REDACTED]"
    },
    ...options
  });

export const createLogger = (service: string, options: LoggerOptions = {}): Logger =>
  pino(createLoggerOptions(service, options));
