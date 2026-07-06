import { useCreateCategoria, useCreateProducto, useListCategorias } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Image as ImageIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { isValidImageSource, readImageFileAsDataUrl } from "@/lib/imageUpload";
import { invalidateCatalogData } from "@/lib/queryInvalidation";
import { errorMessages } from "@/lib/errorMessages";

const precioTiempoSchema = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? null : value,
  z.coerce.number().min(0, "El precio no puede ser negativo").nullable().optional()
);

const productoSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  descripcion: z.string().optional(),
  categoria_id: z.coerce.number().min(1, "Debe seleccionar una categoría"),
  precio: z.coerce.number().min(0.01, "El precio debe ser mayor a 0"),
  precio_dia: precioTiempoSchema,
  precio_semana: precioTiempoSchema,
  precio_mes: precioTiempoSchema,
  imagen_url: z.string().refine(isValidImageSource, "Debe ser una URL valida o una imagen cargada").optional(),
  activo: z.boolean().default(true),
  stock_inicial: z.coerce.number().min(0, "El stock inicial no puede ser negativo").default(0),
  stock_minimo: z.coerce.number().min(0, "El stock mínimo no puede ser negativo").default(5),
});

type ProductoValues = z.infer<typeof productoSchema>;

export function ProductoNuevo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [imageUrlPreview, setImageUrlPreview] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");

  const { data: categorias, isLoading: isLoadingCategorias, refetch: refetchCategorias } = useListCategorias();

  const handleImageFile = async (file: File | undefined, onChange: (value: string) => void) => {
    if (!file) return;

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      onChange(dataUrl);
      setImageUrlPreview(dataUrl);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No fue posible cargar la imagen",
        description: error instanceof Error ? error.message : errorMessages.generic,
      });
    }
  };

  const form = useForm<ProductoValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      precio: 0,
      precio_dia: null,
      precio_semana: null,
      precio_mes: null,
      imagen_url: "",
      activo: true,
      stock_inicial: 0,
      stock_minimo: 5,
    },
  });

  const createMutation = useCreateProducto({
    mutation: {
      onSuccess: async () => {
        toast({ title: "Producto creado", description: "El producto fue guardado correctamente." });
        await invalidateCatalogData(queryClient);
        setLocation("/admin/productos");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible crear el producto", description: err?.message || errorMessages.createProduct });
      }
    }
  });

  const createCategoriaMutation = useCreateCategoria({
    mutation: {
      onSuccess: async (categoria) => {
        toast({ title: "Categoría creada", description: "Ya puede usarla en este producto." });
        await invalidateCatalogData(queryClient);
        await refetchCategorias();
        form.setValue("categoria_id", categoria.id);
        setNuevaCategoria("");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible crear la categoría", description: err?.message || errorMessages.createCategory });
      },
    },
  });

  const crearCategoriaRapida = () => {
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;
    createCategoriaMutation.mutate({ data: { nombre, activa: true } });
  };

  const onSubmit = (data: ProductoValues) => {
    // Si la URL está vacía, no enviarla para que el backend maneje el null
    const payload = { ...data };
    if (!payload.imagen_url) delete payload.imagen_url;
    
    createMutation.mutate({ data: payload as any });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/productos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
          <p className="text-muted-foreground">Añadir un nuevo producto al catálogo e inventario inicial.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Main info col */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Producto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Taladro Percutor Industrial 800W" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="descripcion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción detallada</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Características, usos, especificaciones técnicas..." 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="categoria_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            disabled={isLoadingCategorias}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione una categoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categorias?.map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          <div className="mt-3 rounded-md border bg-muted/40 p-3">
                            <div className="mb-2 text-xs font-semibold text-muted-foreground">Crear categoría rápida</div>
                            <div className="flex gap-2">
                              <Input
                                value={nuevaCategoria}
                                onChange={(event) => setNuevaCategoria(event.target.value)}
                                placeholder="Ej. Maquinaria pesada"
                              />
                              <Button type="button" variant="outline" onClick={crearCategoriaRapida} disabled={createCategoriaMutation.isPending}>
                                Crear
                              </Button>
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="precio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio base de referencia (GTQ) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tarifas por tiempo</CardTitle>
                  <CardDescription>Estas son las tarifas visibles que el cliente podrá escoger en el sitio web.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="precio_dia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Por día (GTQ)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Opcional"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>Tarifa diaria</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="precio_semana"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Por semana (GTQ)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Opcional"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>Tarifa semanal</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="precio_mes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Por mes (GTQ)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Opcional"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>Tarifa mensual</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventario Inicial</CardTitle>
                  <CardDescription>Configure las existencias de este producto al crearlo.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="stock_inicial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad Inicial</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription>Unidades disponibles ahora</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock_minimo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Mínimo</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription>Alerta de reabastecimiento</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar col */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="activo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Catálogo Público</FormLabel>
                          <FormDescription>
                            El producto será visible
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fotografía</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-square w-full rounded-lg border-2 border-dashed bg-muted flex flex-col items-center justify-center overflow-hidden relative">
                    {imageUrlPreview ? (
                      <img src={imageUrlPreview} alt="Preview" className="w-full h-full object-cover" onError={() => setImageUrlPreview("")} />
                    ) : (
                      <>
                        <ImageIcon className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
                        <span className="text-xs text-muted-foreground">Sin imagen</span>
                      </>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="imagen_url"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Imagen del producto</FormLabel>
                        <FormControl>
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-background px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                            <Upload className="h-4 w-4" />
                            Subir imagen
                            <Input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(event) => {
                                void handleImageFile(event.target.files?.[0], field.onChange);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </FormControl>
                        <FormDescription>
                          La foto cargada sera la que aparezca en catálogo y detalle.
                        </FormDescription>
                        <FormControl>
                          <Input 
                            placeholder="O pegue una URL de imagen"
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              setImageUrlPreview(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" asChild>
              <Link href="/admin/productos">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="min-w-[150px]">
              {createMutation.isPending ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Producto</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

