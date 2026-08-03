import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { AdminShell } from "@/components/asocial/AdminShell";
import { EmptyState } from "@/components/asocial/EmptyState";
import { StatusPill } from "@/components/asocial/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { staffUsersQuery } from "@/lib/queries";
import { createStaffUser, updateStaffUser } from "@/lib/admin.functions";
import { appRoleLabel, type AppRole } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsersPage,
});

type StaffUser = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  active: boolean;
  role: string;
};

function UsersPage() {
  const { data } = useQuery(staffUsersQuery());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);

  const isAdmin = data?.isAdmin ?? false;

  return (
    <AdminShell
      title="Usuarios"
      description="Los accesos del equipo se crean solo desde aquí."
      actions={
        isAdmin ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Nuevo usuario
          </Button>
        ) : null
      }
    >
      {!isAdmin ? (
        <p className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Solo un administrador puede crear o modificar accesos.
        </p>
      ) : null}

      <div className="space-y-3">
        {!data || data.users.length === 0 ? (
          <EmptyState title="Aún no hay usuarios registrados." />
        ) : (
          data.users.map((u) => (
            <div key={u.id} className="card-soft flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm">{u.full_name || u.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="muted">{appRoleLabel[u.role as AppRole] ?? u.role}</StatusPill>
                <StatusPill tone={u.active ? "musgo" : "nogal"}>{u.active ? "Activo" : "Inactivo"}</StatusPill>
                {isAdmin ? (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(u as StaffUser)}>
                    Editar
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {creating ? <CreateUserDialog open onOpenChange={(o) => !o && setCreating(false)} /> : null}
      {editing ? (
        <EditUserDialog open onOpenChange={(o) => !o && setEditing(null)} user={editing} />
      ) : null}
    </AdminShell>
  );
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "operator" as AppRole });

  const create = useMutation({
    mutationFn: () => createStaffUser({ data: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      toast("Usuario creado");
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos crear el usuario"),
  });

  const invalid = !form.email.includes("@") || form.password.length < 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input
              className="mt-2"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Correo</Label>
            <Input
              className="mt-2"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Contraseña temporal (mín. 8)</Label>
            <Input
              className="mt-2"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rol</Label>
            <div className="mt-2">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(appRoleLabel) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {appRoleLabel[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || invalid}>
            {create.isPending ? "Creando…" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: StaffUser;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: user.full_name ?? "",
    role: (user.role as AppRole) ?? "operator",
    active: user.active,
    password: "",
  });

  const save = useMutation({
    mutationFn: () => updateStaffUser({ data: { userId: user.user_id, ...form } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      toast("Usuario actualizado");
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos actualizar el usuario"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input
              className="mt-2"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rol</Label>
            <div className="mt-2">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(appRoleLabel) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {appRoleLabel[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm">Acceso activo</p>
              <p className="text-xs text-muted-foreground">Al desactivarlo no podrá entrar al panel.</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nueva contraseña (opcional, mín. 8)</Label>
            <Input
              className="mt-2"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || (form.password.length > 0 && form.password.length < 8)}
          >
            {save.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
