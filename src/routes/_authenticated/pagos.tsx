import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/asocial/AdminShell";
import { MetricCard } from "@/components/asocial/MetricCard";
import { EmptyState } from "@/components/asocial/EmptyState";
import { StatusPill } from "@/components/asocial/StatusPill";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentStatusDialog } from "@/components/asocial/PaymentStatusDialog";
import { RefundDialog } from "@/components/asocial/RefundDialog";
import { workspaceQuery } from "@/lib/queries";
import { customerName, paidAmount } from "@/lib/derive";
import { hour, longDay, money, todayISO } from "@/lib/format";
import {
  paymentMethodLabel,
  paymentTxnStatusLabel,
  paymentTxnStatusTone,
  type PaymentMethod,
  type PaymentTxnStatus,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/pagos")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: ws } = useQuery(workspaceQuery());
  // El módulo abre mostrando solo lo pendiente.
  const [filter, setFilter] = useState<string>("pending");
  const [statusFor, setStatusFor] = useState<{ id: string; amount: number; status: PaymentTxnStatus } | null>(
    null,
  );
  const [refundFor, setRefundFor] = useState<{ id: string; amount: number; refunded: number } | null>(null);

  const payments = useMemo(() => {
    if (!ws) return [];
    return ws.payments.filter((p) => filter === "all" || (p.status ?? "pending") === filter);
  }, [ws, filter]);

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
    .filter((p) => (p.paid_at ?? "").slice(0, 7) === month && (p.status ?? "pending") === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingRows = ws.reservations.filter(
    (r) => r.reservation_status !== "cancelled" && Number(r.total) - paidAmount(ws, r.id) > 0,
  );
  const pendingTotal = pendingRows.reduce((sum, r) => sum + (Number(r.total) - paidAmount(ws, r.id)), 0);
  const refundedTotal = ws.refunds.reduce((sum, r) => sum + Number(r.amount), 0);

  const refundedByPayment = new Map<string, number>();
  for (const r of ws.refunds) {
    refundedByPayment.set(r.payment_id, (refundedByPayment.get(r.payment_id) ?? 0) + Number(r.amount));
  }

  return (
    <AdminShell title="Pagos" description="Todo lo cobrado y lo que falta cobrar.">
      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Cobrado este mes" value={money(collectedMonth)} />
        <MetricCard label="Por cobrar" value={money(pendingTotal)} hint={`${pendingRows.length} reservas`} />
        <MetricCard label="Pagos registrados" value={ws.payments.length} />
        <MetricCard label="Devoluciones" value={money(refundedTotal)} hint={`${ws.refunds.length} registros`} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Pagos</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-52 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(paymentTxnStatusLabel) as PaymentTxnStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {paymentTxnStatusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 space-y-3">
        {payments.length === 0 ? (
          <EmptyState title="No hay pagos en esta vista." />
        ) : (
          payments.map((p) => {
            const r = ws.reservations.find((x) => x.id === p.reservation_id);
            const s = r ? ws.sessions.find((x) => x.id === r.session_id) : null;
            const status = (p.status ?? "pending") as PaymentTxnStatus;
            const refunded = refundedByPayment.get(p.id) ?? 0;
            return (
              <div key={p.id} className="card-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">{r ? customerName(ws, r.customer_id) : "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reserva: {s ? `${longDay(s.fecha)} · ${hour(s.hora_inicio)}` : "—"}
                      {r ? ` · ${r.booking_code}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pago registrado el{" "}
                      {new Date(p.paid_at).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                      {paymentMethodLabel[p.payment_method as PaymentMethod] ?? p.payment_method}
                      {p.transaction_reference ? ` · ${p.transaction_reference}` : ""}
                    </p>
                    {refunded > 0 ? (
                      <p className="mt-1 text-xs text-arcilla">Devuelto: {money(refunded)}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={paymentTxnStatusTone[status]}>{paymentTxnStatusLabel[status]}</StatusPill>
                    <p className="text-sm tabular-nums">{money(p.amount)}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatusFor({ id: p.id, amount: Number(p.amount), status })}
                    >
                      Estado
                    </Button>
                    {refunded < Number(p.amount) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRefundFor({ id: p.id, amount: Number(p.amount), refunded })}
                      >
                        Devolución
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <h2 className="mt-8 text-sm font-medium">Reservas por cobrar</h2>
      <div className="mt-4 space-y-3">
        {pendingRows.length === 0 ? (
          <EmptyState title="No hay pagos pendientes." />
        ) : (
          pendingRows.map((r) => {
            const s = ws.sessions.find((x) => x.id === r.session_id);
            return (
              <div key={r.id} className="card-soft flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm">{customerName(ws, r.customer_id)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.booking_code} · {s ? `${longDay(s.fecha)} · ${hour(s.hora_inicio)}` : "—"}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-arcilla">
                  {money(Number(r.total) - paidAmount(ws, r.id))}
                </p>
              </div>
            );
          })
        )}
      </div>

      {statusFor ? (
        <PaymentStatusDialog
          open
          onOpenChange={(o) => !o && setStatusFor(null)}
          paymentId={statusFor.id}
          amount={statusFor.amount}
          current={statusFor.status}
        />
      ) : null}
      {refundFor ? (
        <RefundDialog
          open
          onOpenChange={(o) => !o && setRefundFor(null)}
          paymentId={refundFor.id}
          amount={refundFor.amount}
          alreadyRefunded={refundFor.refunded}
        />
      ) : null}
    </AdminShell>
  );
}
