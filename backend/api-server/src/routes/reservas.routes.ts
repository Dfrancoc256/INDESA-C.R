import { Router } from "express";
import * as ctrl from "../controllers/reservas.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";
import { reservasRateLimit } from "../middlewares/rate-limit.middleware";

const router = Router();

// Pública: crear reserva
router.post("/",               reservasRateLimit, ctrl.create);
router.get("/disponibilidad",   ctrl.disponibilidad);

// Protegidas
router.get("/",                authMiddleware, requirePermiso("reservas.ver"),    ctrl.list);
router.get("/:id",             authMiddleware, requirePermiso("reservas.ver"),    ctrl.getOne);
router.patch("/:id/estado",    authMiddleware, requirePermiso("reservas.editar"), ctrl.updateEstado);

export default router;
