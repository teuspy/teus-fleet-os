"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wallet, Loader2, Calendar, ArrowRight, Users } from "lucide-react";

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
  viatico: number;
  otros_costos: number;
  precio_pagado_al_externo: number;
  comision_recibida: number;
  nro_contenedor: string | null;
  cliente?: { nombre: string } | null;
  vehiculo?: { alias: string | null; chapa: string } | null;
};

const CLIENTE_TL_NOMBRE = "TL";
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtGs(n: number) {
  const sign = n < 0 ? "-" : "";
  return sign + "Gs. " + Math.round(Math.abs(n || 0)).toLocaleString("es-PY");
}

function fmtFecha(fechaStr: string) {
  const [y, m, d] = fechaStr.split("T")[0].split("-");
  return `${d}/${m}`;
}

export default function ReconciliacionTLPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quincena, setQuincena] = useState<"1" | "2">(now.getDate() <= 15 ? "1" : "2");
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const startDay = quincena === "1" ? "01" : "16";
    const endDay = quincena === "1" ? "15" : String(new Date(year, month, 0).getDate()).padStart(2, "0");
    const startDate = `${year}-${String(month).padStart(2, "0")}-${startDay}`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${endDay}`;

    const { data } = await supabase.from("viajes")
      .select("*, cliente:cliente_id(nombre), vehiculo:vehiculo_id(alias, chapa)")
      .gte("fecha", startDate).lte("fecha", endDate)
      .order("fecha");
    setViajes((data as unknown as Viaje[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month, quincena]);

  const flujoA = useMemo(() => {
    const viajesA = viajes.filter(v => v.cliente?.nombre?.toUpperCase() === CLIENTE_TL_NOMBRE && !v.vehiculo_externo_id);
    const totalFletes = viajesA.reduce((s, v) => s + (v.precio_flete || 0), 0);
    const totalCombustible = viajesA.reduce((s, v) => s + (v.costo_combustible || 0), 0);
    const totalViaticos = viajesA.reduce((s, v) => s + (v.viatico || 0), 0);
    const totalOtros = viajesA.reduce((s, v) => s + (v.otros_costos || 0), 0);
    const neto = totalFletes - totalCombustible - totalViaticos - totalOtros;
    return { viajes: viajesA, totalFletes, totalCombustible, totalViaticos, totalOtros, neto };
  }, [viajes]);

  const flujoB = useMemo(() => {
    const viajesB = viajes.filter(v => v.vehiculo_externo_id === "TL");
    const totalFletes = viajesB.reduce((s, v) => s + (v.precio_flete || 0), 0);
    const totalComision = viajesB.reduce((s, v) => s + (v.comision_recibida || 0), 0);
    const debeATL = totalFletes - totalComision;
    return { viajes: viajesB, totalFletes, totalComision, debeATL };
  }, [viajes]);

  const flujoC = useMemo(() => {
    const viajesC = viajes.filter(v => v.vehiculo_externo_id === "ELVIO");
    const totalPagadoAElvio = viajesC.reduce((s, v) => s + (v.precio_pagado_al_externo || 0), 0);
    const totalCobrado = viajesC.reduce((s, v) => s + (v.precio_flete || 0), 0);
    const margen = totalCobrado - totalPagadoAElvio;
    return { viajes: viajesC, totalPagadoAElvio, totalCobrado, margen };
  }, [viajes]);

  const netoConTL = flujoB.debeATL - flujoA.neto;

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Wallet className="w-8 h-8 text-teus-accent" />
            Reconciliación con Aliados
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Neteo automático quincenal con TL y compra/venta con Elvio</p>
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

      {loading ? (
        <div className="p-16 text-center text-teus-text_muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Cargando...
        </div>
      ) : (
        <>
          <div className="bg-teus-accent/5 border border-teus-accent/30 rounded-2xl p-5 mb-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-5 h-5 text-teus-accent rotate-180" />
              <h2 className="text-lg font-black text-teus-text_dark">🅰️ Teus HIZO viajes PARA TL (con camiones Teus)</h2>
              <span className="ml-auto text-xs bg-teus-accent/20 text-teus-accent-dark px-2 py-1 rounded font-bold">{flujoA.viajes.length} viajes</span>
            </div>
            <div className="grid grid-cols-5 gap-3 mb-3">
              <div className="bg-white rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-teus-text_muted">Fletes</div>
                <div className="text-lg font-black text-teus-text_dark">{fmtGs(flujoA.totalFletes)}</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-teus-text_muted">(−) Combustible</div>
                <div className="text-lg font-black text-teus-danger">{fmtGs(flujoA.totalCombustible)}</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-teus-text_muted">(−) Viáticos</div>
                <div className="text-lg font-black text-teus-danger">{fmtGs(flujoA.totalViaticos)}</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-teus-text_muted">(−) Otros</div>
                <div className="text-lg font-black text-teus-danger">{fmtGs(flujoA.totalOtros)}</div>
              </div>
              <div className="bg-teus-accent text-white rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold opacity-80">= TL debe a Teus</div>
                <div className="text-lg font-black">{fmtGs(flujoA.neto)}</div>
              </div>
            </div>
            {flujoA.viajes.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs font-bold text-teus-accent cursor-pointer">Ver detalle de los {flujoA.viajes.length} viajes</summary>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs">
                    <thead className="bg-white text-teus-text_muted">
                      <tr>
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Ruta</th>
                        <th className="text-left p-2">Contenedor</th>
                        <th className="text-left p-2">Equipo</th>
                        <th className="text-right p-2">Flete</th>
                        <th className="text-right p-2">Comb</th>
                        <th className="text-right p-2">Viát</th>
                        <th className="text-right p-2">Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flujoA.viajes.map(v => (
                        <tr key={v.id} className="border-t border-teus-border_light">
                          <td className="p-2">{fmtFecha(v.fecha)}</td>
                          <td className="p-2">{v.origen}→{v.destino}</td>
                          <td className="p-2 font-mono text-[10px]">{v.nro_contenedor || "-"}</td>
                          <td className="p-2">{v.vehiculo?.alias || "-"}</td>
                          <td className="p-2 text-right">{fmtGs(v.precio_flete)}</td>
                          <td className="p-2 text-right text-teus-danger">{fmtGs(v.costo_combustible)}</td>
                          <td className="p-2 text-right text-teus-danger">{fmtGs(v.viatico)}</td>
                          <td className="p-2 text-right font-bold text-teus-accent">{fmtGs(v.precio_flete - v.costo_combustible - v.viatico - (v.otros_costos || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-300 rounded-2xl p-5 mb-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-black text-teus-text_dark">🅱️ Teus USÓ camiones de TL (para clientes Teus)</h2>
              <span className="ml-auto text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded font-bold">{flujoB.viajes.length} viajes</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-teus-text_muted">Total fletes con camiones TL</div>
                <div className="text-lg font-black text-teus-text_dark">{fmtGs(flujoB.totalFletes)}</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-teus-text_muted">(−) Comisión 5% Teus</div>
                <div className="text-lg font-black text-teus-accent">{fmtGs(flujoB.totalComision)}</div>
              </div>
              <div className="bg-orange-500 text-white rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold opacity-80">= Teus debe a TL</div>
                <div className="text-lg font-black">{fmtGs(flujoB.debeATL)}</div>
              </div>
            </div>
            {flujoB.viajes.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs font-bold text-orange-700 cursor-pointer">Ver detalle de los {flujoB.viajes.length} viajes</summary>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs">
                    <thead className="bg-white text-teus-text_muted">
                      <tr>
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Cliente</th>
                        <th className="text-left p-2">Chofer TL</th>
                        <th className="text-left p-2">Ruta</th>
                        <th className="text-right p-2">Flete</th>
                        <th className="text-right p-2">Comisión 5%</th>
                        <th className="text-right p-2">Debo a TL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flujoB.viajes.map(v => (
                        <tr key={v.id} className="border-t border-teus-border_light">
                          <td className="p-2">{fmtFecha(v.fecha)}</td>
                          <td className="p-2">{v.cliente?.nombre || "-"}</td>
                          <td className="p-2">{v.chofer_externo_nombre || "-"}</td>
                          <td className="p-2">{v.origen}→{v.destino}</td>
                          <td className="p-2 text-right">{fmtGs(v.precio_flete)}</td>
                          <td className="p-2 text-right text-teus-accent">{fmtGs(v.comision_recibida)}</td>
                          <td className="p-2 text-right font-bold text-orange-600">{fmtGs(v.precio_flete - v.comision_recibida)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>

          <div className="bg-gradient-to-br from-teus-text_dark to-gray-900 text-white rounded-2xl p-6 mb-6 shadow-2xl">
            <div className="text-xs uppercase tracking-widest opacity-70 mb-2">🎯 NETEO FINAL con TL</div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div>
                <div className="text-xs opacity-70">Teus debe a TL (B)</div>
                <div className="text-2xl font-black">{fmtGs(flujoB.debeATL)}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">(−) TL debe a Teus (A)</div>
                <div className="text-2xl font-black">{fmtGs(flujoA.neto)}</div>
              </div>
              <div className={`p-4 rounded-xl ${netoConTL >= 0 ? "bg-orange-500" : "bg-teus-accent"}`}>
                <div className="text-xs opacity-90 font-bold uppercase">
                  {netoConTL >= 0 ? "➡️ Teus PAGA a TL" : "⬅️ TL PAGA a Teus"}
                </div>
                <div className="text-3xl font-black">{fmtGs(Math.abs(netoConTL))}</div>
              </div>
            </div>
          </div>

          {flujoC.viajes.length > 0 && (
            <div className="bg-purple-50 border border-purple-300 rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-black text-teus-text_dark">🅲 Compra/venta con Elvio González</h2>
                <span className="ml-auto text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded font-bold">{flujoC.viajes.length} viajes</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-teus-text_muted">Cobrado a clientes</div>
                  <div className="text-lg font-black text-teus-text_dark">{fmtGs(flujoC.totalCobrado)}</div>
                </div>
                <div className="bg-purple-500 text-white rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold opacity-90">Teus debe a Elvio</div>
                  <div className="text-lg font-black">{fmtGs(flujoC.totalPagadoAElvio)}</div>
                </div>
                <div className={`rounded-lg p-3 ${flujoC.margen >= 0 ? "bg-teus-accent" : "bg-teus-danger"} text-white`}>
                  <div className="text-[10px] uppercase font-bold opacity-90">Margen Teus</div>
                  <div className="text-lg font-black">{fmtGs(flujoC.margen)}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
