import { Router } from "express";
import * as ctrl from "../controllers/roles.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, ctrl.list);

export default router;
