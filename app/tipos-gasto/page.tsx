"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Power, X, DollarSign, Search, Loader2, Trash2 } from "lucide-react";

type TipoGasto = {
  id: string;
  nombre: string;
  activo: boolean;
};

export default function TiposGastoPage() {
  const supabase = createClient();
  const [tipos, setTipos] = useState<TipoGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TipoGasto | null>(null);
  const [filter, setFilter] = useState<"activos" | "todos">("activos");
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    let query = supabase.from("tipos_gasto").select("*").order("nombre");
    if (filter === "activos") query = query.eq("activo", true);
    const { data } = await query;
    if (data) setTipos(data as TipoGasto[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filter]);

  const filtered = tipos.filter((t) => {
    if (search && !t.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function toggleActivo(t: TipoGasto) {
    const nuevoEstado = !t.activo;
    if (!confirm(nuevoEstado ? `¿Reactivar "${t.nombre}"?` : `¿Desactivar "${t.nombre}"?\nLos gastos históricos con este tipo se mantienen.`)) return;
    await supabase.from("tipos_gasto").update({ activo: nuevoEstado }).eq("id", t.id);
    loadData();
  }

  async function eliminar(t: TipoGasto) {
    if (!confirm(`¿ELIMINAR permanentemente "${t.nombre}"?\n⚠️ Si hay gastos con este tipo, no se podrá borrar.`)) return;
    const { error } = await supabase.from("tipos_gasto").delete().eq("id", t.id);
    if (error) {
      alert("No se puede eliminar: hay gastos que usan este tipo. Desactivalo en su lugar.");
      return;
    }
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-teus-accent" />
            Tipos de Gasto
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Categorías disponibles al cargar gastos (repuestos, reparación, comisiones, etc.)
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Tipo
        </button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("activos")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold ${filter === "activos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light text-teus-text_muted"}`}
          >Activos</button>
          <button
            onClick={() => setFilter("todos")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold ${filter === "todos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light text-teus-text_muted"}`}
          >Todos</button>
        </div>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-teus-text_muted">
            No hay tipos de gasto. Creá el primero con el botón "+ Nuevo Tipo".
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className={`border-t border-teus-border_light hover:bg-teus-bg_soft/50 ${!t.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-bold text-teus-text_dark">{t.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {t.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditing(t); setShowModal(true); }} className="p-1.5 hover:bg-teus-accent/10 text-teus-accent rounded" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActivo(t)} className="p-1.5 hover:bg-teus-danger/10 text-teus-danger rounded" title={t.activo ? "Desactivar" : "Activar"}>
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminar(t)} className="p-1.5 hover:bg-red-100 text-red-600 rounded" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 text-xs text-teus-text_muted">
        Total: <span className="font-bold text-teus-text_dark">{filtered.length}</span> tipos de gasto
      </div>

      {showModal && <TipoGastoModal tipo={editing} onClose={() => { setShowModal(false); loadData(); }} />}
    </div>
  );
}

function TipoGastoModal({ tipo, onClose }: { tipo: TipoGasto | null; onClose: () => void }) {
  const supabase = createClient();
  const [nombre, setNombre] = useState(tipo?.nombre || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = { nombre: nombre.trim() };
    const { error } = tipo
      ? await supabase.from("tipos_gasto").update(payload).eq("id", tipo.id)
      : await supabase.from("tipos_gasto").insert(payload);
    if (error) { setErr(error.message); setSaving(false); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teus-accent" />
            {tipo ? "Editar Tipo" : "Nuevo Tipo de Gasto"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase">Nombre *</label>
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Comisión Productividad, Peajes, Habilitación..."
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:border-teus-accent outline-none" />
            <p className="text-xs text-teus-text_soft mt-1">
              💡 Escribí un nombre único. Ej: "Peajes", "Almuerzo choferes", "Repuestos importados", etc.
            </p>
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{err}</div>}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teus-accent hover:bg-teus-accent-2 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
              {saving ? "Guardando..." : tipo ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
