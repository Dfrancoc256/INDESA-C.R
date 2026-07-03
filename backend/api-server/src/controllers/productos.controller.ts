import { Request, Response } from "express";
import * as service from "../services/productos.service";
import { verifyAccessToken } from "../lib/jwt";

function hasValidAccessToken(req: Request): boolean {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) return false;

  try {
    verifyAccessToken(header.slice(7));
    return true;
  } catch {
    return false;
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { categoria_id, busqueda, disponibilidad, orden, page, limit, incluir_inactivos } = req.query as Record<string, string>;
    const params = {
      categoriaId: categoria_id ? Number(categoria_id) : undefined,
      busqueda,
      disponibilidad: disponibilidad as any,
      orden: orden as any,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };

    if (incluir_inactivos === "true") {
      if (!hasValidAccessToken(req)) {
        res.status(401).json({ error: "Token de acceso requerido" });
        return;
      }

      const data = await service.listProductosAdmin(params);
      res.json(data);
      return;
    }

    const data = await service.listProductos(params);
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
