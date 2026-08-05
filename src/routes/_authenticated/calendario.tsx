import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminShell } from "@/components/asocial/AdminShell";
import { Button } from "@/components/ui/button";
import { workspaceQuery } from "@/lib/queries";
import { sessionStats } from "@/lib/derive";
import { hour, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Workspace, SessionRow } from "@/lib/queries";

function sessionCalendarStyle(ws: Workspace, s: SessionRow) {
  const { reserved, available } = sessionStats(ws, s);
  if (available <= 0) {
    return "bg-carbon text-lino hover:bg-carbon/80";
  }
  if (reserved === 0) {
    return "bg-secondary text-muted-foreground hover:bg-nogal/15";
  }
  return "bg-musgo/15 text-musgo hover:bg-musgo/25";
}


export const Route = createFileRoute("/_authenticated/calendario")({
  component: CalendarPage,
});

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days: (string | null)[] = Array.from({ length: offset }, () => null);
  const total = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    days.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function CalendarPage() {
  const { data: ws } = useQuery(workspaceQuery());
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const days = monthMatrix(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });

  function shift(delta: number) {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <AdminShell
      title="Calendario"
      description={monthLabel}
      actions={
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="bg-card px-2 py-2 text-center text-[11px] text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((iso, i) => {
          const sessions = ws?.sessions.filter((s) => s.fecha === iso && s.estado !== "cancelled") ?? [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-24 bg-card p-2 align-top",
                iso === todayISO() && "bg-secondary",
                !iso && "bg-background/40",
              )}
            >
              {iso ? (
                <>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{Number(iso.slice(8))}</p>
                  <div className="mt-1 space-y-1">
                    {sessions.map((s) => {
                      const stats = ws ? sessionStats(ws, s) : { reserved: 0 };
                      return (
                        <Link
                          key={s.id}
                          to="/sesiones/$id"
                          params={{ id: s.id }}
                          className="block truncate rounded bg-secondary px-1.5 py-1 text-[11px] transition-colors duration-200 hover:bg-nogal/15"
                        >
                          {hour(s.hora_inicio)} · {stats.reserved}/{s.capacidad_maxima}
                        </Link>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
