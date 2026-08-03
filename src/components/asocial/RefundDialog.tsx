import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRefund } from "@/lib/admin.functions";
import { money } from "@/lib/format";

export function RefundDialog({
  open,
  onOpenChange,
  paymentId,
  amount,
  alreadyRefunded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  amount: number;
  alreadyRefunded: number;
}) {
  const queryClient = useQueryClient();
  const remaining = Math.max(amount - alreadyRefunded, 0);
  const [value, setValue] = useState(remaining);
  const [reason, setReason] = useState("");

  const refund = Number.isFinite(value) ? value : 0;
  const invalid = refund <= 0 || refund > remaining + 0.001 || reason.trim().length === 0;

  const submit = useMutation({
    mutationFn: () => createRefund({ data: { paymentId, amount: refund, reason: reason.trim() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast("Devolución registrada");
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos registrar la devolución"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar devolución</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <p>Pago original: {money(amount)}</p>
          <p className="text-muted-foreground">
            Devuelto: {money(alreadyRefunded)} · disponible {money(remaining)}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Monto a devolver</Label>
            <Input
              className="mt-2"
              type="number"
              min={0}
              step="0.5"
              max={remaining}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setValue(remaining)}>
                Total
              </Button>
              <Button size="sm" variant="outline" onClick={() => setValue(Math.round(remaining / 2))}>
                Mitad
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <Textarea className="mt-2 min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {refund > remaining ? (
            <p className="text-sm text-destructive">Solo puedes devolver hasta {money(remaining)}.</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || invalid}>
            {submit.isPending ? "Registrando…" : "Registrar devolución"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
