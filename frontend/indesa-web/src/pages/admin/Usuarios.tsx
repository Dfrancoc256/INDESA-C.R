import { useListUsuarios, useCreateUsuario, useUpdateUsuario, useToggleUsuario, useResetUsuarioPassword, useListRoles, useDeleteUsuario } from "@workspace/api-client-react";
import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Search, Edit, ShieldCheck, Key, MoreHorizontal, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyApiErrorMessage } from "@/lib/apiErrorMessage";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessages } from "@/lib/errorMessages";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const usuarioCreateSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role_id: z.coerce.number().min(1, "Seleccione un rol"),
});

const usuarioUpdateSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  role_id: z.coerce.number().min(1, "Seleccione un rol"),
});

const passwordResetSchema = z.object({
  nueva_password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type UsuarioCreateValues = z.infer<typeof usuarioCreateSchema>;
type UsuarioUpdateValues = z.infer<typeof usuarioUpdateSchema>;
type PasswordResetValues = z.infer<typeof passwordResetSchema>;
const pageSize = 10;

export function Usuarios() {
  const { toast } = useToast();
  const { usuario: usuarioActual } = useAuth();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const debouncedBusqueda = useDebouncedValue(busqueda.trim(), 250);
  
  const [isCrearOpen, setIsCrearOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isEliminarOpen, setIsEliminarOpen] = useState(false);
  
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null);
  const canDeleteUsers = hasPermission(usuarioActual, "usuarios.eliminar");
  
  const { data: usuarios, isLoading, refetch } = useListUsuarios();
  const { data: roles } = useListRoles();

  const createForm = useForm<UsuarioCreateValues>({
    resolver: zodResolver(usuarioCreateSchema),
    defaultValues: { nombre: "", apellido: "", email: "", password: "", role_id: 2 },
  });

  const updateForm = useForm<UsuarioUpdateValues>({
    resolver: zodResolver(usuarioUpdateSchema),
    defaultValues: { nombre: "", apellido: "", email: "", role_id: 2 },
  });

  const resetForm = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { nueva_password: "" },
  });

  const createMutation = useCreateUsuario({
    mutation: {
      onSuccess: () => {
        toast({ title: "Usuario creado", description: "El usuario fue registrado correctamente." });
        refetch();
        setIsCrearOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible crear el usuario", description: getFriendlyApiErrorMessage(err, errorMessages.createUser) });
      }
    }
  });

  const updateMutation = useUpdateUsuario({
    mutation: {
      onSuccess: () => {
        toast({ title: "Usuario actualizado", description: "Los datos del usuario se actualizaron correctamente." });
        refetch();
        setIsEditarOpen(false);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible actualizar el usuario", description: getFriendlyApiErrorMessage(err, errorMessages.updateUser) });
      }
    }
  });

  const resetMutation = useResetUsuarioPassword({
    mutation: {
      onSuccess: () => {
        toast({ title: "Contraseña restablecida", description: "La contraseña se cambió correctamente." });
        setIsResetOpen(false);
        resetForm.reset();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible restablecer la contraseña", description: getFriendlyApiErrorMessage(err, errorMessages.resetPassword) });
      }
    }
  });

  const toggleMutation = useToggleUsuario({
    mutation: {
      onSuccess: () => {
        toast({ title: "Estado actualizado", description: "El estado del usuario se modificó correctamente." });
        refetch();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible cambiar el estado del usuario", description: getFriendlyApiErrorMessage(err, errorMessages.toggleUser) });
      }
    }
  });

  const deleteMutation = useDeleteUsuario({
    mutation: {
      onSuccess: () => {
        toast({ title: "Usuario eliminado", description: "El usuario fue retirado correctamente." });
        refetch();
        setIsEliminarOpen(false);
        setUsuarioSeleccionado(null);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible eliminar el usuario", description: getFriendlyApiErrorMessage(err, errorMessages.generic) });
      }
    }
  });

  const onCreateSubmit = (data: UsuarioCreateValues) => {
    createMutation.mutate({ data });
  };

  const onUpdateSubmit = (data: UsuarioUpdateValues) => {
    if (usuarioSeleccionado) {
      updateMutation.mutate({ id: usuarioSeleccionado.id, data });
    }
  };

  const onResetSubmit = (data: PasswordResetValues) => {
    if (usuarioSeleccionado) {
      resetMutation.mutate({ id: usuarioSeleccionado.id, data });
    }
  };

  const handleOpenEditar = (usuario: any) => {
    setUsuarioSeleccionado(usuario);
    updateForm.reset({
      nombre: usuario.nombre,
      apellido: usuario.apellido || "",
      email: usuario.email,
      role_id: usuario.role_id ?? usuario.roleId ?? 2,
    });
    setIsEditarOpen(true);
  };

  const handleOpenReset = (usuario: any) => {
    setUsuarioSeleccionado(usuario);
    resetForm.reset({ nueva_password: "" });
    setIsResetOpen(true);
  };

  const handleOpenEliminar = (usuario: any) => {
    setUsuarioSeleccionado(usuario);
    setIsEliminarOpen(true);
  };

  const handleToggleEstado = (id: number, currentEstado: boolean) => {
    toggleMutation.mutate({ id });
  };

  const confirmarEliminarUsuario = () => {
    if (!usuarioSeleccionado) return;
    deleteMutation.mutate({ id: usuarioSeleccionado.id });
  };

  const usuariosFiltrados = useMemo(() => {
    const term = debouncedBusqueda.toLowerCase();
    return [...(usuarios ?? [])]
      .filter(u =>
        !term ||
        u.nombre.toLowerCase().includes(term) ||
        u.apellido?.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      )
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at ?? 0).getTime();
        const dateB = new Date(b.created_at ?? 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return Number(b.id ?? 0) - Number(a.id ?? 0);
      });
  }, [usuarios, debouncedBusqueda]);
  const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / pageSize));
  const usuariosPagina = usuariosFiltrados.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [debouncedBusqueda]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const rolesDisponibles = Array.isArray(roles) ? roles : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">Gestión de personal y accesos al sistema administrativo.</p>
        </div>
        <Button onClick={() => setIsCrearOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, apellido o email..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-10 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : usuariosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                usuariosPagina.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium text-foreground">
                      {usuario.nombre} {usuario.apellido}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {usuario.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-normal capitalize ${usuario.rol_nombre === 'admin' ? 'border-primary text-primary' : ''}`}>
                        {usuario.rol_nombre === 'admin' && <ShieldCheck className="mr-1 h-3 w-3" />}
                        {usuario.rol_nombre ?? "Sin rol"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {usuario.last_login ? formatDate(usuario.last_login) : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={usuario.activo} 
                          onCheckedChange={() => handleToggleEstado(usuario.id, usuario.activo)}
                          disabled={toggleMutation.isPending}
                        />
                        <span className="text-xs text-muted-foreground">
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditar(usuario)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar Datos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenReset(usuario)}>
                            <Key className="mr-2 h-4 w-4" /> Restablecer Contraseña
                          </DropdownMenuItem>
                          {canDeleteUsers && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onClick={() => handleOpenEliminar(usuario)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Usuario
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {usuariosFiltrados.length > 0 && (
          <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, usuariosFiltrados.length)} de {usuariosFiltrados.length} usuarios
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
        )}
      </Card>

      {/* Modal Nuevo Usuario */}
      <Dialog open={isCrearOpen} onOpenChange={setIsCrearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>Añade un nuevo miembro al equipo con acceso al sistema.</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={createForm.control} name="nombre" render={({ field }) => (
                  <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={createForm.control} name="apellido" render={({ field }) => (
                  <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={createForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={createForm.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={createForm.control} name="role_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol en el sistema</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={String(field.value ?? "")}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {rolesDisponibles.length === 0 ? (
                          <SelectItem value="2" disabled>Sin roles disponibles</SelectItem>
                        ) : rolesDisponibles.map(rol => (
                          <SelectItem key={rol.id} value={rol.id.toString()} className="capitalize">{rol.nombre}</SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCrearOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuario */}
      <Dialog open={isEditarOpen} onOpenChange={setIsEditarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifique los datos personales y permisos del usuario.</DialogDescription>
          </DialogHeader>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={updateForm.control} name="nombre" render={({ field }) => (
                  <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={updateForm.control} name="apellido" render={({ field }) => (
                  <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={updateForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={updateForm.control} name="role_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol en el sistema</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    value={String(field.value ?? "")}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {rolesDisponibles.length === 0 ? (
                        <SelectItem value="2" disabled>Sin roles disponibles</SelectItem>
                      ) : rolesDisponibles.map(rol => (
                        <SelectItem key={rol.id} value={rol.id.toString()} className="capitalize">{rol.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditarOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Restablecer Contraseña */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription>
              Ingrese la nueva contraseña para <strong>{usuarioSeleccionado?.nombre} {usuarioSeleccionado?.apellido}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <FormField control={resetForm.control} name="nueva_password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl><Input type="password" placeholder="Mínimo 8 caracteres" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsResetOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={resetMutation.isPending}>
                  {resetMutation.isPending ? "Guardando..." : "Cambiar Contraseña"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isEliminarOpen} onOpenChange={(open) => {
        setIsEliminarOpen(open);
        if (!open) setUsuarioSeleccionado(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará a {usuarioSeleccionado?.nombre} {usuarioSeleccionado?.apellido} del sistema. Si solo necesita bloquear el acceso, puede cambiar su estado a inactivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmarEliminarUsuario();
              }}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar usuario"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
