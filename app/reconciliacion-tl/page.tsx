"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wallet, Loader2, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react";
type Viaje = {
  id: string;
  fecha: string;
  vehiculo_id: string | null;
  cliente_id: string | null;
  vehiculo_externo_id: string | null;
  chofer_externo_nombre: string | null;
  origen: string;
  destino: string;
  precio_flete: number;
  costo_combustible: number;
  litros: number;
  gs_por_litro: number;
  viatico: number;
  otros_costos: number;
  precio_pagado_al_externo: number;
  comision_recibida: number;
  nro_contenedor: string | null;
  cliente?: { nombre: string } | null;
  vehiculo?: { alias: string | null; chapa: string } | null;
};
type PagoViatico = {
  id: string;
  fecha_pago: string;
  monto: number;
  semana_inicio: string;
  notas: string | null;
};
type RecargaCombustible = {
  id: string;
  fecha: string;
  vehiculo_id: string | null;
  proveedor_id: string | null;
  litros: number;
  gs_por_litro: number;
  monto_total: number;
  observacion: string | null;
};
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function fmtGs(n: number) {
  const sign = n < 0 ? "-" : "";
  return sign + "Gs. " + Math.round(Math.abs(n || 0)).toLocaleString("es-PY");
}
function fmtFecha(fechaStr: string) {
  const [, m, d] = fechaStr.split("T")[0].split("-");
  return `${d}/${m}`;
}
export default function ReconciliacionTLPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quincena, setQuincena] = useState<"1" | "2">(now.getDate() <= 15 ? "1" : "2");
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [pagosViatico, setPagosViatico] = useState<PagoViatico[]>([]);
  const [recargasCombustible, setRecargasCombustible] = useState<RecargaCombustible[]>([]);
  const [loading, setLoading] = useState(true);
  async function loadData() {
    setLoading(true);
    const startDay = quincena === "1" ? "01" : "16";
    const endDay = quincena === "1" ? "15" : String(new Date(year, month, 0).getDate()).padStart(2, "0");
    const startDate = `${year}-${String(month).padStart(2, "0")}-${startDay}`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${endDay}`;
    const [viajesRes, pagosRes, recargasRes] = await Promise.all([
      supabase.from("viajes")
        .select("*, cliente:cliente_id(nombre), vehiculo:vehiculo_id(alias, chapa)")
        .gte("fecha", startDate).lte("fecha", endDate)
        .order("fecha"),
      supabase.from("pagos_viatico")
        .select("*")
        .gte("semana_inicio", startDate).lte("semana_inicio", endDate)
        .order("fecha_pago"),
      supabase.from("recargas_combustible")
        .select("*")
        .gte("fecha", startDate).lte("fecha", endDate)
        .order("fecha"),
    ]);
    setViajes((viajesRes.data as unknown as Viaje[]) || []);
    setPagosViatico((pagosRes.data as unknown as PagoViatico[]) || []);
    setRecargasCombustible((recargasRes.data as unknown as RecargaCombustible[]) || []);
    setLoading(false);
  }
  useEffect(() => { loadData(); }, [year, month, quincena]);
  // DEBO A DAVID (débito)
  const debitos = useMemo(() => {
    // Combustible y viático: SOLO de viajes con camión PROPIO (no externo)
    // Porque cuando uso camión de TL, David paga combustible/viático de su bolsillo (Opción A)
    const viajesConCamionPropio = viajes.filter(v => !v.vehiculo_externo_id);
    const combustibleViajes = viajesConCamionPropio.reduce((s, v) => s + (v.costo_combustible || 0), 0);
    const litrosViajes = viajesConCamionPropio.reduce((s, v) => s + (v.litros || 0), 0);
        // Recargas sueltas (fuera de viajes) - todas van a David (Opción A: sin filtro por proveedor)
    const combustibleRecargas = recargasCombustible.reduce((s, r) => s + (r.monto_total || 0), 0);
    const litrosRecargas = recargasCombustible.reduce((s, r) => s + (r.litros || 0), 0);
    // Insumos extra comprados en la estación (aceite, refrigerante, etc.)
    const totalInsumosEstacion = viajesConCamionPropio.reduce((s, v) => s + ((v as any).insumos_estacion_monto || 0), 0);
    const totalCombustible = combustibleViajes + combustibleRecargas + totalInsumosEstacion;
    const totalLitros = litrosViajes + litrosRecargas;
    const totalViatico = viajesConCamionPropio.reduce((s, v) => s + (v.viatico || 0), 0);
    // Fletes con camión TL (le debo el flete completo)
    const viajesConCamionTL = viajes.filter(v => v.vehiculo_externo_id === "TL");
    const totalFletesConTL = viajesConCamionTL.reduce((s, v) => s + (v.precio_pagado_al_externo || v.precio_flete || 0), 0);
    const totalComision = viajesConCamionTL.reduce((s, v) => s + (v.comision_recibida || 0), 0);
    const debeFletesTL = totalFletesConTL;
    return {
      totalCombustible, totalLitros, combustibleViajes, litrosViajes, combustibleRecargas, litrosRecargas,
      totalViatico, totalFletesConTL, totalComision, debeFletesTL,
      viajesConCamionPropio, viajesConCamionTL,
      total: totalCombustible + totalViatico + debeFletesTL,
    };
  }, [viajes, recargasCombustible]);
  // ME DEBE DAVID (crédito)
  const creditos = useMemo(() => {
    const viajesParaTL = viajes.filter(v => 
      v.cliente?.nombre?.toUpperCase().includes("T&L") && !v.vehiculo_externo_id
    );
    const totalFletesParaTL = viajesParaTL.reduce((s, v) => s + (v.precio_flete || 0), 0);
    const totalComisionRecibida = debitos.totalComision;
    const totalPagosViatico = pagosViatico.reduce((s, p) => s + (p.monto || 0), 0);
    return {
      viajesParaTL, totalFletesParaTL, totalComisionRecibida, totalPagosViatico,
      total: totalFletesParaTL + totalComisionRecibida + totalPagosViatico,
    };
  }, [viajes, debitos, pagosViatico]);
  const neto = debitos.total - creditos.total;
  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-teus-text_dark flex items-center gap-3">
            <Wallet className="w-8 h-8 text-teus-accent" />
            Reconciliación con David (TL)
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Libro de contabilidad quincenal · Débitos / Créditos / Neteo automático</p>
          <a href="/conciliacion-viaticos" className="inline-flex items-center gap-2 mt-3 bg-green-100 hover:bg-green-200 text-green-900 px-4 py-2 rounded-lg text-sm font-bold transition">
            💵 Ir a Conciliación Viáticos Semanal (pagos parciales) →
          </a>
        </div>
        <div className="flex items-center gap-3 bg-teus-card_light border border-teus-border_light rounded-xl px-4 py-2 shadow-card">
          <Calendar className="w-4 h-4 text-teus-accent" />
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-white border rounded-lg px-3 py-1.5 text-sm font-semibold">
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white border rounded-lg px-3 py-1.5 text-sm font-semibold">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={quincena} onChange={(e) => setQuincena(e.target.value as "1" | "2")} className="bg-white border rounded-lg px-3 py-1.5 text-sm font-semibold">
            <option value="1">1ra Q (1-15)</option>
            <option value="2">2da Q (16-fin)</option>
          </select>
        </div>
      </div>
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
        <div className="text-sm font-black text-yellow-900 mb-2">📖 REGLAS DEL LIBRO CON DAVID (memorizá esto)</div>
        <div className="grid grid-cols-2 gap-4 text-xs text-yellow-900">
          <div>
            <div className="font-bold mb-1">💸 YO LE DEBO A DAVID:</div>
            <ul className="space-y-0.5">
              <li>⛽ Combustible (viajes + recargas sueltas en la estación)</li>
              <li>💵 Viáticos que retiré (según ruta)</li>
              <li>🚛 Fletes con SUS camiones (flete completo)</li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-1">💰 DAVID ME DEBE:</div>
            <ul className="space-y-0.5">
              <li>🚛 Fletes que hice PARA él (con mis camiones)</li>
              <li>💰 5% de comisión sobre fletes con SUS camiones</li>
              <li>💵 Pagos viáticos que le hice en efectivo (semanales)</li>
            </ul>
          </div>
        </div>
        <div className="text-xs text-yellow-900 mt-2 font-bold">🎯 NETEO = DEBO − ME DEBE. Positivo = yo pago. Negativo = él paga.</div>
      </div>
      {loading ? (
        <div className="p-16 text-center text-teus-text_muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-black text-red-900">💸 YO LE DEBO A DAVID</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <div className="text-xs uppercase font-bold text-red-700">⛽ Combustible</div>
                      <div className="text-[10px] text-red-600 mt-0.5">{debitos.totalLitros.toLocaleString("es-PY")} lts · {debitos.litrosViajes.toLocaleString("es-PY")} en viajes + {debitos.litrosRecargas.toLocaleString("es-PY")} en recargas</div>
                    </div>
                    <div className="text-lg font-black text-red-900">{fmtGs(debitos.totalCombustible)}</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <div className="text-xs uppercase font-bold text-red-700">💵 Viáticos</div>
                      <div className="text-[10px] text-red-600 mt-0.5">retirados de la estación (bruto)</div>
                    </div>
                    <div className="text-lg font-black text-red-900">{fmtGs(debitos.totalViatico)}</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <div className="text-xs uppercase font-bold text-red-700">🚛 Fletes con camión TL</div>
                      <div className="text-[10px] text-red-600 mt-0.5">{debitos.viajesConCamionTL.length} viajes · flete completo</div>
                    </div>
                    <div className="text-lg font-black text-red-900">{fmtGs(debitos.debeFletesTL)}</div>
                  </div>
                </div>
                <div className="bg-red-600 text-white rounded-lg p-4 mt-4">
                  <div className="text-xs uppercase font-bold opacity-90">TOTAL DEBO</div>
                  <div className="text-3xl font-black">{fmtGs(debitos.total)}</div>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <ArrowDownLeft className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-black text-green-900">💰 DAVID ME DEBE</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <div className="text-xs uppercase font-bold text-green-700">🚛 Fletes hechos PARA TL</div>
                      <div className="text-[10px] text-green-600 mt-0.5">{creditos.viajesParaTL.length} viajes · con mis camiones</div>
                    </div>
                    <div className="text-lg font-black text-green-900">{fmtGs(creditos.totalFletesParaTL)}</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <div className="text-xs uppercase font-bold text-green-700">💰 Comisión 5%</div>
                      <div className="text-[10px] text-green-600 mt-0.5">sobre fletes con camiones TL</div>
                    </div>
                    <div className="text-lg font-black text-green-900">{fmtGs(creditos.totalComisionRecibida)}</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <div className="text-xs uppercase font-bold text-green-700">💵 Pagos viáticos en efectivo</div>
                      <div className="text-[10px] text-green-600 mt-0.5">{pagosViatico.length} {pagosViatico.length === 1 ? "pago semanal" : "pagos semanales"} en esta quincena</div>
                    </div>
                    <div className="text-lg font-black text-green-900">{fmtGs(creditos.totalPagosViatico)}</div>
                  </div>
                </div>
                <div className="bg-green-600 text-white rounded-lg p-4 mt-4">
                  <div className="text-xs uppercase font-bold opacity-90">TOTAL ME DEBE</div>
                  <div className="text-3xl font-black">{fmtGs(creditos.total)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-teus-text_dark to-gray-900 text-white rounded-2xl p-6 shadow-2xl mb-6">
            <div className="text-xs uppercase tracking-widest opacity-70 mb-3">🎯 NETEO FINAL</div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div>
                <div className="text-xs opacity-70">DEBO A DAVID</div>
                <div className="text-2xl font-black text-red-300">{fmtGs(debitos.total)}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">(−) DAVID ME DEBE</div>
                <div className="text-2xl font-black text-green-300">{fmtGs(creditos.total)}</div>
              </div>
              <div className={`p-4 rounded-xl ${neto >= 0 ? "bg-red-500" : "bg-green-500"}`}>
                <div className="text-xs opacity-90 font-bold uppercase">
                  {neto >= 0 ? "➡️ YO LE PAGO A DAVID" : "⬅️ DAVID ME PAGA A MÍ"}
                </div>
                <div className="text-3xl font-black">{fmtGs(Math.abs(neto))}</div>
              </div>
            </div>
          </div>
          <details className="bg-teus-card_light border border-teus-border_light rounded-xl mb-4 shadow-card">
            <summary className="cursor-pointer px-5 py-3 font-bold text-teus-text_dark hover:bg-teus-bg_soft">
              📋 Detalle: {debitos.viajesConCamionPropio.length} viajes con camión propio (para combustible/viático)
            </summary>
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead className="bg-teus-bg_soft">
                  <tr>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Cliente</th>
                    <th className="text-left p-2">Ruta</th>
                    <th className="text-left p-2">Equipo</th>
                    <th className="text-right p-2">Litros</th>
                    <th className="text-right p-2">Combustible</th>
                    <th className="text-right p-2">Viático</th>
                  </tr>
                </thead>
                <tbody>
                  {debitos.viajesConCamionPropio.map(v => (
                    <tr key={v.id} className="border-t border-teus-border_light">
                      <td className="p-2">{fmtFecha(v.fecha)}</td>
                      <td className="p-2">{v.cliente?.nombre || "-"}</td>
                      <td className="p-2">{v.origen}→{v.destino}</td>
                      <td className="p-2">{v.vehiculo?.alias || "-"}</td>
                      <td className="p-2 text-right">{v.litros}</td>
                      <td className="p-2 text-right text-red-600 font-bold">{fmtGs(v.costo_combustible)}</td>
                      <td className="p-2 text-right text-red-600 font-bold">{fmtGs(v.viatico)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          {recargasCombustible.length > 0 && (
            <details className="bg-teus-card_light border border-teus-border_light rounded-xl mb-4 shadow-card">
              <summary className="cursor-pointer px-5 py-3 font-bold text-teus-text_dark hover:bg-teus-bg_soft">
                ⛽ Detalle: {recargasCombustible.length} recargas de combustible sueltas (esta quincena)
              </summary>
              <div className="overflow-x-auto p-3">
                <table className="w-full text-xs">
                  <thead className="bg-teus-bg_soft">
                    <tr>
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Observación</th>
                      <th className="text-right p-2">Litros</th>
                      <th className="text-right p-2">Gs/L</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recargasCombustible.map(r => (
                      <tr key={r.id} className="border-t border-teus-border_light">
                        <td className="p-2">{fmtFecha(r.fecha)}</td>
                        <td className="p-2">{r.observacion || "-"}</td>
                        <td className="p-2 text-right">{r.litros}</td>
                        <td className="p-2 text-right">{fmtGs(r.gs_por_litro)}</td>
                        <td className="p-2 text-right font-bold text-red-600">{fmtGs(r.monto_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {pagosViatico.length > 0 && (
            <details className="bg-teus-card_light border border-teus-border_light rounded-xl mb-4 shadow-card">
              <summary className="cursor-pointer px-5 py-3 font-bold text-teus-text_dark hover:bg-teus-bg_soft">
                📋 Detalle: {pagosViatico.length} pagos de viáticos en efectivo (esta quincena)
              </summary>
              <div className="overflow-x-auto p-3">
                <table className="w-full text-xs">
                  <thead className="bg-teus-bg_soft">
                    <tr>
                      <th className="text-left p-2">Fecha pago</th>
                      <th className="text-left p-2">Semana pagada</th>
                      <th className="text-left p-2">Notas</th>
                      <th className="text-right p-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosViatico.map(p => (
                      <tr key={p.id} className="border-t border-teus-border_light">
                        <td className="p-2">{fmtFecha(p.fecha_pago)}</td>
                        <td className="p-2">Lun {fmtFecha(p.semana_inicio)}</td>
                        <td className="p-2">{p.notas || "-"}</td>
                        <td className="p-2 text-right font-bold text-green-600">{fmtGs(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {creditos.viajesParaTL.length > 0 && (
            <details className="bg-teus-card_light border border-teus-border_light rounded-xl mb-4 shadow-card">
              <summary className="cursor-pointer px-5 py-3 font-bold text-teus-text_dark hover:bg-teus-bg_soft">
                📋 Detalle: {creditos.viajesParaTL.length} fletes hechos PARA David
              </summary>
              <div className="overflow-x-auto p-3">
                <table className="w-full text-xs">
                  <thead className="bg-teus-bg_soft">
                    <tr>
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Contenedor</th>
                      <th className="text-left p-2">Ruta</th>
                      <th className="text-left p-2">Equipo</th>
                      <th className="text-right p-2">Flete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditos.viajesParaTL.map(v => (
                      <tr key={v.id} className="border-t border-teus-border_light">
                        <td className="p-2">{fmtFecha(v.fecha)}</td>
                        <td className="p-2 font-mono">{v.nro_contenedor || "-"}</td>
                        <td className="p-2">{v.origen}→{v.destino}</td>
                        <td className="p-2">{v.vehiculo?.alias || "-"}</td>
                        <td className="p-2 text-right font-bold text-green-600">{fmtGs(v.precio_flete)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {debitos.viajesConCamionTL.length > 0 && (
            <details className="bg-teus-card_light border border-teus-border_light rounded-xl shadow-card">
              <summary className="cursor-pointer px-5 py-3 font-bold text-teus-text_dark hover:bg-teus-bg_soft">
                📋 Detalle: {debitos.viajesConCamionTL.length} fletes con camión de David
              </summary>
              <div className="overflow-x-auto p-3">
                <table className="w-full text-xs">
                  <thead className="bg-teus-bg_soft">
                    <tr>
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Chofer TL</th>
                      <th className="text-left p-2">Ruta</th>
                      <th className="text-right p-2">Flete</th>
                      <th className="text-right p-2">Comisión 5%</th>
                      <th className="text-right p-2">Debo neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debitos.viajesConCamionTL.map(v => (
                      <tr key={v.id} className="border-t border-teus-border_light">
                        <td className="p-2">{fmtFecha(v.fecha)}</td>
                        <td className="p-2">{v.cliente?.nombre || "-"}</td>
                        <td className="p-2">{v.chofer_externo_nombre || "-"}</td>
                        <td className="p-2">{v.origen}→{v.destino}</td>
                        <td className="p-2 text-right">{fmtGs(v.precio_flete)}</td>
                        <td className="p-2 text-right text-green-600">{fmtGs(v.comision_recibida)}</td>
                        <td className="p-2 text-right font-bold text-red-600">{fmtGs(v.precio_flete - v.comision_recibida)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
