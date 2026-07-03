import { Router } from "express";
import * as ctrl from "../controllers/productos.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";

const router = Router();

// Rutas públicas
router.get("/",       ctrl.list);
router.get("/:id",    ctrl.getOne);

// Rutas protegidas (admin)
router.post("/",            authMiddleware, requirePermiso("productos.crear"),   ctrl.create);
router.put("/:id",          authMiddleware, requirePermiso("productos.editar"),  ctrl.update);
router.delete("/:id",       authMiddleware, requirePermiso("productos.eliminar"), ctrl.remove);
router.patch("/:id/toggle", authMiddleware, requirePermiso("productos.editar"),  ctrl.toggle);

export default router;
