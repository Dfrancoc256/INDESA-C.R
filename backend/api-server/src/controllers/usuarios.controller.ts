import { Request, Response } from "express";
import * as service from "../services/usuarios.service";

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.listUsuarios();
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.createUsuario(req.body);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.updateUsuario(Number(req.params["id"]), req.body);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await service.deleteUsuario(Number(req.params["id"]));
    res.json({ message: "Usuario eliminado" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function toggle(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.toggleUsuario(Number(req.params["id"]));
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    await service.resetPassword(Number(req.params["id"]), req.body.nueva_password);
    res.json({ message: "Contraseña restablecida correctamente" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
