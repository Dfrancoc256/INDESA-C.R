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
  precio: number;
  precio_dia?: number | null;
  precio_semana?: number | null;
  precio_mes?: number | null;
}

export function getTarifasProducto(producto: ProductPricing) {
  const tarifas = [
    { label: "Dia", suffix: "dia", value: producto.precio_dia },
    { label: "Semana", suffix: "semana", value: producto.precio_semana },
    { label: "Mes", suffix: "mes", value: producto.precio_mes },
  ].filter((tarifa): tarifa is { label: string; suffix: string; value: number } => (
    tarifa.value !== null && tarifa.value !== undefined && Number(tarifa.value) > 0
  ));

  if (tarifas.length > 0) return tarifas;
  return [{ label: "Base", suffix: "servicio", value: producto.precio }];
}

export function getTarifaPrincipal(producto: ProductPricing) {
  return getTarifasProducto(producto)[0];
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
