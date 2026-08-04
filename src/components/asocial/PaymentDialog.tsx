import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerPayment } from "@/lib/admin.functions";
import { paymentMethodLabel, type PaymentMethod } from "@/lib/domain";
import { money, todayISO } from "@/lib/format";

export function PaymentDialog({
  open,
  onOpenChange,
  reservationId,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  pending: number;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(Math.max(pending, 0));
  const [method, setMethod] = useState<PaymentMethod>("yape");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [reference, setReference] = useState("");

  const save = useMutation({
    mutationFn: () =>
      registerPayment({
        data: { reservationId, amount: Number(amount), method, paidAt, reference: reference.trim(), notes: "" },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast(res.email?.sent ? "Pago validado y correo de confirmación enviado" : "Pago registrado");
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos registrar el pago"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Pendiente: {money(pending)}</p>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Monto</Label>
            <Input
              type="number"
              min={0.01}
              step="0.5"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Método</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {paymentMethodLabel[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Referencia (opcional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-2" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || amount <= 0}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
