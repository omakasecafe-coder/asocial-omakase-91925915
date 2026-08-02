import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workspaceQuery } from "@/lib/queries";
import { reportMetrics } from "@/lib/derive";
import { money, pct, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reportes")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data: ws } = useQuery(workspaceQuery());
  const today = todayISO();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);

  if (!ws) {
    return (
      <AdminShell title="Reportes">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  const m = reportMetrics(ws, from, to);

  return (
    <AdminShell title="Reportes" description="Una lectura tranquila del negocio.">
      <div className="flex flex-wrap gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-2 w-44" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Hasta</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-2 w-44" />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ingresos" value={money(m.revenue)} hint={`${m.reservations} reservas`} />
        <MetricCard label="Ocupación" value={pct(m.occupancy)} hint={`${m.guests} asistentes`} />
        <MetricCard label="Ticket promedio" value={money(m.averageTicket)} hint={`${money(m.revenuePerGuest)} por persona`} />
        <MetricCard label="No shows" value={pct(m.noShowRate)} hint={`Cancelaciones ${pct(m.cancellationRate)}`} />
        <MetricCard label="Clientes nuevos" value={m.newCustomers} />
        <MetricCard label="Clientes recurrentes" value={m.repeatCustomers} />
      </div>
    </AdminShell>
  );
}
