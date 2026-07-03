import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriasTable = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertCategoriaSchema = createInsertSchema(categoriasTable).omit({ id: true, createdAt: true });
export type InsertCategoria = z.infer<typeof insertCategoriaSchema>;
export type Categoria = typeof categoriasTable.$inferSelect;
