import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReservaCalendarioDisponibilidad } from "@/hooks/use-reserva-calendario-disponibilidad";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";

function toDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = toDate(value) ?? new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

type ReservationDatePickerProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minDate: string;
  productId?: number | null;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function ReservationDatePicker({
  label,
  value,
  onChange,
  minDate,
  productId,
  disabled = false,
  placeholder = "dd/mm/aaaa",
  className,
}: ReservationDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const min = toDate(minDate);
  const hasta = useMemo(() => addDays(minDate, 370), [minDate]);

  const calendario = useReservaCalendarioDisponibilidad({
    productoId: productId ?? null,
    desde: minDate || null,
    hasta,
  });

  const disabledMatchers = useMemo(() => {
    const fechasBloqueadas = calendario.data?.fechasBloqueadas ?? [];
    const blocked = fechasBloqueadas
      .map((item) => toDate(item))
      .filter((item): item is Date => Boolean(item));

    const matchers: Array<Date | { before: Date }> = [];
    if (min) matchers.push({ before: min });
    matchers.push(...blocked);
    return matchers;
  }, [calendario.data?.fechasBloqueadas, min]);

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <label className="text-sm font-medium">{label}</label> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-between font-normal"
            disabled={disabled}
          >
            <span>{selected ? selected.toLocaleDateString("es-GT") : placeholder}</span>
            <CalendarIcon className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(toISODate(date));
              setOpen(false);
            }}
            disabled={disabledMatchers}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
