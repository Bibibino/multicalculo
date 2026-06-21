import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const fixtureRoot = resolve(packageRoot, "fixtures");

export const carrierAFixtures = {
  quoteForm: resolve(fixtureRoot, "carrier-a", "quote-form.html"),
  quoteFormChanged: resolve(fixtureRoot, "carrier-a", "quote-form-changed.html"),
  results: resolve(fixtureRoot, "carrier-a", "results.html"),
  noResults: resolve(fixtureRoot, "carrier-a", "no-results.html"),
  captcha: resolve(fixtureRoot, "carrier-a", "captcha.html"),
  error: resolve(fixtureRoot, "carrier-a", "error.html")
} as const;
