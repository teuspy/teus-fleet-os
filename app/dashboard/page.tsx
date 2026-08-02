"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Truck, Users, Building2, MapPin, TrendingUp, ArrowUpRight, ClipboardList, DollarSign, Wallet, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";

function fmtGs(n: number) {
  const sign = n < 0 ? "-" : "";
  return sign + "Gs. " + Math.abs(n || 0).toLocaleString("es-PY");
}

const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type EquipoStats = { viajes: number; km: number; facturacion: number; utilidadBruta: number; gastoFlota: number; utilidadNeta: number };

export default function DashboardPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState({
    vehiculosCount: 0,
    choferesCount: 0,
    clientesCount: 0,
    rutasCount: 0,
    totalGastosFijosEquipos: 0,
    totalGastosFijosOficina: 0,
    totalGastosFlota: 0,
    totalViajesMes: 0,
    facturacionMes: 0,
    utilidadBrutaMes: 0,
    kmMes: 0,
    vehiculos: [] as any[],
    statsPorEquipo: {} as Record<string, EquipoStats>,
  });

  async function loadData() {
    setLoading(true);
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
      { data: gastosMes },
    ] = await Promise.all([
      supabase.from("vehiculos").select("*", { count: "exact", head: true }).eq("activo", true),
      supabase.from("choferes").select("*", { count: "exact", head: true }).eq("activo", true),
      supabase.from("clientes").select("*", { count: "exact", head: true }).eq("activo", true),
      supabase.from("rutas").select("*", { count: "exact", head: true }),
      supabase.from("gastos_fijos").select("monto_mensual, aplica_a").eq("activo", true),
      supabase.from("vehiculos").select("*").eq("activo", true).eq("tipo", "tracto"),
      supabase.from("viajes").select("vehiculo_id, precio_flete, utilidad_bruta, km_viaje").gte("fecha", startDate).lte("fecha", endDate),
      supabase.from("gastos").select("monto, vehiculo:vehiculo_id(alias)").gte("fecha", startDate).lte("fecha", endDate),
    ]);

    const gfEquipos = (gastosFijos || []).filter((g: any) => g.aplica_a === "equipos").reduce((s, g: any) => s + (g.monto_mensual || 0), 0);
    const gfOficina = (gastosFijos || []).filter((g: any) => g.aplica_a === "oficina").reduce((s, g: any) => s + (g.monto_mensual || 0), 0);
    const totalGastosFlota = (gastosMes || []).reduce((s, g: any) => s + (g.monto || 0), 0);
    const totalViajesMes = viajesMes?.length || 0;
    const facturacionMes = (viajesMes || []).reduce((s, v: any) => s + (v.precio_flete || 0), 0);
    const utilidadBrutaMes = (viajesMes || []).reduce((s, v: any) => s + (v.utilidad_bruta || 0), 0);
    const kmMes = (viajesMes || []).reduce((s, v: any) => s + (v.km_viaje || 0), 0);

    // Stats por equipo (tractocamión)
    const tractos = vehiculos || [];
    const numEquipos = tractos.length || 1;
    const fijoPorEquipo = gfEquipos / numEquipos;
    const statsPorEquipo: Record<string, EquipoStats> = {};

    tractos.forEach((v: any) => {
      const viajesEquipo = (viajesMes || []).filter((vj: any) => vj.vehiculo_id === v.id);
      const facturacion = viajesEquipo.reduce((s: number, vj: any) => s + (vj.precio_flete || 0), 0);
      const utilidadBrutaViajes = viajesEquipo.reduce((s: number, vj: any) => s + (vj.utilidad_bruta || 0), 0);
      const km = viajesEquipo.reduce((s: number, vj: any) => s + (vj.km_viaje || 0), 0);
      const gastoFlota = (gastosMes || []).filter((g: any) => g.vehiculo?.alias === v.alias).reduce((s: number, g: any) => s + (g.monto || 0), 0);
      const utilidadBruta = utilidadBrutaViajes - gastoFlota;
      const utilidadNeta = utilidadBruta - fijoPorEquipo;
      statsPorEquipo[v.id] = {
        viajes: viajesEquipo.length,
        km,
        facturacion,
        utilidadBruta,
        gastoFlota,
        utilidadNeta,
      };
    });

    setData({
      vehiculosCount: vehiculosCount || 0,
      choferesCount: choferesCount || 0,
      clientesCount: clientesCount || 0,
      rutasCount: rutasCount || 0,
      totalGastosFijosEquipos: gfEquipos,
      totalGastosFijosOficina: gfOficina,
      totalGastosFlota,
      totalViajesMes,
      facturacionMes,
      utilidadBrutaMes,
      kmMes,
      vehiculos: tractos,
      statsPorEquipo,
    });
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month]);

  const totalGastosFijos = data.totalGastosFijosEquipos + data.totalGastosFijosOficina;
  const utilidadNeta = data.utilidadBrutaMes - data.totalGastosFlota - totalGastosFijos;
  const margenBruto = data.facturacionMes ? (data.utilidadBrutaMes / data.facturacionMes) * 100 : 0;
  const margenNeto = data.facturacionMes ? (utilidadNeta / data.facturacionMes) * 100 : 0;
  const breakEven = data.facturacionMes > 0 && data.totalViajesMes > 0 ? Math.ceil(totalGastosFijos / (data.facturacionMes / data.totalViajesMes)) : 0;

  const kpis = [
    { label: "Vehículos activos", value: data.vehiculosCount, icon: Truck, sub: "Tractos + Semirremolques" },
    { label: "Choferes activos", value: data.choferesCount, icon: Users, sub: "En operación" },
    { label: "Clientes activos", value: data.clientesCount, icon: Building2, sub: "Base actual" },
    { label: "Rutas cargadas", value: data.rutasCount, icon: MapPin, sub: "Con km precalculados" },
  ];

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark">
            Dashboard <span className="text-teus-accent">·</span>{" "}
            <span className="text-teus-text_muted font-semibold">{MESES_ES[month - 1]} de {year}</span>
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Bienvenido de vuelta 👋</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-teus-card_light border border-teus-border_light rounded-xl px-3 py-2 shadow-card">
            <Calendar className="w-4 h-4 text-teus-accent" />
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-white border border-teus-border_light rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-teus-accent">
              {MESES_ES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white border border-teus-border_light rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-teus-accent">
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Link href="/viajes" className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm inline-flex items-center gap-2">
            + Nuevo Viaje
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-teus-text_muted mb-4">
          <Loader2 className="w-3 h-3 animate-spin" />
          Cargando datos de {MESES_ES[month - 1]} {year}...
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link href="/viajes" className="bg-teus-card_light border border-teus-border_light rounded-2xl p-5 shadow-card hover:-translate-y-1 hover:shadow-card-hover hover:border-teus-accent transition-all">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[11px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Viajes del mes</div>
            <div className="w-10 h-10 rounded-xl bg-teus-accent/10 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-teus-accent" /></div>
          </div>
          <div className="text-4xl font-black tracking-tight text-teus-text_dark">{data.totalViajesMes}</div>
          <div className="text-xs text-teus-text_soft mt-1">{data.kmMes.toLocaleString("es-PY")} km recorridos</div>
        </Link>
        <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-5 shadow-card">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[11px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Facturación</div>
            <div className="w-10 h-10 rounded-xl bg-teus-accent/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-teus-accent" /></div>
          </div>
          <div className="text-2xl font-black tracking-tight text-teus-text_dark">{fmtGs(data.facturacionMes)}</div>
          <div className="text-xs text-teus-text_soft mt-1">Ingresos del mes</div>
        </div>
        <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-5 shadow-card">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[11px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Utilidad Bruta</div>
            <div className="w-10 h-10 rounded-xl bg-teus-accent/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-teus-accent" /></div>
          </div>
          <div className="text-2xl font-black tracking-tight text-teus-text_dark">{fmtGs(data.utilidadBrutaMes)}</div>
          <div className="text-xs text-teus-accent font-bold mt-1">{margenBruto.toFixed(1)}% margen bruto</div>
        </div>
        <div className={`rounded-2xl p-5 shadow-card border ${utilidadNeta >= 0 ? "bg-teus-card_light border-teus-border_light" : "bg-teus-danger-light border-teus-danger/30"}`}>
          <div className="flex items-start justify-between mb-2">
            <div className={`text-[11px] uppercase tracking-[1.5px] font-bold ${utilidadNeta >= 0 ? "text-teus-text_muted" : "text-teus-danger"}`}>Utilidad Neta</div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${utilidadNeta >= 0 ? "bg-teus-accent" : "bg-teus-danger"}`}><Wallet className="w-5 h-5 text-white" /></div>
          </div>
          <div className={`text-2xl font-black tracking-tight ${utilidadNeta >= 0 ? "text-teus-text_dark" : "text-teus-danger"}`}>{fmtGs(utilidadNeta)}</div>
          <div className="text-[10px] text-teus-text_soft mt-1">Bruta − Gastos flota − Gastos fijos ({margenNeto.toFixed(1)}%)</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-teus-accent/10 to-green-100 border border-teus-accent/30 rounded-2xl p-5 shadow-card">
          <div className="text-[11px] text-teus-accent-dark uppercase tracking-[2px] font-black flex items-center gap-2">
            <Truck className="w-4 h-4" /> Gastos Fijos EQUIPOS
          </div>
          <div className="text-3xl font-black mt-2 text-teus-text_dark">{fmtGs(data.totalGastosFijosEquipos)}</div>
          <div className="text-xs text-teus-text_muted mt-1">
            Prorrateo entre 6 tractos: <strong>{fmtGs(data.totalGastosFijosEquipos / 6)}</strong>/equipo
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-200 to-gray-300 border border-gray-300 rounded-2xl p-5 shadow-card">
          <div className="text-[11px] text-gray-700 uppercase tracking-[2px] font-black flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Gastos Fijos OFICINA
          </div>
          <div className="text-3xl font-black mt-2 text-teus-text_dark">{fmtGs(data.totalGastosFijosOficina)}</div>
          <div className="text-xs text-teus-text_muted mt-1">NO se prorratea a equipos, sí afecta utilidad empresa</div>
        </div>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-5 mb-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-teus-text_muted uppercase tracking-[2px] font-black">Break-even del mes</div>
            <div className="text-3xl font-black mt-1 text-teus-text_dark">{breakEven || "—"} viajes</div>
            <div className="text-xs text-teus-text_muted mt-1">
              Viajes necesarios para cubrir gastos fijos totales ({fmtGs(totalGastosFijos)})
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-teus-text_muted uppercase tracking-wider font-bold">Actualmente</div>
            <div className={`text-2xl font-black mt-1 ${data.totalViajesMes >= breakEven && breakEven > 0 ? "text-teus-accent" : "text-teus-danger"}`}>
              {data.totalViajesMes} viajes {data.totalViajesMes >= breakEven && breakEven > 0 ? "✓" : ""}
            </div>
            <div className="text-[10px] text-teus-text_soft mt-0.5">
              {breakEven > 0 && data.totalViajesMes < breakEven ? `Faltan ${breakEven - data.totalViajesMes}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-teus-card_light border border-teus-border_light rounded-2xl p-4 shadow-card">
              <div className="flex items-start justify-between mb-2">
                <div className="text-[10px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">{k.label}</div>
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

      <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-lg font-bold text-teus-text_dark flex items-center gap-2">
              <Truck className="w-5 h-5 text-teus-accent" />
              Flota — Tractocamiones activos ({MESES_ES[month - 1]} {year})
            </div>
            <div className="text-xs text-teus-text_muted mt-0.5">{data.vehiculos.length} equipos en operación</div>
          </div>
          <Link href="/rankings/equipos" className="text-xs font-bold text-teus-accent hover:underline inline-flex items-center gap-1">
            Ver ranking completo <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {data.vehiculos.map((v: any) => {
            const stats = data.statsPorEquipo[v.id] || { viajes: 0, km: 0, facturacion: 0, utilidadBruta: 0, gastoFlota: 0, utilidadNeta: 0 };
            const positive = stats.utilidadNeta >= 0;
            return (
              <Link key={v.id} href="/rankings/equipos" className="bg-teus-hover_light border border-teus-border_light rounded-xl p-4 relative hover:border-teus-accent hover:-translate-y-1 transition-all">
                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${stats.viajes > 0 ? "bg-teus-accent shadow-[0_0_12px_#26D07C] animate-pulse-slow" : "bg-gray-300"}`} />
                <div className="font-black text-lg tracking-tight text-teus-text_dark">{v.alias || v.nombre_equipo}</div>
                <div className="text-[11px] text-teus-text_muted font-mono tracking-wider mt-1">{v.chapa}</div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <div className="text-[9px] uppercase text-teus-text_soft font-bold">Viajes</div>
                    <div className="text-lg font-bold text-teus-text_dark">{stats.viajes}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-teus-text_soft font-bold">Km del mes</div>
                    <div className="text-lg font-bold text-teus-accent">{stats.km.toLocaleString("es-PY")}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-teus-border_light">
                  <div className="text-[9px] uppercase text-teus-text_soft font-bold">Utilidad neta</div>
                  <div className={`text-sm font-black ${positive ? "text-teus-accent" : "text-red-600"}`}>
                    {fmtGs(stats.utilidadNeta)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="text-center text-[10px] text-teus-text_soft mt-10 tracking-[2px] uppercase font-semibold">
        TEUS FLEET OS · v1.4 · End to end logistics
      </div>
    </div>
  );
}
