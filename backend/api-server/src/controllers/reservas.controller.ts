import { Request, Response } from "express";
import * as service from "../services/reservas.service";

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
    const data = await service.createReserva(req.body);
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
