import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { Button } from "@/components/ui/button";
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
import { asNumber, menuCost, recipeById, recipeCost } from "@/lib/inventory";
import { saveOmakaseMenu } from "@/lib/inventory.functions";
import { inventoryWorkspaceQuery } from "@/lib/queries";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/menus/")({
  component: MenusPage,
});

function MenusPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(inventoryWorkspaceQuery());
  const [menuForm, setMenuForm] = useState({
    name: "",
    price_per_person: "",
    notes: "",
  });
  const [menuLines, setMenuLines] = useState<MenuLineForm[]>([
    { step_order: "1", step_name: "", drink_recipe_id: "", pairing_recipe_id: "", pairing_optional: true },
  ]);

  const createMenu = useMutation({
    mutationFn: () =>
      saveOmakaseMenu({
        data: {
          ...menuForm,
          price_per_person: Number(menuForm.price_per_person),
          steps: menuLines
            .filter((line) => line.drink_recipe_id || line.step_name.trim())
            .map((line, index) => {
              const drink = ws?.recipes.find((recipe) => recipe.id === line.drink_recipe_id);
              return {
                step_order: Number(line.step_order) || index + 1,
                step_name: line.step_name.trim() || drink?.name || `Tiempo ${index + 1}`,
                drink_recipe_id: line.drink_recipe_id || null,
                pairing_recipe_id: line.pairing_recipe_id || null,
                pairing_optional: line.pairing_optional,
              };
            }),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-workspace"] });
      setMenuForm({ name: "", price_per_person: "", notes: "" });
      setMenuLines([
        { step_order: "1", step_name: "", drink_recipe_id: "", pairing_recipe_id: "", pairing_optional: true },
      ]);
      toast("Menú creado");
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos crear el menú"),
  });

  if (!ws) {
    return (
      <AdminShell title="Menús">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  if (ws.setupRequired) {
    return (
      <AdminShell title="Menús" description="Estructura de tiempos, bebidas y acompanamientos.">
        <SetupRequiredCard message={ws.setupMessage} />
      </AdminShell>
    );
  }

  const activeMenus = ws.menus.filter((menu) => menu.active);
  const drinkOptions = ws.recipes.filter((recipe) => recipe.active && recipe.recipe_type === "drink");
  const pairingOptions = ws.recipes.filter((recipe) => recipe.active && recipe.recipe_type === "pairing");
  const averageMenuCost =
    activeMenus.length > 0
      ? activeMenus.reduce((sum, menu) => sum + menuCost(ws, menu.id), 0) / activeMenus.length
      : 0;
  const canCreateMenu =
    menuForm.name.trim().length > 0 &&
    menuForm.price_per_person !== "" &&
    Number(menuForm.price_per_person) >= 0 &&
    menuLines.some((line) => line.drink_recipe_id || line.step_name.trim());

  return (
    <AdminShell title="Menús" description="Estructura de tiempos, bebidas y acompanamientos.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Menús activos" value={activeMenus.length} />
        <MetricCard label="Tiempos creados" value={ws.menuSteps.length} />
        <MetricCard label="Costo menú prom." value={money(averageMenuCost)} />
        <MetricCard label="Recetas disponibles" value={drinkOptions.length + pairingOptions.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {ws.menus.length === 0 ? (
            <div className="card-soft p-5 text-sm text-muted-foreground">Aun no hay menús creados.</div>
          ) : (
            ws.menus.map((menu) => {
              const steps = ws.menuSteps.filter((step) => step.menu_id === menu.id);
              return (
                <article key={menu.id} className="card-soft p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        <h2 className="text-sm font-medium">{menu.name}</h2>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {steps.length} tiempos · venta {money(asNumber(menu.price_per_person))}
                        {!menu.active ? " · archivado" : ""}
                      </p>
                    </div>
                    <p className="text-right text-sm font-medium">{money(menuCost(ws, menu.id))}</p>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-border">
                    <div className="grid grid-cols-[0.4fr_1.1fr_1fr_0.7fr] gap-3 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>Tiempo</span>
                      <span>Bebida</span>
                      <span>Acompanamiento</span>
                      <span className="text-right">Costo</span>
                    </div>
                    <div className="divide-y divide-border">
                      {steps.map((step) => {
                        const drink = recipeById(ws, step.drink_recipe_id);
                        const pairing = recipeById(ws, step.pairing_recipe_id);
                        const stepCost =
                          recipeCost(ws, step.drink_recipe_id) + recipeCost(ws, step.pairing_recipe_id);
                        return (
                          <div
                            key={step.id}
                            className="grid grid-cols-[0.4fr_1.1fr_1fr_0.7fr] gap-3 px-3 py-2 text-sm"
                          >
                            <span className="text-muted-foreground">{step.step_order}</span>
                            <span>{drink?.name ?? step.step_name}</span>
                            <span className="text-muted-foreground">
                              {pairing?.name ?? (step.pairing_optional ? "Opcional" : "-")}
                            </span>
                            <span className="text-right tabular-nums">{money(stepCost)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <aside className="card-soft p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-sm font-medium">Nuevo menú</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input
                className="mt-2"
                value={menuForm.name}
                onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Precio por persona</Label>
              <Input
                className="mt-2"
                type="number"
                min={0}
                step="0.5"
                value={menuForm.price_per_person}
                onChange={(event) => setMenuForm({ ...menuForm, price_per_person: event.target.value })}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Tiempos</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2"
                  onClick={() =>
                    setMenuLines([
                      ...menuLines,
                      {
                        step_order: String(menuLines.length + 1),
                        step_name: "",
                        drink_recipe_id: "",
                        pairing_recipe_id: "",
                        pairing_optional: true,
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Tiempo
                </Button>
              </div>
              {menuLines.map((line, index) => (
                <div key={index} className="rounded-lg border border-border p-3">
                  <div className="grid grid-cols-[72px_1fr] gap-3">
                    <Input
                      type="number"
                      min={0}
                      value={line.step_order}
                      onChange={(event) =>
                        updateMenuLine(index, { step_order: event.target.value }, menuLines, setMenuLines)
                      }
                    />
                    <Input
                      placeholder="Nombre del tiempo"
                      value={line.step_name}
                      onChange={(event) =>
                        updateMenuLine(index, { step_name: event.target.value }, menuLines, setMenuLines)
                      }
                    />
                  </div>
                  <div className="mt-3 space-y-3">
                    <Select
                      value={line.drink_recipe_id || "none"}
                      onValueChange={(value) =>
                        updateMenuLine(
                          index,
                          { drink_recipe_id: value === "none" ? "" : value },
                          menuLines,
                          setMenuLines,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Bebida" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin bebida</SelectItem>
                        {drinkOptions.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={line.pairing_recipe_id || "none"}
                      onValueChange={(value) =>
                        updateMenuLine(
                          index,
                          { pairing_recipe_id: value === "none" ? "" : value },
                          menuLines,
                          setMenuLines,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Acompanamiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin acompanamiento</SelectItem>
                        {pairingOptions.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <Label className="text-xs text-muted-foreground">Acompanamiento opcional</Label>
                      <Switch
                        checked={line.pairing_optional}
                        onCheckedChange={(pairing_optional) =>
                          updateMenuLine(index, { pairing_optional }, menuLines, setMenuLines)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Textarea
              className="min-h-20"
              placeholder="Notas"
              value={menuForm.notes}
              onChange={(event) => setMenuForm({ ...menuForm, notes: event.target.value })}
            />
            <Button
              className="w-full gap-2"
              disabled={!canCreateMenu || createMenu.isPending}
              onClick={() => createMenu.mutate()}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {createMenu.isPending ? "Creando…" : "Crear menú"}
            </Button>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}

type MenuLineForm = {
  step_order: string;
  step_name: string;
  drink_recipe_id: string;
  pairing_recipe_id: string;
  pairing_optional: boolean;
};

function updateMenuLine(
  index: number,
  patch: Partial<MenuLineForm>,
  lines: MenuLineForm[],
  setLines: (lines: MenuLineForm[]) => void,
) {
  setLines(lines.map((line, current) => (current === index ? { ...line, ...patch } : line)));
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
