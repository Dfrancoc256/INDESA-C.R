import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
  permisos: text("permisos").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertRolSchema = createInsertSchema(rolesTable).omit({ id: true, createdAt: true });
export type InsertRol = z.infer<typeof insertRolSchema>;
export type Rol = typeof rolesTable.$inferSelect;
