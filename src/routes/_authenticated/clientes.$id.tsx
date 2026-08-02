import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { EmptyState } from "@/components/asocial/EmptyState";
import { StatusPill } from "@/components/asocial/StatusPill";
import { workspaceQuery } from "@/lib/queries";
import { customerStats, paidAmount } from "@/lib/derive";
import { money, longDay, hour, shortDay } from "@/lib/format";
import { reservationStatusLabel, reservationStatusTone, type ReservationStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = useParams({ from: "/_authenticated/clientes/$id" });
  const { data: ws } = useQuery(workspaceQuery());

  if (!ws) {
    return (
      <AdminShell title="Cliente">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  const customer = ws.customers.find((c) => c.id === id);
  if (!customer) {
    return (
      <AdminShell title="Cliente">
        <EmptyState title="No encontramos a esta persona." action={<Link to="/clientes">Volver</Link>} />
      </AdminShell>
    );
  }

  const stats = customerStats(ws, id);

  return (
    <AdminShell
      title={`${customer.first_name} ${customer.last_name}`}
      description={[customer.phone, customer.email].filter(Boolean).join(" · ")}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Visitas" value={stats.attended} hint={`${stats.total} reservas`} />
        <MetricCard label="Gasto total" value={money(stats.spend)} />
        <MetricCard label="No shows" value={stats.noShows} hint={`${stats.cancelled} canceladas`} />
        <MetricCard
          label="Última visita"
          value={stats.lastVisit ? shortDay(stats.lastVisit) : "—"}
          hint={stats.firstVisit ? `Primera: ${shortDay(stats.firstVisit)}` : undefined}
        />
      </div>

      {customer.notes ? (
        <p className="card-soft mt-6 p-5 text-sm leading-relaxed text-muted-foreground">{customer.notes}</p>
      ) : null}

      <h2 className="mt-8 text-sm font-medium">Historial</h2>
      <div className="mt-4 space-y-3">
        {stats.reservations.length === 0 ? (
          <EmptyState title="Sin reservas todavía." />
        ) : (
          stats.reservations.map((r) => {
            const s = ws.sessions.find((x) => x.id === r.session_id);
            return (
              <div key={r.id} className="card-soft flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm">{s ? `${longDay(s.fecha)} · ${hour(s.hora_inicio)}` : "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.booking_code} · {r.guest_count}p · {money(paidAmount(ws, r.id))} de {money(r.total)}
                  </p>
                </div>
                <StatusPill tone={reservationStatusTone[r.reservation_status as ReservationStatus]}>
                  {reservationStatusLabel[r.reservation_status as ReservationStatus]}
                </StatusPill>
              </div>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
