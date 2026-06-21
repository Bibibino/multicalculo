import type { Carrier, CarrierExecution, PrismaClient, QuoteRequest, Traveler, User } from "@prisma/client";
import { hashPassword } from "../src/auth.js";

type QuoteWithRelations = QuoteRequest & {
  travelers: Traveler[];
  executions: Array<
    CarrierExecution & {
      carrier: Carrier;
      plans: [];
    }
  >;
};

const now = (): Date => new Date("2026-06-20T19:00:00.000Z");

export type FakePrismaState = {
  users: User[];
  carriers: Carrier[];
  quoteRequests: QuoteWithRelations[];
  auditLogs: unknown[];
};

export const createFakePrisma = async (): Promise<{
  prisma: PrismaClient;
  state: FakePrismaState;
}> => {
  const state: FakePrismaState = {
    users: [
      {
        id: "user-1",
        name: "Operador Dev",
        email: "operador@corretora.test",
        passwordHash: await hashPassword("dev-password"),
        providerId: null,
        role: "OPERATOR",
        active: true,
        createdAt: now(),
        updatedAt: now()
      }
    ],
    carriers: [
      {
        id: "carrier-id-a",
        slug: "carrier-a",
        name: "Carrier A",
        enabled: true,
        adapterVersion: "0.0.0-foundation",
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: "carrier-id-b",
        slug: "carrier-b",
        name: "Carrier B",
        enabled: true,
        adapterVersion: "0.0.0-foundation",
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: "carrier-id-c",
        slug: "carrier-c",
        name: "Carrier C",
        enabled: true,
        adapterVersion: "0.0.0-foundation",
        createdAt: now(),
        updatedAt: now()
      }
    ],
    quoteRequests: [],
    auditLogs: []
  };

  const tx = {
    carrier: {
      findMany: (args: { where?: { slug?: { in?: string[] }; enabled?: boolean } } = {}) => {
        const slugs = args.where?.slug?.in;
        return Promise.resolve(state.carriers.filter((carrier) => {
          const slugMatches = slugs ? slugs.includes(carrier.slug) : true;
          const enabledMatches =
            args.where?.enabled === undefined ? true : carrier.enabled === args.where.enabled;

          return slugMatches && enabledMatches;
        }));
      }
    },
    quoteRequest: {
      create: (args: {
        data: {
          userId: string;
          originCountry: string;
          destinationJson: unknown;
          departureDate: Date;
          returnDate: Date;
          tripPurpose: string;
          status: QuoteRequest["status"];
          travelers: { create: Array<{ birthDate: Date }> };
          executions: {
            create: Array<{
              carrierId: string;
              status: CarrierExecution["status"];
              attempt: number;
              adapterVersion: string;
            }>;
          };
        };
      }) => {
        const quoteRequestId = `quote-${state.quoteRequests.length + 1}`;
        const quoteRequest: QuoteWithRelations = {
          id: quoteRequestId,
          userId: args.data.userId,
          originCountry: args.data.originCountry,
          destinationJson: args.data.destinationJson,
          departureDate: args.data.departureDate,
          returnDate: args.data.returnDate,
          tripPurpose: args.data.tripPurpose,
          status: args.data.status,
          createdAt: now(),
          updatedAt: now(),
          travelers: args.data.travelers.create.map((traveler, index) => ({
            id: `traveler-${index + 1}`,
            quoteRequestId,
            birthDate: traveler.birthDate,
            createdAt: now()
          })),
          executions: args.data.executions.create.map((execution, index) => {
            const carrier = state.carriers.find((candidate) => candidate.id === execution.carrierId);

            if (!carrier) {
              throw new Error("carrier not found");
            }

            return {
              id: `execution-${index + 1}`,
              quoteRequestId,
              carrierId: execution.carrierId,
              status: execution.status,
              attempt: execution.attempt,
              startedAt: null,
              finishedAt: null,
              errorCode: null,
              errorMessageSanitized: null,
              currentStep: null,
              externalQuoteReference: null,
              adapterVersion: execution.adapterVersion,
              createdAt: now(),
              updatedAt: now(),
              carrier,
              plans: []
            };
          })
        };

        state.quoteRequests.push(quoteRequest);
        return Promise.resolve(quoteRequest);
      },
      findUnique: (args: { where: { id: string } }) =>
        Promise.resolve(
          state.quoteRequests.find((quoteRequest) => quoteRequest.id === args.where.id) ?? null
        ),
      findMany: () => Promise.resolve(state.quoteRequests),
      update: (args: { where: { id: string }; data: Partial<QuoteRequest> }) => {
        const quoteRequest = state.quoteRequests.find((candidate) => candidate.id === args.where.id);

        if (!quoteRequest) {
          return Promise.reject(new Error("quote not found"));
        }

        Object.assign(quoteRequest, args.data, { updatedAt: now() });
        return Promise.resolve(quoteRequest);
      }
    },
    carrierExecution: {
      findFirst: () => Promise.resolve(null),
      create: () => Promise.reject(new Error("not implemented in fake")),
      updateMany: () => Promise.resolve({ count: 0 })
    },
    auditLog: {
      create: (args: unknown) => {
        state.auditLogs.push(args);
        return Promise.resolve(args);
      }
    }
  };

  const prisma = {
    ...tx,
    user: {
      findUnique: (args: { where: { id?: string; email?: string } }) =>
        Promise.resolve(
          state.users.find((user) => user.id === args.where.id || user.email === args.where.email) ??
            null
        ),
      findFirst: () => Promise.resolve(state.users[0] ?? null)
    },
    $transaction: <T>(fn: (transaction: typeof tx) => Promise<T>) => fn(tx)
  } as unknown as PrismaClient;

  return { prisma, state };
};

export const validQuotePayload = {
  originCountry: "BR",
  destination: {
    type: "COUNTRY",
    countryCodes: ["PT", "ES"]
  },
  departureDate: "2026-09-10",
  returnDate: "2026-09-25",
  tripPurpose: "LEISURE",
  travelers: [{ birthDate: "1995-05-17" }, { birthDate: "1998-08-03" }],
  selectedCarrierIds: ["carrier-a", "carrier-b", "carrier-c"]
} as const;
