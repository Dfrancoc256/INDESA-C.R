import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JwtPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["authorization"];
  const bearerToken = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = req.cookies?.["indesa_access_token"] as string | undefined;
  const token = bearerToken ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: "Token de acceso requerido" });
    return;
  }

  try {
    req.usuario = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}
