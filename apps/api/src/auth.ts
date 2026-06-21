import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { UserRole } from "@prisma/client";

const scrypt = promisify(scryptCallback);

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
};

const base64UrlEncode = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

const base64UrlJson = (input: unknown): string => base64UrlEncode(JSON.stringify(input));

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET ?? "development-only-secret";

  if (process.env.NODE_ENV === "production" && secret === "development-only-secret") {
    throw new Error("JWT_SECRET must be configured in production");
  }

  return secret;
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString("base64url")}`;
};

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [algorithm, salt, hash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const createAccessToken = (
  user: AuthUser,
  options: { now?: Date; ttlSeconds?: number } = {}
): string => {
  const now = options.now ?? new Date();
  const ttlSeconds = options.ttlSeconds ?? 60 * 60;
  const header = { alg: "HS256", typ: "JWT" };
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(now.getTime() / 1000) + ttlSeconds
  };
  const unsignedToken = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = createHmac("sha256", getJwtSecret()).update(unsignedToken).digest("base64url");

  return `${unsignedToken}.${signature}`;
};

export const verifyAccessToken = (token: string, now = new Date()): TokenPayload | null => {
  const [encodedHeader, encodedPayload, signature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", getJwtSecret())
    .update(unsignedToken)
    .digest("base64url");

  if (
    expectedSignature.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as TokenPayload;

  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    return null;
  }

  return payload;
};

export const canCreateQuote = (role: UserRole): boolean => role === "ADMIN" || role === "OPERATOR";

export const canMutateQuote = (role: UserRole): boolean => role === "ADMIN" || role === "OPERATOR";
