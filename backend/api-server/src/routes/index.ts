import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth.routes";
import categoriasRouter from "./categorias.routes";
import productosRouter from "./productos.routes";
import inventarioRouter from "./inventario.routes";
import reservasRouter from "./reservas.routes";
import usuariosRouter from "./usuarios.routes";
import rolesRouter from "./roles.routes";
import dashboardRouter from "./dashboard.routes";

const router = Router();

router.use("/",           healthRouter);
router.use("/auth",       authRouter);
router.use("/categorias", categoriasRouter);
router.use("/productos",  productosRouter);
router.use("/inventario", inventarioRouter);
router.use("/reservas",   reservasRouter);
router.use("/usuarios",   usuariosRouter);
router.use("/roles",      rolesRouter);
router.use("/dashboard",  dashboardRouter);

export default router;
