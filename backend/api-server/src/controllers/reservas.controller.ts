import { Request, Response } from "express";
import * as service from "../services/reservas.service";
import { verifyAccessToken } from "../lib/jwt";

function puedeSobrescribirPrecio(req: Request): boolean {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) return false;

  try {
    const payload = verifyAccessToken(header.slice(7));
    return payload.rolNombre === "admin";
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
      limit: limit ? Number(limit) : 20,
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
      allowPrecioOverride: puedeSobrescribirPrecio(req),
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
    const usuario = req.usuario;
    if (!usuario || usuario.rolNombre !== "admin") {
      res.status(403).json({ error: "Solo el administrador puede editar el precio de una reserva" });
      return;
    }

    const data = await service.updateReserva(Number(req.params["id"]), req.body);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function reporte(req: Request, res: Response): Promise<void> {
  try {
    const usuario = req.usuario;
    if (!usuario || usuario.rolNombre !== "admin") {
      res.status(403).json({ error: "Solo el administrador puede descargar reportes financieros" });
      return;
    }

    const { desde, hasta } = req.query as Record<string, string>;
    const reporte = await service.getReservasReporte({ desde, hasta });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${reporte.filename}"`);
    res.status(200).send(reporte.content);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ error: err.message });
  }
}
