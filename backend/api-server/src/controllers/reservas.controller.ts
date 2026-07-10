import { Request, Response } from "express";
import * as service from "../services/reservas.service";
import { verifyAccessToken } from "../lib/jwt";
import { db, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function puedeSobrescribirPrecio(req: Request): Promise<boolean> {
  const header = req.headers["authorization"];
  const bearerToken = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = req.cookies?.["indesa_access_token"] as string | undefined;
  const token = bearerToken ?? cookieToken;

  if (!token) return false;

  try {
    const payload = verifyAccessToken(token);
    if (payload.rolNombre === "admin") return true;

    const roles = await db
      .select({ permisos: rolesTable.permisos })
      .from(rolesTable)
      .where(eq(rolesTable.id, payload.roleId))
      .limit(1);

    return Boolean(roles[0]?.permisos?.includes("reservas.editar"));
  } catch {
    return false;
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { estado, busqueda, page, limit } = req.query as Record<string, string>;
    const data = await service.listReservas({
      estado,
      busqueda,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.getReservaDetalle(Number(req.params["id"]));
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.createReserva(req.body, {
      allowPrecioOverride: await puedeSobrescribirPrecio(req),
    });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ error: err.message });
  }
}

export async function disponibilidad(req: Request, res: Response): Promise<void> {
  try {
    const { productoId, fechaInicio, fechaFin, cantidad } = req.query as Record<string, string>;
    const data = await service.getDisponibilidadReserva({
      productoId: Number(productoId),
      fechaInicio,
      fechaFin,
      cantidad: cantidad ? Number(cantidad) : 1,
    });
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ error: err.message });
  }
}

export async function calendarioDisponibilidad(req: Request, res: Response): Promise<void> {
  try {
    const { productoId, desde, hasta } = req.query as Record<string, string>;
    const data = await service.getCalendarioDisponibilidad({
      productoId: Number(productoId),
      desde,
      hasta,
    });
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ error: err.message });
  }
}

export async function updateEstado(req: Request, res: Response): Promise<void> {
  try {
    const { estado, notas } = req.body;
    const data = await service.updateEstadoReserva(Number(req.params["id"]), estado, notas);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.updateReserva(Number(req.params["id"]), req.body);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function updatePago(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.updatePagoReserva(Number(req.params["id"]), req.body);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function reporte(req: Request, res: Response): Promise<void> {
  try {
    const { desde, hasta } = req.query as Record<string, string>;
    const reporte = await service.getReservasReporte({ desde, hasta });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${reporte.filename}"`);
    res.status(200).send(reporte.content);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ error: err.message });
  }
}
