import { Router } from "express";
import * as ctrl from "../controllers/inventario.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/",                            authMiddleware, requirePermiso("inventario.ver"),    ctrl.list);
router.get("/:productoId",                 authMiddleware, requirePermiso("inventario.ver"),    ctrl.getOne);
router.put("/:productoId",                 authMiddleware, requirePermiso("inventario.editar"), ctrl.update);
router.get("/:productoId/movimientos",     authMiddleware, requirePermiso("inventario.ver"),    ctrl.getMovimientos);

export default router;
