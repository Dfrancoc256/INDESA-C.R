import { Request, Response } from "express";
import * as service from "../services/categorias.service";

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.listCategorias(false);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.createCategoria(req.body);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.updateCategoria(Number(req.params["id"]), req.body);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await service.deleteCategoria(Number(req.params["id"]));
    res.json({ message: "Categoría desactivada" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
