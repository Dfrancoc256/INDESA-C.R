import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productosTable } from "./productos";
import { sql } from "drizzle-orm";

export const inventarioTable = pgTable("inventario", {
  id: serial("id").primaryKey(),
  productoId: integer("producto_id").notNull().unique().references(() => productosTable.id, { onDelete: "cascade" }),
  cantidad: integer("cantidad").notNull().default(0),
  stockMinimo: integer("stock_minimo").notNull().default(5),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertInventarioSchema = createInsertSchema(inventarioTable).omit({ id: true, updatedAt: true });
export type InsertInventario = z.infer<typeof insertInventarioSchema>;
export type Inventario = typeof inventarioTable.$inferSelect;
