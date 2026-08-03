import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelReservation } from "@/lib/admin.functions";

const REASONS = [
  "El cliente canceló",
  "El cliente no puede asistir",
  "Reprogramación pendiente",
  "Pago no completado",
];

export function CancelReservationDialog({
  open,
  onOpenChange,
  reservationId,
  bookingCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  bookingCode: string;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const cancel = useMutation({
    mutationFn: () => cancelReservation({ data: { reservationId, reason: reason.trim() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast("Reserva cancelada", { description: "El motivo quedó registrado en la bitácora." });
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos cancelar la reserva"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar reserva</DialogTitle>
          <DialogDescription>
            {bookingCode} · los lugares vuelven a quedar disponibles para la sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <Button key={r} size="sm" variant="outline" type="button" onClick={() => setReason(r)}>
                {r}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 200))}
              placeholder="Cuéntanos brevemente qué pasó"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancel.mutate()}
            disabled={reason.trim().length < 3 || cancel.isPending}
          >
            {cancel.isPending ? "Cancelando…" : "Cancelar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
