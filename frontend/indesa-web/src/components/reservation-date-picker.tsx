import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

function toDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDisabledDates(min?: Date, blockedDates: string[] = []) {
  const blocked = blockedDates
    .map((date) => toDate(date))
    .filter((date): date is Date => Boolean(date));
  const matchers: Array<Date | { before: Date }> = [];

  if (min) matchers.push({ before: min });
  matchers.push(...blocked);

  if (matchers.length === 0) return undefined;
  return matchers.length === 1 ? matchers[0] : matchers;
}

type ReservationDatePickerProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minDate: string;
  blockedDates?: string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function ReservationDatePicker({
  label,
  value,
  onChange,
  minDate,
  blockedDates = [],
  disabled = false,
  placeholder = "dd/mm/aaaa",
  className,
}: ReservationDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const min = toDate(minDate);

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
            disabled={buildDisabledDates(min, blockedDates)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
