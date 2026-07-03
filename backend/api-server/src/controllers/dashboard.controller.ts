import { Request, Response } from "express";
import * as service from "../services/dashboard.service";
import * as inventarioService from "../services/inventario.service";
import * as reservasService from "../services/reservas.service";

export async function resumen(_req: Request, res: Response): Promise<void> {
  try {
    const data = await service.getResumen();
    res.json({
      total_productos: data.totalProductos,
      total_reservas: data.totalReservas,
      reservas_pendientes: data.reservasPendientes,
      reservas_confirmadas: data.reservasConfirmadas,
      reservas_entregadas: data.reservasEntregadas,
      productos_agotados: data.productosAgotados,
      productos_pocas_unidades: data.productosPocasUnidades,
      total_usuarios: data.totalUsuarios,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function reservasRecientes(_req: Request, res: Response): Promise<void> {
  try {
    const data = await reservasService.getReservasRecientes();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function stockBajo(_req: Request, res: Response): Promise<void> {
  try {
    const data = await inventarioService.getStockBajo();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
