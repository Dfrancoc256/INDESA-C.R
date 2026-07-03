import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productosTable } from "./productos";
import { usuariosTable } from "./usuarios";

export const movimientosTable = pgTable("movimientos_inventario", {
  id: serial("id").primaryKey(),
  productoId: integer("producto_id").notNull().references(() => productosTable.id),
  tipo: text("tipo").notNull(), // 'entrada' | 'salida' | 'ajuste'
  cantidad: integer("cantidad").notNull(),
  motivo: text("motivo"),
  usuarioId: integer("usuario_id").references(() => usuariosTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertMovimientoSchema = createInsertSchema(movimientosTable).omit({ id: true, createdAt: true });
export type InsertMovimiento = z.infer<typeof insertMovimientoSchema>;
export type Movimiento = typeof movimientosTable.$inferSelect;
