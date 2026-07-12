import * as productosRepo from "../repositories/productos.repository";
import * as inventarioRepo from "../repositories/inventario.repository";

type ProductoInput = {
  nombre?: string;
  descripcion?: string;
  categoriaId?: number;
  categoria_id?: number;
  precio?: number;
  precioDia?: number | null;
  precio_dia?: number | null;
  precioSemana?: number | null;
  precio_semana?: number | null;
  precioMes?: number | null;
  precio_mes?: number | null;
  imagenUrl?: string;
  imagen_url?: string;
  activo?: boolean;
  advertenciaPrecio?: boolean;
  advertencia_precio?: boolean;
  stockInicial?: number;
  stock_inicial?: number;
  stockMinimo?: number;
  stock_minimo?: number;
};

function normalizeProductoInput(data: ProductoInput) {
  return {
    nombre: data.nombre,
    descripcion: data.descripcion,
    categoriaId: data.categoriaId ?? data.categoria_id,
    precio: data.precio,
    precioDia: data.precioDia !== undefined ? data.precioDia : data.precio_dia,
    precioSemana: data.precioSemana !== undefined ? data.precioSemana : data.precio_semana,
    precioMes: data.precioMes !== undefined ? data.precioMes : data.precio_mes,
    imagenUrl: data.imagenUrl ?? data.imagen_url,
    activo: data.activo,
    advertenciaPrecio: data.advertenciaPrecio ?? data.advertencia_precio,
    stockInicial: data.stockInicial ?? data.stock_inicial,
    stockMinimo: data.stockMinimo ?? data.stock_minimo,
  };
}

export async function listProductos(params: {
  categoriaId?: number;
  busqueda?: string;
  disponibilidad?: "disponible" | "pocas_unidades" | "agotado";
  orden?: "nombre_asc" | "nombre_desc" | "precio_asc" | "precio_desc";
  page?: number;
  limit?: number;
}) {
  return productosRepo.findProductos({ ...params, soloActivos: true });
}

export async function listProductosAdmin(params: {
  categoriaId?: number;
  busqueda?: string;
  page?: number;
  limit?: number;
}) {
  return productosRepo.findProductos({ ...params, soloActivos: false });
}

export async function getProducto(id: number) {
  const producto = await productosRepo.findProductoById(id);
  if (!producto) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
  return producto;
}

export async function createProducto(data: ProductoInput) {
  const normalized = normalizeProductoInput(data);
  const { stockInicial = 0, stockMinimo = 5, ...productoData } = normalized;
  if (!productoData.nombre || productoData.precio === undefined) {
    throw Object.assign(new Error("Nombre y precio son obligatorios"), { status: 400 });
  }

  const producto = await productosRepo.createProducto({
    nombre: productoData.nombre,
    descripcion: productoData.descripcion,
    categoriaId: productoData.categoriaId,
    precio: productoData.precio,
    precioDia: productoData.precioDia,
    precioSemana: productoData.precioSemana,
    precioMes: productoData.precioMes,
    imagenUrl: productoData.imagenUrl,
    activo: productoData.activo,
    advertenciaPrecio: productoData.advertenciaPrecio,
  });

  // Crear registro de inventario automáticamente
  await inventarioRepo.upsertInventario(producto.id, stockInicial, stockMinimo);

  return productosRepo.findProductoById(producto.id);
}

export async function updateProducto(id: number, data: ProductoInput) {
  const normalized = normalizeProductoInput(data);
  const { stockInicial, stockMinimo, ...productoData } = normalized;
  const updated = await productosRepo.updateProducto(id, productoData);
  if (!updated) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });

  if (stockInicial !== undefined || stockMinimo !== undefined) {
    const inv = await inventarioRepo.findInventarioByProducto(id);
    await inventarioRepo.upsertInventario(id, stockInicial ?? inv?.cantidad ?? 0, stockMinimo);
  }

  return productosRepo.findProductoById(id);
}

export async function toggleProducto(id: number) {
  const updated = await productosRepo.toggleProductoActivo(id);
  if (!updated) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
  return productosRepo.findProductoById(id);
}

export async function deleteProducto(id: number) {
  const producto = await productosRepo.findProductoById(id);
  if (!producto) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });

  const reservasRegistradas = await productosRepo.countReservasByProducto(id);
  if (reservasRegistradas > 0) {
    throw Object.assign(
      new Error("Este producto tiene reservas registradas. Para conservar el historial, desactive la publicación desde editar producto."),
      { status: 409 },
    );
  }

  const deleted = await productosRepo.hardDeleteProducto(id);
  if (!deleted) throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
}
