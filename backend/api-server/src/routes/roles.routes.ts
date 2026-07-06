import { Router } from "express";
import * as ctrl from "../controllers/roles.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermiso } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/", authMiddleware, requirePermiso("roles.ver"), ctrl.list);

export default router;
