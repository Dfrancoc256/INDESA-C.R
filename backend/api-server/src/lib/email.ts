import net from "node:net";
import tls from "node:tls";
import { logger } from "./logger";

interface ReservaNotificacionCorreo {
  reservaId: number;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  productoNombre: string;
  cantidad: number;
  fechaInicio: string;
  fechaFin: string;
  diasReserva: number;
  tipoTarifa: string;
  unidadesTarifa: number;
  precioUnitario: number;
  totalEstimado: number;
  notas?: string;
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  recipients: string[];
};

type SmtpResponse = {
  code: number;
  lines: string[];
};

class SmtpSession {
  private readonly socket: net.Socket | tls.TLSSocket;
  private readonly servername: string;
  private buffer = "";
  private readonly pending: Array<{
    resolve: (response: SmtpResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private current:
    | {
        resolve: (response: SmtpResponse) => void;
        reject: (error: Error) => void;
        lines: string[];
        code: number | null;
      }
    | null = null;
  private closed = false;

  constructor(socket: net.Socket | tls.TLSSocket, servername: string) {
    this.socket = socket;
    this.servername = servername;

    this.socket.on("data", (chunk: string | Buffer) => this.handleData(chunk));
    this.socket.on("error", (error) => this.failAll(error as Error));
    this.socket.on("close", () => this.failAll(new Error("Conexión SMTP cerrada")));
  }

  async send(command?: string): Promise<SmtpResponse> {
    const responsePromise = this.waitResponse();
    if (command) {
      this.socket.write(`${command}\r\n`);
    }
    return responsePromise;
  }

  async upgradeToTls(): Promise<void> {
    if (this.socket instanceof tls.TLSSocket) {
      return;
    }

    const upgraded = tls.connect({
      socket: this.socket,
      servername: this.servername,
    });

    await new Promise<void>((resolve, reject) => {
      upgraded.once("secureConnect", () => resolve());
      upgraded.once("error", reject);
    });

    this.socket.removeAllListeners("data");
    this.socket.removeAllListeners("error");
    this.socket.removeAllListeners("close");

    (this as unknown as { socket: net.Socket | tls.TLSSocket }).socket = upgraded;
    upgraded.on("data", (chunk: string | Buffer) => this.handleData(chunk));
    upgraded.on("error", (error) => this.failAll(error as Error));
    upgraded.on("close", () => this.failAll(new Error("Conexión SMTP cerrada")));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      this.socket.end();
    } catch {
      // No hacemos nada: el socket se está cerrando.
    }
  }

  private waitResponse(): Promise<SmtpResponse> {
    return new Promise<SmtpResponse>((resolve, reject) => {
      this.pending.push({ resolve, reject });
    });
  }

  private handleData(chunk: string | Buffer) {
    this.buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");

    let newlineIndex = this.buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const rawLine = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      const line = rawLine.replace(/\r$/, "");
      this.handleLine(line);
      newlineIndex = this.buffer.indexOf("\n");
    }
  }

  private handleLine(line: string) {
    if (!this.current) {
      const next = this.pending.shift();
      if (!next) return;
      this.current = { ...next, lines: [], code: null };
    }

    const match = line.match(/^(\d{3})([- ])(.*)$/);
    if (!match) {
      this.current.lines.push(line);
      return;
    }

    const code = Number(match[1]);
    const separator = match[2];
    const message = match[3];

    if (this.current.code === null) {
      this.current.code = code;
    }
    this.current.lines.push(message);

    if (separator === " ") {
      const response = { code: this.current.code ?? code, lines: this.current.lines };
      const resolver = this.current.resolve;
      this.current = null;
      resolver(response);
    }
  }

  private failAll(error: Error) {
    if (this.closed) return;
    this.closed = true;

    if (this.current) {
      this.current.reject(error);
      this.current = null;
    }

    while (this.pending.length > 0) {
      const next = this.pending.shift();
      next?.reject(error);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim() || "INDESA <no-reply@somosindesa.com>";
  const recipientsRaw = process.env.RESERVAS_EMAIL_TO?.trim() || "rentas@somosindesa.com, gerencia@somosindesa.com";

  if (!host) {
    logger.warn("Correo no configurado: falta SMTP_HOST.");
    return null;
  }

  const recipients = recipientsRaw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!recipients.length) {
    logger.warn("Correo no configurado: no hay destinatarios en RESERVAS_EMAIL_TO.");
    return null;
  }

  const port = Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === "true" ? 465 : 587));
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : (secure ? 465 : 587),
    secure,
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASS?.trim() || undefined,
    from,
    recipients,
  };
}

function buildMessage(datos: ReservaNotificacionCorreo) {
  const subject = `[INDESA] Nueva reserva #${datos.reservaId} - ${datos.productoNombre}`;
  const text = [
    "Nueva reserva recibida en INDESA",
    "",
    `Reserva: #${datos.reservaId}`,
    `Cliente: ${datos.clienteNombre}`,
    `Correo: ${datos.clienteEmail}`,
    `Teléfono: ${datos.clienteTelefono}`,
    `Producto: ${datos.productoNombre}`,
    `Cantidad: ${datos.cantidad}`,
    `Fechas: ${datos.fechaInicio} al ${datos.fechaFin}`,
    `Días: ${datos.diasReserva}`,
    `Tarifa: ${datos.tipoTarifa} x ${datos.unidadesTarifa}`,
    `Precio unitario: Q ${datos.precioUnitario.toFixed(2)}`,
    `Total estimado: Q ${datos.totalEstimado.toFixed(2)}`,
    datos.notas?.trim() ? `Notas: ${datos.notas.trim()}` : null,
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 12px;">Nueva reserva recibida en INDESA</h2>
      <p style="margin: 0 0 8px;"><strong>Reserva:</strong> #${datos.reservaId}</p>
      <p style="margin: 0 0 8px;"><strong>Cliente:</strong> ${escapeHtml(datos.clienteNombre)}</p>
      <p style="margin: 0 0 8px;"><strong>Correo:</strong> ${escapeHtml(datos.clienteEmail)}</p>
      <p style="margin: 0 0 8px;"><strong>Teléfono:</strong> ${escapeHtml(datos.clienteTelefono)}</p>
      <p style="margin: 0 0 8px;"><strong>Producto:</strong> ${escapeHtml(datos.productoNombre)}</p>
      <p style="margin: 0 0 8px;"><strong>Cantidad:</strong> ${datos.cantidad}</p>
      <p style="margin: 0 0 8px;"><strong>Fechas:</strong> ${datos.fechaInicio} al ${datos.fechaFin}</p>
      <p style="margin: 0 0 8px;"><strong>Días:</strong> ${datos.diasReserva}</p>
      <p style="margin: 0 0 8px;"><strong>Tarifa:</strong> ${escapeHtml(datos.tipoTarifa)} x ${datos.unidadesTarifa}</p>
      <p style="margin: 0 0 8px;"><strong>Precio unitario:</strong> Q ${datos.precioUnitario.toFixed(2)}</p>
      <p style="margin: 0 0 8px;"><strong>Total estimado:</strong> Q ${datos.totalEstimado.toFixed(2)}</p>
      ${datos.notas?.trim() ? `<p style="margin: 0 0 8px;"><strong>Notas:</strong> ${escapeHtml(datos.notas.trim())}</p>` : ""}
    </div>
  `;

  return { subject, text, html };
}

function createSocket(config: SmtpConfig): net.Socket | tls.TLSSocket {
  if (config.secure) {
    return tls.connect({
      host: config.host,
      port: config.port,
      servername: config.host,
    });
  }

  return net.createConnection({
    host: config.host,
    port: config.port,
  });
}

async function authenticate(session: SmtpSession, config: SmtpConfig): Promise<void> {
  if (!config.user || !config.pass) {
    return;
  }

  try {
    let response = await session.send(`AUTH PLAIN ${Buffer.from(`\0${config.user}\0${config.pass}`).toString("base64")}`);
    if (response.code === 235) return;
  } catch {
    // Intentamos con LOGIN si PLAIN no está soportado.
  }

  let response = await session.send("AUTH LOGIN");
  if (response.code !== 334) {
    throw new Error(`SMTP AUTH LOGIN falló: ${response.lines.join(" ")}`);
  }

  response = await session.send(Buffer.from(config.user).toString("base64"));
  if (response.code !== 334) {
    throw new Error(`SMTP AUTH LOGIN rechazó el usuario: ${response.lines.join(" ")}`);
  }

  response = await session.send(Buffer.from(config.pass).toString("base64"));
  if (response.code !== 235) {
    throw new Error(`SMTP AUTH LOGIN rechazó la contraseña: ${response.lines.join(" ")}`);
  }
}

async function sendSmtpMail(
  config: SmtpConfig,
  subject: string,
  text: string,
  html: string,
) {
  const socket = createSocket(config);
  const session = new SmtpSession(socket, config.host);

  try {
    let response = await session.send();
    if (response.code !== 220) {
      throw new Error(`SMTP no respondió con saludo 220: ${response.lines.join(" ")}`);
    }

    response = await session.send(`EHLO ${process.env.SMTP_EHLO || "localhost"}`);
    if (response.code !== 250) {
      response = await session.send(`HELO ${process.env.SMTP_EHLO || "localhost"}`);
      if (response.code !== 250) {
        throw new Error(`SMTP no aceptó EHLO/HELO: ${response.lines.join(" ")}`);
      }
    }

    if (!config.secure && response.lines.some((line) => /STARTTLS/i.test(line))) {
      const startTls = await session.send("STARTTLS");
      if (startTls.code !== 220) {
        throw new Error(`SMTP no aceptó STARTTLS: ${startTls.lines.join(" ")}`);
      }
      await session.upgradeToTls();
      response = await session.send(`EHLO ${process.env.SMTP_EHLO || "localhost"}`);
      if (response.code !== 250) {
        throw new Error(`SMTP no aceptó EHLO después de STARTTLS: ${response.lines.join(" ")}`);
      }
    }

    await authenticate(session, config);

    response = await session.send(`MAIL FROM:<${extractEmail(config.from)}>`);
    if (response.code !== 250) {
      throw new Error(`SMTP rechazó MAIL FROM: ${response.lines.join(" ")}`);
    }

    for (const recipient of config.recipients) {
      response = await session.send(`RCPT TO:<${extractEmail(recipient)}>`);
      if (response.code !== 250 && response.code !== 251) {
        throw new Error(`SMTP rechazó RCPT TO (${recipient}): ${response.lines.join(" ")}`);
      }
    }

    response = await session.send("DATA");
    if (response.code !== 354) {
      throw new Error(`SMTP no aceptó DATA: ${response.lines.join(" ")}`);
    }

    const message = [
      `From: ${config.from}`,
      `To: ${config.recipients.join(", ")}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: multipart/alternative; boundary="indesa-boundary"',
      "",
      "--indesa-boundary",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      dotStuff(text),
      "",
      "--indesa-boundary",
      "Content-Type: text/html; charset=UTF-8",
      "",
      dotStuff(html),
      "",
      "--indesa-boundary--",
      ".",
    ].join("\r\n");

    const resultPromise = session.send();
    socket.write(message + "\r\n");
    const result = await resultPromise;
    if (result.code !== 250) {
      throw new Error(`SMTP no confirmó el mensaje: ${result.lines.join(" ")}`);
    }

    await session.send("QUIT").catch(() => undefined);
  } finally {
    await session.close();
  }
}

function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function dotStuff(text: string): string {
  return text.replace(/(^|\r?\n)\./g, "$1..");
}

export async function notificarReservaPorCorreo(datos: ReservaNotificacionCorreo): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    return false;
  }

  const { subject, text, html } = buildMessage(datos);

  try {
    await sendSmtpMail(config, subject, text, html);
    logger.info({ reservaId: datos.reservaId, recipients: config.recipients }, "Notificación de correo enviada correctamente");
    return true;
  } catch (error) {
    logger.error({ error }, "Error enviando correo de nueva reserva");
    return false;
  }
}
