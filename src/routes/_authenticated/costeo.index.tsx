import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { asNumber, menuCost, recipeById, recipeCost } from "@/lib/inventory";
import { saveOmakaseMenu } from "@/lib/inventory.functions";
import { inventoryWorkspaceQuery } from "@/lib/queries";
import { money, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/costeo/")({
  component: CostingPage,
});

function CostingPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(inventoryWorkspaceQuery());
  const firstMenuId = ws?.menus[0]?.id ?? "";
  const [menuId, setMenuId] = useState("");
  const [served, setServed] = useState(5);
  const [venueCost, setVenueCost] = useState(0);
  const [baristaCost, setBaristaCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);
  const [menuForm, setMenuForm] = useState({
    name: "",
    price_per_person: "",
    notes: "",
  });
  const [menuLines, setMenuLines] = useState<MenuLineForm[]>([
    { step_order: "1", step_name: "", drink_recipe_id: "", pairing_recipe_id: "", pairing_optional: true },
  ]);

  const selectedMenuId = menuId || firstMenuId;
  const selectedMenu = ws?.menus.find((menu) => menu.id === selectedMenuId);
  const steps = useMemo(
    () => (ws?.menuSteps ?? []).filter((step) => step.menu_id === selectedMenuId),
    [ws, selectedMenuId],
  );

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
      toast("Menu creado");
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos crear el menu"),
  });

  if (!ws) {
    return (
      <AdminShell title="Costeo">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  if (ws.setupRequired) {
    return (
      <AdminShell title="Costeo" description="Costo por menu servido, gastos de sesion y margen.">
        <SetupRequiredCard message={ws.setupMessage} />
      </AdminShell>
    );
  }

  const unitMenuCost = menuCost(ws, selectedMenuId);
  const beverageCost = unitMenuCost * served;
  const fixedCosts = venueCost + baristaCost + otherCost;
  const totalCost = beverageCost + fixedCosts;
  const revenue = asNumber(selectedMenu?.price_per_person) * served;
  const margin = revenue > 0 ? (revenue - totalCost) / revenue : 0;
  const costPerGuest = served > 0 ? totalCost / served : 0;
  const drinkOptions = ws.recipes.filter((recipe) => recipe.active && recipe.recipe_type === "drink");
  const pairingOptions = ws.recipes.filter((recipe) => recipe.active && recipe.recipe_type === "pairing");
  const canCreateMenu =
    menuForm.name.trim().length > 0 &&
    menuForm.price_per_person !== "" &&
    Number(menuForm.price_per_person) >= 0 &&
    menuLines.some((line) => line.drink_recipe_id || line.step_name.trim());

  return (
    <AdminShell title="Costeo" description="Costo por menu servido, gastos de sesion y margen.">
      <div className="flex flex-wrap gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Menu</Label>
          <Select value={selectedMenuId} onValueChange={setMenuId}>
            <SelectTrigger className="mt-2 w-64">
              <SelectValue placeholder="Elige un menu" />
            </SelectTrigger>
            <SelectContent>
              {ws.menus.map((menu) => (
                <SelectItem key={menu.id} value={menu.id}>
                  {menu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <NumberField label="Menus servidos" value={served} onChange={setServed} />
        <NumberField label="Local" value={venueCost} onChange={setVenueCost} />
        <NumberField label="Barista" value={baristaCost} onChange={setBaristaCost} />
        <NumberField label="Otros gastos" value={otherCost} onChange={setOtherCost} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Costo menu" value={money(unitMenuCost)} hint="Solo recetas y bebidas" />
        <MetricCard label="Costo bebidas" value={money(beverageCost)} hint={`${served} menus servidos`} />
        <MetricCard label="Gastos sesion" value={money(fixedCosts)} />
        <MetricCard label="Costo por persona" value={money(costPerGuest)} />
        <MetricCard label="Margen" value={pct(margin)} hint={`Venta ${money(revenue)}`} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-x-auto rounded-xl border border-border bg-card">
          <div className="grid min-w-[780px] grid-cols-[0.4fr_1.2fr_1fr_0.7fr_0.8fr] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>Tiempo</span>
            <span>Bebida</span>
            <span>Acompanamiento</span>
            <span className="text-right">Unitario</span>
            <span className="text-right">Sesion</span>
          </div>
          <div className="divide-y divide-border">
            {steps.map((step) => {
              const drink = recipeById(ws, step.drink_recipe_id);
              const pairing = recipeById(ws, step.pairing_recipe_id);
              const unitCost = recipeCost(ws, step.drink_recipe_id) + recipeCost(ws, step.pairing_recipe_id);
              return (
                <div
                  key={step.id}
                  className="grid min-w-[780px] grid-cols-[0.4fr_1.2fr_1fr_0.7fr_0.8fr] gap-3 px-4 py-4 text-sm"
                >
                  <span className="text-muted-foreground">{step.step_order}</span>
                  <span className="font-medium">{drink?.name ?? step.step_name}</span>
                  <span className="text-muted-foreground">
                    {pairing?.name ?? (step.pairing_optional ? "Opcional" : "—")}
                  </span>
                  <span className="text-right tabular-nums">{money(unitCost)}</span>
                  <span className="text-right tabular-nums">{money(unitCost * served)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card-soft p-5">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-sm font-medium">Nuevo menu</h2>
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
                  onChange={(event) =>
                    setMenuForm({ ...menuForm, price_per_person: event.target.value })
                  }
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
                {createMenu.isPending ? "Creando…" : "Crear menu"}
              </Button>
            </div>
          </div>

          <div className="card-soft p-5">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-sm font-medium">Lectura de sesion</h2>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <CostLine label="Venta estimada" value={money(revenue)} />
              <CostLine label="Bebidas y recetas" value={money(beverageCost)} />
              <CostLine label="Local" value={money(venueCost)} />
              <CostLine label="Barista" value={money(baristaCost)} />
              <CostLine label="Otros" value={money(otherCost)} />
              <div className="border-t border-border pt-3">
                <CostLine label="Utilidad estimada" value={money(revenue - totalCost)} strong />
              </div>
            </dl>
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        step="0.5"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-36"
      />
    </div>
  );
}

function CostLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-medium" : "tabular-nums"}>{value}</dd>
    </div>
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
