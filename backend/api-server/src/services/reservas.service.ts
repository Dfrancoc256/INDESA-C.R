import * as repo from "../repositories/reservas.repository";
import * as inventarioRepo from "../repositories/inventario.repository";
import * as productosRepo from "../repositories/productos.repository";
import { notificarReservaPorWhatsApp } from "../lib/whatsapp";
import { logger } from "../lib/logger";

export async function listReservas(params: { estado?: string; page?: number; limit?: number }) {
  return repo.findAllReservas(params);
}

export async function getReserva(id: number) {
  const reserva = await repo.findReservaById(id);
  if (!reserva) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
  return reserva;
}

export async function createReserva(data: {
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  productoId: number;
  cantidad: number;
  notas?: string;
}) {
  // Verificar que el producto existe y está activo
  const producto = await productosRepo.findProductoById(data.productoId);
  if (!producto || !producto.activo) {
    throw Object.assign(new Error("Producto no disponible"), { status: 404 });
  }

  // Verificar stock suficiente (no decrementar aún — solo reservar)
  const inventario = await inventarioRepo.findInventarioByProducto(data.productoId);
  const stockActual = inventario?.cantidad ?? 0;
  if (stockActual < data.cantidad) {
    throw Object.assign(
      new Error(`Stock insuficiente. Disponible: ${stockActual}`),
      { status: 400 }
    );
  }

  const reserva = await repo.createReserva(data);

  // Notificar por WhatsApp de forma asíncrona (no bloquea la respuesta)
  notificarReservaPorWhatsApp({
    clienteNombre: data.clienteNombre,
    clienteEmail: data.clienteEmail,
    clienteTelefono: data.clienteTelefono,
    productoNombre: producto.nombre,
    cantidad: data.cantidad,
    reservaId: reserva.id,
  }).then(async (enviado) => {
    if (enviado) {
      await repo.marcarWhatsappEnviado(reserva.id);
    }
  }).catch((err) => logger.error({ err }, "Error asíncrono en notificación WhatsApp"));

  return repo.findReservaById(reserva.id);
}

export async function updateEstadoReserva(id: number, estado: string, notas?: string) {
  const reserva = await repo.findReservaById(id);
  if (!reserva) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });

  // Al confirmar reserva, decrementar stock
  if (estado === "confirmada" && reserva.estado === "pendiente") {
    const decrementado = await inventarioRepo.decrementarStock(reserva.productoId, reserva.cantidad);
    if (!decrementado) {
      throw Object.assign(new Error("Stock insuficiente para confirmar la reserva"), { status: 400 });
    }
    await inventarioRepo.createMovimiento({
      productoId: reserva.productoId,
      tipo: "salida",
      cantidad: reserva.cantidad,
      motivo: `Reserva #${id} confirmada`,
    });
  }

  // Al cancelar reserva confirmada, devolver stock
  if (estado === "cancelada" && reserva.estado === "confirmada") {
    const inv = await inventarioRepo.findInventarioByProducto(reserva.productoId);
    if (inv) {
      await inventarioRepo.upsertInventario(reserva.productoId, inv.cantidad + reserva.cantidad);
      await inventarioRepo.createMovimiento({
        productoId: reserva.productoId,
        tipo: "entrada",
        cantidad: reserva.cantidad,
        motivo: `Reserva #${id} cancelada — stock devuelto`,
      });
    }
  }

  return repo.updateReservaEstado(id, estado, notas);
}

export async function getReservasRecientes() {
  return repo.findReservasRecientes(10);
}
