import { Request, Response } from "express";
import * as service from "../services/reservas.service";

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { estado, page, limit } = req.query as Record<string, string>;
    const data = await service.listReservas({
      estado,
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
    const data = await service.getReserva(Number(req.params["id"]));
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

export async function updateEstado(req: Request, res: Response): Promise<void> {
  try {
    const { estado, notas } = req.body;
    const data = await service.updateEstadoReserva(Number(req.params["id"]), estado, notas);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
