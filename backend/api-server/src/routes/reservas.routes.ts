import { Router, raw } from "express";
import * as ctrl from "../controllers/reservas.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";
import { reservasRateLimit } from "../middlewares/rate-limit.middleware";

const router = Router();

// Pública: crear reserva
router.post("/",               reservasRateLimit, ctrl.create);
router.get("/disponibilidad",   ctrl.disponibilidad);
router.get("/calendario-disponibilidad", ctrl.calendarioDisponibilidad);

// Protegidas
router.get("/",                authMiddleware, requirePermiso("reservas.ver"),    ctrl.list);
router.get("/reporte",         authMiddleware, requirePermiso("finanzas.ver"),    ctrl.reporte);
router.get("/:id",             authMiddleware, requirePermiso("reservas.ver"),    ctrl.getOne);
router.patch("/:id",           authMiddleware, requirePermiso("reservas.editar"), ctrl.update);
router.patch("/:id/estado",    authMiddleware, requirePermiso("reservas.cambiar_estado"), ctrl.updateEstado);
router.patch("/:id/pago",      authMiddleware, requirePermiso("reservas.cambiar_estado"), ctrl.updatePago);
router.post(
  "/:id/pago/comprobante",
  authMiddleware,
  requirePermiso("reservas.cambiar_estado"),
  raw({ type: "*/*", limit: process.env["PAYMENT_PROOF_MAX_SIZE"] ?? "50mb" }),
  ctrl.uploadComprobantePago,
);
router.get("/:id/pago/comprobante", authMiddleware, requirePermiso("reservas.ver"), ctrl.downloadComprobantePago);

export default router;
