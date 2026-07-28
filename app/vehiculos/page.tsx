"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Power, X, Truck, Search, Loader2 } from "lucide-react";

type Vehiculo = {
  id: string;
  tipo: "tracto" | "semirremolque";
  nombre_equipo: string;
  chapa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  km_actual: number;
  activo: boolean;
  observacion: string | null;
};

export default function VehiculosPage() {
  const supabase = createClient();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vehiculo | null>(null);
  const [filter, setFilter] = useState<"activos" | "todos">("activos");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "tracto" | "semirremolque">("todos");
  const [search, setSearch] = useState("");

  async function loadVehiculos() {
    setLoading(true);
    let query = supabase.from("vehiculos").select("*").order("nombre_equipo").order("tipo");
    if (filter === "activos") query = query.eq("activo", true);
    const { data, error } = await query;
    if (!error && data) setVehiculos(data as Vehiculo[]);
    setLoading(false);
  }

  useEffect(() => {
    loadVehiculos();
  }, [filter]);

  const filtered = vehiculos.filter((v) => {
    if (tipoFilter !== "todos" && v.tipo !== tipoFilter) return false;
    if (search && !`${v.nombre_equipo} ${v.chapa}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function toggleActivo(v: Vehiculo) {
    const nuevoEstado = !v.activo;
    const msg = nuevoEstado
      ? `¿Reactivar el vehículo ${v.nombre_equipo} (${v.chapa})?`
      : `¿Desactivar el vehículo ${v.nombre_equipo} (${v.chapa})?\nEl histórico se conserva pero no aparecerá en nuevos viajes.`;
    if (!confirm(msg)) return;

    await supabase.from("vehiculos").update({ activo: nuevoEstado }).eq("id", v.id);
    loadVehiculos();
  }

  return (
    <div className="px-8 py-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <Truck className="w-7 h-7 text-teus-accent" />
            Vehículos
          </h1>
          <p className="text-sm text-teus-text-dim mt-1">
            Gestión de tractocamiones y semirremolques
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-gradient-to-r from-teus-accent to-teus-accent-2 text-teus-bg font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-teus-accent/30 hover:shadow-teus-accent/50 transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Vehículo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-teus-card to-teus-card-2 border border-teus-border rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text-dim" />
          <input
            type="text"
            placeholder="Buscar por equipo o chapa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-9 py-2 text-sm placeholder-teus-text-dim/50 focus:outline-none focus:border-teus-accent"
          />
        </div>
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as any)}
          className="bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teus-accent"
        >
          <option value="todos">Todos los tipos</option>
          <option value="tracto">Solo Tractos</option>
          <option value="semirremolque">Solo Semirremolques</option>
        </select>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teus-accent"
        >
          <option value="activos">Solo activos</option>
          <option value="todos">Incluir inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-gradient-to-br from-teus-card to-teus-card-2 border border-teus-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-teus-text-dim">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teus-accent" />
            Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-teus-text-dim text-sm">
            No hay vehículos que coincidan con el filtro
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-teus-text-dim border-b border-teus-border">
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Equipo</th>
                <th className="px-4 py-3 font-semibold">Chapa</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold text-right">KM Actual</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-teus-border/50 hover:bg-teus-accent/5 transition">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                      v.activo
                        ? "bg-teus-accent/15 text-teus-accent"
                        : "bg-teus-danger/15 text-teus-danger"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${v.activo ? "bg-teus-accent" : "bg-teus-danger"}`} />
                      {v.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-sm">{v.nombre_equipo}</td>
                  <td className="px-4 py-3 font-mono text-xs text-teus-text-dim tracking-wider">{v.chapa}</td>
                  <td className="px-4 py-3 text-xs text-teus-text-dim capitalize">{v.tipo}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">
                    {(v.km_actual || 0).toLocaleString("es-PY")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => { setEditing(v); setShowModal(true); }}
                        className="p-2 rounded-lg hover:bg-teus-accent/10 text-teus-text-dim hover:text-teus-accent transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActivo(v)}
                        className={`p-2 rounded-lg hover:bg-teus-danger/10 transition ${
                          v.activo ? "text-teus-text-dim hover:text-teus-danger" : "text-teus-accent"
                        }`}
                        title={v.activo ? "Desactivar" : "Reactivar"}
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

      <div className="text-xs text-teus-text-dim mt-4 px-1">
        Mostrando {filtered.length} de {vehiculos.length} vehículos
      </div>

      {/* Modal */}
      {showModal && (
        <VehiculoModal
          vehiculo={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadVehiculos(); }}
        />
      )}
    </div>
  );
}

function VehiculoModal({
  vehiculo,
  onClose,
  onSaved,
}: {
  vehiculo: Vehiculo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    tipo: vehiculo?.tipo || "tracto",
    nombre_equipo: vehiculo?.nombre_equipo || "",
    chapa: vehiculo?.chapa || "",
    marca: vehiculo?.marca || "",
    modelo: vehiculo?.modelo || "",
    anio: vehiculo?.anio || new Date().getFullYear(),
    km_actual: vehiculo?.km_actual || 0,
    observacion: vehiculo?.observacion || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (vehiculo) {
        const { error } = await supabase.from("vehiculos").update(form).eq("id", vehiculo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vehiculos").insert({ ...form, activo: true });
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-teus-card to-teus-card-2 border border-teus-border rounded-2xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-teus-border">
          <h2 className="text-lg font-bold">
            {vehiculo ? "Editar Vehículo" : "Nuevo Vehículo"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-teus-bg/50 text-teus-text-dim hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
                className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-teus-accent"
              >
                <option value="tracto">Tracto</option>
                <option value="semirremolque">Semirremolque</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">Equipo</label>
              <input
                type="text"
                value={form.nombre_equipo}
                onChange={(e) => setForm({ ...form, nombre_equipo: e.target.value.toUpperCase() })}
                required
                placeholder="Ej: SENNA"
                className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-teus-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">Chapa</label>
            <input
              type="text"
              value={form.chapa}
              onChange={(e) => setForm({ ...form, chapa: e.target.value.toUpperCase() })}
              required
              placeholder="Ej: HDH510"
              className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 mt-1 text-sm font-mono tracking-wider focus:outline-none focus:border-teus-accent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">Marca</label>
              <input
                type="text"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                placeholder="Scania"
                className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-teus-accent"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">Modelo</label>
              <input
                type="text"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                placeholder="R450"
                className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-teus-accent"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">Año</label>
              <input
                type="number"
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: parseInt(e.target.value) || 0 })}
                className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-teus-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">KM Actual</label>
            <input
              type="number"
              value={form.km_actual}
              onChange={(e) => setForm({ ...form, km_actual: parseInt(e.target.value) || 0 })}
              className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-teus-accent"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-teus-text-dim uppercase tracking-wider">Observaciones</label>
            <textarea
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              rows={2}
              className="w-full bg-teus-bg/50 border border-teus-border rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-teus-accent resize-none"
            />
          </div>

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg bg-teus-danger/10 border border-teus-danger/30 text-teus-danger">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-teus-border text-teus-text-dim py-2.5 rounded-lg font-semibold text-sm hover:bg-teus-bg/30 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-teus-accent to-teus-accent-2 text-teus-bg py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-teus-accent/30 hover:shadow-teus-accent/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {vehiculo ? "Guardar cambios" : "Crear vehículo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
