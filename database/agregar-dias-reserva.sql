ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS dias_reserva INTEGER NOT NULL DEFAULT 1;

UPDATE reservas
SET dias_reserva = GREATEST(1, (fecha_fin - fecha_inicio) + 1)
WHERE dias_reserva IS NULL OR dias_reserva < 1;
