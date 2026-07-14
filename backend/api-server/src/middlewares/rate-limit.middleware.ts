import rateLimit from "express-rate-limit";

/** Rate limit estricto para el endpoint de login (máxima seguridad) */
export const loginRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5,                    // máximo 5 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de acceso. Espere 5 minutos antes de volver a intentarlo." },
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode < 400 && !res.locals["loginFailed"],
});

/** Rate limit general para endpoints de API */
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Límite de solicitudes excedido. Intente en un momento." },
});

/** Rate limit para creación de reservas públicas */
export const reservasRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Ha superado el límite de reservas por hora. Intente más tarde." },
});
