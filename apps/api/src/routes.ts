import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import openApiDocument from "../../../docs/openapi.json" with { type: "json" };
import { ZodError, z } from "zod";
import type { UserRole } from "@prisma/client";
import {
  canCreateQuote,
  canMutateQuote,
  verifyAccessToken,
  type AuthUser,
  type TokenPayload
} from "./auth.js";
import {
  ApiError,
  cancelQuoteRequest,
  createQuoteRequest,
  getQuoteRequest,
  exportQuoteRequest,
  listQuoteRequests,
  login,
  retryCarrierExecution,
  type AppPrismaClient,
  type QuoteJobPublisher
} from "./service.js";

export type ApiRouteDependencies = {
  prisma: AppPrismaClient;
  publisher: QuoteJobPublisher;
};

const listQuerySchema = z.object({
  status: z.string().optional(),
  userId: z.string().optional(),
  carrierId: z.string().optional(),
  createdFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  createdTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const toAuthUser = async (
  prisma: AppPrismaClient,
  payload: TokenPayload
): Promise<AuthUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user?.active) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
};

const requireAuth = async (
  request: FastifyRequest,
  prisma: AppPrismaClient
): Promise<AuthUser> => {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    throw new ApiError(401, "Missing bearer token", "AUTHENTICATION_REQUIRED");
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    throw new ApiError(401, "Invalid bearer token", "INVALID_TOKEN");
  }

  const user = await toAuthUser(prisma, payload);

  if (!user) {
    throw new ApiError(401, "Invalid bearer token", "INVALID_TOKEN");
  }

  return user;
};

const requireRole = (role: UserRole, allowed: (role: UserRole) => boolean): void => {
  if (!allowed(role)) {
    throw new ApiError(403, "Insufficient permissions", "FORBIDDEN");
  }
};

const sendRouteError = (reply: FastifyReply, error: unknown): FastifyReply => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request payload",
      issues: error.issues
    });
  }

  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message
    });
  }

  throw error;
};

export const registerApiRoutes = (
  app: FastifyInstance,
  dependencies: ApiRouteDependencies
): void => {
  app.get("/api/v1/openapi.json", () => openApiDocument);

  app.post("/api/v1/auth/login", async (request, reply) => {
    try {
      const response = await login(dependencies.prisma, request.body);

      return reply.send(response);
    } catch (error) {
      return sendRouteError(reply, error);
    }
  });

  app.post("/api/v1/quote-requests", async (request, reply) => {
    try {
      const user = await requireAuth(request, dependencies.prisma);
      requireRole(user.role, canCreateQuote);
      const quoteRequest = await createQuoteRequest(
        dependencies.prisma,
        dependencies.publisher,
        user,
        request.body
      );

      return reply.status(202).send(quoteRequest);
    } catch (error) {
      return sendRouteError(reply, error);
    }
  });

  app.get("/api/v1/quote-requests", async (request, reply) => {
    try {
      const user = await requireAuth(request, dependencies.prisma);
      const query = listQuerySchema.parse(request.query);
      const listQuery: {
        status?: string;
        userId?: string;
        carrierId?: string;
        createdFrom?: string;
        createdTo?: string;
        limit?: number;
        offset?: number;
      } = {};

      if (query.status) {
        listQuery.status = query.status;
      }
      if (query.limit) {
        listQuery.limit = query.limit;
      }
      if (query.offset !== undefined) {
        listQuery.offset = query.offset;
      }
      if (query.carrierId) {
        listQuery.carrierId = query.carrierId;
      }
      if (query.createdFrom) {
        listQuery.createdFrom = query.createdFrom;
      }
      if (query.createdTo) {
        listQuery.createdTo = query.createdTo;
      }
      if (user.role === "VIEWER" || user.role === "OPERATOR") {
        listQuery.userId = user.id;
      } else if (query.userId) {
        listQuery.userId = query.userId;
      }

      const quoteRequests = await listQuoteRequests(dependencies.prisma, listQuery);

      return reply.send({ data: quoteRequests });
    } catch (error) {
      return sendRouteError(reply, error);
    }
  });

  app.get("/api/v1/quote-requests/:id", async (request, reply) => {
    try {
      await requireAuth(request, dependencies.prisma);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);

      return reply.send(await getQuoteRequest(dependencies.prisma, params.id));
    } catch (error) {
      return sendRouteError(reply, error);
    }
  });

  app.get("/api/v1/quote-requests/:id/export", async (request, reply) => {
    try {
      await requireAuth(request, dependencies.prisma);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const query = z
        .object({
          format: z.enum(["json", "csv"]).default("json")
        })
        .parse(request.query);
      const exported = await exportQuoteRequest(dependencies.prisma, params.id, query.format);

      return reply.type(exported.contentType).send(exported.body);
    } catch (error) {
      return sendRouteError(reply, error);
    }
  });

  app.post("/api/v1/quote-requests/:id/cancel", async (request, reply) => {
    try {
      const user = await requireAuth(request, dependencies.prisma);
      requireRole(user.role, canMutateQuote);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);

      return reply.send(
        await cancelQuoteRequest(dependencies.prisma, dependencies.publisher, user, params.id)
      );
    } catch (error) {
      return sendRouteError(reply, error);
    }
  });

  app.post("/api/v1/quote-requests/:id/carriers/:carrierId/retry", async (request, reply) => {
    try {
      const user = await requireAuth(request, dependencies.prisma);
      requireRole(user.role, canMutateQuote);
      const params = z
        .object({
          id: z.string().min(1),
          carrierId: z.string().min(1)
        })
        .parse(request.params);

      return reply
        .status(202)
        .send(
          await retryCarrierExecution(
            dependencies.prisma,
            dependencies.publisher,
            user,
            params.id,
            params.carrierId
          )
        );
    } catch (error) {
      return sendRouteError(reply, error);
    }
  });
};
