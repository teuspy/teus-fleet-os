"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Power, Trash2, X, DollarSign, Loader2, Users, Shield, Wrench, Briefcase, Truck, Home } from "lucide-react";

type Proveedor = { id: string; nombre: string };
type GastoFijo = {
  id: string;
  concepto: string;
  categoria: "financiero" | "salarios" | "seguros" | "operativos" | "administrativos";
  aplica_a: "equipos" | "oficina";
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

function fmtGs(n: number) { return "Gs. " + Math.round(n || 0).toLocaleString("es-PY"); }
function fmtGsShort(n: number) {
  if (!n) return "Gs. 0";
  if (n >= 1_000_000) return "Gs. " + (n / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (n >= 1_000) return "Gs. " + (n / 1_000).toFixed(0) + "K";
 return "Gs. " + Math.round(n).toLocaleString("es-PY");
}

export default function GastosFijosPage() {
  const supabase = createClient();
  const [gastos, setGastos] = useState<GastoFijo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GastoFijo | null>(null);
  const [filter, setFilter] = useState<"activos" | "todos">("activos");
  const [aplicaFilter, setAplicaFilter] = useState<"todos" | "equipos" | "oficina">("todos");

  async function loadData() {
    setLoading(true);
    let query = supabase.from("gastos_fijos").select("*, proveedor:proveedor_id(id, nombre)").order("aplica_a").order("categoria").order("concepto");
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

  const filtered = useMemo(() => {
    if (aplicaFilter === "todos") return gastos;
    return gastos.filter(g => g.aplica_a === aplicaFilter);
  }, [gastos, aplicaFilter]);

  const totales = useMemo(() => {
    const activos = gastos.filter(g => g.activo);
    const equipos = activos.filter(g => g.aplica_a === "equipos");
    const oficina = activos.filter(g => g.aplica_a === "oficina");
    const totalEquipos = equipos.reduce((s, g) => s + Number(g.monto_mensual || 0), 0);
    const totalOficina = oficina.reduce((s, g) => s + Number(g.monto_mensual || 0), 0);
    return { totalEquipos, totalOficina, total: totalEquipos + totalOficina, cantidadEq: equipos.length, cantidadOf: oficina.length };
  }, [gastos]);

  async function toggleActivo(g: GastoFijo) {
    const nuevoEstado = !g.activo;
    if (!confirm(nuevoEstado ? `¿Reactivar "${g.concepto}"?` : `¿Desactivar "${g.concepto}"?`)) return;
    await supabase.from("gastos_fijos").update({ activo: nuevoEstado }).eq("id", g.id);
    loadData();
  }

  async function eliminar(g: GastoFijo) {
    if (!confirm(`¿ELIMINAR permanentemente "${g.concepto}"?`)) return;
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
          <p className="text-sm text-teus-text_muted mt-1">Solo los gastos con "Aplica a: Equipos" prorratean al ranking de tractos</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Gasto Fijo
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-teus-accent to-green-600 rounded-2xl p-5 shadow-xl text-white">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-80">
            <Truck className="w-4 h-4" /> Aplica a EQUIPOS (prorratea)
          </div>
          <div className="text-4xl font-black mt-2">{fmtGs(totales.totalEquipos)}</div>
          <div className="text-xs opacity-80 mt-1">
            {totales.cantidadEq} gastos · Prorrateo por equipo: <strong>{fmtGs(totales.totalEquipos / 6)}</strong>/mes
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl p-5 shadow-xl text-white">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-80">
            <Home className="w-4 h-4" /> Aplica a OFICINA (empresa)
          </div>
          <div className="text-4xl font-black mt-2">{fmtGs(totales.totalOficina)}</div>
          <div className="text-xs opacity-80 mt-1">
            {totales.cantidadOf} gastos · NO afecta ranking, sí afecta utilidad total empresa
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-xs text-blue-800">
        💡 <strong>Total gastos fijos empresa:</strong> {fmtGs(totales.total)}/mes ·
        Los de <strong>equipos ({fmtGs(totales.totalEquipos)})</strong> se dividen entre 6 para calcular utilidad neta de cada tracto.
        Los de <strong>oficina ({fmtGs(totales.totalOficina)})</strong> se restan del total de la empresa, no del ranking.
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setAplicaFilter("todos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aplicaFilter === "todos" ? "bg-teus-text_dark text-white" : "bg-white border border-teus-border_light"}`}>Todos ({gastos.length})</button>
        <button onClick={() => setAplicaFilter("equipos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aplicaFilter === "equipos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light"}`}>🚛 Solo Equipos</button>
        <button onClick={() => setAplicaFilter("oficina")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aplicaFilter === "oficina" ? "bg-gray-700 text-white" : "bg-white border border-teus-border_light"}`}>🏢 Solo Oficina</button>
        <div className="w-px h-6 bg-teus-border_light mx-2" />
        <button onClick={() => setFilter("activos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === "activos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light"}`}>Activos</button>
        <button onClick={() => setFilter("todos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === "todos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light"}`}>Incluir inactivos</button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-teus-text_muted">
            <DollarSign className="w-12 h-12 text-teus-text_soft mx-auto mb-3" />
            <div className="text-lg font-bold">Sin gastos fijos cargados</div>
            <div className="text-sm mt-2">Click en "+ Nuevo Gasto Fijo" para arrancar</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
              <tr>
                <th className="text-left px-4 py-3">Concepto</th>
                <th className="text-left px-4 py-3">Aplica a</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-left px-4 py-3">Proveedor</th>
                <th className="text-right px-4 py-3">Monto mensual</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className={`border-t border-teus-border_light hover:bg-teus-bg_soft/50 ${!g.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-bold text-teus-text_dark">{g.concepto}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${g.aplica_a === "equipos" ? "bg-teus-accent/20 text-teus-accent-dark" : "bg-gray-200 text-gray-700"}`}>
                      {g.aplica_a === "equipos" ? "🚛 Equipos" : "🏢 Oficina"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${CATEGORIAS[g.categoria]?.color || ""}`}>
                      {CATEGORIAS[g.categoria]?.label.split(" ")[0] || g.categoria}
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
    aplica_a: gasto?.aplica_a || "equipos",
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
      aplica_a: form.aplica_a,
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
              placeholder="Ej: Cuota BNF, Salario chofer, Alquiler oficina..."
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-teus-accent outline-none" />
          </div>

          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase">Aplica a * (afecta ranking)</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button type="button" onClick={() => setForm({ ...form, aplica_a: "equipos" })}
                className={`p-3 rounded-lg border-2 text-sm text-left transition ${form.aplica_a === "equipos" ? "border-teus-accent bg-teus-accent/10" : "border-teus-border_light bg-white"}`}>
                <div className="font-bold flex items-center gap-2">🚛 EQUIPOS</div>
                <div className="text-xs text-teus-text_muted mt-1">Se prorratea entre los 6 tractocamiones. Ej: préstamos, salario chofer, GPS, seguro camión.</div>
              </button>
              <button type="button" onClick={() => setForm({ ...form, aplica_a: "oficina" })}
                className={`p-3 rounded-lg border-2 text-sm text-left transition ${form.aplica_a === "oficina" ? "border-gray-700 bg-gray-100" : "border-teus-border_light bg-white"}`}>
                <div className="font-bold flex items-center gap-2">🏢 OFICINA</div>
                <div className="text-xs text-teus-text_muted mt-1">NO afecta ranking equipos. Ej: alquiler, contador, IPS, salario admin, movilidades.</div>
              </button>
            </div>
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
