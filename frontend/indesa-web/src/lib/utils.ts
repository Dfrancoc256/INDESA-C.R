import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(amount)
}

type ProductPricing = {
  precio?: number | null;
  precio_dia?: number | null;
  precio_semana?: number | null;
  precio_mes?: number | null;
}

export type TipoTarifaProducto = "dia" | "semana" | "mes" | "base";

type TarifaProducto = {
  tipo: TipoTarifaProducto;
  label: string;
  suffix: string;
  plural: string;
  value: number;
}

export function getTarifasProducto(producto: ProductPricing): TarifaProducto[] {
  const tarifasBase: TarifaProducto[] = [
    { tipo: "dia", label: "Día", suffix: "día", plural: "días", value: Number(producto.precio_dia ?? 0) },
    { tipo: "semana", label: "Semana", suffix: "semana", plural: "semanas", value: Number(producto.precio_semana ?? 0) },
    { tipo: "mes", label: "Mes", suffix: "mes", plural: "meses", value: Number(producto.precio_mes ?? 0) },
  ];
  const tarifas = tarifasBase.filter((tarifa) => tarifa.value > 0);

  if (tarifas.length > 0) return tarifas;
  return [{ tipo: "base", label: "Base", suffix: "servicio", plural: "servicios", value: Number(producto.precio ?? 0) }];
}

export function getTarifaPrincipal(producto: ProductPricing): TarifaProducto {
  return getTarifasProducto(producto)[0];
}

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function getDiasEntreFechas(fechaInicio: string, fechaFin: string) {
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  const diff = fin.getTime() - inicio.getTime();

  if (Number.isNaN(diff) || diff < 0) return 1;
  return Math.floor(diff / 86_400_000) + 1;
}

export function calcularFechaFinPorTarifa(fechaInicio: string, tipoTarifa: string, unidades: number) {
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const safeUnits = Math.max(1, Number(unidades) || 1);

  if (Number.isNaN(inicio.getTime())) return fechaInicio;

  if (tipoTarifa === "semana") {
    inicio.setDate(inicio.getDate() + safeUnits * 7 - 1);
  } else if (tipoTarifa === "mes") {
    inicio.setMonth(inicio.getMonth() + safeUnits);
    inicio.setDate(inicio.getDate() - 1);
  }

  return inicio.toISOString().slice(0, 10);
}

export function calcularUnidadesTarifa(tipoTarifa: string, fechaInicio: string, fechaFin: string, unidades: number) {
  if (tipoTarifa === "dia") return getDiasEntreFechas(fechaInicio, fechaFin);
  return Math.max(1, Number(unidades) || 1);
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("es-GT", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString))
}

export function getInitials(name: string) {
  if (!name) return "P";
  const words = name.split(" ");
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
