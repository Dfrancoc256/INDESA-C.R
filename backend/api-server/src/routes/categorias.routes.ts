import { Router } from "express";
import * as ctrl from "../controllers/categorias.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/",     ctrl.list);
router.post("/",    authMiddleware, requirePermiso("categorias.crear"), ctrl.create);
router.put("/:id",  authMiddleware, requirePermiso("categorias.editar"), ctrl.update);
router.delete("/:id", authMiddleware, requirePermiso("categorias.eliminar"), ctrl.remove);

export default router;
