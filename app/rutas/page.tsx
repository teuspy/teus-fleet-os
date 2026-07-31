"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Power, X, MapPin, Search, Loader2 } from "lucide-react";

type Ruta = {
  id: string;
  origen: string;
  destino: string;
  departamento: string | null;
  km_ida: number;
  km_vuelta: number | null;
  activo: boolean;
};

const DEPARTAMENTOS = [
  "Central", "Presidente Hayes", "Paraguarí", "Cordillera",
  "Guairá", "Caaguazú", "Caazapá", "Misiones", "Ñeembucú",
  "Itapúa", "Alto Paraná", "Canindeyú", "Amambay", "San Pedro",
  "Concepción", "Boquerón", "Alto Paraguay",
];

export default function RutasPage() {
  const supabase = createClient();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Ruta | null>(null);
  const [filter, setFilter] = useState<"activos" | "todos">("activos");
  const [search, setSearch] = useState("");
  const [depFilter, setDepFilter] = useState<string>("todos");

  async function loadData() {
    setLoading(true);
    let query = supabase.from("rutas").select("*").order("destino");
    if (filter === "activos") query = query.eq("activo", true);
    const { data } = await query;
    if (data) setRutas(data as Ruta[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filter]);

  const filtered = rutas.filter((r) => {
    if (depFilter !== "todos" && r.departamento !== depFilter) return false;
    if (search && !`${r.origen} ${r.destino} ${r.departamento || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function toggleActivo(r: Ruta) {
    const nuevoEstado = !r.activo;
    if (!confirm(nuevoEstado ? `¿Reactivar ${r.destino}?` : `¿Desactivar ${r.destino}?`)) return;
    await supabase.from("rutas").update({ activo: nuevoEstado }).eq("id", r.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <MapPin className="w-8 h-8 text-teus-accent" />
            Rutas Maestras
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Catálogo de destinos con km aproximados desde Villeta
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Ruta
        </button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
          <input
            type="text"
            placeholder="Buscar destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none"
          />
        </div>
        <select
          value={depFilter}
          onChange={(e) => setDepFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none"
        >
          <option value="todos">Todos los departamentos</option>
          {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("activos")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold ${filter === "activos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light text-teus-text_muted"}`}
          >Activas</button>
          <button
            onClick={() => setFilter("todos")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold ${filter === "todos" ? "bg-teus-accent text-white" : "bg-white border border-teus-border_light text-teus-text_muted"}`}
          >Todas</button>
        </div>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Cargando rutas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-teus-text_muted">
            No hay rutas que coincidan
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
              <tr>
                <th className="text-left px-4 py-3">Origen</th>
                <th className="text-left px-4 py-3">Destino</th>
                <th className="text-left px-4 py-3">Departamento</th>
                <th className="text-right px-4 py-3">Km ida</th>
                <th className="text-right px-4 py-3">Km ida y vuelta</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`border-t border-teus-border_light hover:bg-teus-bg_soft/50 ${!r.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium">{r.origen}</td>
                  <td className="px-4 py-3 font-semibold text-teus-text_dark">{r.destino}</td>
                  <td className="px-4 py-3 text-teus-text_muted">{r.departamento || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.km_ida.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-teus-accent">{(r.km_ida * 2).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {r.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setEditing(r); setShowModal(true); }}
                        className="p-1.5 hover:bg-teus-accent/10 text-teus-accent rounded transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActivo(r)}
                        className="p-1.5 hover:bg-teus-danger/10 text-teus-danger rounded transition"
                      >
                        <Power className="w-4 h-4" />
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
        Total: <span className="font-bold text-teus-text_dark">{filtered.length}</span> rutas
      </div>

      {showModal && <RutaModal ruta={editing} onClose={() => { setShowModal(false); loadData(); }} />}
    </div>
  );
}

function RutaModal({ ruta, onClose }: { ruta: Ruta | null; onClose: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    origen: ruta?.origen || "Villeta",
    destino: ruta?.destino || "",
    departamento: ruta?.departamento || "Central",
    km_ida: ruta?.km_ida?.toString() || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const km = parseInt(form.km_ida);
    const payload = {
      origen: form.origen.trim(),
      destino: form.destino.trim(),
      departamento: form.departamento,
      km_ida: km,
      km_vuelta: km,
    };
    const { error } = ruta
      ? await supabase.from("rutas").update(payload).eq("id", ruta.id)
      : await supabase.from("rutas").insert(payload);
    if (error) { setErr(error.message); setSaving(false); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-teus-border_light">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teus-accent" />
            {ruta ? "Editar Ruta" : "Nueva Ruta"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-teus-text_muted uppercase">Origen</label>
              <input required value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-teus-text_muted uppercase">Destino *</label>
              <input required value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}
                placeholder="Ej: Vallemí"
                className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-teus-text_muted uppercase">Departamento</label>
            <select value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none">
              {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-teus-text_muted uppercase">Km ida (aproximado) *</label>
            <input required type="number" min="1" value={form.km_ida} onChange={(e) => setForm({ ...form, km_ida: e.target.value })}
              placeholder="Ej: 350"
              className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none" />
            <p className="text-xs text-teus-text_soft mt-1">Ida y vuelta = km_ida × 2 (calculado automáticamente)</p>
          </div>

          {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{err}</div>}

          <div className="flex justify-end gap-2 pt-4 border-t border-teus-border_light">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-teus-border_light rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teus-accent hover:bg-teus-accent-2 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
              {saving ? "Guardando..." : ruta ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
