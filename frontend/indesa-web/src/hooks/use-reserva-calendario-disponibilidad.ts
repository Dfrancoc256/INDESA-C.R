import { useQuery } from "@tanstack/react-query";

async function fetchCalendarioDisponibilidad(params: {
  productoId: number;
  desde: string;
  hasta: string;
}): Promise<{ productoId: number; desde: string; hasta: string; stockActual: number; fechasBloqueadas: string[] }> {
  const query = new URLSearchParams({
    productoId: String(params.productoId),
    desde: params.desde,
    hasta: params.hasta,
  });

  const response = await fetch(`/api/reservas/calendario-disponibilidad?${query.toString()}`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "No se pudo validar el calendario");
  }

  return data;
}

export function useReservaCalendarioDisponibilidad(params: {
  productoId?: number | null;
  desde?: string | null;
  hasta?: string | null;
}) {
  const enabled = Boolean(params.productoId && params.desde && params.hasta);

  return useQuery({
    queryKey: [
      "/api/reservas/calendario-disponibilidad",
      params.productoId ?? 0,
      params.desde ?? "",
      params.hasta ?? "",
    ],
    queryFn: () => fetchCalendarioDisponibilidad({
      productoId: Number(params.productoId),
      desde: String(params.desde),
      hasta: String(params.hasta),
    }),
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
