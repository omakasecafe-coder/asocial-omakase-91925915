import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { StatusPill } from "@/components/asocial/StatusPill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteInventoryItem,
  saveInventoryItem,
  setInventoryItemActive,
  updateInventoryItem,
} from "@/lib/inventory.functions";
import { asNumber, type InventoryItem } from "@/lib/inventory";
import { inventoryWorkspaceQuery } from "@/lib/queries";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/insumos/")({
  component: ItemsPage,
});

function ItemsPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(inventoryWorkspaceQuery());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "insumo",
    base_unit: "g" as "g" | "ml" | "un",
    presentation_quantity: "1000",
    presentation_price: "",
    active: true,
    notes: "",
  });

  const editingItem = ws?.items.find((item) => item.id === editingItemId);

  const resetItemForm = () => {
    setEditingItemId(null);
    setItemForm({
      name: "",
      category: "insumo",
      base_unit: "g",
      presentation_quantity: "1000",
      presentation_price: "",
      active: true,
      notes: "",
    });
  };

  const editItem = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      category: item.category,
      base_unit: item.base_unit,
      presentation_quantity: String(item.presentation_quantity),
      presentation_price: String(item.presentation_price),
      active: item.active,
      notes: item.notes ?? "",
    });
  };

  const createItem = useMutation({
    mutationFn: () =>
      saveInventoryItem({
        data: {
          ...itemForm,
          presentation_quantity: Number(itemForm.presentation_quantity),
          presentation_price: Number(itemForm.presentation_price),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-workspace"] });
      resetItemForm();
      toast("Insumo creado");
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos crear el insumo"),
  });

  const updateItem = useMutation({
    mutationFn: () => {
      if (!editingItemId) throw new Error("Elige un insumo para editar");
      return updateInventoryItem({
        data: {
          id: editingItemId,
          ...itemForm,
          presentation_quantity: Number(itemForm.presentation_quantity),
          presentation_price: Number(itemForm.presentation_price),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-workspace"] });
      resetItemForm();
      toast("Insumo actualizado");
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos actualizar el insumo"),
  });

  const toggleItem = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setInventoryItemActive({ data: { id, active } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-workspace"] });
      if (editingItemId === variables.id) {
        setItemForm((current) => ({ ...current, active: variables.active }));
      }
      toast(variables.active ? "Insumo activado" : "Insumo inactivado");
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos cambiar el estado"),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => deleteInventoryItem({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-workspace"] });
      if (deletingItem?.id === editingItemId) resetItemForm();
      setDeletingItem(null);
      toast("Insumo eliminado");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No pudimos eliminar el insumo"),
  });

  if (!ws) {
    return (
      <AdminShell title="Insumos">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  if (ws.setupRequired) {
    return (
      <AdminShell title="Insumos" description="Maestra de insumos y costos unitarios.">
        <SetupRequiredCard message={ws.setupMessage} />
      </AdminShell>
    );
  }

  const activeItems = ws.items.filter((item) => item.active);
  const usedItems = ws.items.filter((item) => {
    const lotsCount = ws.lots.filter((lot) => lot.item_id === item.id).length;
    const movementsCount = ws.movements.filter((movement) => movement.item_id === item.id).length;
    const recipesCount = ws.recipeItems.filter((line) => line.inventory_item_id === item.id).length;
    return lotsCount + movementsCount + recipesCount > 0;
  }).length;
  const itemUnitCost =
    Number(itemForm.presentation_quantity) > 0
      ? Number(itemForm.presentation_price) / Number(itemForm.presentation_quantity)
      : 0;
  const canSaveItem =
    itemForm.name.trim().length > 0 &&
    itemForm.presentation_quantity !== "" &&
    itemForm.presentation_price !== "" &&
    Number(itemForm.presentation_quantity) > 0 &&
    Number(itemForm.presentation_price) >= 0;

  return (
    <AdminShell title="Insumos" description="Maestra de insumos y costos unitarios.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Insumos" value={ws.items.length} />
        <MetricCard label="Activos" value={activeItems.length} />
        <MetricCard label="Inactivos" value={ws.items.length - activeItems.length} />
        <MetricCard label="Con uso" value={usedItems} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-x-auto rounded-xl border border-border bg-card">
          <div className="grid min-w-[820px] grid-cols-[1.1fr_0.6fr_0.7fr_0.8fr_0.7fr_1fr] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>Insumo</span>
            <span>Unidad</span>
            <span>Presentacion</span>
            <span>Costo unitario</span>
            <span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-border">
            {ws.items.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Aun no hay insumos registrados.</p>
            ) : (
              ws.items.map((item) => {
                const lotsCount = ws.lots.filter((lot) => lot.item_id === item.id).length;
                const movementsCount = ws.movements.filter((movement) => movement.item_id === item.id).length;
                const recipesCount = ws.recipeItems.filter((line) => line.inventory_item_id === item.id).length;
                const canDelete = lotsCount + movementsCount + recipesCount === 0;

                return (
                  <div
                    key={item.id}
                    className="grid min-w-[820px] grid-cols-[1.1fr_0.6fr_0.7fr_0.8fr_0.7fr_1fr] gap-3 px-4 py-4 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.category}
                        {lotsCount + movementsCount + recipesCount > 0
                          ? ` · ${lotsCount} lotes · ${recipesCount} recetas`
                          : ""}
                      </p>
                    </div>
                    <span className="text-muted-foreground">{item.base_unit}</span>
                    <span className="tabular-nums">
                      {asNumber(item.presentation_quantity).toLocaleString("es-PE")} {item.base_unit}
                    </span>
                    <span className="tabular-nums">{money(asNumber(item.default_unit_cost))}</span>
                    <span>
                      <StatusPill tone={item.active ? "musgo" : "muted"}>
                        {item.active ? "Activo" : "Inactivo"}
                      </StatusPill>
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => editItem(item)}>
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={toggleItem.isPending}
                        onClick={() => toggleItem.mutate({ id: item.id, active: !item.active })}
                      >
                        {item.active ? "Inactivar" : "Activar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={!canDelete}
                        onClick={() => setDeletingItem(item)}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="card-soft p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-sm font-medium">{editingItem ? "Editar insumo" : "Nuevo insumo"}</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input
                className="mt-2"
                value={itemForm.name}
                onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Input
                  className="mt-2"
                  value={itemForm.category}
                  onChange={(event) => setItemForm({ ...itemForm, category: event.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Unidad</Label>
                <Select
                  value={itemForm.base_unit}
                  onValueChange={(value) =>
                    setItemForm({ ...itemForm, base_unit: value as typeof itemForm.base_unit })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gramos</SelectItem>
                    <SelectItem value="ml">Mililitros</SelectItem>
                    <SelectItem value="un">Unidades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Presentacion</Label>
                <Input
                  className="mt-2"
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemForm.presentation_quantity}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, presentation_quantity: event.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Precio</Label>
                <Input
                  className="mt-2"
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemForm.presentation_price}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, presentation_price: event.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notas</Label>
              <Textarea
                className="mt-2 min-h-20"
                value={itemForm.notes}
                onChange={(event) => setItemForm({ ...itemForm, notes: event.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label className="text-xs text-muted-foreground">Activo</Label>
              <Switch
                checked={itemForm.active}
                onCheckedChange={(active) => setItemForm({ ...itemForm, active })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Costo unitario: {money(itemUnitCost)} por {itemForm.base_unit}
            </p>
            <div className="flex gap-2">
              {editingItem ? (
                <Button variant="outline" className="flex-1" onClick={resetItemForm}>
                  Cancelar
                </Button>
              ) : null}
              <Button
                className="flex-1 gap-2"
                disabled={!canSaveItem || createItem.isPending || updateItem.isPending}
                onClick={() => (editingItem ? updateItem.mutate() : createItem.mutate())}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                {editingItem
                  ? updateItem.isPending
                    ? "Guardando…"
                    : "Guardar cambios"
                  : createItem.isPending
                    ? "Creando…"
                    : "Crear insumo"}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este insumo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem
                ? `Se eliminará “${deletingItem.name}” de forma permanente. Solo se permite si no tiene lotes, movimientos ni recetas asociadas.`
                : "Esta accion no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeItem.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={removeItem.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deletingItem) removeItem.mutate(deletingItem.id);
              }}
            >
              {removeItem.isPending ? "Eliminando…" : "Eliminar insumo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function SetupRequiredCard({ message }: { message?: string }) {
  return (
    <div className="card-soft max-w-2xl p-5">
      <h2 className="text-sm font-medium">Modulo pendiente de inicializar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ??
          "Falta aplicar la migracion de inventario en Supabase para crear las tablas del modulo."}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Migracion: supabase/migrations/20260831120000_inventory_operations.sql
      </p>
    </div>
  );
}
