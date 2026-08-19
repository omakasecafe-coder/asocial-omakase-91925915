import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/asocial/AdminShell";
import { EmptyState } from "@/components/asocial/EmptyState";
import { MetricCard } from "@/components/asocial/MetricCard";
import { PromotionDialog } from "@/components/asocial/PromotionDialog";
import { StatusPill } from "@/components/asocial/StatusPill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { deletePromotion, setPromotionActive } from "@/lib/admin.functions";
import { money, todayISO } from "@/lib/format";
import { workspaceQuery, type PromotionRow } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/promociones")({
  component: PromotionsPage,
});

function benefitLabel(promotion: PromotionRow) {
  if (promotion.discount_type === "free") return "Reserva gratuita";
  if (promotion.discount_type === "fixed") return `${money(promotion.discount_value)} de descuento`;
  return `${Number(promotion.discount_value).toLocaleString("es-PE")}% de descuento${
    promotion.max_discount ? ` · máx. ${money(promotion.max_discount)}` : ""
  }`;
}

function PromotionsPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(workspaceQuery());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const [deleting, setDeleting] = useState<PromotionRow | null>(null);

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setPromotionActive({ data: { id, active } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast(variables.active ? "Promoción activada" : "Promoción pausada");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No pudimos actualizarla"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePromotion({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast("Promoción eliminada");
      setDeleting(null);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No pudimos eliminarla"),
  });

  const metrics = useMemo(() => {
    if (!ws) return { active: 0, redemptions: 0, discounts: 0, revenue: 0 };
    const validReservationIds = new Set(
      ws.reservations
        .filter((reservation) => reservation.reservation_status !== "cancelled")
        .map((r) => r.id),
    );
    const redemptions = ws.promotionRedemptions.filter((item) =>
      validReservationIds.has(item.reservation_id),
    );
    const promotedIds = new Set(redemptions.map((item) => item.reservation_id));
    return {
      active: ws.promotions.filter((promotion) => promotion.active).length,
      redemptions: redemptions.length,
      discounts: redemptions.reduce((sum, item) => sum + Number(item.discount_amount), 0),
      revenue: ws.reservations
        .filter((reservation) => promotedIds.has(reservation.id))
        .reduce((sum, reservation) => sum + Number(reservation.total), 0),
    };
  }, [ws]);

  const today = todayISO();
  const sessions = (ws?.sessions ?? []).filter(
    (session) => session.estado !== "cancelled" && session.fecha >= today,
  );

  return (
    <AdminShell
      title="Promociones"
      description="Reglas automáticas y códigos promocionales."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Nueva promoción
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Promociones activas" value={metrics.active} />
        <MetricCard label="Usos registrados" value={metrics.redemptions} />
        <MetricCard label="Descuentos otorgados" value={money(metrics.discounts)} />
        <MetricCard label="Valor neto reservado" value={money(metrics.revenue)} />
      </div>

      <div className="mt-8 space-y-3">
        {!ws || ws.promotions.length === 0 ? (
          <EmptyState
            title="Aún no hay promociones."
            description="Crea una regla automática o un código promocional."
          />
        ) : (
          ws.promotions.map((promotion) => {
            const validUses = ws.promotionRedemptions.filter((item) => {
              const reservation = ws.reservations.find((row) => row.id === item.reservation_id);
              return (
                item.promotion_id === promotion.id &&
                reservation?.reservation_status !== "cancelled"
              );
            });
            return (
              <div key={promotion.id} className="card-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <BadgePercent className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <p className="text-sm font-medium">{promotion.name}</p>
                      {promotion.code ? (
                        <code className="rounded bg-muted px-2 py-0.5 text-xs">
                          {promotion.code}
                        </code>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-foreground">{benefitLabel(promotion)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {promotion.application_type === "automatic"
                        ? "Aplicación automática"
                        : "Requiere código"}
                      {promotion.min_guests > 1 ? ` · desde ${promotion.min_guests} personas` : ""}
                      {promotion.starts_on || promotion.ends_on
                        ? ` · ${promotion.starts_on ?? "sin inicio"} → ${promotion.ends_on ?? "sin fin"}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {validUses.length} usos
                      {promotion.usage_limit ? ` de ${promotion.usage_limit}` : ""} ·{" "}
                      {money(
                        validUses.reduce((sum, item) => sum + Number(item.discount_amount), 0),
                      )}{" "}
                      otorgados
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={promotion.active ? "musgo" : "muted"}>
                      {promotion.active ? "Activa" : "Pausada"}
                    </StatusPill>
                    <Button size="sm" variant="outline" onClick={() => setEditing(promotion)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: promotion.id, active: !promotion.active })}
                    >
                      {promotion.active ? "Pausar" : "Activar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(promotion)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {creating ? (
        <PromotionDialog
          open
          onOpenChange={(open) => !open && setCreating(false)}
          sessions={sessions}
        />
      ) : null}
      {editing ? (
        <PromotionDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          promotion={editing}
          sessions={sessions}
        />
      ) : null}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta promoción?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `Se eliminará “${deleting.name}” de forma permanente. Las reservas existentes conservarán sus montos y descuentos en los reportes.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              {remove.isPending ? "Eliminando…" : "Eliminar promoción"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
