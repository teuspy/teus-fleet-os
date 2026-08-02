"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Medal, Loader2, Calendar, Trophy, TrendingUp, TrendingDown, Users } from "lucide-react";

type Chofer = { id: string; nombre_completo: string; vehiculo_asignado_id: string | null };
type Vehiculo = { id: string; alias: string | null; chapa: string; tipo: string };
type Viaje = { chofer_id: string | null; vehiculo_id: string | null; precio_flete: number; costo_combustible: number; viatico: number; otros_costos: number; utilidad_bruta: number };
type GastoJoin = { monto: number; vehiculo?: { alias: string | null } | null };
type GastoFijo = { monto_mensual: number };

type RankingChofer = {
  choferId: string;
  nombre: string;
  equipo: string;
  chapa: string;
  viajes: number;
  facturacion: number;
  gastoOperativo: number;
  gastoFlota: number;
  gastoFijo: number;
  utilBruta: number;
  utilNeta: number;
  utilPorViaje: number;
  posicion: number;
  vsLider: number;
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtGsShort(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "Gs. " + (abs / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (abs >= 1_000) return sign + "Gs. " + (abs / 1_000).toFixed(0) + "K";
  return sign + "Gs. " + abs.toLocaleString("es-PY");
}
function fmtGs(n: number) { const sign = n < 0 ? "-" : ""; return sign + "Gs. " + Math.abs(n).toLocaleString("es-PY"); }

export default function RankingChoferesPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rankings, setRankings] = useState<RankingChofer[]>([]);
  const [gastosFijosTotal, setGastosFijosTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const [chofRes, vehsRes, viajesRes, gastosRes, gfRes] = await Promise.all([
      supabase.from("choferes").select("id, nombre_completo, vehiculo_asignado_id").eq("activo", true),
      supabase.from("vehiculos").select("id, alias, chapa, tipo").eq("activo", true),
      supabase.from("viajes").select("chofer_id, vehiculo_id, precio_flete, costo_combustible, viatico, otros_costos, utilidad_bruta").gte("fecha", startDate).lte("fecha", endDate),
      supabase.from("gastos").select("monto, vehiculo:vehiculo_id(alias)").gte("fecha", startDate).lte("fecha", endDate),
      supabase.from("gastos_fijos").select("monto_mensual").eq("aplica_a", "equipos").eq("activo", true),
    ]);

    const choferes = (chofRes.data as Chofer[]) || [];
    const vehiculos = (vehsRes.data as Vehiculo[]) || [];
    const viajes = (viajesRes.data as Viaje[]) || [];
    const gastos = (gastosRes.data as unknown as GastoJoin[]) || [];
    const gastosFijos = (gfRes.data as GastoFijo[]) || [];

    const totalFijos = gastosFijos.reduce((s, g) => s + (g.monto_mensual || 0), 0);
    setGastosFijosTotal(totalFijos);

    const tractos = vehiculos.filter(v => v.tipo === "tracto");
    const numEquipos = tractos.length || 1;
    const fijoPorEquipo = totalFijos / numEquipos;

    const rankingsData: RankingChofer[] = choferes.map(chofer => {
      const tracto = tractos.find(t => t.id === chofer.vehiculo_asignado_id);
      const viajesChofer = viajes.filter(v => v.chofer_id === chofer.id);
      const facturacion = viajesChofer.reduce((s, v) => s + (v.precio_flete || 0), 0);
      const gastoOperativo = viajesChofer.reduce((s, v) => s + (v.costo_combustible || 0) + (v.viatico || 0) + (v.otros_costos || 0), 0);
      const utilBrutaViajes = viajesChofer.reduce((s, v) => s + (v.utilidad_bruta || 0), 0);
      const gastoFlota = tracto ? gastos.filter(g => g.vehiculo?.alias === tracto.alias).reduce((s, g) => s + (g.monto || 0), 0) : 0;
      const utilBruta = utilBrutaViajes - gastoFlota;
      const utilNeta = utilBruta - (tracto ? fijoPorEquipo : 0);
      const utilPorViaje = viajesChofer.length > 0 ? utilBruta / viajesChofer.length : 0;
      return {
        choferId: chofer.id,
        nombre: chofer.nombre_completo,
        equipo: tracto?.alias || "Sin asignar",
        chapa: tracto?.chapa || "-",
        viajes: viajesChofer.length,
        facturacion, gastoOperativo, gastoFlota, gastoFijo: tracto ? fijoPorEquipo : 0,
        utilBruta, utilNeta, utilPorViaje,
        posicion: 0, vsLider: 0,
      };
    }).filter(r => r.viajes > 0 || r.equipo !== "Sin asignar");

    rankingsData.sort((a, b) => b.utilNeta - a.utilNeta);
    const lider = rankingsData[0]?.utilNeta || 0;
    rankingsData.forEach((r, i) => { r.posicion = i + 1; r.vsLider = r.utilNeta - lider; });
    setRankings(rankingsData);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month]);

  const totales = useMemo(() => {
    const totalUtil = rankings.reduce((s, r) => s + r.utilNeta, 0);
    const totalFact = rankings.reduce((s, r) => s + r.facturacion, 0);
    const totalViajes = rankings.reduce((s, r) => s + r.viajes, 0);
    return { totalUtil, totalFact, totalViajes };
  }, [rankings]);

  const maxAbsUtil = Math.max(...rankings.map(r => Math.abs(r.utilNeta)), 1);

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Medal className="w-8 h-8 text-yellow-500" />
            Ranking de Choferes
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Performance mensual por chofer · Utilidad NETA con gastos fijos prorrateados</p>
        </div>
        <div className="flex items-center gap-3 bg-teus-card_light border border-teus-border_light rounded-xl px-4 py-2 shadow-card">
          <Calendar className="w-4 h-4 text-teus-accent" />
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-white border border-teus-border_light rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-teus-accent">
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white border border-teus-border_light rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-teus-accent">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-teus-text_muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Cargando ranking...
        </div>
      ) : rankings.length === 0 ? (
        <div className="p-16 text-center text-teus-text_muted bg-teus-card_light border border-teus-border_light rounded-xl">
          <Medal className="w-12 h-12 text-teus-text_soft mx-auto mb-3" />
          <div className="text-lg font-bold">Sin choferes en este período</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-700"><Users className="w-4 h-4" />Choferes activos</div>
              <div className="text-3xl font-black mt-1 text-blue-900">{rankings.length}</div>
            </div>
            <div className="bg-teus-accent/10 border border-teus-accent/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-teus-accent-dark"><TrendingUp className="w-4 h-4" />Facturación total</div>
              <div className="text-2xl font-black mt-1 text-teus-accent-dark">{fmtGsShort(totales.totalFact)}</div>
              <div className="text-[10px] text-teus-accent-dark opacity-70">{fmtGs(totales.totalFact)}</div>
            </div>
            <div className={`border rounded-xl p-4 ${totales.totalUtil >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <div className={`flex items-center gap-2 text-xs font-bold uppercase ${totales.totalUtil >= 0 ? "text-green-700" : "text-red-700"}`}><Trophy className="w-4 h-4" />Utilidad neta acumulada</div>
              <div className={`text-2xl font-black mt-1 ${totales.totalUtil >= 0 ? "text-green-900" : "text-red-900"}`}>{fmtGsShort(totales.totalUtil)}</div>
              <div className="text-[10px] opacity-70">{fmtGs(totales.totalUtil)}</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-xs text-blue-800">
            💡 Fijo prorrateado por equipo: <strong>{fmtGs(gastosFijosTotal / (Math.max(rankings.filter(r => r.equipo !== "Sin asignar").length, 1)))}</strong>/mes.
            {gastosFijosTotal === 0 && <span className="ml-2 text-blue-600">(Sin gastos fijos "equipos" activos)</span>}
          </div>

          <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-6 mb-6 shadow-card">
            <div className="text-sm font-bold text-teus-text_dark mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Comparativa visual — Utilidad NETA por chofer
            </div>
            <div className="space-y-3">
              {rankings.map(r => {
                const pctBar = (Math.abs(r.utilNeta) / maxAbsUtil) * 100;
                const isNegative = r.utilNeta < 0;
                const badge = r.posicion === 1 ? "🥇" : r.posicion === 2 ? "🥈" : r.posicion === 3 ? "🥉" : isNegative ? "⚠️" : `${r.posicion}°`;
                return (
                  <div key={r.choferId} className="flex items-center gap-3">
                    <div className="w-8 text-center text-lg font-black">{badge}</div>
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm font-bold text-teus-text_dark truncate">{r.nombre}</div>
                      <div className="text-[10px] text-teus-text_soft">{r.equipo} · {r.viajes} viajes</div>
                    </div>
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div className={`h-full ${isNegative ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-teus-accent to-green-500"} transition-all shadow-inner`} style={{ width: `${pctBar}%` }}>
                        <div className="h-full flex items-center justify-end pr-2">
                          <span className="text-xs font-black text-white drop-shadow whitespace-nowrap">{fmtGs(r.utilNeta)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
            <div className="px-5 py-3 bg-teus-bg_soft border-b border-teus-border_light">
              <div className="text-sm font-bold text-teus-text_dark">🏁 Ranking completo — {MESES[month - 1]} {year}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
                  <tr>
                    <th className="text-center px-3 py-3">#</th>
                    <th className="text-left px-3 py-3">Chofer</th>
                    <th className="text-left px-3 py-3">Equipo</th>
                    <th className="text-right px-3 py-3">Viajes</th>
                    <th className="text-right px-3 py-3">Facturación</th>
                    <th className="text-right px-3 py-3">Gasto op.</th>
                    <th className="text-right px-3 py-3">Gasto flota</th>
                    <th className="text-right px-3 py-3">Fijo prorr.</th>
                    <th className="text-right px-3 py-3">Util. bruta</th>
                    <th className="text-right px-3 py-3">Util. NETA</th>
                    <th className="text-right px-3 py-3">Util/viaje</th>
                    <th className="text-right px-3 py-3">VS Líder</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map(r => (
                    <tr key={r.choferId} className="border-t border-teus-border_light hover:bg-teus-bg_soft/50">
                      <td className="text-center px-3 py-3 font-black text-lg">{r.posicion}</td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-teus-text_dark">{r.nombre}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold">{r.equipo}</div>
                        <div className="text-[10px] text-teus-text_soft font-mono">{r.chapa}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{r.viajes}</td>
                      <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{fmtGs(r.facturacion)}</td>
                      <td className="px-3 py-3 text-right font-mono text-teus-danger whitespace-nowrap">{fmtGs(r.gastoOperativo)}</td>
                      <td className="px-3 py-3 text-right font-mono text-teus-danger whitespace-nowrap">{fmtGs(r.gastoFlota)}</td>
                      <td className="px-3 py-3 text-right font-mono text-orange-600 whitespace-nowrap">{fmtGs(r.gastoFijo)}</td>
                      <td className={`px-3 py-3 text-right font-mono font-bold whitespace-nowrap ${r.utilBruta >= 0 ? "text-teus-text_dark" : "text-red-600"}`}>{fmtGs(r.utilBruta)}</td>
                      <td className={`px-3 py-3 text-right font-mono font-black whitespace-nowrap ${r.utilNeta >= 0 ? "text-teus-accent" : "text-red-600"}`}>{fmtGs(r.utilNeta)}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">{fmtGs(r.utilPorViaje)}</td>
                      <td className={`px-3 py-3 text-right font-mono text-xs whitespace-nowrap ${r.vsLider === 0 ? "text-teus-accent font-bold" : "text-teus-text_muted"}`}>{r.vsLider === 0 ? "LÍDER" : fmtGs(r.vsLider)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
