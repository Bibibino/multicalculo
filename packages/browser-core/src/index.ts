import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export type BrowserSession = {
  page: Page;
  context: BrowserContext;
  captureFailureArtifact(input: { stepId: string; error: unknown }): Promise<void>;
  close(): Promise<void>;
};

export type BrowserRuntimeConfig = {
  headless: boolean;
  timeoutMs: number;
  artifactStoragePath: string;
  locale: string;
  timezoneId: string;
  allowFileUrls: boolean;
  allowedOrigins: string[];
};

export type ArtifactRecord = {
  id: string;
  type: "SCREENSHOT" | "HTML_SNAPSHOT" | "TRACE" | "LOG_EXCERPT";
  path: string;
  mimeType: string;
  sanitized: boolean;
  createdAt: string;
};

export type ArtifactCollector = {
  collectScreenshot(input: { page: Page; executionId: string; stepId: string }): Promise<ArtifactRecord>;
  collectHtmlSnapshot(input: {
    html: string;
    executionId: string;
    stepId: string;
  }): Promise<ArtifactRecord>;
  collectLogExcerpt(input: {
    text: string;
    executionId: string;
    stepId: string;
  }): Promise<ArtifactRecord>;
};

export type HumanInterventionRequest = {
  executionId: string;
  type: "CAPTCHA" | "MFA" | "SESSION_EXPIRED" | "TERMS_CHANGED" | "UNKNOWN_PAGE" | "MANUAL_REVIEW";
  instructions: string;
  expiresAt: string;
};

export class HumanInterventionRequiredError extends Error {
  constructor(readonly intervention: HumanInterventionRequest) {
    super(`Human intervention required: ${intervention.type}`);
  }
}

export class UnexpectedNavigationError extends Error {
  constructor(url: string) {
    super(`Navigation blocked by allowlist: ${url}`);
  }
}

export const getBrowserRuntimeConfig = (): BrowserRuntimeConfig => ({
  headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
  timeoutMs: Number.parseInt(process.env.PLAYWRIGHT_TIMEOUT_MS ?? "30000", 10),
  artifactStoragePath: process.env.ARTIFACT_STORAGE_PATH ?? "./var/artifacts",
  locale: process.env.PLAYWRIGHT_LOCALE ?? "pt-BR",
  timezoneId: process.env.PLAYWRIGHT_TIMEZONE ?? "America/Sao_Paulo",
  allowFileUrls: process.env.PLAYWRIGHT_ALLOW_FILE_URLS !== "false",
  allowedOrigins: (process.env.PLAYWRIGHT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
});

export const sanitizeText = (input: string): string =>
  input
    .replaceAll(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replaceAll(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED_TOKEN]")
    .replaceAll(/(token|accessToken|authorization|cookie)=["']?[^"'\s<>]+/gi, "$1=[REDACTED]")
    .replaceAll(/(<input[^>]+type=["']password["'][^>]*value=["'])[^"']*(["'][^>]*>)/gi, "$1[REDACTED]$2")
    .replaceAll(/(<input[^>]+name=["']?password["']?[^>]*value=["'])[^"']*(["'][^>]*>)/gi, "$1[REDACTED]$2")
    .slice(0, 50_000);

const safeFilePart = (value: string): string => value.replaceAll(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);

export const createFileArtifactCollector = (
  artifactStoragePath = getBrowserRuntimeConfig().artifactStoragePath
): ArtifactCollector => {
  const writeArtifact = async (input: {
    executionId: string;
    stepId: string;
    type: ArtifactRecord["type"];
    extension: string;
    mimeType: string;
    content: string | Buffer;
  }): Promise<ArtifactRecord> => {
    const createdAt = new Date().toISOString();
    const directory = resolve(artifactStoragePath, safeFilePart(input.executionId));
    const id = `${Date.now()}-${safeFilePart(input.stepId)}-${input.type.toLowerCase()}`;
    const path = join(directory, `${id}.${input.extension}`);

    await mkdir(directory, { recursive: true });
    await writeFile(path, input.content);

    return {
      id,
      type: input.type,
      path,
      mimeType: input.mimeType,
      sanitized: true,
      createdAt
    };
  };

  return {
    async collectScreenshot(input) {
      const screenshot = await input.page.screenshot({ fullPage: true });

      return writeArtifact({
        ...input,
        type: "SCREENSHOT",
        extension: "png",
        mimeType: "image/png",
        content: screenshot
      });
    },
    collectHtmlSnapshot(input) {
      return writeArtifact({
        ...input,
        type: "HTML_SNAPSHOT",
        extension: "html",
        mimeType: "text/html",
        content: sanitizeText(input.html)
      });
    },
    collectLogExcerpt(input) {
      return writeArtifact({
        ...input,
        type: "LOG_EXCERPT",
        extension: "txt",
        mimeType: "text/plain",
        content: sanitizeText(input.text)
      });
    }
  };
};

const isAllowedUrl = (url: string, config: BrowserRuntimeConfig): boolean => {
  if (url === "about:blank") {
    return true;
  }

  const parsedUrl = new URL(url);

  if (parsedUrl.protocol === "file:") {
    return config.allowFileUrls;
  }

  return config.allowedOrigins.includes(parsedUrl.origin);
};

export const createBrowserSession = async (
  input: {
    executionId: string;
    config?: BrowserRuntimeConfig;
    artifactCollector?: ArtifactCollector;
    cancellationSignal?: AbortSignal;
  }
): Promise<BrowserSession> => {
  const config = input.config ?? getBrowserRuntimeConfig();
  const artifacts = input.artifactCollector ?? createFileArtifactCollector(config.artifactStoragePath);
  const browser: Browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    locale: config.locale,
    timezoneId: config.timezoneId,
    acceptDownloads: false
  });
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeoutMs);
  page.setDefaultNavigationTimeout(config.timeoutMs);

  await page.route("**/*", async (route) => {
    const url = route.request().url();

    if (input.cancellationSignal?.aborted) {
      await route.abort("aborted");
      return;
    }

    if (!isAllowedUrl(url, config)) {
      await route.abort("blockedbyclient");
      throw new UnexpectedNavigationError(url);
    }

    await route.continue();
  });

  return {
    page,
    context,
    async captureFailureArtifact({ stepId, error }) {
      await artifacts.collectScreenshot({ page, executionId: input.executionId, stepId });
      await artifacts.collectHtmlSnapshot({
        html: await page.content(),
        executionId: input.executionId,
        stepId
      });
      await artifacts.collectLogExcerpt({
        text: error instanceof Error ? error.stack ?? error.message : String(error),
        executionId: input.executionId,
        stepId
      });
    },
    async close() {
      await context.close();
      await browser.close();
    }
  };
};

export const fixtureFileUrl = (fixturePath: string): string => pathToFileURL(resolve(fixturePath)).href;
