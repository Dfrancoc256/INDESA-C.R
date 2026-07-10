/**
 * Middleware RBAC.
 * Admin accede a todo; el resto de roles se valida contra permisos de base de datos.
 */
import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export function requirePermiso(permiso: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const usuario = req.usuario;
    if (!usuario) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    try {
      if (usuario.rolNombre === "admin") {
        next();
        return;
      }

      // Consultar permisos del rol DESDE LA BASE DE DATOS en cada petición.
      const roles = await db
        .select({ permisos: rolesTable.permisos })
        .from(rolesTable)
        .where(eq(rolesTable.id, usuario.roleId))
        .limit(1);

      if (!roles.length) {
        res.status(403).json({ error: "Rol no encontrado" });
        return;
      }

      const permisos: string[] = roles[0].permisos ?? [];

      if (!permisos.includes(permiso)) {
        res.status(403).json({ error: `Permiso requerido: ${permiso}` });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, "Error verificando permisos desde BD");
      res.status(500).json({ error: "Error interno verificando permisos" });
    }
  };
}
