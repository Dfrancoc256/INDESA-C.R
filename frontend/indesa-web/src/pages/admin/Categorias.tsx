import { useCreateCategoria, useListCategorias, useUpdateCategoria, type Categoria } from "@workspace/api-client-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyApiErrorMessage } from "@/lib/apiErrorMessage";
import { CheckCircle2, Pencil, Plus, Save, Tags, XCircle } from "lucide-react";
import { invalidateCatalogData } from "@/lib/queryInvalidation";

type CategoriaForm = {
  nombre: string;
  descripcion: string;
  activa: boolean;
};

const emptyForm: CategoriaForm = {
  nombre: "",
  descripcion: "",
  activa: true,
};

const pageSize = 10;

export function Categorias() {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [form, setForm] = useState<CategoriaForm>(emptyForm);
  const [page, setPage] = useState(1);
  const canCreateCategories = hasPermission(usuario, "categorias.crear");
  const canEditCategories = hasPermission(usuario, "categorias.editar");
  const canDeleteCategories = hasPermission(usuario, "categorias.eliminar");
  const canManageCategories = canCreateCategories || canEditCategories || canDeleteCategories;

  const { data: categorias = [], isLoading } = useListCategorias();
  const categoriasOrdenadas = useMemo(() => {
    return [...categorias].sort((a: any, b: any) => {
      const dateA = new Date(a.created_at ?? 0).getTime();
      const dateB = new Date(b.created_at ?? 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return Number(b.id ?? 0) - Number(a.id ?? 0);
    });
  }, [categorias]);
  const totalPages = Math.max(1, Math.ceil(categoriasOrdenadas.length / pageSize));
  const categoriasPagina = categoriasOrdenadas.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const createMutation = useCreateCategoria({
    mutation: {
      onSuccess: async () => {
        toast({ title: "Categoría creada", description: "Ya está disponible para publicar productos." });
        setForm(emptyForm);
        await invalidateCatalogData(queryClient);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No se pudo crear", description: getFriendlyApiErrorMessage(err, "Revise los datos e intente nuevamente.") });
      },
    },
  });

  const updateMutation = useUpdateCategoria({
    mutation: {
      onSuccess: async () => {
        toast({ title: "Categoría actualizada", description: "Los cambios quedaron guardados en la base de datos." });
        setEditingCategory(null);
        setForm(emptyForm);
        await invalidateCatalogData(queryClient);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No se pudo actualizar", description: getFriendlyApiErrorMessage(err, "Revise los datos e intente nuevamente.") });
      },
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const startEdit = (categoria: Categoria) => {
    setEditingCategory(categoria);
    setForm({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion ?? "",
      activa: categoria.activa,
    });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setForm(emptyForm);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      activa: form.activa,
    };

    if (!payload.nombre) {
      toast({ variant: "destructive", title: "Nombre requerido", description: "Ingrese el nombre de la categoría." });
      return;
    }

    if (editingCategory) {
      if (!canEditCategories) {
        toast({ variant: "destructive", title: "Acción no disponible", description: "No tiene permiso para editar categorías." });
        return;
      }
      updateMutation.mutate({ id: editingCategory.id, data: payload });
      return;
    }

    if (!canCreateCategories) {
      toast({ variant: "destructive", title: "Acción no disponible", description: "No tiene permiso para crear categorías." });
      return;
    }

    createMutation.mutate({ data: payload });
  };

  const toggleCategoria = (categoria: Categoria) => {
    if (!canDeleteCategories) {
      toast({ variant: "destructive", title: "Acción no disponible", description: "No tiene permiso para cambiar el estado de categorías." });
      return;
    }

    updateMutation.mutate({
      id: categoria.id,
      data: {
        nombre: categoria.nombre,
        descripcion: categoria.descripcion ?? undefined,
        activa: !categoria.activa,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Categorías</h1>
          <p className="text-muted-foreground">Organiza el catálogo público desde la base de datos.</p>
        </div>
        {canCreateCategories && (
          <Button type="button" variant="outline" onClick={cancelEdit} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Nueva categoría
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {canManageCategories && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" />
                {editingCategory ? "Editar categoría" : "Crear categoría"}
              </CardTitle>
              <CardDescription>
                Las categorías activas aparecen en los filtros públicos y al publicar productos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria-nombre">Nombre</Label>
                  <Input
                    id="categoria-nombre"
                    value={form.nombre}
                    onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                    placeholder="Ej. Maquinaria pesada"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria-descripcion">Descripción</Label>
                  <Textarea
                    id="categoria-descripcion"
                    value={form.descripcion}
                    onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                    placeholder="Uso o tipo de productos incluidos"
                    className="min-h-24 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="categoria-activa" className="text-sm font-semibold">Visible en el sitio</Label>
                    <p className="text-xs text-muted-foreground">Permite usarla en el catálogo público.</p>
                  </div>
                  <Switch
                    id="categoria-activa"
                    checked={form.activa}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, activa: checked }))}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" disabled={isSaving} className="flex-1 gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? "Guardando..." : editingCategory ? "Guardar cambios" : "Crear categoría"}
                  </Button>
                  {editingCategory && (
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className={!canManageCategories ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle>Categorías registradas</CardTitle>
            <CardDescription>
              Activa o desactiva categorías sin borrar su historial de productos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : categoriasOrdenadas.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No hay categorías creadas todavía.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {categoriasPagina.map((categoria) => (
                    <div
                      key={categoria.id}
                      className="flex flex-col gap-4 rounded-lg border bg-white p-4 transition-all hover:border-primary/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{categoria.nombre}</h3>
                          <Badge variant={categoria.activa ? "secondary" : "outline"} className="gap-1">
                            {categoria.activa ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {categoria.activa ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {categoria.descripcion || "Sin descripción registrada."}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        {canManageCategories && (
                          <>
                            {canEditCategories && (
                              <Button type="button" variant="outline" size="sm" onClick={() => startEdit(categoria)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                            )}
                            {canDeleteCategories && (
                              <Button
                                type="button"
                                variant={categoria.activa ? "outline" : "default"}
                                size="sm"
                                onClick={() => toggleCategoria(categoria)}
                                disabled={updateMutation.isPending}
                              >
                                {categoria.activa ? "Desactivar" : "Activar"}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, categoriasOrdenadas.length)} de {categoriasOrdenadas.length} categorías
                  </span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                      Anterior
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
