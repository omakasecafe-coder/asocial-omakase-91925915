import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, PackageMinus, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteInventoryItem,
  recordInventoryWaste,
  saveInventoryItem,
  saveInventoryLot,
  setInventoryItemActive,
  updateInventoryItem,
} from "@/lib/inventory.functions";
import {
  asNumber,
  daysUntil,
  itemById,
  lotStatusClass,
  lotStatusLabel,
  lotValue,
  movementCost,
  type InventoryItem,
} from "@/lib/inventory";
import { inventoryWorkspaceQuery } from "@/lib/queries";
import { money, stamp } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inventario/")({
  component: InventoryPage,
});

function InventoryPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(inventoryWorkspaceQuery());
  const [lotId, setLotId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<"vencimiento" | "calidad" | "preparacion" | "conteo" | "otro">(
    "vencimiento",
  );
  const [notes, setNotes] = useState("");
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
  const [lotForm, setLotForm] = useState({
    item_id: "",
    lot_code: "",
    quantity: "",
    total_cost: "",
    purchased_at: "",
    expires_at: "",
    notes: "",
  });

  const lots = useMemo(() => ws?.lots ?? [], [ws]);
  const selectedLot = lots.find((lot) => lot.id === lotId) ?? lots[0];
  const wasteMovements = (ws?.movements ?? []).filter((movement) => movement.movement_type === "waste");
  const activeItems = (ws?.items ?? []).filter((item) => item.active);
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

  const createLot = useMutation({
    mutationFn: () =>
      saveInventoryLot({
        data: {
          ...lotForm,
          item_id: lotForm.item_id || activeItems[0]?.id || "",
          quantity: Number(lotForm.quantity),
          total_cost: Number(lotForm.total_cost),
          purchased_at: lotForm.purchased_at || null,
          expires_at: lotForm.expires_at || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-workspace"] });
      setLotForm({
        item_id: "",
        lot_code: "",
        quantity: "",
        total_cost: "",
        purchased_at: "",
        expires_at: "",
        notes: "",
      });
      toast("Lote registrado");
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos registrar el lote"),
  });

  const waste = useMutation({
    mutationFn: () => {
      if (!selectedLot) throw new Error("Elige un lote");
      return recordInventoryWaste({
        data: {
          lotId: selectedLot.id,
          quantity: Number(quantity),
          reason,
          notes,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-workspace"] });
      setQuantity("");
      setNotes("");
      toast("Merma registrada", { description: "El lote y el historial quedaron actualizados." });
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos registrar la merma"),
  });

  if (!ws) {
    return (
      <AdminShell title="Inventario">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  if (ws.setupRequired) {
    return (
      <AdminShell title="Inventario" description="Lotes, vencimientos y mermas de insumos.">
        <SetupRequiredCard message={ws.setupMessage} />
      </AdminShell>
    );
  }

  const inventoryValue = lots.reduce((sum, lot) => sum + lotValue(lot), 0);
  const expiring = lots.filter((lot) => {
    const remainingDays = daysUntil(lot.expires_at);
    return lot.status === "expiring" || (remainingDays !== null && remainingDays >= 0 && remainingDays <= 10);
  }).length;
  const blocked = lots.filter((lot) => ["expired", "blocked", "discarded"].includes(lot.status)).length;
  const wasteValue = wasteMovements.reduce((sum, movement) => sum + movementCost(movement), 0);
  const canSubmit =
    Boolean(selectedLot) && Number(quantity) > 0 && Number(quantity) <= asNumber(selectedLot?.quantity_available);
  const itemUnitCost =
    Number(itemForm.presentation_quantity) > 0
      ? Number(itemForm.presentation_price) / Number(itemForm.presentation_quantity)
      : 0;
  const canCreateItem =
    itemForm.name.trim().length > 0 &&
    itemForm.presentation_quantity !== "" &&
    itemForm.presentation_price !== "" &&
    Number(itemForm.presentation_quantity) > 0 &&
    Number(itemForm.presentation_price) >= 0;
  const canCreateLot =
    Boolean(lotForm.item_id || activeItems.length > 0) &&
    lotForm.quantity !== "" &&
    lotForm.total_cost !== "" &&
    Number(lotForm.quantity) > 0 &&
    Number(lotForm.total_cost) >= 0;

  return (
    <AdminShell title="Inventario" description="Lotes, vencimientos y mermas de insumos.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Valor en stock" value={money(inventoryValue)} hint={`${lots.length} lotes activos`} />
        <MetricCard label="Por vencer" value={expiring} hint="Lotes dentro de la ventana corta" />
        <MetricCard label="Bloqueados" value={blocked} hint="Vencidos, descartados o no aptos" />
        <MetricCard label="Merma registrada" value={money(wasteValue)} hint={`${wasteMovements.length} movimientos`} />
      </div>

      <Tabs defaultValue="lotes" className="mt-8">
        <TabsList>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="insumos">Maestra de insumos</TabsTrigger>
        </TabsList>

        <TabsContent value="lotes" className="mt-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-x-auto rounded-xl border border-border bg-card">
              <div className="grid min-w-[760px] grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
                <span>Insumo</span>
                <span>Lote</span>
                <span>Disponible</span>
                <span>Vence</span>
                <span className="text-right">Valor</span>
              </div>
              <div className="divide-y divide-border">
                {lots.map((lot) => {
                  const item = itemById(ws, lot.item_id);
                  const remainingDays = daysUntil(lot.expires_at);
                  return (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => setLotId(lot.id)}
                      className={cn(
                        "grid w-full min-w-[760px] grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-left text-sm transition-colors hover:bg-muted/35",
                        selectedLot?.id === lot.id ? "bg-muted/50" : "bg-card",
                      )}
                    >
                      <span>
                        <span className="block font-medium text-foreground">{item?.name ?? "Insumo"}</span>
                        <span
                          className={cn(
                            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px]",
                            lotStatusClass(lot.status),
                          )}
                        >
                          {lotStatusLabel(lot.status)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">{lot.lot_code || "Sin código"}</span>
                      <span className="tabular-nums">
                        {asNumber(lot.quantity_available).toLocaleString("es-PE")} {item?.base_unit}
                      </span>
                      <span className="text-muted-foreground">
                        {lot.expires_at ?? "Sin fecha"}
                        {remainingDays !== null ? (
                          <span className="block text-xs">
                            {remainingDays < 0 ? "Vencido" : `${remainingDays} dias`}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-right tabular-nums">{money(lotValue(lot))}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-6">
              <div className="card-soft p-5">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <h2 className="text-sm font-medium">Nuevo lote</h2>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Insumo</Label>
                    <Select
                      value={lotForm.item_id || activeItems[0]?.id || ""}
                      onValueChange={(value) => setLotForm({ ...lotForm, item_id: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Elige un insumo" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Código de lote</Label>
                    <Input
                      className="mt-2"
                      value={lotForm.lot_code}
                      onChange={(event) => setLotForm({ ...lotForm, lot_code: event.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Cantidad</Label>
                      <Input
                        className="mt-2"
                        type="number"
                        min={0}
                        step="0.01"
                        value={lotForm.quantity}
                        onChange={(event) => setLotForm({ ...lotForm, quantity: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Costo total</Label>
                      <Input
                        className="mt-2"
                        type="number"
                        min={0}
                        step="0.01"
                        value={lotForm.total_cost}
                        onChange={(event) => setLotForm({ ...lotForm, total_cost: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Compra</Label>
                      <Input
                        className="mt-2"
                        type="date"
                        value={lotForm.purchased_at}
                        onChange={(event) => setLotForm({ ...lotForm, purchased_at: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Vence</Label>
                      <Input
                        className="mt-2"
                        type="date"
                        value={lotForm.expires_at}
                        onChange={(event) => setLotForm({ ...lotForm, expires_at: event.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    disabled={!canCreateLot || createLot.isPending}
                    onClick={() => createLot.mutate()}
                  >
                    <PackageCheck className="h-4 w-4" strokeWidth={1.5} />
                    {createLot.isPending ? "Registrando…" : "Registrar lote"}
                  </Button>
                </div>
              </div>

              <div className="card-soft p-5">
                <div className="flex items-center gap-2">
                  <PackageMinus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <h2 className="text-sm font-medium">Registrar merma</h2>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Lote</Label>
                    <Select value={selectedLot?.id ?? ""} onValueChange={setLotId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Elige un lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {lots.map((lot) => {
                          const item = itemById(ws, lot.item_id);
                          return (
                            <SelectItem key={lot.id} value={lot.id}>
                              {item?.name} · {lot.lot_code || "sin lote"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cantidad</Label>
                    <Input
                      className="mt-2"
                      type="number"
                      min={0}
                      step="0.01"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                    />
                    {selectedLot ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Disponible: {asNumber(selectedLot.quantity_available).toLocaleString("es-PE")} {" "}
                        {itemById(ws, selectedLot.item_id)?.base_unit}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Motivo</Label>
                    <Select value={reason} onValueChange={(value) => setReason(value as typeof reason)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vencimiento">Vencimiento</SelectItem>
                        <SelectItem value="calidad">Calidad</SelectItem>
                        <SelectItem value="preparacion">Preparacion</SelectItem>
                        <SelectItem value="conteo">Conteo</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Notas</Label>
                    <Textarea
                      className="mt-2 min-h-24"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <Button className="w-full gap-2" disabled={!canSubmit || waste.isPending} onClick={() => waste.mutate()}>
                    <PackageCheck className="h-4 w-4" strokeWidth={1.5} />
                    {waste.isPending ? "Registrando…" : "Guardar merma"}
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          <section className="mt-8">
            <h2 className="text-sm font-medium">Ultimos movimientos</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
              {wasteMovements.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">Aun no hay mermas registradas.</p>
              ) : (
                <div className="divide-y divide-border">
                  {wasteMovements.slice(0, 6).map((movement) => {
                    const item = itemById(ws, movement.item_id);
                    return (
                      <div key={movement.id} className="grid gap-2 p-4 text-sm sm:grid-cols-4 sm:items-center">
                        <p className="font-medium">{item?.name ?? "Insumo"}</p>
                        <p className="text-xs text-muted-foreground">
                          {asNumber(movement.quantity).toLocaleString("es-PE")} {movement.unit} · {movement.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">{stamp(movement.created_at)}</p>
                        <p className="text-right font-medium">{money(movementCost(movement))}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="insumos" className="mt-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-x-auto rounded-xl border border-border bg-card">
              <div className="grid min-w-[820px] grid-cols-[1.1fr_0.6fr_0.7fr_0.8fr_0.7fr_1fr] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
                <span>Insumo</span>
                <span>Unidad</span>
                <span>Presentación</span>
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
                <h2 className="text-sm font-medium">
                  {editingItem ? "Editar insumo" : "Nuevo insumo"}
                </h2>
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
                    <Label className="text-xs text-muted-foreground">Categoría</Label>
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
                    <Label className="text-xs text-muted-foreground">Presentación</Label>
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
                    disabled={!canCreateItem || createItem.isPending || updateItem.isPending}
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
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este insumo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem
                ? `Se eliminará “${deletingItem.name}” de forma permanente. Solo se permite si no tiene lotes, movimientos ni recetas asociadas.`
                : "Esta acción no se puede deshacer."}
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
      <h2 className="text-sm font-medium">Módulo pendiente de inicializar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ??
          "Falta aplicar la migración de inventario en Supabase para crear las tablas del módulo."}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Migración: supabase/migrations/20260831120000_inventory_operations.sql
      </p>
    </div>
  );
}
