"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, Loader2, Calendar, TrendingDown, DollarSign } from "lucide-react";

type Gasto = { tipo_gasto: string; monto: number };

type RankingGasto = {
  tipo: string;
  monto: number;
  cantidad: number;
  pct: number;
  posicion: number;
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const COLORS = [
  "#EF4444", "#F59E0B", "#26D07C", "#3B82F6", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
  "#06B6D4", "#D946EF", "#DC2626", "#F97316", "#22C55E",
];

function fmtGs(n: number) {
  return "Gs. " + Math.round(n || 0).toLocaleString("es-PY");
}
function fmtGsShort(n: number) {
  return "Gs. " + Math.round(n || 0).toLocaleString("es-PY");
}

export default function RankingGastosPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rankings, setRankings] = useState<RankingGasto[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const { data } = await supabase.from("gastos").select("tipo_gasto, monto").gte("fecha", startDate).lte("fecha", endDate);
    const gastos = (data as Gasto[]) || [];

    const totalGeneral = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    const porTipo: Record<string, { monto: number; cantidad: number }> = {};
    gastos.forEach(g => {
      if (!porTipo[g.tipo_gasto]) porTipo[g.tipo_gasto] = { monto: 0, cantidad: 0 };
      porTipo[g.tipo_gasto].monto += g.monto || 0;
      porTipo[g.tipo_gasto].cantidad++;
    });

    const rankingsData: RankingGasto[] = Object.entries(porTipo).map(([tipo, v]) => ({
      tipo,
      monto: v.monto,
      cantidad: v.cantidad,
      pct: totalGeneral > 0 ? (v.monto / totalGeneral) * 100 : 0,
      posicion: 0,
    }));

    rankingsData.sort((a, b) => b.monto - a.monto);
    rankingsData.forEach((r, i) => { r.posicion = i + 1; });
    setRankings(rankingsData);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month]);

  const totales = useMemo(() => {
    const totalGasto = rankings.reduce((s, r) => s + r.monto, 0);
    const totalCantidad = rankings.reduce((s, r) => s + r.cantidad, 0);
    return { totalGasto, totalCantidad, categorias: rankings.length };
  }, [rankings]);

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-teus-danger" />
            Ranking de Gastos
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Dónde se va la plata · Distribución de gastos variables por categoría</p>
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
          <BarChart3 className="w-12 h-12 text-teus-text_soft mx-auto mb-3" />
          <div className="text-lg font-bold">Sin gastos en este período</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-red-700"><TrendingDown className="w-4 h-4" />Total gasto mes</div>
              <div className="text-2xl font-black mt-1 text-red-900">{fmtGs(totales.totalGasto)}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-700"><DollarSign className="w-4 h-4" />Cantidad de gastos</div>
              <div className="text-3xl font-black mt-1 text-blue-900">{totales.totalCantidad}</div>
            </div>
            <div className="bg-teus-accent/10 border border-teus-accent/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-teus-accent-dark"><BarChart3 className="w-4 h-4" />Categorías activas</div>
              <div className="text-3xl font-black mt-1 text-teus-accent-dark">{totales.categorias}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-6 shadow-card">
              <div className="text-sm font-bold text-teus-text_dark mb-4">🍕 Distribución por categoría</div>
              <PieChart data={rankings.slice(0, 12)} total={totales.totalGasto} />
            </div>
            <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-6 shadow-card">
              <div className="text-sm font-bold text-teus-text_dark mb-4">🏆 Top 5 categorías</div>
              <div className="space-y-3">
                {rankings.slice(0, 5).map((r, i) => (
                  <div key={r.tipo} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-teus-text_dark truncate capitalize">{r.tipo}</div>
                      <div className="text-[10px] text-teus-text_soft">{r.cantidad} gastos · {fmtGsShort(r.monto)}</div>
                    </div>
                    <div className="text-lg font-black text-teus-danger">{r.pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-6 shadow-card mb-6">
            <div className="text-sm font-bold text-teus-text_dark mb-4">📊 Barras comparativas — Monto por categoría</div>
            <div className="space-y-3">
              {rankings.map((r, i) => {
                const maxMonto = rankings[0]?.monto || 1;
                const pctBar = (r.monto / maxMonto) * 100;
                const badge = r.posicion === 1 ? "🥇" : r.posicion === 2 ? "🥈" : r.posicion === 3 ? "🥉" : `${r.posicion}°`;
                return (
                  <div key={r.tipo} className="flex items-center gap-3">
                    <div className="w-8 text-center text-lg font-black">{badge}</div>
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm font-bold text-teus-text_dark capitalize truncate">{r.tipo}</div>
                      <div className="text-[10px] text-teus-text_soft">{r.cantidad} gastos</div>
                    </div>
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div className="h-full transition-all shadow-inner" style={{ width: `${pctBar}%`, backgroundColor: COLORS[i % COLORS.length] }}>
                        <div className="h-full flex items-center justify-end pr-2">
                          <span className="text-xs font-black text-white drop-shadow whitespace-nowrap">{fmtGs(r.monto)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm font-black text-teus-danger">{r.pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
            <div className="px-5 py-3 bg-teus-bg_soft border-b border-teus-border_light">
              <div className="text-sm font-bold text-teus-text_dark">💸 Ranking completo — {MESES[month - 1]} {year}</div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
                <tr>
                  <th className="text-center px-3 py-3">#</th>
                  <th className="text-left px-3 py-3">Categoría</th>
                  <th className="text-right px-3 py-3">Cantidad</th>
                  <th className="text-right px-3 py-3">Monto total</th>
                  <th className="text-right px-3 py-3">% del total</th>
                  <th className="text-right px-3 py-3">Promedio por gasto</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr key={r.tipo} className="border-t border-teus-border_light hover:bg-teus-bg_soft/50">
                    <td className="text-center px-3 py-3 font-black text-lg">{r.posicion}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <div className="font-bold text-teus-text_dark capitalize">{r.tipo}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{r.cantidad}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-teus-danger whitespace-nowrap">{fmtGs(r.monto)}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold">
                      <span className={`inline-block px-2 py-0.5 rounded ${r.pct >= 20 ? "bg-red-100 text-red-700" : r.pct >= 10 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                        {r.pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-teus-text_muted whitespace-nowrap">{fmtGs(r.monto / r.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PieChart({ data, total }: { data: RankingGasto[]; total: number }) {
  const size = 260;
  const radius = 110;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativeAngle = -Math.PI / 2;
  const segments = data.map((r, i) => {
    const angle = (r.monto / total) * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    cumulativeAngle = endAngle;
    return { path, color: COLORS[i % COLORS.length] };
  });

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size}>
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            stroke="#fff"
            strokeWidth="2"
            style={{ transition: "all 0.3s ease" }}
          />
        ))}
      </svg>
    </div>
  );
}
