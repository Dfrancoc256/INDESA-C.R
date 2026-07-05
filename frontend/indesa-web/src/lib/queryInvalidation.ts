import type { QueryClient } from "@tanstack/react-query";

const catalogQueryPrefixes = [
  "/api/productos",
  "/api/categorias",
  "/api/inventario",
  "/api/reservas",
  "/api/dashboard/resumen",
  "/api/dashboard/reservas-recientes",
  "/api/dashboard/stock-bajo",
];

function matchesApiPrefix(value: unknown, prefix: string) {
  return typeof value === "string" && (value === prefix || value.startsWith(`${prefix}/`));
}

export function invalidateCatalogData(queryClient: QueryClient) {
  return Promise.all(
    catalogQueryPrefixes.map((prefix) =>
      queryClient.invalidateQueries({
        predicate: (query) => matchesApiPrefix(query.queryKey[0], prefix),
      }),
    ),
  );
}
