import { describe, expect, it } from "vitest";
import { createQuoteRequestSchema } from "../src/index.js";

describe("createQuoteRequestSchema", () => {
  it("accepts the normalized MVP payload", () => {
    expect(() =>
      createQuoteRequestSchema.parse({
        originCountry: "BR",
        destination: {
          type: "COUNTRY",
          countryCodes: ["PT", "ES"]
        },
        departureDate: "2026-09-10",
        returnDate: "2026-09-25",
        tripPurpose: "LEISURE",
        travelers: [{ birthDate: "1995-05-17" }],
        selectedCarrierIds: ["carrier-a", "carrier-b", "carrier-c"]
      })
    ).not.toThrow();
  });

  it("rejects personal document fields and reversed dates", () => {
    const result = createQuoteRequestSchema.safeParse({
      originCountry: "BR",
      destination: {
        type: "COUNTRY",
        countryCodes: ["PT"]
      },
      departureDate: "2026-09-25",
      returnDate: "2026-09-10",
      tripPurpose: "LEISURE",
      travelers: [{ birthDate: "1995-05-17", cpf: "00000000000" }],
      selectedCarrierIds: ["carrier-a"]
    });

    expect(result.success).toBe(false);
  });
});
