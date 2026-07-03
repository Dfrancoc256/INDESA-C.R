import * as repo from "../repositories/categorias.repository";

export async function listCategorias(soloActivas = true) {
  return repo.findAllCategorias(soloActivas);
}

export async function createCategoria(data: { nombre: string; descripcion?: string; activa?: boolean }) {
  return repo.createCategoria(data);
}

export async function updateCategoria(id: number, data: Partial<{ nombre: string; descripcion: string; activa: boolean }>) {
  const updated = await repo.updateCategoria(id, data);
  if (!updated) throw Object.assign(new Error("Categoría no encontrada"), { status: 404 });
  return updated;
}

export async function deleteCategoria(id: number) {
  await repo.deleteCategoria(id);
}
