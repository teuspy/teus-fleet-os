"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Award, Loader2, Calendar, TrendingUp, Building2, Users } from "lucide-react";

type Cliente = { id: string; nombre: string };
type Viaje = { cliente_id: string | null; precio_flete: number; utilidad_bruta: number };

type RankingCliente = {
  id: string;
  nombre: string;
  viajes: number;
  facturacion: number;
  utilBruta: number;
  pctFact: number;
  posicion: number;
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// Paleta de colores para el donut
const COLORS = [
  "#26D07C", // teus green
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
  "#6366F1", // indigo
  "#84CC16", // lime
  "#06B6D4", // cyan
  "#D946EF", // fuchsia
];

function fmtGsShort(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "Gs. " + (abs / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (abs >= 1_000) return sign + "Gs. " + (abs / 1_000).toFixed(0) + "K";
  return sign + "Gs. " + abs.toLocaleString("es-PY");
}
function fmtGs(n: number) { return "Gs. " + (n || 0).toLocaleString("es-PY"); }

export default function RankingClientesPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rankings, setRankings] = useState<RankingCliente[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const [clientRes, viajesRes] = await Promise.all([
      supabase.from("clientes").select("id, nombre"),
      supabase.from("viajes").select("cliente_id, precio_flete, utilidad_bruta").gte("fecha", startDate).lte("fecha", endDate),
    ]);

    const clientes = (clientRes.data as Cliente[]) || [];
    const viajes = (viajesRes.data as Viaje[]) || [];

    const totalFact = viajes.reduce((s, v) => s + (v.precio_flete || 0), 0);

    const rankingsData: RankingCliente[] = clientes.map(c => {
      const viajesCliente = viajes.filter(v => v.cliente_id === c.id);
      const facturacion = viajesCliente.reduce((s, v) => s + (v.precio_flete || 0), 0);
      const utilBruta = viajesCliente.reduce((s, v) => s + (v.utilidad_bruta || 0), 0);
      return {
        id: c.id,
        nombre: c.nombre,
        viajes: viajesCliente.length,
        facturacion,
        utilBruta,
        pctFact: totalFact > 0 ? (facturacion / totalFact) * 100 : 0,
        posicion: 0,
      };
    }).filter(r => r.viajes > 0);

    rankingsData.sort((a, b) => b.facturacion - a.facturacion);
    rankingsData.forEach((r, i) => { r.posicion = i + 1; });
    setRankings(rankingsData);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month]);

  const totales = useMemo(() => {
    const totalFact = rankings.reduce((s, r) => s + r.facturacion, 0);
    const totalUtil = rankings.reduce((s, r) => s + r.utilBruta, 0);
    const totalViajes = rankings.reduce((s, r) => s + r.viajes, 0);
    return { totalFact, totalUtil, totalViajes };
  }, [rankings]);

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Award className="w-8 h-8 text-yellow-500" />
            Ranking de Clientes
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Distribución de facturación por cliente</p>
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
          <Award className="w-12 h-12 text-teus-text_soft mx-auto mb-3" />
          <div className="text-lg font-bold">Sin clientes con viajes en este período</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-700"><Users className="w-4 h-4" />Clientes con viajes</div>
              <div className="text-3xl font-black mt-1 text-blue-900">{rankings.length}</div>
            </div>
            <div className="bg-teus-accent/10 border border-teus-accent/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-teus-accent-dark"><Building2 className="w-4 h-4" />Facturación total</div>
              <div className="text-3xl font-black mt-1 text-teus-accent-dark">{fmtGsShort(totales.totalFact)}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-green-700"><TrendingUp className="w-4 h-4" />Util. bruta acumulada</div>
              <div className="text-3xl font-black mt-1 text-green-900">{fmtGsShort(totales.totalUtil)}</div>
            </div>
          </div>

          {/* Donut chart + Top 5 */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-6 shadow-card">
              <div className="text-sm font-bold text-teus-text_dark mb-4">🍩 Distribución de facturación</div>
              <DonutChart data={rankings.slice(0, 12)} total={totales.totalFact} />
            </div>
            <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-6 shadow-card">
              <div className="text-sm font-bold text-teus-text_dark mb-4">🏆 Top 5 clientes</div>
              <div className="space-y-3">
                {rankings.slice(0, 5).map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-teus-text_dark truncate">{r.nombre}</div>
                      <div className="text-[10px] text-teus-text_soft">{r.viajes} viajes · {fmtGsShort(r.facturacion)}</div>
                    </div>
                    <div className="text-lg font-black text-teus-accent">{r.pctFact.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla completa */}
          <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
            <div className="px-5 py-3 bg-teus-bg_soft border-b border-teus-border_light">
              <div className="text-sm font-bold text-teus-text_dark">👥 Ranking completo — {MESES[month - 1]} {year}</div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
                <tr>
                  <th className="text-center px-3 py-3">#</th>
                  <th className="text-left px-3 py-3">Cliente</th>
                  <th className="text-right px-3 py-3">Viajes</th>
                  <th className="text-right px-3 py-3">Facturación</th>
                  <th className="text-right px-3 py-3">% Fact.</th>
                  <th className="text-right px-3 py-3">Util. bruta</th>
                  <th className="text-right px-3 py-3">Ranking</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => {
                  const badge = r.posicion === 1 ? "🥇" : r.posicion === 2 ? "🥈" : r.posicion === 3 ? "🥉" : `${r.posicion}°`;
                  return (
                    <tr key={r.id} className="border-t border-teus-border_light hover:bg-teus-bg_soft/50">
                      <td className="text-center px-3 py-3 font-black text-lg">{r.posicion}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <div className="font-bold text-teus-text_dark">{r.nombre}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{r.viajes}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-teus-accent">{fmtGsShort(r.facturacion)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded ${r.pctFact >= 20 ? "bg-teus-accent/20 text-teus-accent-dark" : r.pctFact >= 5 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {r.pctFact.toFixed(1)}%
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-right font-mono font-bold ${r.utilBruta >= 0 ? "text-green-700" : "text-red-600"}`}>{fmtGsShort(r.utilBruta)}</td>
                      <td className="px-3 py-3 text-right text-lg">{badge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function DonutChart({ data, total }: { data: RankingCliente[]; total: number }) {
  const size = 260;
  const radius = 100;
  const strokeWidth = 40;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data.map((r, i) => {
    const pct = total > 0 ? r.facturacion / total : 0;
    const dashArray = pct * circumference;
    const seg = {
      color: COLORS[i % COLORS.length],
      dashArray,
      dashOffset: -offset,
      nombre: r.nombre,
      pct: r.pctFact,
    };
    offset += dashArray;
    return seg;
  });

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dashArray} ${circumference - seg.dashArray}`}
              strokeDashoffset={seg.dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: "all 0.5s ease" }}
            />
          ))}
          <text x={cx} y={cy - 10} textAnchor="middle" className="text-2xl font-black fill-teus-text_dark">
            {data.length}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="text-xs fill-teus-text_muted">
            clientes
          </text>
          <text x={cx} y={cy + 30} textAnchor="middle" className="text-sm font-bold fill-teus-accent">
            {fmtGsShort(total)}
          </text>
        </svg>
      </div>
    </div>
  );
}
