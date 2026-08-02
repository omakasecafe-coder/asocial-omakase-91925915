import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveSession } from "@/lib/admin.functions";
import { sessionStatusLabel, type SessionStatus } from "@/lib/domain";
import type { SessionRow } from "@/lib/queries";
import { todayISO } from "@/lib/format";

export function SessionDialog({
  open,
  onOpenChange,
  session,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: SessionRow | null;
  defaults?: { capacity: number; price: number; location: string };
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    fecha: session?.fecha ?? todayISO(),
    hora_inicio: (session?.hora_inicio ?? "19:00").slice(0, 5),
    hora_fin: (session?.hora_fin ?? "21:00").slice(0, 5),
    capacidad_maxima: session?.capacidad_maxima ?? defaults?.capacity ?? 8,
    precio_por_persona: Number(session?.precio_por_persona ?? defaults?.price ?? 120),
    ubicacion: session?.ubicacion ?? defaults?.location ?? "Barra principal",
    estado: (session?.estado ?? "draft") as SessionStatus,
    descripcion_publica: session?.descripcion_publica ?? "",
    notas_internas: session?.notas_internas ?? "",
  }));

  const save = useMutation({
    mutationFn: () =>
      saveSession({
        data: {
          ...(session ? { id: session.id } : {}),
          ...form,
          hora_inicio: `${form.hora_inicio}:00`.slice(0, 8),
          hora_fin: `${form.hora_fin}:00`.slice(0, 8),
          capacidad_maxima: Number(form.capacidad_maxima),
          precio_por_persona: Number(form.precio_por_persona),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["public-sessions"] });
      toast(session ? "Sesión actualizada" : "Sesión creada");
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos guardar la sesión"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{session ? "Editar sesión" : "Nueva sesión"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Fecha">
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Row>
          <Row label="Estado">
            <Select
              value={form.estado}
              onValueChange={(v) => setForm({ ...form, estado: v as SessionStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sessionStatusLabel) as SessionStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {sessionStatusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Hora de inicio">
            <Input
              type="time"
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
            />
          </Row>
          <Row label="Hora de fin">
            <Input
              type="time"
              value={form.hora_fin}
              onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
            />
          </Row>
          <Row label="Capacidad">
            <Input
              type="number"
              min={1}
              value={form.capacidad_maxima}
              onChange={(e) => setForm({ ...form, capacidad_maxima: Number(e.target.value) })}
            />
          </Row>
          <Row label="Precio por persona">
            <Input
              type="number"
              min={0}
              step="0.5"
              value={form.precio_por_persona}
              onChange={(e) => setForm({ ...form, precio_por_persona: Number(e.target.value) })}
            />
          </Row>
          <Row label="Ubicación" className="sm:col-span-2">
            <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
          </Row>
          <Row label="Descripción pública" className="sm:col-span-2">
            <Textarea
              value={form.descripcion_publica}
              onChange={(e) => setForm({ ...form, descripcion_publica: e.target.value })}
              className="min-h-20"
            />
          </Row>
          <Row label="Notas internas" className="sm:col-span-2">
            <Textarea
              value={form.notas_internas}
              onChange={(e) => setForm({ ...form, notas_internas: e.target.value })}
              className="min-h-20"
            />
          </Row>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
