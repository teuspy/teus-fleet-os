"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckSquare, Loader2, Plus, Edit2, Trash2, CheckCircle2 } from "lucide-react";

type Cheque = {
  id: string;
  fecha_emision: string;
  fecha_pago: string;
  numero_cheque: string;
  cuenta_id: string;
  monto: number;
  beneficiario: string | null;
  concepto: string | null;
  estado: string;
  observaciones: string | null;
};

type CuentaBancaria = {
  id: string;
  alias: string;
  banco: string;
  moneda: string;
};

function fmtGs(n: number): string {
  return "Gs. " + Math.round(n).toLocaleString("es-PY");
}
function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function diasHasta(fechaISO: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fechaISO + "T00:00:00");
  return Math.round((target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}
function estadoUrgencia(dias: number, estado: string) {
  if (estado === "cobrado") return { label: "COBRADO", bg: "bg-gray-200", text: "text-gray-700" };
  if (dias < 0) return { label: `VENCIDO ${Math.abs(dias)}d`, bg: "bg-red-900", text: "text-white" };
  if (dias === 0) return { label: "HOY", bg: "bg-red-600", text: "text-white" };
  if (dias <= 3) return { label: `${dias}d`, bg: "bg-red-500", text: "text-white" };
  if (dias <= 7) return { label: `${dias}d`, bg: "bg-yellow-500", text: "text-white" };
  if (dias <= 30) return { label: `${dias}d`, bg: "bg-blue-100", text: "text-blue-800" };
  return { label: `${dias}d`, bg: "bg-gray-100", text: "text-gray-700" };
}
function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ChequesEmitidos() {
  const supabase = createClient();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Cheque | null>(null);

  const [fechaEmision, setFechaEmision] = useState(hoyISO());
  const [fechaPago, setFechaPago] = useState("");
  const [numeroCheque, setNumeroCheque] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [monto, setMonto] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [concepto, setConcepto] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [filtroEstado, setFiltroEstado] = useState<"emitido" | "cobrado" | "todos">("emitido");
  const [filtroCuenta, setFiltroCuenta] = useState<string>("todas");

  async function loadData() {
    setLoading(true);
    const [chRes, cuRes] = await Promise.all([
      supabase.from("cheques_emitidos").select("*").order("fecha_pago"),
      supabase.from("cuentas_bancarias").select("id, alias, banco, moneda").eq("activo", true).order("alias"),
    ]);
    setCheques((chRes.data as Cheque[]) || []);
    setCuentas((cuRes.data as CuentaBancaria[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const cuentasMap = useMemo(() => new Map(cuentas.map(c => [c.id, c])), [cuentas]);

  const chequesPendientes = cheques.filter(c => c.estado === "emitido");
  const totalPendiente = chequesPendientes.reduce((s, c) => s + c.monto, 0);
  const venceHoy = chequesPendientes.filter(c => diasHasta(c.fecha_pago) === 0);
  const vence7 = chequesPendientes.filter(c => { const d = diasHasta(c.fecha_pago); return d >= 0 && d <= 7; });
  const vence30 = chequesPendientes.filter(c => { const d = diasHasta(c.fecha_pago); return d >= 0 && d <= 30; });
  const vencidos = chequesPendientes.filter(c => diasHasta(c.fecha_pago) < 0);

  const porCuenta = useMemo(() => {
    const grupos = new Map<string, { cuenta: CuentaBancaria; total: number; count: number }>();
    for (const c of chequesPendientes) {
      const cta = cuentasMap.get(c.cuenta_id);
      if (!cta) continue;
      if (!grupos.has(cta.id)) grupos.set(cta.id, { cuenta: cta, total: 0, count: 0 });
      const g = grupos.get(cta.id)!;
      g.total += c.monto;
      g.count += 1;
    }
    return Array.from(grupos.values()).sort((a, b) => b.total - a.total);
  }, [chequesPendientes, cuentasMap]);

  const chequesVisibles = useMemo(() => {
    let list = cheques;
    if (filtroEstado !== "todos") list = list.filter(c => c.estado === filtroEstado);
    if (filtroCuenta !== "todas") list = list.filter(c => c.cuenta_id === filtroCuenta);
    return list;
  }, [cheques, filtroEstado, filtroCuenta]);

  function resetForm() {
    setFechaEmision(hoyISO());
    setFechaPago("");
    setNumeroCheque("");
    setCuentaId("");
    setMonto("");
    setBeneficiario("");
    setConcepto("");
    setObservaciones("");
    setEditando(null);
  }
  function abrirNuevo() { resetForm(); setMostrarForm(true); }
  function abrirEditar(c: Cheque) {
    setFechaEmision(c.fecha_emision);
    setFechaPago(c.fecha_pago);
    setNumeroCheque(c.numero_cheque);
    setCuentaId(c.cuenta_id);
    setMonto(String(c.monto));
    setBeneficiario(c.beneficiario || "");
    setConcepto(c.concepto || "");
    setObservaciones(c.observaciones || "");
    setEditando(c);
    setMostrarForm(true);
  }

  async function guardar() {
    if (!fechaEmision || !fechaPago || !numeroCheque || !cuentaId || !monto) {
      alert("Los campos con * son obligatorios");
      return;
    }
    const montoNum = parseFloat(monto.replace(/[^\d.]/g, ""));
    if (!montoNum || montoNum <= 0) { alert("Monto inválido"); return; }
    const payload = {
      fecha_emision: fechaEmision,
      fecha_pago: fechaPago,
      numero_cheque: numeroCheque,
      cuenta_id: cuentaId,
      monto: montoNum,
      beneficiario: beneficiario || null,
      concepto: concepto || null,
      observaciones: observaciones || null,
    };
    let error;
    if (editando) {
      const res = await supabase.from("cheques_emitidos").update(payload).eq("id", editando.id);
      error = res.error;
    } else {
      const res = await supabase.from("cheques_emitidos").insert(payload);
      error = res.error;
    }
    if (error) { alert("Error: " + error.message); return; }
    resetForm();
    setMostrarForm(false);
    loadData();
  }

  async function marcarCobrado(c: Cheque) {
    if (!confirm(`¿Marcar el cheque ${c.numero_cheque} como cobrado?`)) return;
    const { error } = await supabase.from("cheques_emitidos").update({ estado: "cobrado" }).eq("id", c.id);
    if (error) { alert("Error: " + error.message); return; }
    loadData();
  }
  async function eliminar(c: Cheque) {
    if (!confirm(`¿Eliminar el cheque ${c.numero_cheque}? No se puede deshacer.`)) return;
    const { error } = await supabase.from("cheques_emitidos").delete().eq("id", c.id);
    if (error) { alert("Error: " + error.message); return; }
    loadData();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <CheckSquare className="w-8 h-8 text-green-700" />
        <h1 className="text-2xl font-black text-gray-900">Cheques Emitidos</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Control de cheques diferidos con alertas por vencimiento · <a href="/cuentas-bancarias" className="text-green-700 hover:underline">Gestionar cuentas bancarias →</a>
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-700" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow p-3">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total pendiente</div>
              <div className="text-lg font-black text-gray-900 mt-1">{fmtGs(totalPendiente)}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{chequesPendientes.length} cheques</div>
            </div>
            <div className={`rounded-xl shadow p-3 ${vencidos.length > 0 ? "bg-red-900 text-white" : "bg-white"}`}>
              <div className={`text-[10px] uppercase font-bold ${vencidos.length > 0 ? "text-red-200" : "text-gray-500"}`}>Vencidos</div>
              <div className={`text-lg font-black mt-1 ${vencidos.length > 0 ? "text-white" : "text-gray-900"}`}>{fmtGs(vencidos.reduce((s,c)=>s+c.monto,0))}</div>
              <div className={`text-[10px] mt-0.5 ${vencidos.length > 0 ? "text-red-200" : "text-gray-500"}`}>{vencidos.length} cheques</div>
            </div>
            <div className={`rounded-xl shadow p-3 ${venceHoy.length > 0 ? "bg-red-500 text-white" : "bg-white"}`}>
              <div className={`text-[10px] uppercase font-bold ${venceHoy.length > 0 ? "text-red-100" : "text-gray-500"}`}>Vence hoy</div>
              <div className={`text-lg font-black mt-1 ${venceHoy.length > 0 ? "text-white" : "text-gray-900"}`}>{fmtGs(venceHoy.reduce((s,c)=>s+c.monto,0))}</div>
              <div className={`text-[10px] mt-0.5 ${venceHoy.length > 0 ? "text-red-100" : "text-gray-500"}`}>{venceHoy.length} cheques</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl shadow p-3">
              <div className="text-[10px] uppercase font-bold text-yellow-700">Próximos 7 días</div>
              <div className="text-lg font-black text-yellow-900 mt-1">{fmtGs(vence7.reduce((s,c)=>s+c.monto,0))}</div>
              <div className="text-[10px] text-yellow-700 mt-0.5">{vence7.length} cheques</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl shadow p-3">
              <div className="text-[10px] uppercase font-bold text-blue-700">Próximos 30 días</div>
              <div className="text-lg font-black text-blue-900 mt-1">{fmtGs(vence30.reduce((s,c)=>s+c.monto,0))}</div>
              <div className="text-[10px] text-blue-700 mt-0.5">{vence30.length} cheques</div>
            </div>
          </div>

          {porCuenta.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <h2 className="text-sm font-black text-gray-900 mb-3 uppercase">💰 Saldo requerido por cuenta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {porCuenta.map(g => (
                  <div key={g.cuenta.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-bold text-gray-700">{g.cuenta.alias}</div>
                    <div className="text-lg font-black text-red-700 mt-1">{fmtGs(g.total)}</div>
                    <div className="text-[10px] text-gray-500">{g.count} cheques pendientes</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
            <div className="flex gap-2 items-center flex-wrap">
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as any)} className="border rounded px-3 py-1.5 text-sm bg-white">
                <option value="emitido">Pendientes de cobro</option>
                <option value="cobrado">Cobrados</option>
                <option value="todos">Todos</option>
              </select>
              <select value={filtroCuenta} onChange={(e) => setFiltroCuenta(e.target.value)} className="border rounded px-3 py-1.5 text-sm bg-white">
                <option value="todas">Todas las cuentas</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.alias}</option>)}
              </select>
              <span className="text-xs text-gray-500">{chequesVisibles.length} resultados</span>
            </div>
            <button onClick={abrirNuevo} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Nuevo cheque
            </button>
          </div>

          {mostrarForm && (
            <div className="bg-white rounded-xl shadow p-4 mb-6 border-2 border-green-200">
              <h3 className="font-bold text-lg mb-3 text-gray-900">
                {editando ? `Editando cheque ${editando.numero_cheque}` : "Nuevo cheque"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Fecha emisión *</label>
                  <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Fecha pago *</label>
                  <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">N° cheque *</label>
                  <input type="text" value={numeroCheque} onChange={(e) => setNumeroCheque(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="15366982" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Cuenta *</label>
                  <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-white">
                    <option value="">Elegir cuenta...</option>
                    {cuentas.map(c => <option key={c.id} value={c.id}>{c.alias} ({c.moneda})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Monto *</label>
                  <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="4232000" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Beneficiario</label>
                  <input type="text" value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Cubiertas Karai" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Concepto</label>
                  <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Cubiertas Karai enero" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Observaciones</label>
                  <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={guardar} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold">
                  {editando ? "Guardar cambios" : "Crear cheque"}
                </button>
                <button onClick={() => { resetForm(); setMostrarForm(false); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-center p-2 w-20">⏱ Días</th>
                  <th className="text-left p-2">Fecha pago</th>
                  <th className="text-left p-2">Cuenta</th>
                  <th className="text-left p-2">N° cheque</th>
                  <th className="text-left p-2">Beneficiario</th>
                  <th className="text-left p-2">Concepto</th>
                  <th className="text-right p-2">Monto</th>
                  <th className="text-center p-2">Emisión</th>
                  <th className="text-center p-2 w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {chequesVisibles.map((c) => {
                  const dias = diasHasta(c.fecha_pago);
                  const urg = estadoUrgencia(dias, c.estado);
                  const cta = cuentasMap.get(c.cuenta_id);
                  return (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${urg.bg} ${urg.text}`}>
                          {urg.label}
                        </span>
                      </td>
                      <td className="p-2 font-bold">{fmtFecha(c.fecha_pago)}</td>
                      <td className="p-2">{cta?.alias || "—"}</td>
                      <td className="p-2 font-mono text-xs">{c.numero_cheque}</td>
                      <td className="p-2">{c.beneficiario || "—"}</td>
                      <td className="p-2 text-xs text-gray-600">{c.concepto || "—"}</td>
                      <td className="p-2 text-right font-bold">{fmtGs(c.monto)}</td>
                      <td className="p-2 text-center text-xs text-gray-500">{fmtFecha(c.fecha_emision)}</td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center gap-1">
                          {c.estado === "emitido" && (
                            <button onClick={() => marcarCobrado(c)} className="text-green-600 hover:text-green-800" title="Marcar cobrado">
                              <CheckCircle2 className="w-4 h-4 inline" />
                            </button>
                          )}
                          <button onClick={() => abrirEditar(c)} className="text-blue-600 hover:text-blue-800" title="Editar">
                            <Edit2 className="w-4 h-4 inline" />
                          </button>
                          <button onClick={() => eliminar(c)} className="text-red-600 hover:text-red-800" title="Eliminar">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {chequesVisibles.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-gray-500">Sin cheques con los filtros actuales</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
