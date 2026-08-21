import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { resendReservationConfirmation } from "@/lib/admin.functions";

type ReservationEmailTarget = {
  id: string;
  bookingCode: string;
  email: string;
  sentAt: string | null;
};

const reasonMessage: Record<string, string> = {
  cancelled_reservation: "No se puede enviar una confirmación para una reserva cancelada.",
  lovable_api_key_not_configured: "El servicio de correo todavía no está configurado.",
  missing_email_context: "No se pudieron cargar los datos necesarios de la reserva.",
  missing_reservation: "La reserva ya no existe.",
  missing_template: "No se encontró la plantilla correspondiente.",
  no_recipient: "La reserva no tiene un correo válido.",
  rate_limited: "Espera un minuto antes de volver a enviar este correo.",
  template_disabled: "La plantilla de este correo está desactivada.",
};

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function ReservationEmailDialog({
  target,
  onOpenChange,
}: {
  target: ReservationEmailTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const send = useMutation({
    mutationFn: () => resendReservationConfirmation({ data: { reservationId: target?.id ?? "" } }),
    onSuccess: (result) => {
      if (!result.sent) {
        toast.error(
          reasonMessage[result.reason ?? ""] ??
            "No se pudo enviar el correo. Revisa los registros para ver el motivo.",
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast.success("Correo de confirmación enviado");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el correo"),
  });

  const isResend = Boolean(target?.sentAt);

  return (
    <AlertDialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isResend ? "¿Reenviar la confirmación?" : "¿Enviar la confirmación?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se enviará el correo correspondiente a la reserva {target?.bookingCode ?? ""} a{" "}
            <span className="font-medium text-foreground">
              {target ? maskEmail(target.email) : ""}
            </span>
            . Esta acción no modifica la reserva ni genera un cobro.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={send.isPending}>Volver</AlertDialogCancel>
          <AlertDialogAction
            disabled={send.isPending}
            onClick={(event) => {
              event.preventDefault();
              send.mutate();
            }}
          >
            {send.isPending
              ? "Enviando…"
              : isResend
                ? "Reenviar confirmación"
                : "Enviar confirmación"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
