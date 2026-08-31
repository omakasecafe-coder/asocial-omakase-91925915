import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Beaker, BookOpen } from "lucide-react";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { asNumber, itemById, recipeById, recipeCost } from "@/lib/inventory";
import { inventoryWorkspaceQuery } from "@/lib/queries";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recetas/")({
  component: RecipesPage,
});

function RecipesPage() {
  const { data: ws } = useQuery(inventoryWorkspaceQuery());

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
  const drinks = activeRecipes.filter((recipe) => recipe.recipe_type === "drink");
  const bases = activeRecipes.filter((recipe) => recipe.recipe_type === "base");
  const averageDrinkCost =
    drinks.length > 0
      ? drinks.reduce((sum, recipe) => sum + recipeCost(ws, recipe.id), 0) / drinks.length
      : 0;

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
            <Beaker className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-sm font-medium">Estructura recomendada</h2>
          </div>
          <div className="mt-5 space-y-4 text-sm text-muted-foreground">
            <p>
              Cada bebida apunta a insumos directos o a preparaciones base. Asi puedes costear un
              clarificado, un cold brew o una leche infusionada una sola vez y reutilizarlo en varios
              tiempos.
            </p>
            <p>
              Los acompanamientos pueden entrar como receta opcional dentro del tiempo. Si no se sirve,
              el costeo de la sesion no lo suma.
            </p>
            <p>
              Las cantidades quedan en unidad base: gramos, mililitros o unidades. El precio se toma del
              costo por unidad del insumo.
            </p>
          </div>
        </aside>
      </div>
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
