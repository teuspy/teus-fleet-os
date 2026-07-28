"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Truck, Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nombre_completo: email.split("@")[0] },
          },
        });
        if (error) throw error;
        setError("✓ Cuenta creada. Revisá tu email para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teus-accent/10 border border-teus-accent/30 mb-4"
               style={{ animation: "pulseGlow 2s infinite" }}>
            <Truck className="w-8 h-8 text-teus-accent" />
          </div>
          <h1 className="text-5xl font-black tracking-tight">
            teu<span className="text-teus-accent">s</span>
            <span className="text-teus-accent">.</span>
          </h1>
          <p className="text-xs text-teus-text-dim tracking-[4px] uppercase mt-2">
            End to end logistics
          </p>
        </div>

        {/* Card */}
        <div className="bg-gradient-to-br from-teus-card to-teus-card-2 border border-teus-border rounded-2xl p-8 shadow-2xl animate-slide-up">
          <h2 className="text-xl font-bold mb-1">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p className="text-sm text-teus-text-dim mb-6">
            {mode === "login"
              ? "Ingresá a tu panel de flota"
              : "Registrate para usar TEUS Fleet OS"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">
                Email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text-dim" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-10 py-3 text-sm text-white placeholder-teus-text-dim/50 focus:outline-none focus:border-teus-accent transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text-dim" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-10 py-3 text-sm text-white placeholder-teus-text-dim/50 focus:outline-none focus:border-teus-accent transition"
                />
              </div>
            </div>

            {error && (
              <div
                className={`text-sm px-3 py-2 rounded-lg border ${
                  error.startsWith("✓")
                    ? "bg-teus-accent/10 border-teus-accent/30 text-teus-accent"
                    : "bg-teus-danger/10 border-teus-danger/30 text-teus-danger"
                }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teus-accent to-teus-accent-2 text-teus-bg font-bold py-3 rounded-lg shadow-lg shadow-teus-accent/30 hover:shadow-teus-accent/50 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Ingresar" : "Registrarme"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-teus-border text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="text-sm text-teus-text-dim hover:text-teus-accent transition"
            >
              {mode === "login"
                ? "¿No tenés cuenta? Registrate"
                : "¿Ya tenés cuenta? Ingresá"}
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-teus-text-dim tracking-widest">
          TEUS FLEET OS · v1.0
        </div>
      </div>
    </div>
  );
}
