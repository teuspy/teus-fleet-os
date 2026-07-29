"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Power, X, Building2, Search, Loader2 } from "lucide-react";

type Cliente = {
  id: string;
  nombre: string;
  ruc: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  credito_dias: number;
  activo: boolean;
  observacion: string | null;
};

export default function ClientesPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [filter, setFilter] = useState<"activos" | "todos">("activos");
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    let query = supabase.from("clientes").select("*").order("nombre");
    if (filter === "activos") query = query.eq("activo", true);
    const { data } = await query;
    if (data) setClientes(data as Cliente[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filter]);

  const filtered = clientes.filter((c) => {
    if (search && !`${c.nombre} ${c.ruc || ""} ${c.contacto || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function toggleActivo(c: Cliente) {
    const nuevoEstado = !c.activo;
    const msg = nuevoEstado
      ? `¿Reactivar el cliente ${c.nombre}?`
      : `¿Desactivar el cliente ${c.nombre}?\nEl histórico se conserva pero no aparecerá en nuevos viajes.`;
    if (!confirm(msg)) return;
    await supabase.from("clientes").update({ activo: nuevoEstado }).eq("id", c.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Building2 className="w-8 h-8 text-teus-accent" />
            Clientes
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Base de clientes de TEUS Logistics
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC o contacto..."
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
          <option value="todos">Incluir inactivos</option>
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
            No hay clientes que coincidan con el filtro
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-teus-hover_light">
              <tr className="text-left text-[10px] uppercase tracking-wider text-teus-text_muted border-b border-teus-border_light">
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Cliente</th>
                <th className="px-4 py-3 font-bold">RUC</th>
                <th className="px-4 py-3 font-bold">Contacto</th>
                <th className="px-4 py-3 font-bold">Teléfono</th>
                <th className="px-4 py-3 font-bold text-center">Crédito</th>
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
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teus-accent/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-teus-accent" />
                      </div>
                      <div className="font-bold text-sm text-teus-text_dark">{c.nombre}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-teus-text_muted">{c.ruc || "—"}</td>
                  <td className="px-4 py-3 text-xs text-teus-text_muted">{c.contacto || "—"}</td>
                  <td className="px-4 py-3 text-xs text-teus-text_muted">{c.telefono || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-teus-text_dark">
                      {c.credito_dias > 0 ? `${c.credito_dias} días` : "Contado"}
                    </span>
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
                        title={c.activo ? "Desactivar" : "Reactivar"}
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
        Mostrando {filtered.length} de {clientes.length} clientes
      </div>

      {showModal && (
        <ClienteModal
          cliente={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function ClienteModal({ cliente, onClose, onSaved }: {
  cliente: Cliente | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    nombre: cliente?.nombre || "",
    ruc: cliente?.ruc || "",
    contacto: cliente?.contacto || "",
    telefono: cliente?.telefono || "",
    email: cliente?.email || "",
    credito_dias: cliente?.credito_dias ?? 15,
    observacion: cliente?.observacion || "",
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
      contacto: form.contacto || null,
      telefono: form.telefono || null,
      email: form.email || null,
      observacion: form.observacion || null,
    };
    try {
      if (cliente) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", cliente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert({ ...payload, activo: true });
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20";
  const labelCls = "text-xs font-bold text-teus-text_muted uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-teus-text_dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-teus-border_light rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-teus-border_light sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-teus-text_dark">
            {cliente ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-teus-hover_light text-teus-text_muted hover:text-teus-text_dark transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre del cliente *</label>
            <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })} required placeholder="SUNSET" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>RUC</label>
              <input type="text" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} placeholder="80012345-6" className={inputCls + " font-mono"} />
            </div>
            <div>
              <label className={labelCls}>Días de crédito</label>
              <input type="number" value={form.credito_dias} onChange={(e) => setForm({ ...form, credito_dias: parseInt(e.target.value) || 0 })} placeholder="15" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Contacto (persona)</label>
            <input type="text" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="Juan Pérez" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="0981 123 456" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="cliente@empresa.com" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} rows={2} placeholder="Notas internas..." className={inputCls + " resize-none"} />
          </div>
          {error && (
            <div className="text-sm px-3 py-2 rounded-lg bg-teus-danger-light border border-teus-danger/30 text-teus-danger">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-teus-border_light text-teus-text_muted py-2.5 rounded-lg font-semibold text-sm hover:bg-teus-hover_light transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-teus-accent hover:bg-teus-accent-2 text-white py-2.5 rounded-lg font-bold text-sm shadow-accent-glow transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {cliente ? "Guardar cambios" : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
