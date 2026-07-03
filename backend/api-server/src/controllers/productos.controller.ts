import { Request, Response } from "express";
import * as service from "../services/productos.service";

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { categoria_id, busqueda, disponibilidad, orden, page, limit } = req.query as Record<string, string>;
    const data = await service.listProductos({
      categoriaId: categoria_id ? Number(categoria_id) : undefined,
      busqueda,
      disponibilidad: disponibilidad as any,
      orden: orden as any,
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
    const data = await service.getProducto(Number(req.params["id"]));
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.createProducto(req.body);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.updateProducto(Number(req.params["id"]), req.body);
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await service.deleteProducto(Number(req.params["id"]));
    res.json({ message: "Producto dado de baja" });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}

export async function toggle(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.toggleProducto(Number(req.params["id"]));
    res.json(data);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
