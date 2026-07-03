import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    await authService.logout(req.usuario!.sub);
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
    const { refresh_token } = req.body;
    const result = await authService.refresh(refresh_token);
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
