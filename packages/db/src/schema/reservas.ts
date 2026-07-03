import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
