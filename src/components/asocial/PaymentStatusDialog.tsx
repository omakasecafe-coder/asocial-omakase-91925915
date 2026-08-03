import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updatePaymentStatus } from "@/lib/admin.functions";
import { paymentTxnStatusLabel, type PaymentTxnStatus } from "@/lib/domain";
import { money } from "@/lib/format";

export function PaymentStatusDialog({
  open,
  onOpenChange,
  paymentId,
  amount,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  amount: number;
  current: PaymentTxnStatus;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PaymentTxnStatus>(current);
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: () => updatePaymentStatus({ data: { paymentId, status, notes: notes.trim() } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast(res.email?.sent ? "Estado actualizado y correo de pago enviado" : "Estado de pago actualizado");
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos actualizar el pago"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Actualizar estado del pago</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Monto registrado: {money(amount)}</p>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <div className="mt-2">
              <Select value={status} onValueChange={(v) => setStatus(v as PaymentTxnStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(paymentTxnStatusLabel) as PaymentTxnStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {paymentTxnStatusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nota (opcional)</Label>
            <Textarea className="mt-2 min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {status === "paid" && current !== "paid" ? (
            <p className="text-xs text-muted-foreground">
              Al marcar como pagado se enviará el correo de confirmación de pago.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || status === current}>
            {save.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
