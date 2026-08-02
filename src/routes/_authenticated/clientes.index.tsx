import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/asocial/AdminShell";
import { SearchInput } from "@/components/asocial/SearchInput";
import { EmptyState } from "@/components/asocial/EmptyState";
import { StatusPill } from "@/components/asocial/StatusPill";
import { workspaceQuery } from "@/lib/queries";
import { customerStats } from "@/lib/derive";
import { money, initials, shortDay } from "@/lib/format";
import { customerTier } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/clientes/")({
  component: CustomersPage,
});

function CustomersPage() {
  const { data: ws } = useQuery(workspaceQuery());
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!ws) return [];
    const term = q.trim().toLowerCase();
    return ws.customers
      .map((c) => ({ customer: c, stats: customerStats(ws, c.id) }))
      .filter(({ customer }) =>
        term
          ? `${customer.first_name} ${customer.last_name} ${customer.email} ${customer.phone}`
              .toLowerCase()
              .includes(term)
          : true,
      )
      .sort((a, b) => b.stats.attended - a.stats.attended);
  }, [ws, q]);

  return (
    <AdminShell title="Clientes" description={`${rows.length} personas`}>
      <SearchInput value={q} onChange={setQ} placeholder="Nombre, email o teléfono" className="w-full sm:w-72" />

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <EmptyState title="Sin clientes que coincidan." />
        ) : (
          rows.map(({ customer, stats }) => (
            <Link
              key={customer.id}
              to="/clientes/$id"
              params={{ id: customer.id }}
              className="card-soft flex items-center justify-between gap-4 p-4 transition-colors duration-200 hover:border-nogal/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
                  {initials(customer.first_name, customer.last_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {customer.phone || customer.email || "Sin contacto"}
                    {stats.lastVisit ? ` · última visita ${shortDay(stats.lastVisit)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">{money(stats.spend)}</span>
                <StatusPill tone={stats.attended >= 3 ? "musgo" : "muted"}>
                  {customerTier(stats.attended)}
                </StatusPill>
              </div>
            </Link>
          ))
        )}
      </div>
    </AdminShell>
  );
}
