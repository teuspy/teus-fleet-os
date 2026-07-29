"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Power, X, Users, Search, Loader2, User } from "lucide-react";

type Vehiculo = { id: string; nombre_equipo: string; tipo: string; chapa: string };

type Chofer = {
  id: string;
  nombre_completo: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  vehiculo_asignado_id: string | null;
  salario_base_mensual: number;
  fecha_ingreso: string | null;
  activo: boolean;
  observacion: string | null;
  vehiculo?: Vehiculo | null;
};

function fmtGs(n: number) {
  if (!n) return "—";
  return "Gs. " + n.toLocaleString("es-PY");
}

export default function ChoferesPage() {
  const supabase = createClient();
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Chofer | null>(null);
  const [filter, setFilter] = useState<"activos" | "todos">("activos");
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    const [{ data: chofData }, { data: vehData }] = await Promise.all([
      supabase
        .from("choferes")
        .select("*, vehiculo:vehiculo_asignado_id(id, nombre_equipo, tipo, chapa)")
        .order("nombre_completo"),
      supabase
        .from("vehiculos")
        .select("id, nombre_equipo, tipo, chapa")
        .eq("activo", true)
        .eq("tipo", "tracto")
        .order("nombre_equipo"),
    ]);
    if (chofData) {
      const filtered = filter === "activos" ? chofData.filter((c: any) => c.activo) : chofData;
      setChoferes(filtered as Chofer[]);
    }
    if (vehData) setVehiculos(vehData as Vehiculo[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [filter]);

  const filtered = choferes.filter((c) => {
    if (search && !`${c.nombre_completo} ${c.cedula || ""}`.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  async function toggleActivo(c: Chofer) {
    const nuevoEstado = !c.activo;
    const msg = nuevoEstado
      ? `¿Reactivar al chofer ${c.nombre_completo}?`
      : `¿Liquidar / desactivar al chofer ${c.nombre_completo}?\nEl histórico se conserva pero no aparecerá en nuevos viajes.`;
    if (!confirm(msg)) return;
    await supabase.from("choferes").update({ activo: nuevoEstado }).eq("id", c.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Users className="w-8 h-8 text-teus-accent" />
            Choferes
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Gestión del personal de conducción
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Chofer
        </button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-teus-border_light rounded-lg px-9 py-2 text-sm text-teus-text_dark placeholder-teus-text_soft focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
        >
          <option value="activos">Solo activos</option>
          <option value="todos">Incluir liquidados</option>
        </select>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teus-accent" />
            Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-teus-text_muted text-sm">
            No hay choferes que coincidan con el filtro
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-teus-hover_light">
              <tr className="text-left text-[10px] uppercase tracking-wider text-teus-text_muted border-b border-teus-border_light">
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Chofer</th>
                <th className="px-4 py-3 font-bold">Cédula</th>
                <th className="px-4 py-3 font-bold">Teléfono</th>
                <th className="px-4 py-3 font-bold">Equipo asignado</th>
                <th className="px-4 py-3 font-bold text-right">Salario base</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-teus-border_light/60 hover:bg-teus-hover_light transition">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                      c.activo
                        ? "bg-teus-accent/15 text-teus-accent-dark"
                        : "bg-teus-danger-light text-teus-danger"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.activo ? "bg-teus-accent" : "bg-teus-danger"}`} />
                      {c.activo ? "Activo" : "Liquidado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teus-accent/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-teus-accent" />
                      </div>
                      <div className="font-bold text-sm text-teus-text_dark">{c.nombre_completo}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-teus-text_muted">{c.cedula || "—"}</td>
                  <td className="px-4 py-3 text-xs text-teus-text_muted">{c.telefono || "—"}</td>
                  <td className="px-4 py-3">
                    {c.vehiculo ? (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs font-bold text-teus-text_dark">{c.vehiculo.nombre_equipo}</span>
                        <span className="text-[10px] font-mono text-teus-text_soft">{c.vehiculo.chapa}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-teus-text_soft">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-teus-text_dark">
                    {fmtGs(c.salario_base_mensual)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => { setEditing(c); setShowModal(true); }}
                        className="p-2 rounded-lg hover:bg-teus-accent/10 text-teus-text_muted hover:text-teus-accent transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActivo(c)}
                        className={`p-2 rounded-lg transition ${
                          c.activo ? "text-teus-text_muted hover:text-teus-danger hover:bg-teus-danger-light" : "text-teus-accent hover:bg-teus-accent/10"
                        }`}
                        title={c.activo ? "Liquidar / Desactivar" : "Reactivar"}
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

      <div className="text-xs text-teus-text_soft mt-4 px-1">
        Mostrando {filtered.length} de {choferes.length} choferes
      </div>

      {showModal && (
        <ChoferModal
          chofer={editing}
          vehiculos={vehiculos}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function ChoferModal({
  chofer,
  vehiculos,
  onClose,
  onSaved,
}: {
  chofer: Chofer | null;
  vehiculos: Vehiculo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    nombre_completo: chofer?.nombre_completo || "",
    cedula: chofer?.cedula || "",
    telefono: chofer?.telefono || "",
    email: chofer?.email || "",
    vehiculo_asignado_id: chofer?.vehiculo_asignado_id || "",
    salario_base_mensual: chofer?.salario_base_mensual || 0,
    fecha_ingreso: chofer?.fecha_ingreso || "",
    observacion: chofer?.observacion || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: any = {
      ...form,
      vehiculo_asignado_id: form.vehiculo_asignado_id || null,
      cedula: form.cedula || null,
      telefono: form.telefono || null,
      email: form.email || null,
      fecha_ingreso: form.fecha_ingreso || null,
      observacion: form.observacion || null,
    };

    try {
      if (chofer) {
        const { error } = await supabase.from("choferes").update(payload).eq("id", chofer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("choferes").insert({ ...payload, activo: true });
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
    <div className="fixed inset-0 bg-teus-text_dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-teus-border_light rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-teus-border_light sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-teus-text_dark">
            {chofer ? "Editar Chofer" : "Nuevo Chofer"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-teus-hover_light text-teus-text_muted hover:text-teus-text_dark transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Nombre completo *</label>
            <input
              type="text"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value.toUpperCase() })}
              required
              placeholder="LUIS FRANCO"
              className="w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Cédula</label>
              <input
                type="text"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                placeholder="1234567"
                className="w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm font-mono text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="0981 123 456"
                className="w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Email (opcional)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="chofer@ejemplo.com"
              className="w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Equipo asignado (tracto)</label>
            <select
              value={form.vehiculo_asignado_id}
              onChange={(e) => setForm({ ...form, vehiculo_asignado_id: e.target.value })}
              className="w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
            >
              <option value="">— Sin asignar —</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre_equipo} · {v.chapa}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Salario base (Gs.)</label>
              <input
                type="number"
                value={form.salario_base_mensual}
                onChange={(e) => setForm({ ...form, salario_base_mensual: parseInt(e.target.value) || 0 })}
                placeholder="3200000"
                className="w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
              />
              {form.salario_base_mensual > 0 && (
                <div className="text-[10px] text-teus-accent font-bold mt-1">
                  = {fmtGs(form.salario_base_mensual)}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Fecha de ingreso</label>
              <input
                type="date"
                value={form.fecha_ingreso}
                onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
                className="w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Observaciones</label>
            <textarea
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              rows={2}
              placeholder="Notas internas..."
              className="w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20 resize-none"
            />
          </div>

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg bg-teus-danger-light border border-teus-danger/30 text-teus-danger">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-teus-border_light text-teus-text_muted py-2.5 rounded-lg font-semibold text-sm hover:bg-teus-hover_light transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-teus-accent hover:bg-teus-accent-2 text-white py-2.5 rounded-lg font-bold text-sm shadow-accent-glow transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {chofer ? "Guardar cambios" : "Crear chofer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
