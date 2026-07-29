import { createClient } from "@/lib/supabase/server";
import { Truck, Users, Building2, MapPin, TrendingUp, ArrowUpRight, ClipboardList, DollarSign, Wallet } from "lucide-react";
import Link from "next/link";

function fmtGs(n: number) {
  return "Gs. " + (n || 0).toLocaleString("es-PY");
}
function fmtGsShort(n: number) {
  if (!n) return "Gs. 0";
  if (n >= 1_000_000) return "Gs. " + (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return "Gs. " + (n / 1_000).toFixed(0) + "K";
  return "Gs. " + n.toLocaleString("es-PY");
}

const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function DashboardPage() {
  const supabase = createClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const [
    { count: vehiculosCount },
    { count: choferesCount },
    { count: clientesCount },
    { count: rutasCount },
    { data: gastosFijos },
    { data: vehiculos },
    { data: viajesMes },
  ] = await Promise.all([
    supabase.from("vehiculos").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("choferes").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("clientes").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.from("rutas").select("*", { count: "exact", head: true }),
    supabase.from("gastos_fijos").select("monto_mensual").eq("activo", true),
    supabase.from("vehiculos").select("*").eq("activo", true).eq("tipo", "tracto"),
    supabase.from("viajes").select("precio_flete, utilidad_bruta, km_viaje").gte("fecha", startDate).lte("fecha", endDate),
  ]);

  const totalGastosFijos = (gastosFijos || []).reduce((acc, g: any) => acc + (g.monto_mensual || 0), 0);
  const totalViajesMes = viajesMes?.length || 0;
  const facturacionMes = (viajesMes || []).reduce((s, v: any) => s + (v.precio_flete || 0), 0);
  const utilidadBrutaMes = (viajesMes || []).reduce((s, v: any) => s + (v.utilidad_bruta || 0), 0);
  const utilidadNeta = utilidadBrutaMes - totalGastosFijos;
  const kmMes = (viajesMes || []).reduce((s, v: any) => s + (v.km_viaje || 0), 0);

  const kpis = [
    { label: "Vehículos activos", value: vehiculosCount || 0, icon: Truck, sub: "Tractos + Semirremolques" },
    { label: "Choferes activos", value: choferesCount || 0, icon: Users, sub: "En operación" },
    { label: "Clientes activos", value: clientesCount || 0, icon: Building2, sub: "Base actual" },
    { label: "Rutas cargadas", value: rutasCount || 0, icon: MapPin, sub: "Con km precalculados" },
  ];

  return (
    <div className="px-8 py-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark">
            Dashboard <span className="text-teus-accent">·</span>{" "}
            <span className="text-teus-text_muted font-semibold">
              {MESES_ES[month-1]} de {year}
            </span>
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Bienvenido de vuelta 👋
          </p>
        </div>
        <Link
          href="/viajes/nuevo"
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm inline-flex items-center gap-2"
        >
          + Nuevo Viaje
        </Link>
      </div>

      {/* Producción del mes — cards principales */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link href="/viajes" className="bg-teus-card_light border border-teus-border_light rounded-2xl p-5 shadow-card hover:-translate-y-1 hover:shadow-card-hover hover:border-teus-accent transition-all animate-slide-up group">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[11px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Viajes del mes</div>
            <div className="w-10 h-10 rounded-xl bg-teus-accent/10 flex items-center justify-center group-hover:bg-teus-accent group-hover:text-white transition"><ClipboardList className="w-5 h-5 text-teus-accent group-hover:text-white transition" /></div>
          </div>
          <div className="text-4xl font-black tracking-tight text-teus-text_dark">{totalViajesMes}</div>
          <div className="text-xs text-teus-text_soft mt-1">{kmMes.toLocaleString("es-PY")} km recorridos</div>
        </Link>
        <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-5 shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "backwards" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="text-[11px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Facturación</div>
            <div className="w-10 h-10 rounded-xl bg-teus-accent/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-teus-accent" /></div>
          </div>
          <div className="text-3xl font-black tracking-tight text-teus-text_dark">{fmtGsShort(facturacionMes)}</div>
          <div className="text-xs text-teus-text_soft mt-1">{fmtGs(facturacionMes)}</div>
        </div>
        <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-5 shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "backwards" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="text-[11px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Utilidad Bruta</div>
            <div className="w-10 h-10 rounded-xl bg-teus-accent/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-teus-accent" /></div>
          </div>
          <div className="text-3xl font-black tracking-tight text-teus-text_dark">{fmtGsShort(utilidadBrutaMes)}</div>
          <div className="text-xs text-teus-accent font-bold mt-1">{facturacionMes ? ((utilidadBrutaMes/facturacionMes)*100).toFixed(1) : 0}% margen bruto</div>
        </div>
        <div className={`rounded-2xl p-5 shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all animate-slide-up border ${utilidadNeta >= 0 ? "bg-teus-card_light border-teus-border_light" : "bg-teus-danger-light border-teus-danger/30"}`} style={{ animationDelay: "0.24s", animationFillMode: "backwards" }}>
          <div className="flex items-start justify-between mb-2">
            <div className={`text-[11px] uppercase tracking-[1.5px] font-bold ${utilidadNeta >= 0 ? "text-teus-text_muted" : "text-teus-danger"}`}>Utilidad Neta</div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${utilidadNeta >= 0 ? "bg-teus-accent" : "bg-teus-danger"}`}><Wallet className="w-5 h-5 text-white" /></div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${utilidadNeta >= 0 ? "text-teus-text_dark" : "text-teus-danger"}`}>{fmtGsShort(utilidadNeta)}</div>
          <div className="text-[10px] text-teus-text_soft mt-1">Bruta − Gastos fijos</div>
        </div>
      </div>

      {/* Card destacada: gastos fijos */}
      <div className="teus-highlight-bg border rounded-2xl p-6 mb-6 relative overflow-hidden shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-teus-accent uppercase tracking-[2px] font-black">
              Gastos Fijos Mensuales
            </div>
            <div className="text-4xl font-black mt-2 tracking-tight text-teus-text_dark">
              {fmtGs(totalGastosFijos)}
            </div>
            <div className="text-xs text-teus-text_muted mt-1">
              Préstamos · Salarios · Seguros · Operativos
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-teus-text_muted uppercase tracking-wider font-bold">Break-even</div>
            <div className="text-2xl font-black text-teus-accent mt-1">
              {facturacionMes > 0 ? Math.ceil(totalGastosFijos / (facturacionMes / (totalViajesMes || 1))) : "—"} viajes
            </div>
            <div className="text-[10px] text-teus-text_soft mt-0.5">
              Actualmente: {totalViajesMes} viajes {totalViajesMes >= Math.ceil(totalGastosFijos / (facturacionMes / (totalViajesMes || 1))) && facturacionMes > 0 ? "✓" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Catálogos rápidos */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="bg-teus-card_light border border-teus-border_light rounded-2xl p-4 relative overflow-hidden animate-slide-up hover:-translate-y-1 hover:shadow-card-hover transition-all shadow-card"
              style={{ animationDelay: `${0.3 + i * 0.05}s`, animationFillMode: "backwards" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-[10px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">
                  {k.label}
                </div>
                <div className="w-8 h-8 rounded-lg bg-teus-accent/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-teus-accent" />
                </div>
              </div>
              <div className="text-2xl font-black tracking-tight text-teus-text_dark">{k.value}</div>
              <div className="text-[10px] text-teus-text_soft mt-1">{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Flota */}
      <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-lg font-bold text-teus-text_dark flex items-center gap-2">
              <Truck className="w-5 h-5 text-teus-accent" />
              Flota — Tractocamiones activos
            </div>
            <div className="text-xs text-teus-text_muted mt-0.5">
              {vehiculos?.length || 0} equipos en operación
            </div>
          </div>
          <Link
            href="/vehiculos"
            className="text-xs font-bold text-teus-accent hover:underline inline-flex items-center gap-1"
          >
            Ver todos <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(vehiculos || []).map((v: any) => (
            <Link
              key={v.id}
              href="/vehiculos"
              className="bg-teus-hover_light border border-teus-border_light rounded-xl p-4 relative hover:border-teus-accent hover:-translate-y-1 hover:shadow-card-hover transition-all cursor-pointer group"
            >
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teus-accent shadow-[0_0_12px_#26D07C] animate-pulse-slow" />
              <div className="font-black text-lg tracking-tight text-teus-text_dark">{v.nombre_equipo}</div>
              <div className="text-[11px] text-teus-text_muted font-mono tracking-wider mt-1">
                {v.chapa}
              </div>
              <div className="text-xs text-teus-accent font-bold mt-2 flex items-center gap-1">
                {(v.km_actual || 0).toLocaleString("es-PY")} <span className="text-teus-text_soft font-medium">km</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="text-center text-[10px] text-teus-text_soft mt-10 tracking-[2px] uppercase font-semibold">
        TEUS FLEET OS · v1.2 · End to end logistics
      </div>
    </div>
  );
}
