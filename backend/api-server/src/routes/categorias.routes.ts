import { Router } from "express";
import * as ctrl from "../controllers/categorias.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/",     ctrl.list);
router.post("/",    authMiddleware, requirePermiso("productos.crear"), ctrl.create);
router.put("/:id",  authMiddleware, requirePermiso("productos.editar"), ctrl.update);
router.delete("/:id", authMiddleware, requirePermiso("productos.eliminar"), ctrl.remove);

export default router;
