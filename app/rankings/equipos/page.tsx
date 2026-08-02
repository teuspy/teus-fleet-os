"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Medal, Award, Loader2, Calendar, TrendingUp, TrendingDown, Truck, DollarSign } from "lucide-react";

type Vehiculo = { id: string; alias: string | null; chapa: string; tipo: string };
type Chofer = { id: string; nombre_completo: string; vehiculo_asignado_id: string | null };
type Viaje = { vehiculo_id: string | null; chofer_id: string | null; precio_flete: number; costo_combustible: number; viatico: number; otros_costos: number; utilidad_bruta: number };
type GastoJoin = { monto: number; vehiculo_id: string | null; aplica_a: string | null; vehiculo?: { alias: string | null } | null };
type GastoFijo = { monto_mensual: number };

type Ranking = {
  alias: string;
  chofer: string;
  chapaTracto: string;
  chapaSemi: string;
  viajes: number;
  facturacion: number;
  gastoOperativo: number;
  gastoFlota: number;
  gastoFijo: number;
  utilBruta: number;
  utilNeta: number;
  utilPorViaje: number;
  vsLider: number;
  posicion: number;
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtGs(n: number) { const sign = n < 0 ? "-" : ""; return sign + "Gs. " + Math.abs(n).toLocaleString("es-PY"); }
function fmtGsShort(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(0) + "K";
  return sign + abs.toLocaleString("es-PY");
}

export default function RankingEquiposPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [gastosFijosTotal, setGastosFijosTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const [vehsRes, chofRes, viajesRes, gastosRes, gfRes] = await Promise.all([
      supabase.from("vehiculos").select("id, alias, chapa, tipo").eq("activo", true).not("alias", "is", null),
      supabase.from("choferes").select("id, nombre_completo, vehiculo_asignado_id").eq("activo", true),
      supabase.from("viajes").select("vehiculo_id, chofer_id, precio_flete, costo_combustible, viatico, otros_costos, utilidad_bruta").gte("fecha", startDate).lte("fecha", endDate),
      supabase.from("gastos").select("monto, vehiculo_id, aplica_a, vehiculo:vehiculo_id(alias)").gte("fecha", startDate).lte("fecha", endDate),
      supabase.from("gastos_fijos").select("monto_mensual").eq("aplica_a", "equipos").eq("activo", true),
    ]);

    const vehiculos = (vehsRes.data as Vehiculo[]) || [];
    const choferes = (chofRes.data as Chofer[]) || [];
    const viajes = (viajesRes.data as Viaje[]) || [];
    const gastos = (gastosRes.data as unknown as GastoJoin[]) || [];
    const gastosFijos = (gfRes.data as GastoFijo[]) || [];

    const totalFijos = gastosFijos.reduce((s, g) => s + (g.monto_mensual || 0), 0);
    setGastosFijosTotal(totalFijos);

    const tractos = vehiculos.filter(v => v.tipo === "tracto");
    const semis = vehiculos.filter(v => v.tipo === "semirremolque");
    const numEquipos = tractos.length || 1;
    const fijoPorEquipo = totalFijos / numEquipos;

    const rankingsData: Ranking[] = tractos.map(tracto => {
      const semi = semis.find(s => s.alias === tracto.alias);
      const chofer = choferes.find(c => c.vehiculo_asignado_id === tracto.id);
      const viajesEquipo = viajes.filter(v => v.vehiculo_id === tracto.id);
      const facturacion = viajesEquipo.reduce((s, v) => s + (v.precio_flete || 0), 0);
      const gastoOperativo = viajesEquipo.reduce((s, v) => s + (v.costo_combustible || 0) + (v.viatico || 0) + (v.otros_costos || 0), 0);
      const utilBrutaViajes = viajesEquipo.reduce((s, v) => s + (v.utilidad_bruta || 0), 0);
      const gastoFlota = gastos.filter(g => g.vehiculo?.alias === tracto.alias).reduce((s, g) => s + (g.monto || 0), 0);
      const utilBruta = utilBrutaViajes - gastoFlota;
      const utilNeta = utilBruta - fijoPorEquipo;
      const utilPorViaje = viajesEquipo.length > 0 ? utilBruta / viajesEquipo.length : 0;
      return {
        alias: tracto.alias!,
        chofer: chofer?.nombre_completo || "Sin asignar",
        chapaTracto: tracto.chapa,
        chapaSemi: semi?.chapa || "-",
        viajes: viajesEquipo.length,
        facturacion,
        gastoOperativo,
        gastoFlota,
        gastoFijo: fijoPorEquipo,
        utilBruta,
        utilNeta,
        utilPorViaje,
        vsLider: 0,
        posicion: 0,
      };
    });

    rankingsData.sort((a, b) => b.utilNeta - a.utilNeta);
    const lider = rankingsData[0]?.utilNeta || 0;
    rankingsData.forEach((r, i) => { r.posicion = i + 1; r.vsLider = r.utilNeta - lider; });
    setRankings(rankingsData);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month]);

  const totales = useMemo(() => {
    const facturacion = rankings.reduce((s, r) => s + r.facturacion, 0);
    const gastoTotal = rankings.reduce((s, r) => s + r.gastoOperativo + r.gastoFlota, 0);
    const utilBruta = rankings.reduce((s, r) => s + r.utilBruta, 0);
    const utilNeta = rankings.reduce((s, r) => s + r.utilNeta, 0);
    const viajes = rankings.reduce((s, r) => s + r.viajes, 0);
    return { facturacion, gastoTotal, utilBruta, utilNeta, viajes };
  }, [rankings]);

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Ranking de Equipos
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Performance mensual · Utilidad neta = Bruta − Gastos fijos prorrateados</p>
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
          <Trophy className="w-12 h-12 text-teus-text_soft mx-auto mb-3" />
          <div className="text-lg font-bold">No hay equipos con alias asignado</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-3 mb-6">
            <KpiCard icon={<Truck className="w-4 h-4" />} label="Viajes mes" value={totales.viajes.toString()} sub="" color="blue" />
            <KpiCard icon={<DollarSign className="w-4 h-4" />} label="Facturación" value={fmtGsShort(totales.facturacion)} sub={fmtGs(totales.facturacion)} color="accent" />
            <KpiCard icon={<TrendingDown className="w-4 h-4" />} label="Gastos totales" value={fmtGsShort(totales.gastoTotal + gastosFijosTotal)} sub={fmtGs(totales.gastoTotal + gastosFijosTotal)} color="red" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Util. bruta" value={fmtGsShort(totales.utilBruta)} sub={fmtGs(totales.utilBruta)} color={totales.utilBruta >= 0 ? "green" : "red"} />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Util. neta" value={fmtGsShort(totales.utilNeta)} sub={fmtGs(totales.utilNeta)} color={totales.utilNeta >= 0 ? "green" : "red"} />
          </div>

          {rankings.length >= 3 && <Podio top3={rankings.slice(0, 3)} />}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm">
            <div className="font-bold text-blue-900 mb-1">💡 Cálculo de utilidad neta</div>
            <div className="text-blue-800 text-xs">
              Gastos fijos EQUIPOS del mes: <strong>{fmtGs(gastosFijosTotal)}</strong> ·
              Prorrateo entre {rankings.length} equipos: <strong>{fmtGs(gastosFijosTotal / (rankings.length || 1))}</strong> por equipo
              {gastosFijosTotal === 0 && <span className="ml-2 text-blue-600">(No hay gastos fijos activos con "Aplica a: Equipos")</span>}
            </div>
          </div>

          <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
            <div className="px-5 py-3 bg-teus-bg_soft border-b border-teus-border_light flex items-center justify-between">
              <div className="text-sm font-bold text-teus-text_dark">🏆 Ranking completo — {MESES[month - 1]} {year}</div>
              <div className="text-xs text-teus-text_muted">Ordenado por utilidad neta</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
                  <tr>
                    <th className="text-center px-3 py-3">#</th>
                    <th className="text-left px-3 py-3">Equipo</th>
                    <th className="text-left px-3 py-3">Chofer</th>
                    <th className="text-right px-3 py-3">Viajes</th>
                    <th className="text-right px-3 py-3">Facturación</th>
                    <th className="text-right px-3 py-3">Gasto op.</th>
                    <th className="text-right px-3 py-3">Gasto flota</th>
                    <th className="text-right px-3 py-3">Fijo prorr.</th>
                    <th className="text-right px-3 py-3">Util. bruta</th>
                    <th className="text-right px-3 py-3">Util. NETA</th>
                    <th className="text-right px-3 py-3">Util/viaje</th>
                    <th className="text-right px-3 py-3">VS Líder</th>
                    <th className="text-center px-3 py-3">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r) => <RankingRow key={r.alias} r={r} />)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    accent: "bg-teus-accent/10 border-teus-accent/30 text-teus-accent-dark",
    red: "bg-red-50 border-red-200 text-red-700",
    green: "bg-green-50 border-green-200 text-green-700",
  };
  return (
    <div className={`border rounded-xl p-3 ${colors[color]}`}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-xl font-black mt-1">{value}</div>
      {sub && <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

function Podio({ top3 }: { top3: Ranking[] }) {
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];
  return (
    <div className="bg-gradient-to-b from-yellow-50 via-white to-orange-50 border border-teus-border_light rounded-2xl p-6 mb-6 shadow-card">
      <div className="text-center text-sm font-bold text-teus-text_muted uppercase tracking-widest mb-4">🏆 Podio del mes</div>
      <div className="grid grid-cols-3 gap-4 items-end">
        <PodioCard rank={2} data={second} color="silver" height="h-40" />
        <PodioCard rank={1} data={first} color="gold" height="h-52" />
        <PodioCard rank={3} data={third} color="bronze" height="h-32" />
      </div>
    </div>
  );
}

function PodioCard({ rank, data, color, height }: { rank: number; data: Ranking; color: "gold" | "silver" | "bronze"; height: string }) {
  const styles = {
    gold: { bg: "bg-gradient-to-b from-yellow-400 to-yellow-600", text: "text-yellow-950", border: "border-yellow-500", icon: "🥇", label: "1RO" },
    silver: { bg: "bg-gradient-to-b from-gray-300 to-gray-400", text: "text-gray-900", border: "border-gray-400", icon: "🥈", label: "2DO" },
    bronze: { bg: "bg-gradient-to-b from-orange-400 to-orange-600", text: "text-orange-950", border: "border-orange-500", icon: "🥉", label: "3RO" },
  }[color];
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl mb-2">{styles.icon}</div>
      <div className={`text-3xl font-black ${styles.text === "text-yellow-950" ? "text-yellow-700" : styles.text === "text-orange-950" ? "text-orange-700" : "text-gray-700"}`}>{data.alias}</div>
      <div className="text-xs text-teus-text_muted mt-1">{data.chofer}</div>
      <div className="text-sm font-bold text-teus-accent mt-1">{fmtGs(data.utilNeta)}</div>
      <div className={`w-full ${height} ${styles.bg} ${styles.border} border-2 rounded-t-lg mt-3 flex items-center justify-center shadow-lg`}>
        <div className={`text-4xl font-black ${styles.text}`}>{styles.label}</div>
      </div>
    </div>
  );
}

function RankingRow({ r }: { r: Ranking }) {
  const badge = r.posicion === 1 ? "🥇" : r.posicion === 2 ? "🥈" : r.posicion === 3 ? "🥉" : r.utilNeta < 0 ? "⚠️" : `${r.posicion}°`;
  return (
    <tr className="border-t border-teus-border_light hover:bg-teus-bg_soft/50">
      <td className="text-center px-3 py-3 font-black text-lg text-teus-text_dark">{r.posicion}</td>
      <td className="px-3 py-3">
        <div className="font-bold text-teus-text_dark">{r.alias}</div>
        <div className="text-[10px] text-teus-text_soft font-mono">{r.chapaTracto} + {r.chapaSemi}</div>
      </td>
      <td className="px-3 py-3 text-xs text-teus-text_muted">{r.chofer}</td>
      <td className="px-3 py-3 text-right font-mono">{r.viajes}</td>
      <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap">{fmtGs(r.facturacion)}</td>
      <td className="px-3 py-3 text-right font-mono text-teus-danger whitespace-nowrap">{fmtGs(r.gastoOperativo)}</td>
      <td className="px-3 py-3 text-right font-mono text-teus-danger whitespace-nowrap">{fmtGs(r.gastoFlota)}</td>
      <td className="px-3 py-3 text-right font-mono text-orange-600 whitespace-nowrap">{fmtGs(r.gastoFijo)}</td>
      <td className={`px-3 py-3 text-right font-mono font-bold whitespace-nowrap ${r.utilBruta >= 0 ? "text-teus-text_dark" : "text-teus-danger"}`}>{fmtGs(r.utilBruta)}</td>
      <td className={`px-3 py-3 text-right font-mono font-black text-base whitespace-nowrap ${r.utilNeta >= 0 ? "text-teus-accent" : "text-red-600"}`}>{fmtGs(r.utilNeta)}</td>
      <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">{fmtGs(r.utilPorViaje)}</td>
      <td className={`px-3 py-3 text-right font-mono text-xs whitespace-nowrap ${r.vsLider === 0 ? "text-teus-accent font-bold" : "text-teus-text_muted"}`}>{r.vsLider === 0 ? "LÍDER" : fmtGs(r.vsLider)}</td>
      <td className="px-3 py-3 text-center text-lg">{badge}</td>
    </tr>
  );
}
