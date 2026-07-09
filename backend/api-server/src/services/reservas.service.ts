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

function escapeXml(value: unknown) {
  const normalized = value === null || value === undefined ? "" : String(value);
  return normalized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function buildCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[i] = value >>> 0;
  }
  return table;
}

const crc32Table = buildCrc32Table();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: Array<{ name: string; content: string | Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf8");
    const contentBuffer = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf8");
    const checksum = crc32(contentBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(contentBuffer.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, contentBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(contentBuffer.length, 20);
    centralHeader.writeUInt32LE(contentBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + contentBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endHeader = Buffer.alloc(22);
  endHeader.writeUInt32LE(0x06054b50, 0);
  endHeader.writeUInt16LE(0, 4);
  endHeader.writeUInt16LE(0, 6);
  endHeader.writeUInt16LE(files.length, 8);
  endHeader.writeUInt16LE(files.length, 10);
  endHeader.writeUInt32LE(centralDirectory.length, 12);
  endHeader.writeUInt32LE(offset, 16);
  endHeader.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endHeader]);
}

function buildXlsx(headers: string[], rows: Array<Array<{ value: unknown; type?: "text" | "number" }>>) {
  const sheetRows = [
    headers.map((header) => ({ value: header, type: "text" as const })),
    ...rows,
  ];
  const sheetData = sheetRows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
          if (cell.type === "number") {
            const numeric = Number(cell.value ?? 0);
            return `<c r="${ref}" s="${rowIndex === 0 ? 1 : 0}"><v>${Number.isFinite(numeric) ? numeric : 0}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr" s="${rowIndex === 0 ? 1 : 0}"><is><t>${escapeXml(cell.value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const columnWidths = headers
    .map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 15 ? 38 : 18}" customWidth="1"/>`)
    .join("");
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${columnWidths}</cols><sheetData>${sheetData}</sheetData></worksheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reservas" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF2800"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;

  return createZip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
    { name: "xl/styles.xml", content: styles },
  ]);
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

  const rows = reservas.map((reserva) => [
    { value: reserva.id, type: "text" as const },
    { value: formatDateTimeForReport(reserva.created_at), type: "text" as const },
    { value: reserva.cliente_nombre, type: "text" as const },
    { value: reserva.cliente_email, type: "text" as const },
    { value: reserva.cliente_telefono, type: "text" as const },
    { value: reserva.producto_nombre, type: "text" as const },
    { value: reserva.cantidad, type: "number" as const },
    { value: formatDateOnlyForReport(reserva.fecha_inicio), type: "text" as const },
    { value: formatDateOnlyForReport(reserva.fecha_fin), type: "text" as const },
    { value: reserva.tipo_tarifa, type: "text" as const },
    { value: reserva.unidades_tarifa, type: "number" as const },
    { value: Number(reserva.precio_unitario ?? 0).toFixed(2), type: "number" as const },
    { value: Number(reserva.descuento ?? 0).toFixed(2), type: "number" as const },
    { value: Number(reserva.total_estimado ?? 0).toFixed(2), type: "number" as const },
    { value: reserva.estado, type: "text" as const },
    { value: reserva.notas, type: "text" as const },
  ]);

  const content = buildXlsx(headers, rows);

  return {
    filename: `reporte-reservas-${desde}-a-${hasta}.xlsx`,
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
