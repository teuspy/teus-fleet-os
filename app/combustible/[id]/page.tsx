"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Fuel, Loader2, ArrowLeft, Download, CheckCircle, X, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import Link from "next/link";

type Proveedor = {
  id: string;
  nombre: string;
  gs_por_litro: number | null;
  activo: boolean;
};

type ViajeItem = {
  id: string;
  fecha: string;
  litros: number;
  gs_por_litro: number;
  costo_combustible: number;
  insumos_estacion_monto: number;
  insumos_estacion_detalle: string | null;
  origen: string;
  destino: string;
  chofer?: { nombre_completo: string } | null;
  cliente?: { nombre: string } | null;
};

type RecargaItem = {
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
function fmtFecha(fechaStr: string) {
  const [y, m, d] = fechaStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ArregloProveedorPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const proveedorId = params?.id as string;

  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [viajes, setViajes] = useState<ViajeItem[]>([]);
  const [recargas, setRecargas] = useState<RecargaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [desde, setDesde] = useState(toISODate(primerDiaMes));
  const [hasta, setHasta] = useState(toISODate(ultimoDiaMes));

  const [fechaPago, setFechaPago] = useState(toISODate(new Date()));
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [notas, setNotas] = useState("");

  async function loadData() {
    setLoading(true);
    const [provRes, viajesRes, recargasRes] = await Promise.all([
      supabase.from("proveedores").select("*").eq("id", proveedorId).single(),
      supabase.from("viajes")
        .select("id, fecha, litros, gs_por_litro, costo_combustible, insumos_estacion_monto, insumos_estacion_detalle, origen, destino, chofer:chofer_id(nombre_completo), cliente:cliente_id(nombre)")
        .eq("proveedor_combustible_id", proveedorId)
        .is("arreglo_combustible_id", null)
        .is("vehiculo_externo_id", null)
        .order("fecha"),
      supabase.from("recargas_combustible")
        .select("id, fecha, litros, gs_por_litro, monto_total, observacion")
        .eq("proveedor_id", proveedorId)
        .is("arreglo_combustible_id", null)
        .order("fecha"),
    ]);
    if (provRes.error) {
      alert("Error cargando proveedor: " + provRes.error.message);
      setLoading(false);
      return;
    }
    setProveedor(provRes.data as Proveedor);
    setViajes((viajesRes.data as unknown as ViajeItem[]) || []);
    setRecargas((recargasRes.data as unknown as RecargaItem[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (proveedorId) loadData();
  }, [proveedorId]);

  const viajesEnRango = useMemo(() =>
    viajes.filter(v => v.fecha >= desde && v.fecha <= hasta),
    [viajes, desde, hasta]
  );
  const recargasEnRango = useMemo(() =>
    recargas.filter(r => r.fecha >= desde && r.fecha <= hasta),
    [recargas, desde, hasta]
  );

  const totalLitros =
    viajesEnRango.reduce((s, v) => s + (v.litros || 0), 0) +
    recargasEnRango.reduce((s, r) => s + (r.litros || 0), 0);
  const totalCombustible =
    viajesEnRango.reduce((s, v) => s + (v.costo_combustible || 0), 0) +
    recargasEnRango.reduce((s, r) => s + (r.monto_total || 0), 0);
  const totalInsumos = viajesEnRango.reduce((s, v) => s + (v.insumos_estacion_monto || 0), 0);
  const totalGeneral = totalCombustible + totalInsumos;
  const promedioGsL = totalLitros > 0 ? totalCombustible / totalLitros : 0;

  function setPresetMesActual() {
    const p = new Date(now.getFullYear(), now.getMonth(), 1);
    const u = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDesde(toISODate(p));
    setHasta(toISODate(u));
  }
  function setPresetMesAnterior() {
    const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const u = new Date(now.getFullYear(), now.getMonth(), 0);
    setDesde(toISODate(p));
    setHasta(toISODate(u));
  }
  function setPresetUltimos15() {
    const hoy = new Date();
    const hace15 = new Date();
    hace15.setDate(hoy.getDate() - 15);
    setDesde(toISODate(hace15));
    setHasta(toISODate(hoy));
  }
  function setPresetTodo() {
    if (viajes.length === 0 && recargas.length === 0) return;
    const fechasV = viajes.map(v => v.fecha);
    const fechasR = recargas.map(r => r.fecha);
    const todas = [...fechasV, ...fechasR].sort();
    setDesde(todas[0]);
    setHasta(todas[todas.length - 1]);
  }

  async function cerrarArreglo() {
    if (viajesEnRango.length === 0 && recargasEnRango.length === 0) {
      alert("No hay viajes ni recargas en el rango seleccionado.");
      return;
    }
    setClosing(true);
    try {
      const { data: nuevoArreglo, error: errIns } = await supabase
        .from("arreglos_combustible")
        .insert({
          proveedor_id: proveedorId,
          fecha_inicio: desde,
          fecha_fin: hasta,
          fecha_pago: fechaPago,
          litros_total: totalLitros,
          monto_total: totalGeneral,
          cantidad_viajes: viajesEnRango.length,
          cantidad_recargas: recargasEnRango.length,
          estado: "pagado",
          metodo_pago: metodoPago,
          notas: notas.trim() || null,
        })
        .select()
        .single();
      if (errIns) throw errIns;
      const arregloId = nuevoArreglo.id;

      if (viajesEnRango.length > 0) {
        const viajeIds = viajesEnRango.map(v => v.id);
        const { error: errV } = await supabase
          .from("viajes")
          .update({ arreglo_combustible_id: arregloId })
          .in("id", viajeIds);
        if (errV) throw errV;
      }
      if (recargasEnRango.length > 0) {
        const recargaIds = recargasEnRango.map(r => r.id);
        const { error: errR } = await supabase
          .from("recargas_combustible")
          .update({ arreglo_combustible_id: arregloId })
          .in("id", recargaIds);
        if (errR) throw errR;
      }

      alert(`✅ Arreglo cerrado con éxito.\n\n${viajesEnRango.length} viajes + ${recargasEnRango.length} recargas\nTotal: ${fmtGs(totalGeneral)}`);
      setModalOpen(false);
      router.push("/combustible");
    } catch (err: any) {
      alert("Error al cerrar arreglo: " + (err.message || "desconocido"));
    } finally {
      setClosing(false);
    }
  }

  function exportarExcel() {
    if (!proveedor) return;
    const wb = XLSX.utils.book_new();
    const nombreProv = proveedor.nombre;

    const resumen = [
      [`ARREGLO DE COMBUSTIBLE - ${nombreProv}`],
      [`Rango: ${fmtFecha(desde)} al ${fmtFecha(hasta)}`],
      [""],
      ["Litros totales", totalLitros],
      ["Precio promedio Gs/L", Math.round(promedioGsL)],
      ["Combustible", totalCombustible],
      ["Insumos extra", totalInsumos],
      ["TOTAL A PAGAR", totalGeneral],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(resumen);
    ws1["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

    const items: any[] = [];
    viajesEnRango.forEach(v => items.push({
      tipo: "Viaje",
      fecha: v.fecha,
      chofer: v.chofer?.nombre_completo || "-",
      detalle: `${v.origen} → ${v.destino}`,
      litros: v.litros || 0,
      gsL: v.gs_por_litro || 0,
      combustible: v.costo_combustible || 0,
      insumos: v.insumos_estacion_monto || 0,
      total: (v.costo_combustible || 0) + (v.insumos_estacion_monto || 0),
    }));
    recargasEnRango.forEach(r => items.push({
      tipo: "Recarga suelta",
      fecha: r.fecha,
      chofer: "-",
      detalle: r.observacion || "-",
      litros: r.litros || 0,
      gsL: r.gs_por_litro || 0,
      combustible: r.monto_total || 0,
      insumos: 0,
      total: r.monto_total || 0,
    }));
    items.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const detalle = [
      ["Fecha", "Tipo", "Chofer", "Detalle", "Litros", "Gs/L", "Combustible", "Insumos", "TOTAL"],
      ...items.map(i => [
        fmtFecha(i.fecha), i.tipo, i.chofer, i.detalle,
        i.litros, i.gsL, i.combustible, i.insumos, i.total,
      ]),
      [],
      ["", "", "", "TOTALES", totalLitros, Math.round(promedioGsL), totalCombustible, totalInsumos, totalGeneral],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(detalle);
    ws2["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Detalle");

    const fname = `Arreglo-${nombreProv.replace(/[^a-zA-Z0-9]/g, "_")}-${desde}-al-${hasta}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-teus-text_muted">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando...
      </div>
    );
  }
  if (!proveedor) {
    return (
      <div className="p-16 text-center text-teus-text_muted">Proveedor no encontrado.</div>
    );
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="mb-6">
        <Link href="/combustible" className="text-sm text-teus-text_muted hover:text-teus-accent flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Volver a Combustible
        </Link>
        <h1 className="text-3xl font-black text-teus-text_dark flex items-center gap-3">
          <Fuel className="w-8 h-8 text-amber-600" />
          {proveedor.nombre}
        </h1>
        <p className="text-sm text-teus-text_muted mt-1">
          Arreglo de combustible · Precio actual: {proveedor.gs_por_litro ? `${fmtGs(proveedor.gs_por_litro)}/L` : "no configurado"}
        </p>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-6 shadow-card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar className="w-4 h-4 text-teus-accent" />
            <label className="text-sm font-bold text-teus-text_dark">Desde:</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="bg-white border rounded-lg px-3 py-1.5 text-sm" />
            <label className="text-sm font-bold text-teus-text_dark">Hasta:</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="bg-white border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={setPresetMesActual} className="text-xs bg-teus-bg_soft hover:bg-teus-card_light border border-teus-border_light px-3 py-1.5 rounded-lg font-bold">Este mes</button>
            <button onClick={setPresetMesAnterior} className="text-xs bg-teus-bg_soft hover:bg-teus-card_light border border-teus-border_light px-3 py-1.5 rounded-lg font-bold">Mes anterior</button>
            <button onClick={setPresetUltimos15} className="text-xs bg-teus-bg_soft hover:bg-teus-card_light border border-teus-border_light px-3 py-1.5 rounded-lg font-bold">Últimos 15 días</button>
            <button onClick={setPresetTodo} className="text-xs bg-teus-bg_soft hover:bg-teus-card_light border border-teus-border_light px-3 py-1.5 rounded-lg font-bold">Todo el histórico</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 shadow-card">
          <div className="text-xs uppercase font-bold text-teus-text_muted">Litros</div>
          <div className="text-2xl font-black text-teus-text_dark">{totalLitros.toLocaleString("es-PY")}</div>
        </div>
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 shadow-card">
          <div className="text-xs uppercase font-bold text-teus-text_muted">Precio promedio</div>
          <div className="text-2xl font-black text-teus-text_dark">{fmtGs(promedioGsL)}/L</div>
        </div>
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 shadow-card">
          <div className="text-xs uppercase font-bold text-teus-text_muted">Combustible</div>
          <div className="text-2xl font-black text-teus-text_dark">{fmtGs(totalCombustible)}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-xl p-4 shadow-card">
          <div className="text-xs uppercase font-bold opacity-90">💰 Total a pagar</div>
          <div className="text-2xl font-black">{fmtGs(totalGeneral)}</div>
          {totalInsumos > 0 && <div className="text-[10px] opacity-90 mt-0.5">+ {fmtGs(totalInsumos)} en insumos</div>}
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setModalOpen(true)}
          disabled={viajesEnRango.length === 0 && recargasEnRango.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Cerrar arreglo y marcar como pagado
        </button>
        <button
          onClick={exportarExcel}
          disabled={viajesEnRango.length === 0 && recargasEnRango.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Exportar Excel
        </button>
      </div>

      {viajesEnRango.length === 0 && recargasEnRango.length === 0 ? (
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-12 text-center text-teus-text_muted">
          <Fuel className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-bold">Sin viajes ni recargas en el rango seleccionado.</p>
          <p className="text-xs mt-2">Cambiá las fechas para ver más resultados.</p>
        </div>
      ) : (
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teus-bg_soft">
                <tr>
                  <th className="text-left p-3 font-bold">Fecha</th>
                  <th className="text-left p-3 font-bold">Tipo</th>
                  <th className="text-left p-3 font-bold">Chofer / Detalle</th>
                  <th className="text-right p-3 font-bold">Litros</th>
                  <th className="text-right p-3 font-bold">Gs/L</th>
                  <th className="text-right p-3 font-bold">Combustible</th>
                  <th className="text-right p-3 font-bold">Insumos</th>
                  <th className="text-right p-3 font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...viajesEnRango.map(v => ({
                    id: v.id, tipo: "viaje" as const, fecha: v.fecha,
                    chofer: v.chofer?.nombre_completo || "-",
                    litros: v.litros || 0,
                    gsL: v.gs_por_litro || 0,
                    combustible: v.costo_combustible || 0,
                    insumos: v.insumos_estacion_monto || 0,
                    total: (v.costo_combustible || 0) + (v.insumos_estacion_monto || 0),
                  })),
                  ...recargasEnRango.map(r => ({
                    id: r.id, tipo: "recarga" as const, fecha: r.fecha,
                    chofer: r.observacion || "recarga suelta",
                    litros: r.litros || 0,
                    gsL: r.gs_por_litro || 0,
                    combustible: r.monto_total || 0,
                    insumos: 0,
                    total: r.monto_total || 0,
                  })),
                ]
                  .sort((a, b) => a.fecha.localeCompare(b.fecha))
                  .map(i => (
                    <tr key={i.id} className="border-t border-teus-border_light hover:bg-teus-bg_soft/50">
                      <td className="p-3">{fmtFecha(i.fecha)}</td>
                      <td className="p-3">
                        {i.tipo === "viaje" ? (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">VIAJE</span>
                        ) : (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">RECARGA</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{i.chofer}</td>
                      <td className="p-3 text-right">{i.litros}</td>
                      <td className="p-3 text-right">{fmtGs(i.gsL)}</td>
                      <td className="p-3 text-right font-bold text-amber-800">{fmtGs(i.combustible)}</td>
                      <td className="p-3 text-right text-amber-800">{i.insumos > 0 ? fmtGs(i.insumos) : "-"}</td>
                      <td className="p-3 text-right font-black text-amber-900">{fmtGs(i.total)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-amber-100 border-t-2 border-amber-400">
                <tr>
                  <td colSpan={3} className="p-3 text-right font-black text-amber-900">TOTALES</td>
                  <td className="p-3 text-right font-black text-amber-900">{totalLitros}</td>
                  <td className="p-3 text-right font-black text-amber-900">{fmtGs(promedioGsL)}</td>
                  <td className="p-3 text-right font-black text-amber-900">{fmtGs(totalCombustible)}</td>
                  <td className="p-3 text-right font-black text-amber-900">{fmtGs(totalInsumos)}</td>
                  <td className="p-3 text-right font-black text-amber-900 text-lg">{fmtGs(totalGeneral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-teus-text_dark">Cerrar arreglo con {proveedor.nombre}</h2>
              <button onClick={() => setModalOpen(false)} className="text-teus-text_muted hover:text-teus-text_dark">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
              <div className="text-xs uppercase font-bold text-amber-700 mb-1">Vas a marcar como pagado:</div>
              <div className="text-sm text-amber-900">
                <b>{viajesEnRango.length}</b> viajes + <b>{recargasEnRango.length}</b> recargas<br />
                Rango: <b>{fmtFecha(desde)}</b> al <b>{fmtFecha(hasta)}</b><br />
                Total: <b className="text-lg">{fmtGs(totalGeneral)}</b>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-teus-text_dark uppercase">Fecha del pago</label>
                <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-teus-text_dark uppercase">Método de pago</label>
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-teus-text_dark uppercase">Notas (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} placeholder="Ej: pagué con cheque 001234 Continental" className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-teus-bg_soft hover:bg-teus-card_light border border-teus-border_light text-teus-text_dark px-4 py-3 rounded-lg text-sm font-bold">
                Cancelar
              </button>
              <button onClick={cerrarArreglo} disabled={closing} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
