import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { StatusPill } from "@/components/asocial/StatusPill";
import { OccupancyBar } from "@/components/asocial/AvailabilityBadge";
import { EmptyState } from "@/components/asocial/EmptyState";
import { workspaceQuery } from "@/lib/queries";
import { dashboardMetrics, sessionStats, upcomingSessions, customerName, paidAmount } from "@/lib/derive";
import { hour, money, pct, relativeDay, longDay } from "@/lib/format";
import { reservationStage, reservationStageLabel, reservationStageTone } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: ws, isLoading } = useQuery(workspaceQuery());

  if (isLoading || !ws) {
    return (
      <AdminShell title="Dashboard">
        <p className="text-sm text-muted-foreground">Cargando el día…</p>
      </AdminShell>
    );
  }

  const m = dashboardMetrics(ws);
  const next = upcomingSessions(ws).slice(0, 5);
  const recent = ws.reservations.slice(0, 6);

  return (
    <AdminShell title="Dashboard" description={longDay(new Date().toISOString().slice(0, 10))}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sesiones hoy" value={m.todaySessionCount} hint={`${m.reserved} de ${m.capacity} lugares`} />
        <MetricCard label="Ocupación de hoy" value={pct(m.occupancy)} />
        <MetricCard label="Cobrado hoy" value={money(m.collectedToday)} hint={`Pendiente ${money(m.pendingAmount)}`} />
        <MetricCard label="Clientes" value={m.customers} hint={`${m.recurring} recurrentes`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card-soft p-5">
          <h2 className="text-sm font-medium">Próximas sesiones</h2>
          <div className="mt-4 space-y-4">
            {next.length === 0 ? (
              <EmptyState title="No hay sesiones programadas." />
            ) : (
              next.map((s) => {
                const stats = sessionStats(ws, s);
                return (
                  <Link
                    key={s.id}
                    to="/sesiones/$id"
                    params={{ id: s.id }}
                    className="block rounded-md px-1 py-1 transition-colors duration-200 hover:bg-secondary/60"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm">
                        {relativeDay(s.fecha)} · {hour(s.hora_inicio)}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {stats.reserved}/{s.capacidad_maxima}
                      </p>
                    </div>
                    <OccupancyBar value={stats.occupancy} className="mt-2" />
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className="card-soft p-5">
          <h2 className="text-sm font-medium">Reservas recientes</h2>
          <div className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <EmptyState title="Aún no hay reservas." />
            ) : (
              recent.map((r) => {
                const s = ws.sessions.find((x) => x.id === r.session_id);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{customerName(ws, r.customer_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s ? `${relativeDay(s.fecha)} · ${hour(s.hora_inicio)}` : "—"} · {r.guest_count}p ·{" "}
                        {money(paidAmount(ws, r.id))} de {money(r.total)}
                      </p>
                    </div>
                    <StatusPill tone={reservationStageTone[reservationStage(r.reservation_status, s)]}>
                      {reservationStageLabel[reservationStage(r.reservation_status, s)]}
                    </StatusPill>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
