import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { loginRateLimit } from "../middlewares/rate-limit.middleware";

const router = Router();

router.post("/login",   loginRateLimit, ctrl.login);
router.post("/logout",  ctrl.logout);
router.get("/me",       authMiddleware,  ctrl.getMe);
router.post("/refresh", ctrl.refreshToken);

export default router;
