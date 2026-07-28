import { createClient } from "@/lib/supabase/server";
import { Truck, Users, Building2, MapPin, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";

function fmtGs(n: number) {
  return "Gs. " + n.toLocaleString("es-PY");
}

export default async function DashboardPage() {
  const supabase = createClient();

  const [
    { count: vehiculosCount },
    { count: choferesCount },
    { count: clientesCount },
    { count: rutasCount },
    { data: gastosFijos },
    { data: vehiculos },
  ] = await Promise.all([
    supabase.from("vehiculos").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("choferes").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("clientes").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("rutas").select("*", { count: "exact", head: true }),
    supabase.from("gastos_fijos").select("monto_mensual").eq("activo", true),
    supabase.from("vehiculos").select("*").eq("activo", true).eq("tipo", "tracto"),
  ]);

  const totalGastosFijos = (gastosFijos || []).reduce(
    (acc, g: any) => acc + (g.monto_mensual || 0),
    0
  );

  const kpis = [
    { label: "Vehículos activos", value: vehiculosCount || 0, icon: Truck, color: "text-teus-accent" },
    { label: "Choferes activos", value: choferesCount || 0, icon: Users, color: "text-teus-accent" },
    { label: "Clientes activos", value: clientesCount || 0, icon: Building2, color: "text-teus-accent" },
    { label: "Rutas cargadas", value: rutasCount || 0, icon: MapPin, color: "text-teus-accent" },
  ];

  return (
    <div className="px-8 py-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Dashboard <span className="text-teus-accent">·</span>{" "}
            <span className="text-teus-text-dim font-medium">
              {new Date().toLocaleDateString("es-PY", { month: "long", year: "numeric" })}
            </span>
          </h1>
          <p className="text-sm text-teus-text-dim mt-1">
            Bienvenido de vuelta 👋
          </p>
        </div>
        <Link
          href="/viajes/nuevo"
          className="bg-gradient-to-r from-teus-accent to-teus-accent-2 text-teus-bg font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-teus-accent/30 hover:shadow-teus-accent/50 transition-all hover:-translate-y-0.5 text-sm"
        >
          + Nuevo Viaje
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="bg-gradient-to-br from-teus-card to-teus-card-2 border border-teus-border rounded-2xl p-5 relative overflow-hidden animate-slide-up hover:-translate-y-1 hover:shadow-xl hover:shadow-teus-accent/20 transition-all"
              style={{ animationDelay: `${i * 0.08}s`, animationFillMode: "backwards" }}
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-teus-accent/10 blur-2xl" />
              <div className="flex items-start justify-between mb-3">
                <div className="text-[10px] text-teus-text-dim uppercase tracking-[1.5px] font-semibold">
                  {k.label}
                </div>
                <Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div className="text-3xl font-black tracking-tight">{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* Card destacada: gastos fijos */}
      <div
        className="border rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(38,208,124,.12), rgba(38,208,124,.02))",
          borderColor: "rgba(38,208,124,0.4)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-teus-accent uppercase tracking-[2px] font-bold">
              Gastos Fijos Mensuales
            </div>
            <div className="text-4xl font-black mt-2 tracking-tight">
              {fmtGs(totalGastosFijos)}
            </div>
            <div className="text-xs text-teus-text-dim mt-1">
              Préstamos · Salarios · Seguros · Operativos
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-teus-accent/20 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-teus-accent" />
          </div>
        </div>
      </div>

      {/* Flota */}
      <div className="bg-gradient-to-br from-teus-card to-teus-card-2 border border-teus-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-bold">🚛 Flota — Tractocamiones activos</div>
            <div className="text-xs text-teus-text-dim mt-0.5">
              {vehiculos?.length || 0} equipos en operación
            </div>
          </div>
          <Link
            href="/vehiculos"
            className="text-xs font-semibold text-teus-accent hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(vehiculos || []).map((v: any) => (
            <div
              key={v.id}
              className="bg-black/20 border border-teus-border rounded-xl p-4 relative hover:border-teus-accent hover:-translate-y-1 hover:shadow-lg hover:shadow-teus-accent/10 transition-all cursor-pointer"
            >
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teus-accent shadow-[0_0_12px_#26D07C] animate-pulse-slow" />
              <div className="font-black text-lg tracking-tight">{v.nombre_equipo}</div>
              <div className="text-[11px] text-teus-text-dim font-mono tracking-wider mt-1">
                {v.chapa}
              </div>
              <div className="text-xs text-teus-accent font-semibold mt-2">
                KM: {(v.km_actual || 0).toLocaleString("es-PY")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-[10px] text-teus-text-dim mt-10 tracking-[2px]">
        TEUS FLEET OS · v1.0 · End to end logistics
      </div>
    </div>
  );
}
