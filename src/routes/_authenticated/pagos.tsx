import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { EmptyState } from "@/components/asocial/EmptyState";
import { workspaceQuery } from "@/lib/queries";
import { customerName, paidAmount } from "@/lib/derive";
import { money, shortDay, todayISO } from "@/lib/format";
import { paymentMethodLabel, type PaymentMethod } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/pagos")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: ws } = useQuery(workspaceQuery());

  if (!ws) {
    return (
      <AdminShell title="Pagos">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  const today = todayISO();
  const month = today.slice(0, 7);
  const collectedMonth = ws.payments
    .filter((p) => (p.paid_at ?? "").slice(0, 7) === month)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingRows = ws.reservations.filter(
    (r) => r.reservation_status !== "cancelled" && Number(r.total) - paidAmount(ws, r.id) > 0,
  );
  const pendingTotal = pendingRows.reduce((sum, r) => sum + (Number(r.total) - paidAmount(ws, r.id)), 0);

  return (
    <AdminShell title="Pagos" description="Todo lo cobrado y lo que falta cobrar.">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Cobrado este mes" value={money(collectedMonth)} />
        <MetricCard label="Por cobrar" value={money(pendingTotal)} hint={`${pendingRows.length} reservas`} />
        <MetricCard label="Pagos registrados" value={ws.payments.length} />
      </div>

      <h2 className="mt-8 text-sm font-medium">Pendientes</h2>
      <div className="mt-4 space-y-3">
        {pendingRows.length === 0 ? (
          <EmptyState title="No hay pagos pendientes." />
        ) : (
          pendingRows.map((r) => (
            <div key={r.id} className="card-soft flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm">{customerName(ws, r.customer_id)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.booking_code}</p>
              </div>
              <p className="text-sm tabular-nums text-arcilla">
                {money(Number(r.total) - paidAmount(ws, r.id))}
              </p>
            </div>
          ))
        )}
      </div>

      <h2 className="mt-8 text-sm font-medium">Historial de pagos</h2>
      <div className="mt-4 space-y-3">
        {ws.payments.length === 0 ? (
          <EmptyState title="Aún no registras pagos." />
        ) : (
          ws.payments.map((p) => {
            const r = ws.reservations.find((x) => x.id === p.reservation_id);
            return (
              <div key={p.id} className="card-soft flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm">{r ? customerName(ws, r.customer_id) : "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shortDay((p.paid_at ?? "").slice(0, 10))} ·{" "}
                    {paymentMethodLabel[p.payment_method as PaymentMethod] ?? p.payment_method}
                    {p.transaction_reference ? ` · ${p.transaction_reference}` : ""}
                  </p>
                </div>
                <p className="text-sm tabular-nums">{money(p.amount)}</p>
              </div>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
