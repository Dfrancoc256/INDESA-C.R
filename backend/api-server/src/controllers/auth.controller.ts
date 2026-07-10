import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { verifyAccessToken } from "../lib/jwt";

const ACCESS_COOKIE = "indesa_access_token";
const REFRESH_COOKIE = "indesa_refresh_token";

const isProduction = process.env["NODE_ENV"] === "production";

const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/api",
  maxAge: 15 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/api/auth/refresh",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setSessionCookies(res: Response, result: Awaited<ReturnType<typeof authService.login>>) {
  res.cookie(ACCESS_COOKIE, result.access_token, accessCookieOptions);
  res.cookie(REFRESH_COOKIE, result.refresh_token, refreshCookieOptions);
}

function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...accessCookieOptions, maxAge: undefined });
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined });
}

function getCookieAccessToken(req: Request) {
  return req.cookies?.[ACCESS_COOKIE] as string | undefined;
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    setSessionCookies(res, result);
    res.json({ expires_in: result.expires_in, usuario: result.usuario });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = getCookieAccessToken(req);
    if (token) {
      try {
        const usuario = verifyAccessToken(token);
        await authService.logout(usuario.sub);
      } catch {
        // Si el access token ya expiró, igual limpiamos la sesión del navegador.
      }
    }
    clearSessionCookies(res);
    res.json({ message: "Sesión cerrada correctamente" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const result = await authService.getMe(req.usuario!.sub, req.usuario!.roleId);
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const refresh_token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refresh_token;
    if (!refresh_token) {
      res.status(401).json({ error: "Sesión expirada" });
      return;
    }
    const result = await authService.refresh(refresh_token);
    setSessionCookies(res, result);
    res.json({ expires_in: result.expires_in, usuario: result.usuario });
  } catch (err: any) {
    clearSessionCookies(res);
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
