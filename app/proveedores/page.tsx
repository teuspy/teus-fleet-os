"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Power, X, Fuel, Search, Loader2, Wrench, Package, Zap, Cog, Circle } from "lucide-react";

type Proveedor = {
  id: string;
  nombre: string;
  tipo: "combustible" | "taller" | "gomeria" | "repuestos" | "electricista" | "otros" | null;
  ruc: string | null;
  telefono: string | null;
  gs_por_litro: number | null;
  activo: boolean;
};

const TIPOS: Record<string, { label: string; icon: any; classes: string }> = {
  combustible: { label: "Combustible", icon: Fuel, classes: "bg-blue-50 text-blue-700 border-blue-200" },
  taller: { label: "Taller", icon: Wrench, classes: "bg-amber-50 text-amber-700 border-amber-200" },
  gomeria: { label: "Gomería", icon: Circle, classes: "bg-slate-50 text-slate-700 border-slate-200" },
  repuestos: { label: "Repuestos", icon: Cog, classes: "bg-purple-50 text-purple-700 border-purple-200" },
  electricista: { label: "Electricista", icon: Zap, classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  otros: { label: "Otros", icon: Package, classes: "bg-gray-50 text-gray-700 border-gray-200" },
};

function fmtGs(n: number | null) {
  if (!n) return "—";
  return "Gs. " + n.toLocaleString("es-PY");
}

export default function ProveedoresPage() {
  const supabase = createClient();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [filter, setFilter] = useState<"activos" | "todos">("activos");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    let query = supabase.from("proveedores").select("*").order("nombre");
    if (filter === "activos") query = query.eq("activo", true);
    const { data } = await query;
    if (data) setProveedores(data as Proveedor[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filter]);

  const filtered = proveedores.filter((p) => {
    if (tipoFilter !== "todos" && p.tipo !== tipoFilter) return false;
    if (search && !`${p.nombre} ${p.ruc || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function toggleActivo(p: Proveedor) {
    const nuevoEstado = !p.activo;
    if (!confirm(nuevoEstado ? `¿Reactivar el proveedor ${p.nombre}?` : `¿Desactivar el proveedor ${p.nombre}?\nEl histórico se conserva.`)) return;
    await supabase.from("proveedores").update({ activo: nuevoEstado }).eq("id", p.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Fuel className="w-8 h-8 text-teus-accent" />
            Proveedores
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Combustibleras, talleres, gomerías, repuestos y más
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
          <input type="text" placeholder="Buscar por nombre o RUC..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-teus-border_light rounded-lg px-9 py-2 text-sm text-teus-text_dark placeholder-teus-text_soft focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20" />
        </div>
        <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}
          className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
          <option value="todos">Todos los tipos</option>
          {Object.entries(TIPOS).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
          className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
          <option value="activos">Solo activos</option>
          <option value="todos">Incluir inactivos</option>
        </select>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teus-accent" />Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-teus-text_muted text-sm">No hay proveedores que coincidan</div>
        ) : (
          <table className="w-full">
            <thead className="bg-teus-hover_light">
              <tr className="text-left text-[10px] uppercase tracking-wider text-teus-text_muted border-b border-teus-border_light">
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Proveedor</th>
                <th className="px-4 py-3 font-bold">Tipo</th>
                <th className="px-4 py-3 font-bold">RUC</th>
                <th className="px-4 py-3 font-bold">Teléfono</th>
                <th className="px-4 py-3 font-bold text-right">Gs/Litro</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const tipoInfo = TIPOS[p.tipo || "otros"];
                const TipoIcon = tipoInfo?.icon || Package;
                return (
                  <tr key={p.id} className="border-b border-teus-border_light/60 hover:bg-teus-hover_light transition">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${p.activo ? "bg-teus-accent/15 text-teus-accent-dark" : "bg-teus-danger-light text-teus-danger"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? "bg-teus-accent" : "bg-teus-danger"}`} />
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-sm text-teus-text_dark">{p.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${tipoInfo?.classes || ""}`}>
                        <TipoIcon className="w-3 h-3" />
                        {tipoInfo?.label || p.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-teus-text_muted">{p.ruc || "—"}</td>
                    <td className="px-4 py-3 text-xs text-teus-text_muted">{p.telefono || "—"}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-teus-text_dark">{fmtGs(p.gs_por_litro)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setEditing(p); setShowModal(true); }} className="p-2 rounded-lg hover:bg-teus-accent/10 text-teus-text_muted hover:text-teus-accent transition" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleActivo(p)} className={`p-2 rounded-lg transition ${p.activo ? "text-teus-text_muted hover:text-teus-danger hover:bg-teus-danger-light" : "text-teus-accent hover:bg-teus-accent/10"}`} title={p.activo ? "Desactivar" : "Reactivar"}><Power className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-xs text-teus-text_soft mt-4 px-1">Mostrando {filtered.length} de {proveedores.length} proveedores</div>

      {showModal && <ProveedorModal proveedor={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadData(); }} />}
    </div>
  );
}

function ProveedorModal({ proveedor, onClose, onSaved }: { proveedor: Proveedor | null; onClose: () => void; onSaved: () => void; }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    nombre: proveedor?.nombre || "",
    tipo: proveedor?.tipo || "otros",
    ruc: proveedor?.ruc || "",
    telefono: proveedor?.telefono || "",
    gs_por_litro: proveedor?.gs_por_litro || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: any = {
      ...form,
      ruc: form.ruc || null,
      telefono: form.telefono || null,
      gs_por_litro: form.tipo === "combustible" ? (form.gs_por_litro || null) : null,
    };
    try {
      if (proveedor) {
        const { error } = await supabase.from("proveedores").update(payload).eq("id", proveedor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proveedores").insert({ ...payload, activo: true });
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) { setError(err.message || "Error al guardar"); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20";
  const labelCls = "text-xs font-bold text-teus-text_muted uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-teus-text_dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-teus-border_light rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-teus-border_light">
          <h2 className="text-lg font-bold text-teus-text_dark">{proveedor ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-teus-hover_light text-teus-text_muted hover:text-teus-text_dark transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Petrobras" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo *</label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })} className={inputCls}>
              {Object.entries(TIPOS).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>RUC</label>
              <input type="text" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} placeholder="80012345-6" className={inputCls + " font-mono"} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="0981..." className={inputCls} />
            </div>
          </div>
          {form.tipo === "combustible" && (
            <div>
              <label className={labelCls}>Precio Gs/Litro (para autocompletado en viajes)</label>
              <input type="number" value={form.gs_por_litro} onChange={(e) => setForm({ ...form, gs_por_litro: parseInt(e.target.value) || 0 })} placeholder="8930" className={inputCls} />
              {form.gs_por_litro > 0 && <div className="text-[10px] text-teus-accent font-bold mt-1">= Gs. {form.gs_por_litro.toLocaleString("es-PY")}</div>}
            </div>
          )}
          {error && <div className="text-sm px-3 py-2 rounded-lg bg-teus-danger-light border border-teus-danger/30 text-teus-danger">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-teus-border_light text-teus-text_muted py-2.5 rounded-lg font-semibold text-sm hover:bg-teus-hover_light transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-teus-accent hover:bg-teus-accent-2 text-white py-2.5 rounded-lg font-bold text-sm shadow-accent-glow transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {proveedor ? "Guardar cambios" : "Crear proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
