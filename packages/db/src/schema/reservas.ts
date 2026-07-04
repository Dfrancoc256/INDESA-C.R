import { date, pgTable, serial, text, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productosTable } from "./productos";

export const reservasTable = pgTable("reservas", {
  id: serial("id").primaryKey(),
  clienteNombre: text("cliente_nombre").notNull(),
  clienteEmail: text("cliente_email").notNull(),
  clienteTelefono: text("cliente_telefono").notNull(),
  productoId: integer("producto_id").notNull().references(() => productosTable.id),
  cantidad: integer("cantidad").notNull(),
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin").notNull(),
  diasReserva: integer("dias_reserva").notNull().default(1),
  tipoTarifa: text("tipo_tarifa").notNull().default("dia"),
  unidadesTarifa: integer("unidades_tarifa").notNull().default(1),
  precioUnitario: decimal("precio_unitario", { precision: 10, scale: 2 }).notNull().default("0"),
  totalEstimado: decimal("total_estimado", { precision: 12, scale: 2 }).notNull().default("0"),
  estado: text("estado").notNull().default("pendiente"),
  notas: text("notas"),
  whatsappEnviado: boolean("whatsapp_enviado").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertReservaSchema = createInsertSchema(reservasTable).omit({
  id: true, createdAt: true, updatedAt: true, whatsappEnviado: true,
});
export type InsertReserva = z.infer<typeof insertReservaSchema>;
export type Reserva = typeof reservasTable.$inferSelect;
