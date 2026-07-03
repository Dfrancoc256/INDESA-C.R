import { Request, Response } from "express";
import * as service from "../services/inventario.service";

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.listInventario();
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.getInventario(Number(req.params["productoId"]));
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { cantidad, stock_minimo, motivo } = req.body;
    const data = await service.updateInventario(
      Number(req.params["productoId"]),
      cantidad,
      motivo,
      stock_minimo,
      req.usuario?.sub
    );
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function getMovimientos(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.getMovimientos(Number(req.params["productoId"]));
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
