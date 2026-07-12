ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS comprobante_pago_path TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_pago_nombre TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_pago_tipo TEXT;
