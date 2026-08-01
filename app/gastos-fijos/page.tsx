"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Power, Trash2, X, DollarSign, Loader2, Building2, Users, Shield, Wrench, Briefcase } from "lucide-react";

type Proveedor = { id: string; nombre: string };
type GastoFijo = {
  id: string;
  concepto: string;
  categoria: "financiero" | "salarios" | "seguros" | "operativos" | "administrativos";
  monto_mensual: number;
  moneda: string | null;
  proveedor_id: string | null;
  observacion: string | null;
  activo: boolean;
  proveedor?: Proveedor | null;
};

const CATEGORIAS: Record<string, { label: string; icon: any; color: string }> = {
  financiero:      { label: "Financiero (préstamos)", icon: DollarSign, color: "bg-purple-50 border-purple-200 text-purple-700" },
  salarios:        { label: "Salarios",               icon: Users,      color: "bg-blue-50 border-blue-200 text-blue-700" },
  seguros:         { label: "Seguros",                icon: Shield,     color: "bg-green-50 border-green-200 text-green-700" },
  operativos:      { label: "Operativos",             icon: Wrench,     color: "bg-orange-50 border-orange-200 text-orange-700" },
  administrativos: { label: "Administrativos",        icon: Briefcase,  color: "bg-gray-50 border-gray-200 text-gray-700" },
};

function fmtGs(n: number) { return "Gs. " + (n || 0).toLocaleString("es-PY"); }
function fmtGsShort(n: number) {
  if (!n) return "Gs. 0";
  if (n >= 1_000_000) return "Gs. " + (n / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (n >= 1_000) return "Gs. " + (n / 1_000).toFixed(0) + "K";
  return "Gs. " + n.toLocaleString("es-PY");
}

export default function GastosFijosPage() {
  const supabase = createClient();
  const [gastos, setGastos] = useState<GastoFijo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GastoFijo | null>(null);
  const [filter, setFilter] = useState<"activos" | "todos">("activos");

  async function loadData() {
    setLoading(true);
    let query = supabase.from("gastos_fijos").select("*, proveedor:proveedor_id(id, nombre)").order("categoria").order("concepto");
    if (filter === "activos") query = query.eq("activo", true);
    const [{ data: gfData }, { data: provData }] = await Promise.all([
      query,
      supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    ]);
    if (gfData) setGastos(gfData as GastoFijo[]);
    if (provData) setProveedores(provData as Proveedor[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filter]);

  const totales = useMemo(() => {
    const activos = gastos.filter(g => g.activo);
    const total = activos.reduce((s, g) => s + Number(g.monto_mensual || 0), 0);
    const porCategoria: Record<string, number> = {};
    activos.forEach(g => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.monto_mensual || 0);
    });
    return { total, porCategoria, cantidad: activos.length };
  }, [gastos]);

  async function toggleActivo(g: GastoFijo) {
    const nuevoEstado = !g.activo;
    if (!confirm(nuevoEstado ? `¿Reactivar "${g.concepto}"?` : `¿Desactivar "${g.concepto}"?\nDeja de sumar al total mensual.`)) return;
    await supabase.from("gastos_fijos").update({ activo: nuevoEstado }).eq("id", g.id);
    loadData();
  }

  async function eliminar(g: GastoFijo) {
    if (!confirm(`¿ELIMINAR permanentemente "${g.concepto}"?\nEsta acción NO se puede deshacer.`)) return;
    await supabase.from("gastos_fijos").delete().eq("id", g.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-teus-accent" />
            Gastos Fijos Mensuales
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Costos fijos que se prorratean entre los 6 tractocamiones para calcular utilidad neta</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Gasto Fijo
        </button>
      </div>

      {/* KPI grande */}
      <div className="bg-gradient-to-r from-teus-danger to-red-600 rounded-2xl p-6 mb-6 shadow-xl text-white">
        <div className="text-xs font-bold uppercase tracking-widest opacity-80">Total mensual activo</div>
        <div className="text-5xl font-black mt-2">{fmtGs(totales.total)}</div>
        <div className="text-sm opacity-80 mt-2">
          {totales.cantidad} gastos fijos activos ·
          Prorrateo entre 6 equipos: <strong>{fmtGs(totales.total / 6)}</strong> por equipo/mes
        </div>
      </div>

      {/* Desglose por categoría */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(CATEGORIAS).map(([key, cat]) => {
          const Icon = cat.icon;
          const monto = totales.porCategoria[key] || 0;
          const pct = totales.total > 0 ? (monto / totales.total * 100) : 0;
          return (
            <div key={key} className={`border rounded-xl p-3 ${cat.color}`}>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                <Icon className="w-4 h-4" />
                {cat.label.split(" ")[0]}
              </div>
              <div className="text-xl font-black mt-1">{fmtGsShort(monto)}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{pct.toFixed(0)}% del total</div>
            </div>
          );
        })}
      </div>

      {/* Filtro activos/todos */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setFilter("activos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === "activos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light text-teus-text_muted"}`}>Solo activos</button>
        <button onClick={() => setFilter("todos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === "todos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light text-teus-text_muted"}`}>Todos (incluye inactivos)</button>
      </div>

      {/* Tabla */}
      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando...</div>
        ) : gastos.length === 0 ? (
          <div className="p-16 text-center text-teus-text_muted">
            <DollarSign className="w-12 h-12 text-teus-text_soft mx-auto mb-3" />
            <div className="text-lg font-bold">Aún no cargaste gastos fijos</div>
            <div className="text-sm mt-2">Click en "+ Nuevo Gasto Fijo" para arrancar</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
              <tr>
                <th className="text-left px-4 py-3">Concepto</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-left px-4 py-3">Proveedor</th>
                <th className="text-right px-4 py-3">Monto mensual</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => (
                <tr key={g.id} className={`border-t border-teus-border_light hover:bg-teus-bg_soft/50 ${!g.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-bold text-teus-text_dark">{g.concepto}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${CATEGORIAS[g.categoria]?.color || ""}`}>
                      {CATEGORIAS[g.categoria]?.label || g.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-teus-text_muted">{g.proveedor?.nombre || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-teus-danger">{fmtGs(g.monto_mensual)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${g.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {g.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditing(g); setShowModal(true); }} className="p-1.5 hover:bg-teus-accent/10 text-teus-accent rounded" title="Editar"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => toggleActivo(g)} className="p-1.5 hover:bg-teus-danger/10 text-teus-danger rounded" title={g.activo ? "Desactivar" : "Activar"}><Power className="w-4 h-4" /></button>
                      <button onClick={() => eliminar(g)} className="p-1.5 hover:bg-red-100 text-red-600 rounded" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <GastoFijoModal gasto={editing} proveedores={proveedores} onClose={() => { setShowModal(false); loadData(); }} />}
    </div>
  );
}

function GastoFijoModal({ gasto, proveedores, onClose }: { gasto: GastoFijo | null; proveedores: Proveedor[]; onClose: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    concepto: gasto?.concepto || "",
    categoria: gasto?.categoria || "operativos",
    monto_mensual: gasto?.monto_mensual?.toString() || "",
    proveedor_id: gasto?.proveedor_id || "",
    observacion: gasto?.observacion || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    const payload = {
      concepto: form.concepto.trim(),
      categoria: form.categoria,
      monto_mensual: parseInt(form.monto_mensual) || 0,
      proveedor_id: form.proveedor_id || null,
      observacion: form.observacion.trim() || null,
      moneda: "PYG",
    };
    const { error } = gasto
      ? await supabase.from("gastos_fijos").update(payload).eq("id", gasto.id)
      : await supabase.from("gastos_fijos").insert(payload);
    if (error) { setErr(error.message); setSaving(false); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teus-accent" />
            {gasto ? "Editar Gasto Fijo" : "Nuevo Gasto Fijo"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase">Concepto *</label>
            <input required value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              placeholder="Ej: Cuota BNF, Salario chofer, Seguro camión..."
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-teus-accent outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-teus-text_muted uppercase">Categoría *</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-teus-accent outline-none">
                {Object.entries(CATEGORIAS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-teus-text_muted uppercase">Monto mensual Gs. *</label>
              <input required type="number" min="0" value={form.monto_mensual} onChange={(e) => setForm({ ...form, monto_mensual: e.target.value })}
                placeholder="Ej: 3200000"
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-teus-accent outline-none" />
              {parseInt(form.monto_mensual) > 0 && <div className="text-xs text-teus-accent font-bold mt-1">= {fmtGs(parseInt(form.monto_mensual))}</div>}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase">Proveedor (opcional)</label>
            <select value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-teus-accent outline-none">
              <option value="">— Sin proveedor —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase">Observaciones</label>
            <textarea rows={2} value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              placeholder="Detalles adicionales..."
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-teus-accent outline-none" />
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{err}</div>}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teus-accent hover:bg-teus-accent-2 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
              {saving ? "Guardando..." : gasto ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
