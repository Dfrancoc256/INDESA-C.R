import { useGetProducto, useUpdateProducto, useListCategorias, getGetProductoQueryKey } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { useLocation, Link, useParams } from "wouter";
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
import { Skeleton } from "@/components/ui/skeleton";
import { isValidImageSource, readImageFileAsDataUrl } from "@/lib/imageUpload";

const productoSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  descripcion: z.string().optional(),
  categoria_id: z.coerce.number().min(1, "Debe seleccionar una categoría"),
  precio: z.coerce.number().min(0.01, "El precio debe ser mayor a 0"),
  imagen_url: z.string().refine(isValidImageSource, "Debe ser una URL valida o una imagen cargada").optional(),
  activo: z.boolean().default(true),
});

type ProductoValues = z.infer<typeof productoSchema>;

export function ProductoEditar() {
  const { id } = useParams<{ id: string }>();
  const productoId = parseInt(id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [imageUrlPreview, setImageUrlPreview] = useState("");
  const initRef = useRef<number | null>(null);

  const { data: categorias, isLoading: isLoadingCategorias } = useListCategorias();
  const { data: producto, isLoading: isLoadingProducto } = useGetProducto(productoId, {
    query: { enabled: productoId > 0, queryKey: getGetProductoQueryKey(productoId) }
  });

  const handleImageFile = async (file: File | undefined, onChange: (value: string) => void) => {
    if (!file) return;

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      onChange(dataUrl);
      setImageUrlPreview(dataUrl);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Imagen no valida",
        description: error instanceof Error ? error.message : "No se pudo cargar la imagen.",
      });
    }
  };

  const form = useForm<ProductoValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      precio: 0,
      imagen_url: "",
      activo: true,
      categoria_id: 0
    },
  });

  useEffect(() => {
    if (producto && initRef.current !== producto.id) {
      initRef.current = producto.id;
      form.reset({
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        precio: producto.precio,
        imagen_url: producto.imagen_url || "",
        activo: producto.activo,
        categoria_id: producto.categoria_id
      });
      setImageUrlPreview(producto.imagen_url || "");
    }
  }, [producto, form]);

  const updateMutation = useUpdateProducto({
    mutation: {
      onSuccess: () => {
        toast({ title: "Producto actualizado", description: "Los cambios han sido guardados." });
        queryClient.invalidateQueries({ queryKey: ["/api/productos"] });
        queryClient.invalidateQueries({ queryKey: [`/api/productos/${productoId}`] });
        setLocation("/admin/productos");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error al actualizar", description: err?.message || "Verifique los datos e intente nuevamente." });
      }
    }
  });

  const onSubmit = (data: ProductoValues) => {
    const payload = { ...data };
    if (!payload.imagen_url) delete payload.imagen_url;
    
    updateMutation.mutate({ 
      id: productoId, 
      data: payload as any 
    });
  };

  if (isLoadingProducto) {
    return <div className="space-y-6 max-w-4xl mx-auto"><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!producto && !isLoadingProducto) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Producto no encontrado</h2>
        <Button asChild className="mt-4"><Link href="/admin/productos">Volver al catálogo</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/productos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Producto</h1>
          <p className="text-muted-foreground">Modificar detalles de {producto?.nombre}.</p>
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
                          <Input {...field} />
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
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="categoria_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value ? field.value.toString() : ""}
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
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="precio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio Público (GTQ) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Note about inventory */}
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 flex gap-3 text-sm">
                <div className="flex-1">
                  <strong>Nota sobre inventario:</strong> Las existencias y alertas de stock de este producto 
                  se gestionan en el módulo de <Link href={`/admin/inventario?producto=${producto?.id}`} className="underline font-medium hover:text-blue-900">Inventario</Link>.
                </div>
              </div>
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
                            El producto es visible
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
                            Cambiar imagen
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
                          La foto cargada sera la que aparezca al publicar el producto.
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

          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/admin/productos">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="min-w-[150px]">
              {updateMutation.isPending ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
