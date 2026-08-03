import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffRole } from "@/lib/admin.functions";
import logoDark from "@/assets/asocial-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso del equipo · asocial" },
      { name: "description", content: "Ingreso al panel de gestión de asocial café omakase." },
      { property: "og:title", content: "Acceso del equipo · asocial" },
      { property: "og:description", content: "Ingreso al panel de gestión de asocial café omakase." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        if (!data.session) {
          toast("Revisa tu correo para confirmar la cuenta.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await ensureStaffRole();
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "No pudimos completar el acceso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="block">
          <img src={logoDark.url} alt="asocial · café omakase" className="h-12 w-auto" />
        </Link>

        <h1 className="mt-10 text-xl font-medium">
          {mode === "signin" ? "Entrar al panel" : "Crear acceso"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este espacio es para el equipo de sala.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs text-muted-foreground">
              Correo
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs text-muted-foreground">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-card"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Un momento…" : mode === "signin" ? "Entrar" : "Crear acceso"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "Aún no tengo acceso" : "Ya tengo acceso"}
        </button>
      </div>
    </div>
  );
}
