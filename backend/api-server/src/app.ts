import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiRateLimit } from "./middlewares/rate-limit.middleware";

const app: Express = express();

// Cuando la app corre detrás de Nginx/Cloudflare/otro proxy, Express debe
// confiar en el encabezado X-Forwarded-For para leer la IP real del cliente.
app.set("trust proxy", Number(process.env["TRUST_PROXY"] ?? 1));

// Seguridad HTTP headers
app.use(helmet());

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// CORS — permite peticiones del mismo dominio
app.use(cors({ origin: true, credentials: true }));

// Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limit general
app.use("/api", apiRateLimit);

// Rutas
app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((err: any, req: any, res: any, next: any) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number(err?.status) || 500;
  const message =
    status >= 500
      ? "Error interno del servidor"
      : err?.message || "Solicitud no procesable";

  logger.error({ err, method: req?.method, url: req?.url, status }, "Unhandled API error");

  res.status(status).json({
    error: message,
    ...(status >= 500 ? { requestId: req?.id } : {}),
  });
});

export default app;
