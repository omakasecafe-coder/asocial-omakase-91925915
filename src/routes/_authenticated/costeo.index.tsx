import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { asNumber, menuCost, recipeById, recipeCost } from "@/lib/inventory";
import { inventoryWorkspaceQuery, workspaceQuery } from "@/lib/queries";
import { hour, longDay, money, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/costeo/")({
  component: CostingPage,
});

function CostingPage() {
  const { data: ws } = useQuery(inventoryWorkspaceQuery());
  const { data: ops } = useQuery(workspaceQuery());
  const firstMenuId = ws?.menus[0]?.id ?? "";
  const firstSessionId = ops?.sessions[0]?.id ?? "";
  const [menuId, setMenuId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [servedOverride, setServedOverride] = useState("");
  const [venueCost, setVenueCost] = useState(0);
  const [baristaCost, setBaristaCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);

  const selectedMenuId = menuId || firstMenuId;
  const selectedSessionId = sessionId || firstSessionId;
  const selectedMenu = ws?.menus.find((menu) => menu.id === selectedMenuId);
  const selectedSession = ops?.sessions.find((session) => session.id === selectedSessionId);
  const steps = useMemo(
    () => (ws?.menuSteps ?? []).filter((step) => step.menu_id === selectedMenuId),
    [ws, selectedMenuId],
  );

  if (!ws || !ops) {
    return (
      <AdminShell title="Costeo de sesiones">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  if (ws.setupRequired) {
    return (
      <AdminShell title="Costeo de sesiones" description="Costo por menu servido, gastos de sesion y margen.">
        <SetupRequiredCard message={ws.setupMessage} />
      </AdminShell>
    );
  }

  const activeReservationGuests = ops.reservations
    .filter(
      (reservation) =>
        reservation.session_id === selectedSessionId &&
        !["cancelled", "no_show"].includes(reservation.reservation_status),
    )
    .reduce((sum, reservation) => sum + Number(reservation.guest_count ?? 0), 0);
  const servedMenus =
    servedOverride === "" ? activeReservationGuests : Math.max(asNumber(servedOverride), 0);
  const pricePerPerson = asNumber(selectedSession?.precio_por_persona ?? selectedMenu?.price_per_person);
  const unitMenuCost = menuCost(ws, selectedMenuId);
  const recipeSessionCost = unitMenuCost * servedMenus;
  const fixedCosts = venueCost + baristaCost + otherCost;
  const totalCost = recipeSessionCost + fixedCosts;
  const revenue = pricePerPerson * servedMenus;
  const margin = revenue > 0 ? (revenue - totalCost) / revenue : 0;
  const costPerGuest = servedMenus > 0 ? totalCost / servedMenus : 0;

  return (
    <AdminShell title="Costeo de sesiones" description="Costo por menu servido, gastos de sesion y margen.">
      <div className="flex flex-wrap gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Sesion</Label>
          <Select value={selectedSessionId} onValueChange={setSessionId}>
            <SelectTrigger className="mt-2 w-72">
              <SelectValue placeholder="Elige una sesion" />
            </SelectTrigger>
            <SelectContent>
              {ops.sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {longDay(session.fecha)} · {hour(session.hora_inicio)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <div>
          <Label className="text-xs text-muted-foreground">Menus servidos</Label>
          <Input
            type="number"
            min={0}
            step="1"
            placeholder={String(activeReservationGuests)}
            value={servedOverride}
            onChange={(event) => setServedOverride(event.target.value)}
            className="mt-2 w-36"
          />
        </div>
        <NumberField label="Local" value={venueCost} onChange={setVenueCost} />
        <NumberField label="Barista" value={baristaCost} onChange={setBaristaCost} />
        <NumberField label="Otros gastos" value={otherCost} onChange={setOtherCost} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Costo menu" value={money(unitMenuCost)} hint="Recetas por persona" />
        <MetricCard label="Costo recetas" value={money(recipeSessionCost)} hint={`${servedMenus} menus servidos`} />
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
            {steps.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">El menu seleccionado no tiene tiempos.</p>
            ) : (
              steps.map((step) => {
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
                      {pairing?.name ?? (step.pairing_optional ? "Opcional" : "-")}
                    </span>
                    <span className="text-right tabular-nums">{money(unitCost)}</span>
                    <span className="text-right tabular-nums">{money(unitCost * servedMenus)}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="card-soft p-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-sm font-medium">Lectura de sesion</h2>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <CostLine label="Reservas activas" value={`${activeReservationGuests} personas`} />
            <CostLine label="Precio por persona" value={money(pricePerPerson)} />
            <CostLine label="Venta estimada" value={money(revenue)} />
            <CostLine label="Recetas" value={money(recipeSessionCost)} />
            <CostLine label="Local" value={money(venueCost)} />
            <CostLine label="Barista" value={money(baristaCost)} />
            <CostLine label="Otros" value={money(otherCost)} />
            <div className="border-t border-border pt-3">
              <CostLine label="Utilidad estimada" value={money(revenue - totalCost)} strong />
            </div>
          </dl>
        </aside>
      </div>
    </AdminShell>
  );
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
