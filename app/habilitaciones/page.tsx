"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, X, FileText, Loader2, Truck, AlertTriangle, CheckCircle, Clock } from "lucide-react";

type Vehiculo = { id: string; nombre_equipo: string; tipo: string; chapa: string };

type Habilitacion = {
  id: string;
  vehiculo_id: string;
  tipo: "dinatran" | "municipal";
  fecha_emision: string;
  fecha_vencimiento: string;
  nro_certificado: string | null;
  observacion: string | null;
  vehiculo?: Vehiculo | null;
};

function calcDias(fechaVenc: string): number {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const v = new Date(fechaVenc);
  return Math.floor((v.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function estadoHab(dias: number): { label: string; classes: string; icon: any } {
  if (dias < 0) return { label: "VENCIDA", classes: "bg-teus-danger-light text-teus-danger border-teus-danger/40", icon: AlertTriangle };
  if (dias <= 30) return { label: "URGENTE", classes: "bg-teus-danger-light text-teus-danger border-teus-danger/40", icon: AlertTriangle };
  if (dias <= 60) return { label: "POR VENCER", classes: "bg-teus-warn-light text-teus-warn border-teus-warn/40", icon: Clock };
  return { label: "VIGENTE", classes: "bg-teus-success-light text-teus-success border-teus-success/40", icon: CheckCircle };
}

export default function HabilitacionesPage() {
  const supabase = createClient();
  const [habilitaciones, setHabilitaciones] = useState<Habilitacion[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Habilitacion | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("");

  async function loadData() {
    setLoading(true);
    const [{ data: habData }, { data: vehData }] = await Promise.all([
      supabase.from("habilitaciones").select("*, vehiculo:vehiculo_id(id, nombre_equipo, tipo, chapa)").order("fecha_vencimiento"),
      supabase.from("vehiculos").select("id, nombre_equipo, tipo, chapa").eq("activo", true).order("nombre_equipo"),
    ]);
    if (habData) setHabilitaciones(habData as Habilitacion[]);
    if (vehData) setVehiculos(vehData as Vehiculo[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = habilitaciones.filter(h => {
    if (filterTipo && h.tipo !== filterTipo) return false;
    if (filterEstado !== "todos") {
      const dias = calcDias(h.fecha_vencimiento);
      if (filterEstado === "vencidas" && dias >= 0) return false;
      if (filterEstado === "urgentes" && (dias < 0 || dias > 30)) return false;
      if (filterEstado === "porvencer" && (dias < 0 || dias > 60)) return false;
      if (filterEstado === "vigentes" && dias <= 60) return false;
    }
    return true;
  });

  const counts = {
    vencidas: habilitaciones.filter(h => calcDias(h.fecha_vencimiento) < 0).length,
    urgentes: habilitaciones.filter(h => { const d = calcDias(h.fecha_vencimiento); return d >= 0 && d <= 30; }).length,
    porvencer: habilitaciones.filter(h => { const d = calcDias(h.fecha_vencimiento); return d > 30 && d <= 60; }).length,
    vigentes: habilitaciones.filter(h => calcDias(h.fecha_vencimiento) > 60).length,
  };

  async function deleteHab(h: Habilitacion) {
    if (!confirm(`¿Eliminar esta habilitación?`)) return;
    await supabase.from("habilitaciones").delete().eq("id", h.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <FileText className="w-8 h-8 text-teus-accent" />
            Habilitaciones
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">DINATRAN + Municipal por vehículo · Semáforo de vencimientos</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />Nueva Habilitación
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard label="Vencidas" value={counts.vencidas} color="danger" icon={AlertTriangle} onClick={() => setFilterEstado("vencidas")} active={filterEstado === "vencidas"} />
        <StatCard label="Urgentes (< 30 días)" value={counts.urgentes} color="danger" icon={AlertTriangle} onClick={() => setFilterEstado("urgentes")} active={filterEstado === "urgentes"} />
        <StatCard label="Por vencer (< 60 días)" value={counts.porvencer} color="warn" icon={Clock} onClick={() => setFilterEstado("porvencer")} active={filterEstado === "porvencer"} />
        <StatCard label="Vigentes" value={counts.vigentes} color="success" icon={CheckCircle} onClick={() => setFilterEstado("vigentes")} active={filterEstado === "vigentes"} />
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
          <option value="">Todos los tipos</option>
          <option value="dinatran">DINATRAN</option>
          <option value="municipal">Municipal</option>
        </select>
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
          <option value="todos">Todos los estados</option>
          <option value="vencidas">Vencidas</option>
          <option value="urgentes">Urgentes</option>
          <option value="porvencer">Por vencer</option>
          <option value="vigentes">Vigentes</option>
        </select>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teus-accent" />Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-teus-text_muted text-sm">No hay habilitaciones que coincidan</div>
        ) : (
          <table className="w-full">
            <thead className="bg-teus-hover_light">
              <tr className="text-left text-[10px] uppercase tracking-wider text-teus-text_muted border-b border-teus-border_light">
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Vehículo</th>
                <th className="px-4 py-3 font-bold">Tipo</th>
                <th className="px-4 py-3 font-bold">Emisión</th>
                <th className="px-4 py-3 font-bold">Vencimiento</th>
                <th className="px-4 py-3 font-bold text-center">Días</th>
                <th className="px-4 py-3 font-bold">N° Certificado</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const dias = calcDias(h.fecha_vencimiento);
                const est = estadoHab(dias);
                const Icon = est.icon;
                return (
                  <tr key={h.id} className="border-b border-teus-border_light/60 hover:bg-teus-hover_light transition">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${est.classes}`}>
                        <Icon className="w-3 h-3" />
                        {est.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-teus-accent" />
                        <span className="font-bold text-sm text-teus-text_dark">{h.vehiculo?.nombre_equipo}</span>
                        <span className="font-mono text-[10px] text-teus-text_soft">{h.vehiculo?.chapa}</span>
                        <span className="text-[9px] text-teus-text_soft uppercase">{h.vehiculo?.tipo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold uppercase text-teus-text_dark">{h.tipo}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-teus-text_muted">{new Date(h.fecha_emision).toLocaleDateString("es-PY")}</td>
                    <td className="px-4 py-3 text-xs text-teus-text_dark font-semibold">{new Date(h.fecha_vencimiento).toLocaleDateString("es-PY")}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${dias < 0 ? "text-teus-danger" : dias <= 60 ? "text-teus-warn" : "text-teus-success"}`}>
                        {dias < 0 ? `${dias}d` : `+${dias}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-teus-text_muted">{h.nro_certificado || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setEditing(h); setShowModal(true); }} className="p-2 rounded-lg hover:bg-teus-accent/10 text-teus-text_muted hover:text-teus-accent transition"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteHab(h)} className="p-2 rounded-lg text-teus-text_muted hover:text-teus-danger hover:bg-teus-danger-light transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <HabModal hab={editing} vehiculos={vehiculos} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadData(); }} />}
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon, onClick, active }: any) {
  const colorMap: Record<string, string> = { danger: "text-teus-danger bg-teus-danger-light", warn: "text-teus-warn bg-teus-warn-light", success: "text-teus-success bg-teus-success-light" };
  return (
    <button onClick={onClick} className={`bg-teus-card_light border rounded-2xl p-4 shadow-card text-left transition-all hover:-translate-y-0.5 ${active ? "border-teus-accent ring-2 ring-teus-accent/30" : "border-teus-border_light"}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">{label}</div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}><Icon className="w-4 h-4" /></div>
      </div>
      <div className="text-3xl font-black tracking-tight text-teus-text_dark">{value}</div>
    </button>
  );
}

function HabModal({ hab, vehiculos, onClose, onSaved }: { hab: Habilitacion | null; vehiculos: Vehiculo[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    vehiculo_id: hab?.vehiculo_id || "",
    tipo: hab?.tipo || "dinatran",
    fecha_emision: hab?.fecha_emision || new Date().toISOString().split("T")[0],
    fecha_vencimiento: hab?.fecha_vencimiento || "",
    nro_certificado: hab?.nro_certificado || "",
    observacion: hab?.observacion || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateEmision(fecha: string) {
    const nueva: any = { ...form, fecha_emision: fecha };
    if (fecha) {
      const f = new Date(fecha);
      f.setFullYear(f.getFullYear() + 1);
      nueva.fecha_vencimiento = f.toISOString().split("T")[0];
    }
    setForm(nueva);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload: any = {
      ...form,
      nro_certificado: form.nro_certificado || null,
      observacion: form.observacion || null,
    };
    try {
      if (hab) {
        const { error } = await supabase.from("habilitaciones").update(payload).eq("id", hab.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habilitaciones").insert(payload);
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) { setError(err.message || "Error"); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20";
  const labelCls = "text-xs font-bold text-teus-text_muted uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-teus-text_dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-teus-border_light rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-teus-border_light">
          <h2 className="text-lg font-bold text-teus-text_dark">{hab ? "Editar Habilitación" : "Nueva Habilitación"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-teus-hover_light text-teus-text_muted hover:text-teus-text_dark transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Vehículo *</label>
            <select value={form.vehiculo_id} onChange={(e) => setForm({ ...form, vehiculo_id: e.target.value })} required className={inputCls}>
              <option value="">— Elegir —</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.nombre_equipo} · {v.chapa} · {v.tipo}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tipo *</label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })} className={inputCls}>
              <option value="dinatran">DINATRAN</option>
              <option value="municipal">Municipal</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha emisión *</label>
              <input type="date" value={form.fecha_emision} onChange={(e) => updateEmision(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha vencimiento *</label>
              <input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} required className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>N° Certificado</label>
            <input type="text" value={form.nro_certificado} onChange={(e) => setForm({ ...form, nro_certificado: e.target.value })} placeholder="2271408" className={inputCls + " font-mono"} />
          </div>
          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} rows={2} className={inputCls + " resize-none"} />
          </div>
          {error && <div className="text-sm px-3 py-2 rounded-lg bg-teus-danger-light border border-teus-danger/30 text-teus-danger">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-teus-border_light text-teus-text_muted py-2.5 rounded-lg font-semibold text-sm hover:bg-teus-hover_light transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-teus-accent hover:bg-teus-accent-2 text-white py-2.5 rounded-lg font-bold text-sm shadow-accent-glow transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {hab ? "Guardar cambios" : "Crear habilitación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
