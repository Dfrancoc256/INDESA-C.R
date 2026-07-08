import * as repo from "../repositories/reservas.repository";
import * as inventarioRepo from "../repositories/inventario.repository";
import * as productosRepo from "../repositories/productos.repository";
import { notificarReservaPorWhatsApp } from "../lib/whatsapp";
import { notificarReservaPorCorreo } from "../lib/email";
import { logger } from "../lib/logger";

type TipoTarifa = "dia" | "semana" | "mes" | "base";

type ReservaInput = {
  clienteNombre?: string;
  cliente_nombre?: string;
  clienteEmail?: string;
  cliente_email?: string;
  clienteTelefono?: string;
  cliente_telefono?: string;
  productoId?: number;
  producto_id?: number;
  cantidad?: number;
  fechaInicio?: string;
  fecha_inicio?: string;
  fechaFin?: string;
  fecha_fin?: string;
  diasReserva?: number;
  dias_reserva?: number;
  tipoTarifa?: TipoTarifa;
  tipo_tarifa?: TipoTarifa;
  unidadesTarifa?: number;
  unidades_tarifa?: number;
  notas?: string;
};

type NormalizedReservaInput = {
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  productoId: number;
  cantidad: number;
  fechaInicio: string;
  fechaFin: string;
  diasReserva: number;
  tipoTarifa: TipoTarifa;
  unidadesTarifaSolicitada?: number;
  notas?: string;
};

function toDateOnly(value: string | undefined, fieldName: string): string {
  if (!value) {
    throw Object.assign(new Error(`${fieldName} es obligatorio`), { status: 400 });
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`${fieldName} no es una fecha válida`), { status: 400 });
  }

  return value.slice(0, 10);
}

function calcularDiasReserva(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  const diffMs = fin.getTime() - inicio.getTime();

  if (diffMs < 0) {
    throw Object.assign(new Error("La fecha final no puede ser anterior a la fecha inicial"), { status: 400 });
  }

  return Math.floor(diffMs / 86_400_000) + 1;
}

function normalizeTipoTarifa(value: string | undefined): TipoTarifa {
  if (value === "semana" || value === "mes" || value === "base") return value;
  return "dia";
}

function toPositiveInteger(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw Object.assign(new Error(`${fieldName} debe ser un número válido`), { status: 400 });
  }

  return parsed;
}

function normalizeReservaInput(data: ReservaInput): NormalizedReservaInput {
  const fechaInicio = toDateOnly(data.fechaInicio ?? data.fecha_inicio, "fecha_inicio");
  const fechaFin = toDateOnly(data.fechaFin ?? data.fecha_fin, "fecha_fin");
  const diasReserva = calcularDiasReserva(fechaInicio, fechaFin);
  const clienteNombre = data.clienteNombre ?? data.cliente_nombre;
  const clienteEmail = data.clienteEmail ?? data.cliente_email;
  const clienteTelefono = data.clienteTelefono ?? data.cliente_telefono;
  const tipoTarifa = normalizeTipoTarifa(data.tipoTarifa ?? data.tipo_tarifa);
  const unidadesTarifaSolicitada = data.unidadesTarifa ?? data.unidades_tarifa;

  if (!clienteNombre || !clienteEmail || !clienteTelefono) {
    throw Object.assign(new Error("Datos incompletos para registrar la reserva"), { status: 400 });
  }

  return {
    clienteNombre,
    clienteEmail,
    clienteTelefono,
    productoId: toPositiveInteger(data.productoId ?? data.producto_id, "producto_id"),
    cantidad: toPositiveInteger(data.cantidad, "cantidad"),
    fechaInicio,
    fechaFin,
    diasReserva,
    tipoTarifa,
    unidadesTarifaSolicitada: unidadesTarifaSolicitada === undefined
      ? undefined
      : toPositiveInteger(unidadesTarifaSolicitada, "unidades_tarifa"),
    notas: data.notas,
  };
}

function calcularTarifaReserva(producto: any, data: NormalizedReservaInput) {
  const precioBase = Number(producto.precio ?? 0);
  const tarifas: Record<TipoTarifa, number> = {
    dia: Number(producto.precio_dia ?? precioBase),
    semana: Number(producto.precio_semana ?? 0),
    mes: Number(producto.precio_mes ?? 0),
    base: precioBase,
  };

  const precioUnitario = tarifas[data.tipoTarifa];
  if (!precioUnitario || precioUnitario <= 0) {
    throw Object.assign(new Error("El producto no tiene configurada esa tarifa"), { status: 400 });
  }

  const unidadesTarifa = data.tipoTarifa === "dia"
    ? data.diasReserva
    : Math.max(1, Number(data.unidadesTarifaSolicitada ?? 1));
  const totalEstimado = precioUnitario * unidadesTarifa * data.cantidad;

  return {
    tipoTarifa: data.tipoTarifa,
    unidadesTarifa,
    precioUnitario,
    totalEstimado,
  };
}

export async function listReservas(params: { estado?: string; busqueda?: string; page?: number; limit?: number }) {
  return repo.findAllReservas(params);
}

export async function getReserva(id: number) {
  const reserva = await repo.findReservaById(id);
  if (!reserva) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
  return reserva;
}

export async function getReservaDetalle(id: number) {
  const reserva = await repo.findReservaDetalleById(id);
  if (!reserva) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
  return reserva;
}

export async function createReserva(input: ReservaInput) {
  const data = normalizeReservaInput(input);

  // Verificar que el producto existe y está activo
  const producto = await productosRepo.findProductoById(data.productoId);
  if (!producto) {
    throw Object.assign(new Error("Producto no encontrado. Actualice el catálogo e intente nuevamente."), { status: 404 });
  }

  if (producto.activo === false) {
    throw Object.assign(new Error("Este producto está desactivado para reservas."), { status: 409 });
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

  const tarifa = calcularTarifaReserva(producto, data);
  const payload = {
    clienteNombre: data.clienteNombre,
    clienteEmail: data.clienteEmail,
    clienteTelefono: data.clienteTelefono,
    productoId: data.productoId,
    cantidad: data.cantidad,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    diasReserva: data.diasReserva,
    tipoTarifa: tarifa.tipoTarifa,
    unidadesTarifa: tarifa.unidadesTarifa,
    precioUnitario: String(tarifa.precioUnitario),
    totalEstimado: String(tarifa.totalEstimado),
    notas: data.notas?.trim() ? data.notas.trim() : undefined,
  };
  const reserva = await repo.createReserva(payload);

  // Notificar por WhatsApp de forma asíncrona (no bloquea la respuesta)
  notificarReservaPorWhatsApp({
    clienteNombre: data.clienteNombre,
    clienteEmail: data.clienteEmail,
    clienteTelefono: data.clienteTelefono,
    productoNombre: producto.nombre,
    cantidad: data.cantidad,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    diasReserva: data.diasReserva,
    tipoTarifa: tarifa.tipoTarifa,
    unidadesTarifa: tarifa.unidadesTarifa,
    precioUnitario: tarifa.precioUnitario,
    totalEstimado: tarifa.totalEstimado,
    reservaId: reserva.id,
  }).then(async (enviado) => {
    if (enviado) {
      await repo.marcarWhatsappEnviado(reserva.id);
    }
  }).catch((err) => logger.error({ err }, "Error asíncrono en notificación WhatsApp"));

  void notificarReservaPorCorreo({
    reservaId: reserva.id,
    clienteNombre: data.clienteNombre,
    clienteEmail: data.clienteEmail,
    clienteTelefono: data.clienteTelefono,
    productoNombre: producto.nombre,
    cantidad: data.cantidad,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    diasReserva: data.diasReserva,
    tipoTarifa: tarifa.tipoTarifa,
    unidadesTarifa: tarifa.unidadesTarifa,
    precioUnitario: tarifa.precioUnitario,
    totalEstimado: tarifa.totalEstimado,
    notas: data.notas,
  }).catch((err) => logger.error({ err }, "Error asíncrono en notificación de correo"));

  return repo.findReservaById(reserva.id);
}

export async function updateEstadoReserva(id: number, estado: string, notas?: string) {
  const reserva = await repo.findReservaById(id);
  if (!reserva) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });

  // Al confirmar reserva, decrementar stock
  if (estado === "confirmada" && reserva.estado === "pendiente") {
    const decrementado = await inventarioRepo.decrementarStock(reserva.producto_id, reserva.cantidad);
    if (!decrementado) {
      throw Object.assign(new Error("Stock insuficiente para confirmar la reserva"), { status: 400 });
    }
    await inventarioRepo.createMovimiento({
      productoId: reserva.producto_id,
      tipo: "salida",
      cantidad: reserva.cantidad,
      motivo: `Reserva #${id} confirmada`,
    });
  }

  // Al cancelar reserva confirmada, devolver stock
  if (estado === "cancelada" && reserva.estado === "confirmada") {
    const inv = await inventarioRepo.findInventarioByProducto(reserva.producto_id);
    if (inv) {
      await inventarioRepo.upsertInventario(reserva.producto_id, inv.cantidad + reserva.cantidad);
      await inventarioRepo.createMovimiento({
        productoId: reserva.producto_id,
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
