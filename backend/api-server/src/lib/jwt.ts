import jwt from "jsonwebtoken";
import crypto from "node:crypto";

function getSecret(): string {
  const secret = process.env["JWT_SECRET"] ?? "dev-secret-change-me";
  if (secret === "dev-secret-change-me" && process.env["NODE_ENV"] === "production") {
    throw new Error("JWT_SECRET debe configurarse en produccion.");
  }
  return secret;
}
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES_DAYS = 7;

export interface JwtPayload {
  sub: number;       // usuario id
  email: string;
  roleId: number;
  rolNombre: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: ACCESS_EXPIRES, algorithm: "HS256" });
}

export function signRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret(), { algorithms: ["HS256"] }) as unknown as JwtPayload;
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRES_DAYS);
  return d;
}
