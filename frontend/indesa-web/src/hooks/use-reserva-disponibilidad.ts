import { useQuery } from "@tanstack/react-query";

export type ReservaDisponibilidad = {
  productoId: number;
  fechaInicio: string;
  fechaFin: string;
  cantidadSolicitada: number;
  stockActual: number;
  stockComprometido: number;
  stockDisponible: number;
  permitido: boolean;
};

async function fetchDisponibilidad(params: {
  productoId: number;
  fechaInicio: string;
  fechaFin: string;
  cantidad: number;
}): Promise<ReservaDisponibilidad> {
  const query = new URLSearchParams({
    productoId: String(params.productoId),
    fechaInicio: params.fechaInicio,
    fechaFin: params.fechaFin,
    cantidad: String(params.cantidad),
  });

  const response = await fetch(`/api/reservas/disponibilidad?${query.toString()}`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "No se pudo validar la disponibilidad");
  }

  return data as ReservaDisponibilidad;
}

export function useReservaDisponibilidad(params: {
  productoId?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  cantidad?: number | null;
}) {
  const enabled = Boolean(
    params.productoId &&
    params.fechaInicio &&
    params.fechaFin &&
    Number.isFinite(params.cantidad ?? NaN) &&
    Number(params.cantidad ?? 0) > 0,
  );

  return useQuery({
    queryKey: [
      "/api/reservas/disponibilidad",
      params.productoId ?? 0,
      params.fechaInicio ?? "",
      params.fechaFin ?? "",
      params.cantidad ?? 0,
    ],
    queryFn: () => fetchDisponibilidad({
      productoId: Number(params.productoId),
      fechaInicio: String(params.fechaInicio),
      fechaFin: String(params.fechaFin),
      cantidad: Number(params.cantidad),
    }),
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
