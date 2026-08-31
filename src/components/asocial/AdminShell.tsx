import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Calculator,
  ChevronDown,
  Coffee,
  CreditCard,
  LayoutDashboard,
  LineChart,
  BadgePercent,
  BookOpen,
  Menu,
  Mail,
  Package,
  Settings as SettingsIcon,
  Ticket,
  Users,
  UserCog,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNewReservationsCount } from "@/hooks/use-new-reservations";
import { myAccessQuery } from "@/lib/queries";
import { canAccessModule } from "@/lib/modules";
import logoLight from "@/assets/asocial-logo-light.png.asset.json";

type NavItem = {
  to: string;
  key: string;
  label: string;
  icon: LucideIcon;
};

type NavEntry =
  | NavItem
  | {
      key: string;
      label: string;
      icon: LucideIcon;
      children: NavItem[];
    };

const nav: NavEntry[] = [
  { to: "/dashboard", key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendario", key: "calendario", label: "Calendario", icon: CalendarDays },
  { to: "/sesiones", key: "sesiones", label: "Sesiones", icon: Coffee },
  { to: "/reservas", key: "reservas", label: "Reservas", icon: Ticket },
  { to: "/clientes", key: "clientes", label: "Clientes", icon: Users },
  { to: "/pagos", key: "pagos", label: "Pagos", icon: CreditCard },
  {
    key: "operacion",
    label: "Operación",
    icon: Package,
    children: [
      { to: "/inventario", key: "inventario", label: "Inventario", icon: Package },
      { to: "/recetas", key: "recetas", label: "Recetas", icon: BookOpen },
      { to: "/costeo", key: "costeo", label: "Costeo", icon: Calculator },
    ],
  },
  { to: "/promociones", key: "promociones", label: "Promociones", icon: BadgePercent },
  { to: "/reportes", key: "reportes", label: "Reportes", icon: LineChart },
  { to: "/usuarios", key: "usuarios", label: "Usuarios", icon: UserCog },
  { to: "/configuracion", key: "configuracion", label: "Configuración", icon: SettingsIcon },
  { to: "/probar-correo", key: "probar-correo", label: "Probar correo", icon: Mail },
];

const navLinks = nav.flatMap((item) => ("children" in item ? item.children : [item]));

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const newReservations = useNewReservationsCount();
  const { data: access } = useQuery(myAccessQuery());
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const visible = nav
    .map((item) => {
      if (!("children" in item)) {
        return canAccessModule(access?.modules, access?.isAdmin ?? false, item.key) ? item : null;
      }
      const children = item.children.filter((child) =>
        canAccessModule(access?.modules, access?.isAdmin ?? false, child.key),
      );
      return children.length > 0 ? { ...item, children } : null;
    })
    .filter(Boolean) as NavEntry[];

  function renderLink(item: NavItem, nested = false) {
    const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
    return (
      <Link
        key={item.to}
        to={item.to as never}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200",
          nested ? "ml-5 pl-4" : "",
          active
            ? "bg-sidebar-accent text-sidebar-foreground"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        <item.icon className="h-4 w-4" strokeWidth={1.5} />
        <span className="flex-1">{item.label}</span>
        {item.to === "/reservas" && newReservations > 0 ? (
          <span
            aria-label={`${newReservations} reservas nuevas`}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-medium leading-none text-destructive-foreground"
          >
            {newReservations > 99 ? "99+" : newReservations}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {visible.map((item) => {
        if (!("children" in item)) return renderLink(item);

        const active = item.children.some(
          (child) => pathname === child.to || pathname.startsWith(`${child.to}/`),
        );
        const open = openGroups[item.key] ?? active;
        return (
          <div key={item.key} className="space-y-0.5">
            <button
              type="button"
              onClick={() => setOpenGroups((current) => ({ ...current, [item.key]: !open }))}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200", open ? "rotate-180" : "")}
                strokeWidth={1.5}
              />
            </button>
            {open ? <div className="space-y-0.5">{item.children.map((child) => renderLink(child, true))}</div> : null}
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-3 py-1">
      <img src={logoLight.url} alt="asocial · café omakase" className="h-9 w-auto" />
    </div>
  );
}

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const { data: access } = useQuery(myAccessQuery());
  const current = navLinks.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  const blocked = Boolean(
    access && current && !canAccessModule(access.modules, access.isAdmin, current.key),
  );
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-60 shrink-0 flex-col justify-between bg-sidebar px-3 py-6 md:flex">
        <div className="flex flex-col gap-8">
          <Brand />
          <NavList />
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors duration-200 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Salir
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-4 md:px-8 md:py-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
                <Menu className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-4 text-sidebar-foreground">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <div className="mt-4 flex flex-col gap-8">
                <Brand />
                <NavList onNavigate={() => setOpen(false)} />
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/50"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  Salir
                </button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-medium text-foreground">{title}</h1>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {blocked ? (
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              No tienes acceso a este módulo. Pide a un administrador que lo habilite.
            </p>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
