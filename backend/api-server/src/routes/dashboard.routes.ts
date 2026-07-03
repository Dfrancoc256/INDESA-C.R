import { Router } from "express";
import * as ctrl from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/resumen",            authMiddleware, requirePermiso("dashboard.ver"), ctrl.resumen);
router.get("/reservas-recientes", authMiddleware, requirePermiso("dashboard.ver"), ctrl.reservasRecientes);
router.get("/stock-bajo",         authMiddleware, requirePermiso("dashboard.ver"), ctrl.stockBajo);

export default router;
