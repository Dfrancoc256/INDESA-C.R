import { pgTable, serial, text, boolean, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriasTable } from "./categorias";

export const productosTable = pgTable("productos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  categoriaId: integer("categoria_id").references(() => categoriasTable.id),
  precio: decimal("precio", { precision: 10, scale: 2 }).notNull().default("0"),
  imagenUrl: text("imagen_url"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertProductoSchema = createInsertSchema(productosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProducto = z.infer<typeof insertProductoSchema>;
export type Producto = typeof productosTable.$inferSelect;
