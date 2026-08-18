export const APP_MODULES = [
  { key: "dashboard", label: "Dashboard", to: "/dashboard" },
  { key: "calendario", label: "Calendario", to: "/calendario" },
  { key: "sesiones", label: "Sesiones", to: "/sesiones" },
  { key: "reservas", label: "Reservas", to: "/reservas" },
  { key: "clientes", label: "Clientes", to: "/clientes" },
  { key: "pagos", label: "Pagos", to: "/pagos" },
  { key: "promociones", label: "Promociones", to: "/promociones" },
  { key: "reportes", label: "Reportes", to: "/reportes" },
  { key: "usuarios", label: "Usuarios", to: "/usuarios" },
  { key: "configuracion", label: "Configuración", to: "/configuracion" },
  { key: "probar-correo", label: "Probar correo", to: "/probar-correo" },
] as const;

export type ModuleKey = (typeof APP_MODULES)[number]["key"];

export const MODULE_KEYS = APP_MODULES.map((m) => m.key) as ModuleKey[];

/** Empty/null modules = full access (admins and legacy users). */
export function canAccessModule(
  modules: string[] | null | undefined,
  isAdmin: boolean,
  key: string,
): boolean {
  if (isAdmin) return true;
  if (!modules || modules.length === 0) return true;
  return modules.includes(key);
}
