/**
 * Servicio de WhatsApp — INDESA
 * ─────────────────────────────────────────────────────────────────────────────
 * Utiliza la API Cloud de WhatsApp Business (Meta).
 *
 * Variables de entorno que EL USUARIO debe configurar:
 *   WHATSAPP_PHONE_NUMBER_ID  — ID del número de teléfono en Meta Business
 *   WHATSAPP_ACCESS_TOKEN     — Token permanente de la API de Meta
 *   WHATSAPP_RECIPIENT_NUMBER — Número de destino en formato internacional (ej: 50212345678)
 *
 * Si las variables no están configuradas, se registra un aviso en el log
 * y la reserva se guarda igualmente sin notificación.
 *
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
import { logger } from "./logger";

interface ReservaNotificacion {
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  productoNombre: string;
  cantidad: number;
  reservaId: number;
}

/**
 * Envía una notificación de nueva reserva por WhatsApp.
 * @returns true si el mensaje fue enviado exitosamente, false en caso contrario.
 */
export async function notificarReservaPorWhatsApp(
  datos: ReservaNotificacion
): Promise<boolean> {
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const accessToken = process.env["WHATSAPP_ACCESS_TOKEN"];
  const recipientNumber = process.env["WHATSAPP_RECIPIENT_NUMBER"];

  if (!phoneNumberId || !accessToken || !recipientNumber) {
    logger.warn(
      "WhatsApp no configurado: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN y WHATSAPP_RECIPIENT_NUMBER son requeridos."
    );
    return false;
  }

  const mensaje = construirMensaje(datos);

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const body = {
      messaging_product: "whatsapp",
      to: recipientNumber,
      type: "text",
      text: { body: mensaje },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ status: response.status, body: err }, "Error enviando WhatsApp");
      return false;
    }

    logger.info({ reservaId: datos.reservaId }, "Notificación WhatsApp enviada correctamente");
    return true;
  } catch (error) {
    logger.error({ error }, "Excepción al enviar notificación WhatsApp");
    return false;
  }
}

function construirMensaje(datos: ReservaNotificacion): string {
  const fecha = new Date().toLocaleString("es-GT", { timeZone: "America/Guatemala" });
  return [
    "🔔 *Nueva Reserva Recibida — INDESA*",
    "",
    `📋 Reserva #${datos.reservaId}`,
    `📅 Fecha: ${fecha}`,
    "",
    "*Cliente:*",
    `  Nombre: ${datos.clienteNombre}`,
    `  Email:  ${datos.clienteEmail}`,
    `  Tel:    ${datos.clienteTelefono}`,
    "",
    "*Producto:*",
    `  ${datos.productoNombre} x ${datos.cantidad}`,
    "",
    "Ingrese al panel administrativo para confirmar o gestionar esta reserva.",
  ].join("\n");
}
