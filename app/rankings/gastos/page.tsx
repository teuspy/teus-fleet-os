"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, Loader2, Calendar, TrendingDown, DollarSign, X, Users, ArrowRight } from "lucide-react";

type Gasto = { tipo_gasto: string; monto: number; proveedor_id: string | null; concepto: string | null; fecha: string; proveedor?: { nombre: string } | null };

type RankingGasto = {
  tipo: string;
  monto: number;
  cantidad: number;
  pct: number;
  posicion: number;
};

type ProveedorEnCategoria = {
  nombre: string;
  monto: number;
  cantidad: number;
  pct: number;
  gastos: Gasto[];
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

export default function RankingGastosPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rankings, setRankings] = useState<RankingGasto[]>([]);
  const [allGastos, setAllGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillCategoria, setDrillCategoria] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const { data } = await supabase.from("gastos")
      .select("tipo_gasto, monto, proveedor_id, concepto, fecha, proveedor:proveedor_id(nombre)")
      .gte("fecha", startDate).lte("fecha", endDate);
    const gastos = (data as unknown as Gasto[]) || [];
    setAllGastos(gastos);

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
          <p className="text-sm text-teus-text_muted mt-1">Click en cualquier categoría para ver los proveedores que te cobraron 👇</p>
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
              <div className="text-sm font-bold text-teus-text_dark mb-4">🏆 Top 5 categorías <span className="text-teus-text_soft font-normal text-xs">(click para ver proveedores)</span></div>
              <div className="space-y-2">
                {rankings.slice(0, 5).map((r, i) => (
                  <button key={r.tipo} onClick={() => setDrillCategoria(r.tipo)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-teus-bg_soft transition text-left group">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-teus-text_dark truncate capitalize">{r.tipo}</div>
                      <div className="text-[10px] text-teus-text_soft">{r.cantidad} gastos · {fmtGs(r.monto)}</div>
                    </div>
                    <div className="text-lg font-black text-teus-danger">{r.pct.toFixed(1)}%</div>
                    <ArrowRight className="w-4 h-4 text-teus-text_soft group-hover:text-teus-accent transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-6 shadow-card mb-6">
            <div className="text-sm font-bold text-teus-text_dark mb-4">📊 Barras comparativas <span className="text-teus-text_soft font-normal text-xs">(click en una barra para ver proveedores)</span></div>
            <div className="space-y-3">
              {rankings.map((r, i) => {
                const maxMonto = rankings[0]?.monto || 1;
                const pctBar = (r.monto / maxMonto) * 100;
                const badge = r.posicion === 1 ? "🥇" : r.posicion === 2 ? "🥈" : r.posicion === 3 ? "🥉" : `${r.posicion}°`;
                return (
                  <button key={r.tipo} onClick={() => setDrillCategoria(r.tipo)} className="w-full flex items-center gap-3 hover:bg-teus-bg_soft rounded-lg p-1 transition cursor-pointer text-left">
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
                    <ArrowRight className="w-4 h-4 text-teus-text_soft" />
                  </button>
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
                  <th className="text-right px-3 py-3">Promedio</th>
                  <th className="text-center px-3 py-3">Proveedores</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr key={r.tipo} onClick={() => setDrillCategoria(r.tipo)} className="border-t border-teus-border_light hover:bg-teus-bg_soft/70 cursor-pointer transition">
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
                    <td className="px-3 py-3 text-center">
                      <button className="inline-flex items-center gap-1 text-teus-accent hover:text-teus-accent-dark font-bold text-xs">
                        Ver <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {drillCategoria && (
        <DrillDownModal
          categoria={drillCategoria}
          gastos={allGastos.filter(g => g.tipo_gasto === drillCategoria)}
          onClose={() => setDrillCategoria(null)}
        />
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
          <path key={i} d={seg.path} fill={seg.color} stroke="#fff" strokeWidth="2" style={{ transition: "all 0.3s ease" }} />
        ))}
      </svg>
    </div>
  );
}

function DrillDownModal({ categoria, gastos, onClose }: { categoria: string; gastos: Gasto[]; onClose: () => void }) {
  const totalCategoria = gastos.reduce((s, g) => s + (g.monto || 0), 0);

  const porProveedor: Record<string, ProveedorEnCategoria> = {};
  gastos.forEach(g => {
    const nombre = g.proveedor?.nombre || "Sin proveedor";
    if (!porProveedor[nombre]) porProveedor[nombre] = { nombre, monto: 0, cantidad: 0, pct: 0, gastos: [] };
    porProveedor[nombre].monto += g.monto || 0;
    porProveedor[nombre].cantidad++;
    porProveedor[nombre].gastos.push(g);
  });

  const proveedores = Object.values(porProveedor).map(p => ({
    ...p,
    pct: totalCategoria > 0 ? (p.monto / totalCategoria) * 100 : 0,
  })).sort((a, b) => b.monto - a.monto);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Users className="w-6 h-6 text-teus-accent" />
              Proveedores de <span className="capitalize text-teus-danger">{categoria}</span>
            </h2>
            <div className="text-xs text-teus-text_muted mt-1">Total categoría: <strong>{fmtGs(totalCategoria)}</strong> · {gastos.length} gastos · {proveedores.length} proveedores distintos</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-sm text-blue-900">
            💡 <strong>Consejo de negociación:</strong> El proveedor #1 tiene el 
            <strong className="mx-1">{proveedores[0]?.pct.toFixed(1)}%</strong> 
            de tu gasto en {categoria}. Es tu mejor candidato para pedir descuento por volumen.
          </div>

          <div className="space-y-3 mb-6">
            {proveedores.map((p, i) => {
              const maxMonto = proveedores[0]?.monto || 1;
              const pctBar = (p.monto / maxMonto) * 100;
              const badge = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}°`;
              return (
                <div key={p.nombre} className="border border-teus-border_light rounded-xl p-4 hover:border-teus-accent transition">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">{badge}</div>
                    <div className="flex-1">
                      <div className="font-black text-lg text-teus-text_dark">{p.nombre}</div>
                      <div className="text-xs text-teus-text_muted">{p.cantidad} gastos · promedio {fmtGs(p.monto / p.cantidad)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-teus-danger">{fmtGs(p.monto)}</div>
                      <div className="text-xs font-bold text-teus-accent">{p.pct.toFixed(1)}% del gasto</div>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all" style={{ width: `${pctBar}%` }} />
                  </div>
                  <details className="mt-3">
                    <summary className="text-xs text-teus-text_muted cursor-pointer hover:text-teus-accent font-semibold">Ver detalle de los {p.cantidad} gastos</summary>
                    <div className="mt-2 space-y-1">
                      {p.gastos.sort((a, b) => (b.monto || 0) - (a.monto || 0)).map((g, gi) => (
                        <div key={gi} className="flex justify-between text-xs bg-teus-bg_soft rounded px-2 py-1">
                          <div>
                            <span className="font-mono text-teus-text_soft">{g.fecha}</span>
                            <span className="ml-2">{g.concepto || "—"}</span>
                          </div>
                          <span className="font-bold text-teus-danger">{fmtGs(g.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-teus-accent hover:bg-teus-accent-2 text-white font-bold rounded-lg text-sm">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
