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
  precioUnitario?: number | string;
  precio_unitario?: number | string;
  descuento?: number | string;
  totalEstimado?: number | string;
  total_estimado?: number | string;
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
  precioUnitarioManual?: number;
  descuento?: number;
  totalEstimadoManual?: number;
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

function toNonNegativeNumber(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
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
    precioUnitarioManual: data.precioUnitario === undefined && data.precio_unitario === undefined
      ? undefined
      : toNonNegativeNumber(data.precioUnitario ?? data.precio_unitario, "precio_unitario"),
    descuento: data.descuento === undefined
      ? 0
      : toNonNegativeNumber(data.descuento, "descuento"),
    totalEstimadoManual: data.totalEstimado === undefined && data.total_estimado === undefined
      ? undefined
      : toNonNegativeNumber(data.totalEstimado ?? data.total_estimado, "total_estimado"),
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

export async function getDisponibilidadReserva(input: {
  productoId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  cantidad?: number;
}) {
  const productoId = Number(input.productoId);
  if (!Number.isInteger(productoId) || productoId < 1) {
    throw Object.assign(new Error("productoId es obligatorio"), { status: 400 });
  }

  const fechaInicio = toDateOnly(input.fechaInicio, "fechaInicio");
  const fechaFin = toDateOnly(input.fechaFin, "fechaFin");
  const cantidadSolicitada = Math.max(1, Number(input.cantidad) || 1);

  const producto = await productosRepo.findProductoById(productoId);
  if (!producto) {
    throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
  }

  const inventario = await inventarioRepo.findInventarioByProducto(productoId);
  const stockActual = inventario?.cantidad ?? 0;
  const stockComprometido = await repo.getReservaStockComprometido({
    productoId,
    fechaInicio,
    fechaFin,
  });
  const stockDisponible = Math.max(0, stockActual - stockComprometido);

  return {
    productoId,
    fechaInicio,
    fechaFin,
    cantidadSolicitada,
    stockActual,
    stockComprometido,
    stockDisponible,
    permitido: stockDisponible >= cantidadSolicitada,
  };
}

function addDaysISO(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export async function getCalendarioDisponibilidad(input: {
  productoId?: number;
  desde?: string;
  hasta?: string;
}) {
  const productoId = Number(input.productoId);
  if (!Number.isInteger(productoId) || productoId < 1) {
    throw Object.assign(new Error("productoId es obligatorio"), { status: 400 });
  }

  const desde = toDateOnly(input.desde, "desde");
  const hasta = toDateOnly(input.hasta, "hasta");

  if (new Date(`${hasta}T00:00:00`).getTime() < new Date(`${desde}T00:00:00`).getTime()) {
    throw Object.assign(new Error("La fecha final no puede ser anterior a la fecha inicial"), { status: 400 });
  }

  const producto = await productosRepo.findProductoById(productoId);
  if (!producto) {
    throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
  }

  const inventario = await inventarioRepo.findInventarioByProducto(productoId);
  const stockActual = inventario?.cantidad ?? 0;
  const reservasComprometidas = await repo.findReservasComprometidasPorProducto({
    productoId,
    fechaInicio: desde,
    fechaFin: hasta,
  });

  const fechasBloqueadas: string[] = [];
  const totalDias = Math.max(1, calcularDiasReserva(desde, hasta));

  for (let i = 0; i < totalDias; i += 1) {
    const fechaActual = addDaysISO(desde, i);
    const comprometidas = reservasComprometidas
      .filter((reserva) => reserva.fecha_inicio <= fechaActual && reserva.fecha_fin >= fechaActual)
      .reduce((total, reserva) => total + Number(reserva.cantidad ?? 0), 0);

    if (comprometidas >= stockActual) {
      fechasBloqueadas.push(fechaActual);
    }
  }

  return {
    productoId,
    desde,
    hasta,
    stockActual,
    fechasBloqueadas,
  };
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

function toEndOfDayISO(value: string | undefined, fieldName: string): string {
  const date = toDateOnly(value, fieldName);
  return `${date}T23:59:59.999`;
}

export async function updateReserva(id: number, input: Partial<{
  notas: string;
  precioUnitario: number | string;
  descuento: number | string;
  totalEstimado: number | string;
}>) {
  const reserva = await repo.findReservaById(id);
  if (!reserva) {
    throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (input.notas !== undefined) {
    updateData.notas = input.notas?.trim() || null;
  }

  if (input.precioUnitario !== undefined || input.descuento !== undefined || input.totalEstimado !== undefined) {
    const precioUnitario = input.precioUnitario !== undefined
      ? Number(input.precioUnitario)
      : Number(reserva.precio_unitario ?? 0);
    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
      throw Object.assign(new Error("El precio unitario debe ser un número válido"), { status: 400 });
    }

    const descuento = input.descuento !== undefined
      ? Number(input.descuento)
      : Number(reserva.descuento ?? 0);
    if (!Number.isFinite(descuento) || descuento < 0) {
      throw Object.assign(new Error("El descuento debe ser un número válido"), { status: 400 });
    }

    const subtotal = precioUnitario * Number(reserva.unidades_tarifa ?? 1) * Number(reserva.cantidad ?? 1);
    const totalEstimado = input.totalEstimado !== undefined
      ? Number(input.totalEstimado)
      : Math.max(0, subtotal - descuento);
    if (!Number.isFinite(totalEstimado) || totalEstimado < 0) {
      throw Object.assign(new Error("El total estimado debe ser un número válido"), { status: 400 });
    }

    updateData.precioUnitario = precioUnitario;
    updateData.descuento = descuento;
    updateData.totalEstimado = totalEstimado;
  }

  if (Object.keys(updateData).length === 0) {
    throw Object.assign(new Error("No hay datos para actualizar"), { status: 400 });
  }

  const actualizado = await repo.updateReserva(id, updateData);
  if (!actualizado) throw Object.assign(new Error("Reserva no encontrada"), { status: 404 });
  return actualizado;
}

export async function getReservasReporte(input: { desde?: string; hasta?: string }) {
  const desde = toDateOnly(input.desde, "desde");
  const hasta = toDateOnly(input.hasta, "hasta");

  if (new Date(`${hasta}T00:00:00`).getTime() < new Date(`${desde}T00:00:00`).getTime()) {
    throw Object.assign(new Error("La fecha final no puede ser anterior a la fecha inicial"), { status: 400 });
  }

  const reservas = await repo.findReservasParaReporte({ desde, hasta });

  const escapeHtml = (value: unknown) => {
    const normalized = value === null || value === undefined ? "" : String(value);
    return normalized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const formatDateOnlyForReport = (value: unknown) => {
    if (!value) return "";
    const normalized = String(value).slice(0, 10);
    const date = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Guatemala",
    }).format(date);
  };

  const formatDateTimeForReport = (value: unknown) => {
    if (!value) return "";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Guatemala",
    }).format(date);
  };

  const cell = (value: unknown, kind: "text" | "number" = "text") => {
    const style = kind === "number"
      ? ' style="mso-number-format:\'0.00\';"'
      : ' style="mso-number-format:\'@\';"';
    return `<td${style}>${escapeHtml(value)}</td>`;
  };

  const headers = [
    "ID",
    "Fecha Registro",
    "Cliente",
    "Correo",
    "Teléfono",
    "Producto",
    "Cantidad",
    "Fecha Inicio",
    "Fecha Fin",
    "Tarifa",
    "Unidades Tarifa",
    "Precio Unitario",
    "Descuento",
    "Total Estimado",
    "Estado",
    "Notas",
  ];

  const headerRow = headers
    .map((header) => `<th style="background:#FF2800;color:#ffffff;font-weight:bold;">${escapeHtml(header)}</th>`)
    .join("");

  const rows = reservas.map((reserva) => [
    cell(reserva.id),
    cell(formatDateTimeForReport(reserva.created_at)),
    cell(reserva.cliente_nombre),
    cell(reserva.cliente_email),
    cell(reserva.cliente_telefono),
    cell(reserva.producto_nombre),
    cell(reserva.cantidad, "number"),
    cell(formatDateOnlyForReport(reserva.fecha_inicio)),
    cell(formatDateOnlyForReport(reserva.fecha_fin)),
    cell(reserva.tipo_tarifa),
    cell(reserva.unidades_tarifa, "number"),
    cell(Number(reserva.precio_unitario ?? 0).toFixed(2), "number"),
    cell(Number(reserva.descuento ?? 0).toFixed(2), "number"),
    cell(Number(reserva.total_estimado ?? 0).toFixed(2), "number"),
    cell(reserva.estado),
    cell(reserva.notas),
  ].join("")).map((row) => `<tr>${row}</tr>`);

  const content = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
      th, td { border: 1px solid #d9d9d9; padding: 6px 8px; vertical-align: top; }
    </style>
  </head>
  <body>
    <table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  </body>
</html>`;

  return {
    filename: `reporte-reservas-${desde}-a-${hasta}.xls`,
    content,
  };
}

export async function createReserva(input: ReservaInput, options?: { allowPrecioOverride?: boolean }) {
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
  const stockComprometido = await repo.getReservaStockComprometido({
    productoId: data.productoId,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
  });
  const stockDisponible = Math.max(0, stockActual - stockComprometido);

  if (stockDisponible < data.cantidad) {
    throw Object.assign(
      new Error(`Stock insuficiente para las fechas seleccionadas. Disponible: ${stockDisponible}`),
      { status: 400 }
    );
  }

  const tarifa = calcularTarifaReserva(producto, data);
  const precioUnitario = options?.allowPrecioOverride && data.precioUnitarioManual !== undefined
    ? data.precioUnitarioManual
    : tarifa.precioUnitario;
  const descuento = options?.allowPrecioOverride ? Number(data.descuento ?? 0) : 0;
  const totalEstimado = options?.allowPrecioOverride && data.totalEstimadoManual !== undefined
    ? data.totalEstimadoManual
    : Math.max(0, (precioUnitario * tarifa.unidadesTarifa * data.cantidad) - descuento);
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
    precioUnitario: String(precioUnitario),
    descuento: String(descuento),
    totalEstimado: String(totalEstimado),
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
    precioUnitario,
    totalEstimado,
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
    precioUnitario,
    totalEstimado,
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
