import { Router } from "express";
import * as ctrl from "../controllers/usuarios.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/",                authMiddleware, requirePermiso("usuarios.ver"),      ctrl.list);
router.post("/",               authMiddleware, requirePermiso("usuarios.crear"),    ctrl.create);
router.put("/:id",             authMiddleware, requirePermiso("usuarios.editar"),   ctrl.update);
router.delete("/:id",          authMiddleware, requirePermiso("usuarios.eliminar"), ctrl.remove);
router.patch("/:id/toggle",    authMiddleware, requirePermiso("usuarios.editar"),   ctrl.toggle);
router.put("/:id/password",    authMiddleware, requirePermiso("usuarios.editar"),   ctrl.resetPassword);

export default router;
