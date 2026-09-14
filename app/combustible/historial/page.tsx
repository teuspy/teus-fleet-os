"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Fuel, Loader2, ArrowLeft, FileText, Download, AlertTriangle, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import Link from "next/link";

type ArregloRow = {
  id: string;
  proveedor_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_pago: string | null;
  litros_total: number;
  monto_total: number;
  cantidad_viajes: number;
  cantidad_recargas: number;
  estado: string;
  metodo_pago: string | null;
  notas: string | null;
  created_at: string;
  proveedor?: { nombre: string } | null;
};

type ViajeDetalle = {
  id: string;
  fecha: string;
  litros: number;
  gs_por_litro: number;
  costo_combustible: number;
  insumos_estacion_monto: number;
  origen: string;
  destino: string;
  chofer?: { nombre_completo: string } | null;
};

type RecargaDetalle = {
  id: string;
  fecha: string;
  litros: number;
  gs_por_litro: number;
  monto_total: number;
  observacion: string | null;
};

function fmtGs(n: number) {
  return "Gs. " + Math.round(n || 0).toLocaleString("es-PY");
}
function fmtFecha(fechaStr: string | null) {
  if (!fechaStr) return "-";
  const [y, m, d] = fechaStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

export default function HistorialArreglosPage() {
  const supabase = createClient();
  const [arreglos, setArreglos] = useState<ArregloRow[]>([]);
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detalleViajes, setDetalleViajes] = useState<Record<string, ViajeDetalle[]>>({});
  const [detalleRecargas, setDetalleRecargas] = useState<Record<string, RecargaDetalle[]>>({});

  const [filtroProveedor, setFiltroProveedor] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  async function loadData() {
    setLoading(true);
    const [arrRes, provRes] = await Promise.all([
      supabase.from("arreglos_combustible")
        .select("*, proveedor:proveedor_id(nombre)")
        .order("fecha_pago", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase.from("proveedores")
        .select("id, nombre")
        .eq("tipo", "combustible")
        .order("nombre"),
    ]);
    setArreglos((arrRes.data as unknown as ArregloRow[]) || []);
    setProveedores(provRes.data || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtrados = useMemo(() => {
    return arreglos.filter(a => {
      if (filtroProveedor !== "todos" && a.proveedor_id !== filtroProveedor) return false;
      if (filtroEstado !== "todos" && a.estado !== filtroEstado) return false;
      return true;
    });
  }, [arreglos, filtroProveedor, filtroEstado]);

  const totalPagado = filtrados
    .filter(a => a.estado === "pagado")
    .reduce((s, a) => s + (a.monto_total || 0), 0);
  const cantidadPagados = filtrados.filter(a => a.estado === "pagado").length;

  async function toggleExpand(arregloId: string) {
    if (expandedId === arregloId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(arregloId);
    if (!detalleViajes[arregloId] || !detalleRecargas[arregloId]) {
      const [vRes, rRes] = await Promise.all([
        supabase.from("viajes")
          .select("id, fecha, litros, gs_por_litro, costo_combustible, insumos_estacion_monto, origen, destino, chofer:chofer_id(nombre_completo)")
          .eq("arreglo_combustible_id", arregloId)
          .order("fecha"),
        supabase.from("recargas_combustible")
          .select("id, fecha, litros, gs_por_litro, monto_total, observacion")
          .eq("arreglo_combustible_id", arregloId)
          .order("fecha"),
      ]);
      setDetalleViajes(prev => ({ ...prev, [arregloId]: (vRes.data as unknown as ViajeDetalle[]) || [] }));
      setDetalleRecargas(prev => ({ ...prev, [arregloId]: (rRes.data as unknown as RecargaDetalle[]) || [] }));
    }
  }

  async function anularArreglo(arregloId: string, proveedorNombre: string) {
    const confirmMsg = `¿Seguro que querés ANULAR este arreglo?\n\nProveedor: ${proveedorNombre}\n\nEsto va a:\n1. Marcar el arreglo como anulado\n2. Liberar todos los viajes/recargas asociados (volverán a aparecer como pendientes)\n\nUsalo solo si te equivocaste al cerrarlo.`;
    if (!confirm(confirmMsg)) return;

    try {
      // Liberar viajes
      const { error: errV } = await supabase
        .from("viajes")
        .update({ arreglo_combustible_id: null })
        .eq("arreglo_combustible_id", arregloId);
      if (errV) throw errV;

      // Liberar recargas
      const { error: errR } = await supabase
        .from("recargas_combustible")
        .update({ arreglo_combustible_id: null })
        .eq("arreglo_combustible_id", arregloId);
      if (errR) throw errR;

      // Marcar arreglo como anulado
      const { error: errA } = await supabase
        .from("arreglos_combustible")
        .update({ estado: "anulado" })
        .eq("id", arregloId);
      if (errA) throw errA;

      alert("✅ Arreglo anulado. Los viajes/recargas volvieron a estar disponibles.");
      loadData();
    } catch (err: any) {
      alert("Error al anular: " + (err.message || "desconocido"));
    }
  }

  function reexportarExcel(arreglo: ArregloRow) {
    const viajes = detalleViajes[arreglo.id] || [];
    const recargas = detalleRecargas[arreglo.id] || [];
    if (viajes.length === 0 && recargas.length === 0) {
      alert("Primero abrí el arreglo para cargar los datos, después exportá.");
      return;
    }
    const nombreProv = arreglo.proveedor?.nombre || "proveedor";
    const wb = XLSX.utils.book_new();
    const resumen = [
      [`COMPROBANTE DE ARREGLO - ${nombreProv}`],
      [`Rango: ${fmtFecha(arreglo.fecha_inicio)} al ${fmtFecha(arreglo.fecha_fin)}`],
      [`Fecha de pago: ${fmtFecha(arreglo.fecha_pago)}`],
      [`Método de pago: ${arreglo.metodo_pago || "-"}`],
      [`Notas: ${arreglo.notas || "-"}`],
      [""],
      ["Litros totales", arreglo.litros_total],
      ["TOTAL PAGADO", arreglo.monto_total],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(resumen);
    ws1["!cols"] = [{ wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Comprobante");

    const items: any[] = [];
    viajes.forEach(v => items.push({
      tipo: "Viaje", fecha: v.fecha,
      chofer: v.chofer?.nombre_completo || "-",
      detalle: `${v.origen} → ${v.destino}`,
      litros: v.litros || 0, gsL: v.gs_por_litro || 0,
      combustible: v.costo_combustible || 0,
      insumos: v.insumos_estacion_monto || 0,
      total: (v.costo_combustible || 0) + (v.insumos_estacion_monto || 0),
    }));
    recargas.forEach(r => items.push({
      tipo: "Recarga", fecha: r.fecha, chofer: "-",
      detalle: r.observacion || "-",
      litros: r.litros || 0, gsL: r.gs_por_litro || 0,
      combustible: r.monto_total || 0, insumos: 0, total: r.monto_total || 0,
    }));
    items.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const detalle = [
      ["Fecha", "Tipo", "Chofer", "Detalle", "Litros", "Gs/L", "Combustible", "Insumos", "TOTAL"],
      ...items.map(i => [fmtFecha(i.fecha), i.tipo, i.chofer, i.detalle, i.litros, i.gsL, i.combustible, i.insumos, i.total]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(detalle);
    ws2["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Detalle");

    const fname = `Comprobante-${nombreProv.replace(/[^a-zA-Z0-9]/g, "_")}-${arreglo.fecha_inicio}-al-${arreglo.fecha_fin}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="mb-6">
        <Link href="/combustible" className="text-sm text-teus-text_muted hover:text-teus-accent flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Volver a Combustible
        </Link>
        <h1 className="text-3xl font-black text-teus-text_dark flex items-center gap-3">
          <FileText className="w-8 h-8 text-amber-600" />
          Historial de arreglos cerrados
        </h1>
        <p className="text-sm text-teus-text_muted mt-1">
          Todos los arreglos que ya pagaste. Podés abrir cualquiera para ver el detalle o reexportar el comprobante.
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-2xl p-5 shadow-2xl mb-6">
        <div className="text-xs uppercase tracking-widest opacity-80 mb-1">💰 Total pagado (filtro actual)</div>
        <div className="text-3xl font-black">{fmtGs(totalPagado)}</div>
        <div className="text-sm mt-1 opacity-90">
          {cantidadPagados} {cantidadPagados === 1 ? "arreglo cerrado" : "arreglos cerrados"}
        </div>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-6 shadow-card">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-bold text-teus-text_dark">Proveedor:</label>
          <select value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)} className="bg-white border rounded-lg px-3 py-1.5 text-sm">
            <option value="todos">Todos</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <label className="text-sm font-bold text-teus-text_dark">Estado:</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="bg-white border rounded-lg px-3 py-1.5 text-sm">
            <option value="todos">Todos</option>
            <option value="pagado">Pagados</option>
            <option value="anulado">Anulados</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-teus-text_muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando historial...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="p-16 text-center text-teus-text_muted bg-teus-card_light border border-teus-border_light rounded-xl">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-bold">No hay arreglos cerrados con estos filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(a => {
            const isExpanded = expandedId === a.id;
            const isAnulado = a.estado === "anulado";
            return (
              <div key={a.id} className={`bg-teus-card_light border-2 rounded-xl shadow-card ${isAnulado ? "border-red-300 opacity-70" : "border-teus-border_light"}`}>
                <div
                  className="p-4 cursor-pointer hover:bg-teus-bg_soft flex items-center justify-between gap-4"
                  onClick={() => toggleExpand(a.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-teus-text_muted" /> : <ChevronRight className="w-5 h-5 text-teus-text_muted" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-teus-text_dark">{a.proveedor?.nombre || "(proveedor eliminado)"}</h3>
                        {isAnulado && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> ANULADO</span>}
                        {!isAnulado && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">PAGADO</span>}
                      </div>
                      <div className="text-xs text-teus-text_muted mt-0.5">
                        {fmtFecha(a.fecha_inicio)} al {fmtFecha(a.fecha_fin)} · Pagado el {fmtFecha(a.fecha_pago)} · {a.metodo_pago || "-"}
                      </div>
                      {a.notas && <div className="text-xs italic text-teus-text_muted mt-1">📝 {a.notas}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-amber-900">{fmtGs(a.monto_total)}</div>
                    <div className="text-xs text-teus-text_muted">
                      {a.litros_total} lts · {a.cantidad_viajes} viajes{a.cantidad_recargas > 0 ? ` + ${a.cantidad_recargas} recargas` : ""}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-teus-border_light p-4 bg-teus-bg_soft">
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => reexportarExcel(a)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Reexportar comprobante Excel
                      </button>
                      {!isAnulado && (
                        <button
                          onClick={() => anularArreglo(a.id, a.proveedor?.nombre || "")}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Anular arreglo (deshacer)
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto bg-white rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-teus-bg_soft">
                          <tr>
                            <th className="text-left p-2">Fecha</th>
                            <th className="text-left p-2">Tipo</th>
                            <th className="text-left p-2">Chofer / Detalle</th>
                            <th className="text-right p-2">Litros</th>
                            <th className="text-right p-2">Gs/L</th>
                            <th className="text-right p-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ...(detalleViajes[a.id] || []).map(v => ({
                              id: v.id, tipo: "viaje" as const, fecha: v.fecha,
                              chofer: v.chofer?.nombre_completo || "-",
                              litros: v.litros || 0, gsL: v.gs_por_litro || 0,
                              total: (v.costo_combustible || 0) + (v.insumos_estacion_monto || 0),
                            })),
                            ...(detalleRecargas[a.id] || []).map(r => ({
                              id: r.id, tipo: "recarga" as const, fecha: r.fecha,
                              chofer: r.observacion || "recarga suelta",
                              litros: r.litros || 0, gsL: r.gs_por_litro || 0,
                              total: r.monto_total || 0,
                            })),
                          ]
                            .sort((a, b) => a.fecha.localeCompare(b.fecha))
                            .map(i => (
                              <tr key={i.id} className="border-t border-teus-border_light">
                                <td className="p-2">{fmtFecha(i.fecha)}</td>
                                <td className="p-2">
                                  {i.tipo === "viaje" ? (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">VIAJE</span>
                                  ) : (
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">RECARGA</span>
                                  )}
                                </td>
                                <td className="p-2">{i.chofer}</td>
                                <td className="p-2 text-right">{i.litros}</td>
                                <td className="p-2 text-right">{fmtGs(i.gsL)}</td>
                                <td className="p-2 text-right font-bold text-amber-900">{fmtGs(i.total)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
