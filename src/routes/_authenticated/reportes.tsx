import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { workspaceQuery } from "@/lib/queries";
import { reportMetrics, type PromotionReportFilter } from "@/lib/derive";
import { money, pct, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reportes")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data: ws } = useQuery(workspaceQuery());
  const today = todayISO();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [promotionFilter, setPromotionFilter] = useState<PromotionReportFilter>("all");

  if (!ws) {
    return (
      <AdminShell title="Reportes">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  const m = reportMetrics(ws, from, to, promotionFilter);

  return (
    <AdminShell title="Reportes" description="Una lectura tranquila del negocio.">
      <div className="flex flex-wrap gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-2 w-44"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Hasta</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-2 w-44"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Promociones</Label>
          <Select
            value={promotionFilter}
            onValueChange={(value) => setPromotionFilter(value as PromotionReportFilter)}
          >
            <SelectTrigger className="mt-2 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ventas</SelectItem>
              <SelectItem value="with_promotion">Con promoción</SelectItem>
              <SelectItem value="without_promotion">Sin promoción</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ingresos" value={money(m.revenue)} hint={`${m.reservations} reservas`} />
        <MetricCard label="Ocupación" value={pct(m.occupancy)} hint={`${m.guests} asistentes`} />
        <MetricCard
          label="Ticket promedio"
          value={money(m.averageTicket)}
          hint={`${money(m.revenuePerGuest)} por persona`}
        />
        <MetricCard
          label="No shows"
          value={pct(m.noShowRate)}
          hint={`Cancelaciones ${pct(m.cancellationRate)}`}
        />
        <MetricCard label="Clientes nuevos" value={m.newCustomers} />
        <MetricCard label="Clientes recurrentes" value={m.repeatCustomers} />
        <MetricCard
          label="Ventas con promoción"
          value={m.promotionalReservations}
          hint={`${pct(m.promotionShare)} de las reservas`}
        />
        <MetricCard
          label="Descuentos otorgados"
          value={money(m.discounts)}
          hint={`Bruto ${money(m.grossSales)}`}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Rendimiento por promoción</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          {m.promotionBreakdown.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No hay ventas con promoción en este periodo.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {m.promotionBreakdown.map((promotion) => (
                <div
                  key={`${promotion.name}-${promotion.code ?? "automatic"}`}
                  className="grid gap-2 p-4 text-sm sm:grid-cols-5 sm:items-center"
                >
                  <div className="sm:col-span-2">
                    <p>{promotion.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {promotion.code ? `Código ${promotion.code}` : "Automática"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {promotion.reservations} reservas · {promotion.guests} personas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Descuento {money(promotion.discount)}
                  </p>
                  <p className="text-right font-medium">Cobrado {money(promotion.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
