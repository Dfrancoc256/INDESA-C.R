import { Request, Response } from "express";
import * as service from "../services/usuarios.service";
import { logger } from "../lib/logger";

function getDbErrorCode(err: any): string | undefined {
  const candidates = [err, err?.cause, err?.cause?.cause, err?.original, err?.original?.cause];
  for (const candidate of candidates) {
    const code = candidate?.code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function getErrorChain(err: any): Array<{ name?: string; message?: string; code?: string; stack?: string }> {
  const chain: Array<{ name?: string; message?: string; code?: string; stack?: string }> = [];
  const seen = new Set<any>();
  let current = err;

  while (current && !seen.has(current) && chain.length < 5) {
    seen.add(current);
    chain.push({
      name: current.name,
      message: current.message,
      code: current.code,
      stack: current.stack,
    });
    current = current.cause ?? current.original;
  }

  return chain;
}

function reportControllerError(req: Request, err: any, fallbackMessage: string) {
  const code = getDbErrorCode(err);
  logger.error(
    {
      route: req.originalUrl,
      method: req.method,
      code,
      params: req.params,
      body: {
        ...req.body,
        password: req.body?.password ? "[REDACTED]" : undefined,
        nueva_password: req.body?.nueva_password ? "[REDACTED]" : undefined,
      },
      errorChain: getErrorChain(err),
    },
    fallbackMessage,
  );
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.listUsuarios();
    res.json(data);
  } catch (err: any) {
    reportControllerError(req, err, "Error listando usuarios");
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const roleId = Number(req.body.role_id ?? req.body.roleId);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      res.status(400).json({ error: "Debe seleccionar un rol válido" });
      return;
    }
    const data = await service.createUsuario({
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      email: req.body.email,
      password: req.body.password,
      roleId,
    });
    res.status(201).json(data);
  } catch (err: any) {
    reportControllerError(req, err, "Error creando usuario");
    const code = getDbErrorCode(err);
    if (code === "23505") {
      res.status(409).json({ error: "Ya existe un usuario con ese correo electrónico" });
      return;
    }
    if (code === "23503") {
      res.status(400).json({ error: "El rol seleccionado no existe" });
      return;
    }
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const roleId = req.body.role_id !== undefined ? Number(req.body.role_id) : req.body.roleId !== undefined ? Number(req.body.roleId) : undefined;
    const data = await service.updateUsuario(Number(req.params["id"]), {
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      email: req.body.email,
      roleId,
    });
    res.json(data);
  } catch (err: any) {
    reportControllerError(req, err, "Error actualizando usuario");
    const code = getDbErrorCode(err);
    if (code === "23505") {
      res.status(409).json({ error: "Ya existe un usuario con ese correo electrónico" });
      return;
    }
    if (code === "23503") {
      res.status(400).json({ error: "El rol seleccionado no existe" });
      return;
    }
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await service.deleteUsuario(Number(req.params["id"]));
    res.json({ message: "Usuario eliminado" });
  } catch (err: any) {
    reportControllerError(req, err, "Error eliminando usuario");
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function toggle(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.toggleUsuario(Number(req.params["id"]));
    res.json(data);
  } catch (err: any) {
    reportControllerError(req, err, "Error cambiando estado de usuario");
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    await service.resetPassword(Number(req.params["id"]), req.body.nueva_password);
    res.json({ message: "Contraseña restablecida correctamente" });
  } catch (err: any) {
    reportControllerError(req, err, "Error restableciendo contraseña");
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
