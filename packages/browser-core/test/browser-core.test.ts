import { access, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { chromium } from "playwright";
import {
  createBrowserSession,
  createFileArtifactCollector,
  fixtureFileUrl,
  sanitizeText
} from "../src/index.js";

let artifactPath = "";
let browserAvailable = false;

beforeAll(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/tmp/ms-playwright";

  try {
    await access(chromium.executablePath());
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    browserAvailable = true;
  } catch {
    browserAvailable = false;
  }
});

afterEach(async () => {
  if (artifactPath) {
    await rm(artifactPath, { recursive: true, force: true });
    artifactPath = "";
  }
});

describe("sanitizeText", () => {
  it("redacts common secrets and personal identifiers", () => {
    expect(
      sanitizeText(
        'email operador@corretora.test token=abc123 Authorization=Bearer secret <input type="password" value="senha">'
      )
    ).toContain("[REDACTED_EMAIL]");
    expect(
      sanitizeText(
        'email operador@corretora.test token=abc123 Authorization=Bearer secret <input type="password" value="senha">'
      )
    ).not.toContain("senha");
  });
});

describe("createBrowserSession", () => {
  it("opens a local fixture and captures sanitized failure artifacts", async () => {
    if (!browserAvailable) {
      return;
    }

    artifactPath = await mkdtemp(join(tmpdir(), "browser-core-artifacts-"));
    const session = await createBrowserSession({
      executionId: "execution-browser-test",
      config: {
        headless: true,
        timeoutMs: 10_000,
        artifactStoragePath: artifactPath,
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        allowFileUrls: true,
        allowedOrigins: []
      },
      artifactCollector: createFileArtifactCollector(artifactPath)
    });

    try {
      await session.page.goto(fixtureFileUrl("packages/test-fixtures/fixtures/carrier-a/quote-form.html"));
      await session.captureFailureArtifact({
        stepId: "fixture_failure",
        error: new Error("token=abc operador@corretora.test")
      });
    } finally {
      await session.close();
    }

    const artifactDirectory = join(artifactPath, "execution-browser-test");
    const htmlFile = (await readdir(artifactDirectory)).find((file) =>
      file.endsWith("html_snapshot.html")
    );
    const html = htmlFile ? await readFile(join(artifactDirectory, htmlFile), "utf8") : "";
    expect(html).not.toContain("secret-password");
  });
});
