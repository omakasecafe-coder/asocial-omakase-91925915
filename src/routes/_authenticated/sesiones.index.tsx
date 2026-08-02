import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/asocial/AdminShell";
import { StatusPill } from "@/components/asocial/StatusPill";
import { OccupancyBar } from "@/components/asocial/AvailabilityBadge";
import { EmptyState } from "@/components/asocial/EmptyState";
import { SessionDialog } from "@/components/asocial/SessionDialog";
import { Button } from "@/components/ui/button";
import { workspaceQuery, settingsQuery } from "@/lib/queries";
import { sessionStats } from "@/lib/derive";
import { hour, money, longDay, todayISO } from "@/lib/format";
import { sessionStatusLabel, sessionStatusTone, type SessionStatus } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sesiones/")({
  component: SessionsPage,
});

function SessionsPage() {
  const { data: ws } = useQuery(workspaceQuery());
  const { data: settings } = useQuery(settingsQuery());
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const today = todayISO();
  const sessions = (ws?.sessions ?? [])
    .filter((s) => (filter === "upcoming" ? s.fecha >= today : filter === "past" ? s.fecha < today : true))
    .sort((a, b) =>
      filter === "past" ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha),
    );

  return (
    <AdminShell
      title="Sesiones"
      description="Cada sesión es una barra con lugares contados."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Nueva sesión
        </Button>
      }
    >
      <div className="mb-6 flex gap-1">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition-colors duration-200",
              filter === f ? "bg-carbon text-lino" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "upcoming" ? "Próximas" : f === "past" ? "Pasadas" : "Todas"}
          </button>
        ))}
      </div>

      {sessions.length === 0 || !ws ? (
        <EmptyState title="Sin sesiones en esta vista." description="Crea una nueva para abrir reservas." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => {
            const stats = sessionStats(ws, s);
            return (
              <Link
                key={s.id}
                to="/sesiones/$id"
                params={{ id: s.id }}
                className="card-soft block p-5 transition-colors duration-200 hover:border-nogal/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{longDay(s.fecha)}</p>
                    <p className="mt-1 text-lg font-medium">{hour(s.hora_inicio)}</p>
                  </div>
                  <StatusPill tone={sessionStatusTone[s.estado as SessionStatus]}>
                    {sessionStatusLabel[s.estado as SessionStatus]}
                  </StatusPill>
                </div>
                <OccupancyBar value={stats.occupancy} className="mt-4" />
                <p className="mt-3 text-xs text-muted-foreground">
                  {stats.reserved}/{s.capacidad_maxima} lugares · {money(s.precio_por_persona)} por persona
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {open ? (
        <SessionDialog
          open={open}
          onOpenChange={setOpen}
          defaults={{
            capacity: settings?.default_capacity ?? 8,
            price: Number(settings?.default_price ?? 120),
            location: "Barra principal",
          }}
        />
      ) : null}
    </AdminShell>
  );
}
