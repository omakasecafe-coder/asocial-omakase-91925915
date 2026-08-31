import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Beaker, BookOpen, Plus } from "lucide-react";
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
import { asNumber, itemById, recipeById, recipeCost } from "@/lib/inventory";
import { savePreparationRecipe } from "@/lib/inventory.functions";
import { inventoryWorkspaceQuery } from "@/lib/queries";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recetas/")({
  component: RecipesPage,
});

function RecipesPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(inventoryWorkspaceQuery());
  const [form, setForm] = useState({
    name: "",
    recipe_type: "drink" as "base" | "drink" | "pairing",
    yield_quantity: "1",
    yield_unit: "un" as "g" | "ml" | "un",
    portion_quantity: "1",
    notes: "",
  });
  const [lines, setLines] = useState<RecipeLineForm[]>([
    { source: "", quantity: "", unit: "g", notes: "" },
  ]);

  const createRecipe = useMutation({
    mutationFn: () =>
      savePreparationRecipe({
        data: {
          ...form,
          yield_quantity: Number(form.yield_quantity),
          portion_quantity: Number(form.portion_quantity),
          lines: lines
            .filter((line) => line.source && Number(line.quantity) > 0)
            .map((line) => ({
              inventory_item_id: line.source.startsWith("item:")
                ? line.source.replace("item:", "")
                : null,
              nested_recipe_id: line.source.startsWith("recipe:")
                ? line.source.replace("recipe:", "")
                : null,
              quantity: Number(line.quantity),
              unit: line.unit,
              notes: line.notes,
            })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-workspace"] });
      setForm({
        name: "",
        recipe_type: "drink",
        yield_quantity: "1",
        yield_unit: "un",
        portion_quantity: "1",
        notes: "",
      });
      setLines([{ source: "", quantity: "", unit: "g", notes: "" }]);
      toast("Receta creada");
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos crear la receta"),
  });

  if (!ws) {
    return (
      <AdminShell title="Recetas">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  if (ws.setupRequired) {
    return (
      <AdminShell title="Recetas" description="Preparaciones base, bebidas y acompanamientos.">
        <SetupRequiredCard message={ws.setupMessage} />
      </AdminShell>
    );
  }

  const activeRecipes = ws.recipes.filter((recipe) => recipe.active);
  const activeItems = ws.items.filter((item) => item.active);
  const drinks = activeRecipes.filter((recipe) => recipe.recipe_type === "drink");
  const bases = activeRecipes.filter((recipe) => recipe.recipe_type === "base");
  const averageDrinkCost =
    drinks.length > 0
      ? drinks.reduce((sum, recipe) => sum + recipeCost(ws, recipe.id), 0) / drinks.length
      : 0;
  const canCreateRecipe =
    form.name.trim().length > 0 &&
    form.yield_quantity !== "" &&
    form.portion_quantity !== "" &&
    Number(form.yield_quantity) > 0 &&
    Number(form.portion_quantity) > 0 &&
    lines.some((line) => line.source && Number(line.quantity) > 0);

  return (
    <AdminShell title="Recetas" description="Preparaciones base, bebidas y acompanamientos.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Recetas activas" value={activeRecipes.length} hint={`${drinks.length} bebidas`} />
        <MetricCard label="Preparaciones base" value={bases.length} />
        <MetricCard label="Costo bebida prom." value={money(averageDrinkCost)} />
        <MetricCard label="Insumos vinculados" value={ws.recipeItems.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          {ws.recipes.map((recipe) => {
            const lines = ws.recipeItems.filter((line) => line.recipe_id === recipe.id);
            return (
              <article key={recipe.id} className="card-soft p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <h2 className="text-sm font-medium">{recipe.name}</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {recipe.recipe_type === "drink"
                        ? "Bebida"
                        : recipe.recipe_type === "base"
                          ? "Preparacion base"
                          : "Acompanamiento"}
                      {!recipe.active ? " · archivada" : ""}
                    </p>
                  </div>
                  <p className="text-right text-sm font-medium">{money(recipeCost(ws, recipe.id))}</p>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[1fr_0.5fr_0.5fr] gap-3 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Insumo o base</span>
                    <span>Cantidad</span>
                    <span className="text-right">Costo</span>
                  </div>
                  <div className="divide-y divide-border">
                    {lines.map((line) => {
                      const item = itemById(ws, line.inventory_item_id);
                      const nested = recipeById(ws, line.nested_recipe_id);
                      const unitCost = item ? asNumber(item.default_unit_cost) : recipeCost(ws, nested?.id);
                      return (
                        <div
                          key={line.id}
                          className="grid grid-cols-[1fr_0.5fr_0.5fr] gap-3 px-3 py-2 text-sm"
                        >
                          <span>{item?.name ?? nested?.name ?? "Linea"}</span>
                          <span className="text-muted-foreground">
                            {asNumber(line.quantity).toLocaleString("es-PE")} {line.unit}
                          </span>
                          <span className="text-right tabular-nums">
                            {money(asNumber(line.quantity) * unitCost)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="card-soft p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-sm font-medium">Nueva receta</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input
                className="mt-2"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select
                  value={form.recipe_type}
                  onValueChange={(value) =>
                    setForm({ ...form, recipe_type: value as typeof form.recipe_type })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drink">Bebida</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="pairing">Acompanamiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Unidad final</Label>
                <Select
                  value={form.yield_unit}
                  onValueChange={(value) => setForm({ ...form, yield_unit: value as typeof form.yield_unit })}
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
                <Label className="text-xs text-muted-foreground">Rinde</Label>
                <Input
                  className="mt-2"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.yield_quantity}
                  onChange={(event) => setForm({ ...form, yield_quantity: event.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Porción costeo</Label>
                <Input
                  className="mt-2"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.portion_quantity}
                  onChange={(event) => setForm({ ...form, portion_quantity: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Componentes</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2"
                  onClick={() => setLines([...lines, { source: "", quantity: "", unit: "g", notes: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Línea
                </Button>
              </div>
              {lines.map((line, index) => (
                <div key={index} className="rounded-lg border border-border p-3">
                  <Select
                    value={line.source}
                    onValueChange={(value) => updateLine(index, { source: value }, lines, setLines)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Insumo o base" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeItems.map((item) => (
                        <SelectItem key={item.id} value={`item:${item.id}`}>
                          {item.name}
                        </SelectItem>
                      ))}
                      {ws.recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={`recipe:${recipe.id}`}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Cantidad"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, { quantity: event.target.value }, lines, setLines)
                      }
                    />
                    <Select
                      value={line.unit}
                      onValueChange={(value) => updateLine(index, { unit: value as RecipeLineForm["unit"] }, lines, setLines)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="un">un</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
            <Textarea
              className="min-h-20"
              placeholder="Notas"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
            <Button
              className="w-full gap-2"
              disabled={!canCreateRecipe || createRecipe.isPending}
              onClick={() => createRecipe.mutate()}
            >
              <Beaker className="h-4 w-4" strokeWidth={1.5} />
              {createRecipe.isPending ? "Creando…" : "Crear receta"}
            </Button>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}

type RecipeLineForm = {
  source: string;
  quantity: string;
  unit: "g" | "ml" | "un";
  notes: string;
};

function updateLine(
  index: number,
  patch: Partial<RecipeLineForm>,
  lines: RecipeLineForm[],
  setLines: (lines: RecipeLineForm[]) => void,
) {
  setLines(lines.map((line, current) => (current === index ? { ...line, ...patch } : line)));
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
