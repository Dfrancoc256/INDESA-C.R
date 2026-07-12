import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

const mimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export type StoredPaymentProof = {
  storedPath: string;
  originalName: string;
  mimeType: string;
};

export function getPaymentProofRoot() {
  return path.resolve(process.env["PAYMENT_PROOF_UPLOAD_DIR"] ?? path.join(process.cwd(), "uploads", "payment-proofs"));
}

function sanitizeFileName(value?: string | null) {
  const fileName = path.basename(value || "comprobante");
  return fileName.replace(/[^\w.\-()\s]/g, "_").trim().slice(0, 180) || "comprobante";
}

function getSafeExtension(originalName: string, mimeType: string) {
  const fromName = path.extname(originalName).toLowerCase();
  if (allowedExtensions.has(fromName)) return fromName;
  return mimeExtensions[mimeType] ?? ".bin";
}

export async function storePaymentProof(input: {
  reservaId: number;
  buffer: Buffer;
  originalName?: string | null;
  mimeType?: string | null;
}): Promise<StoredPaymentProof> {
  if (!input.buffer.length) {
    throw Object.assign(new Error("Seleccione un archivo de comprobante."), { status: 400 });
  }

  const mimeType = input.mimeType || "application/octet-stream";
  const originalName = sanitizeFileName(input.originalName);
  const extension = getSafeExtension(originalName, mimeType);
  const root = getPaymentProofRoot();
  const reservaFolder = path.join(root, String(input.reservaId));
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}${extension}`;
  const storedPath = path.join(reservaFolder, fileName);

  await fs.mkdir(reservaFolder, { recursive: true });
  await fs.writeFile(storedPath, input.buffer);

  return { storedPath, originalName, mimeType };
}

export async function readPaymentProof(storedPath: string) {
  const root = getPaymentProofRoot();
  const resolved = path.resolve(storedPath);

  if (!resolved.startsWith(root)) {
    throw Object.assign(new Error("Archivo de comprobante inválido"), { status: 400 });
  }

  return fs.readFile(resolved);
}
