"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, X, DollarSign, Search, Loader2, Calendar, TrendingDown, Truck } from "lucide-react";

type Vehiculo = { id: string; nombre_equipo: string; tipo: string; chapa: string; alias: string | null };
type Chofer = { id: string; nombre_completo: string };
type Proveedor = { id: string; nombre: string; tipo: string | null };
type TipoGasto = { id: string; nombre: string };

type Gasto = {
  id: string;
  fecha: string;
  vehiculo_id: string | null;
  aplica_a: "tracto" | "semirremolque" | "equipo_completo" | "oficina" | null;
  tipo_gasto: string;
  concepto: string | null;
  proveedor_id: string | null;
  chofer_id: string | null;
  nro_factura: string | null;
  monto: number;
  tipo_mtto: "Planificado" | "Imprevisto" | "N/A" | null;
  observacion: string | null;
  vehiculo?: Vehiculo | null;
  proveedor?: Proveedor | null;
  chofer?: Chofer | null;
};

const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const APLICA_A: Record<string, { label: string; classes: string }> = {
  tracto: { label: "Tracto", classes: "bg-blue-50 text-blue-700" },
  semirremolque: { label: "Semirremolque", classes: "bg-purple-50 text-purple-700" },
  equipo_completo: { label: "Equipo completo", classes: "bg-teus-accent/15 text-teus-accent-dark" },
  oficina: { label: "Oficina", classes: "bg-gray-100 text-gray-700" },
};

function fmtGs(n: number) { return "Gs. " + (n || 0).toLocaleString("es-PY"); }
function fmtGsShort(n: number) {
  return "Gs. " + (n || 0).toLocaleString("es-PY");
}

export default function GastosPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [search, setSearch] = useState("");
  const [filterEquipo, setFilterEquipo] = useState<string>("");
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterAplicaA, setFilterAplicaA] = useState<string>("");

  async function loadData() {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const [{ data: gastosData }, { data: vehData }, { data: chofData }, { data: provData }, { data: tgData }] = await Promise.all([
      supabase.from("gastos").select("*, vehiculo:vehiculo_id(id, nombre_equipo, tipo, chapa, alias), proveedor:proveedor_id(id, nombre, tipo), chofer:chofer_id(id, nombre_completo)").gte("fecha", startDate).lte("fecha", endDate).order("fecha", { ascending: false }),
      supabase.from("vehiculos").select("id, nombre_equipo, tipo, chapa, alias").eq("activo", true).order("alias"),
      supabase.from("choferes").select("id, nombre_completo").eq("activo", true).order("nombre_completo"),
      supabase.from("proveedores").select("id, nombre, tipo").eq("activo", true).order("nombre"),
      supabase.from("tipos_gasto").select("id, nombre").eq("activo", true).order("nombre"),
    ]);
    if (gastosData) setGastos(gastosData as Gasto[]);
    if (vehData) setVehiculos(vehData as Vehiculo[]);
    if (chofData) setChoferes(chofData as Chofer[]);
    if (provData) setProveedores(provData as Proveedor[]);
    if (tgData) setTiposGasto(tgData as TipoGasto[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month]);

  const filtered = useMemo(() => gastos.filter(g => {
    if (filterEquipo && g.vehiculo?.alias !== filterEquipo) return false;
    if (filterTipo && g.tipo_gasto !== filterTipo) return false;
    if (filterAplicaA && g.aplica_a !== filterAplicaA) return false;
    if (search) {
      const q = search.toLowerCase();
      const s = `${g.vehiculo?.alias || ""} ${g.vehiculo?.nombre_equipo || ""} ${g.proveedor?.nombre || ""} ${g.tipo_gasto} ${g.concepto || ""} ${g.nro_factura || ""}`.toLowerCase();
      if (!s.includes(q)) return false;
    }
    return true;
  }), [gastos, filterEquipo, filterTipo, filterAplicaA, search]);

  const totales = useMemo(() => {
    const total = filtered.reduce((s, g) => s + (g.monto || 0), 0);
    const porTipo: Record<string, number> = {};
    filtered.forEach(g => { porTipo[g.tipo_gasto] = (porTipo[g.tipo_gasto] || 0) + g.monto; });
    const topTipo = Object.entries(porTipo).sort((a, b) => b[1] - a[1])[0];
    return { total, cantidad: filtered.length, topTipo };
  }, [filtered]);

  async function deleteGasto(g: Gasto) {
    if (!confirm(`¿Eliminar este gasto?\n${g.tipo_gasto} - ${fmtGs(g.monto)}\n\nEsta acción no se puede deshacer.`)) return;
    await supabase.from("gastos").delete().eq("id", g.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-teus-accent" />
            Gastos de Flota
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Gastos variables por vehículo y oficina</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-xl shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Gasto
        </button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-card">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-teus-accent" />
          <span className="text-xs font-bold text-teus-text_muted uppercase tracking-wider">Período:</span>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark font-semibold focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            {MESES_ES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark font-semibold focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
            <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 bg-white border border-teus-border_light rounded-lg px-9 py-2 text-sm text-teus-text_dark placeholder-teus-text_soft focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20" />
          </div>
          <select value={filterEquipo} onChange={(e) => setFilterEquipo(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            <option value="">Todos los equipos</option>
            {Array.from(new Set(vehiculos.map(v => v.alias).filter(Boolean))).sort().map(alias => (
              <option key={alias} value={alias!}>{alias} (equipo completo)</option>
            ))}
          </select>
          <select value={filterAplicaA} onChange={(e) => setFilterAplicaA(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            <option value="">Todos (aplica a)</option>
            <option value="tracto">Solo Tracto</option>
            <option value="semirremolque">Solo Semirremolque</option>
            <option value="equipo_completo">Solo Equipo completo</option>
            <option value="oficina">Solo Oficina</option>
          </select>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            <option value="">Todos los tipos</option>
            {tiposGasto.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-4 shadow-card">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[10px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Total del mes</div>
            <div className="w-8 h-8 rounded-lg bg-teus-danger-light flex items-center justify-center"><TrendingDown className="w-4 h-4 text-teus-danger" /></div>
          </div>
          <div className="text-2xl font-black tracking-tight text-teus-danger">{fmtGsShort(totales.total)}</div>
          <div className="text-[10px] text-teus-text_soft mt-1">{fmtGs(totales.total)}</div>
        </div>
        <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-4 shadow-card">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[10px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Cantidad</div>
            <div className="w-8 h-8 rounded-lg bg-teus-accent/10 flex items-center justify-center"><DollarSign className="w-4 h-4 text-teus-accent" /></div>
          </div>
          <div className="text-2xl font-black tracking-tight text-teus-text_dark">{totales.cantidad}</div>
          <div className="text-[10px] text-teus-text_soft mt-1">gastos registrados</div>
        </div>
        <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-4 shadow-card">
          <div className="flex items-start justify-between mb-2">
            <div className="text-[10px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">Categoría top</div>
            <div className="w-8 h-8 rounded-lg bg-teus-accent/10 flex items-center justify-center"><Truck className="w-4 h-4 text-teus-accent" /></div>
          </div>
          <div className="text-lg font-black tracking-tight text-teus-text_dark truncate">{totales.topTipo ? totales.topTipo[0] : "—"}</div>
          <div className="text-[10px] text-teus-accent font-bold mt-1">{totales.topTipo ? fmtGsShort(totales.topTipo[1]) : ""}</div>
        </div>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teus-accent" />Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <DollarSign className="w-12 h-12 text-teus-text_soft mx-auto mb-3" />
            <div className="text-teus-text_muted text-sm mb-4">
              {gastos.length === 0 ? `Aún no hay gastos cargados para ${MESES_ES[month-1]} ${year}` : "No hay gastos que coincidan con los filtros"}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teus-hover_light">
                <tr className="text-left text-[10px] uppercase tracking-wider text-teus-text_muted border-b border-teus-border_light">
                  <th className="px-3 py-3 font-bold">Fecha</th>
                  <th className="px-3 py-3 font-bold">Equipo</th>
                  <th className="px-3 py-3 font-bold">Aplica a</th>
                  <th className="px-3 py-3 font-bold">Tipo</th>
                  <th className="px-3 py-3 font-bold">Concepto</th>
                  <th className="px-3 py-3 font-bold">Proveedor</th>
                  <th className="px-3 py-3 font-bold text-right">Monto</th>
                  <th className="px-3 py-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id} className="border-b border-teus-border_light/60 hover:bg-teus-hover_light transition">
                    <td className="px-3 py-3 text-teus-text_dark font-semibold text-xs whitespace-nowrap">{(() => { const [y,m,d] = g.fecha.split("T")[0].split("-"); return `${d}/${m}`; })()}</td>
                    <td className="px-3 py-3 font-bold text-teus-text_dark">{g.vehiculo?.alias || g.vehiculo?.nombre_equipo || "—"}</td>
                    <td className="px-3 py-3">
                      {g.aplica_a && (
                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${APLICA_A[g.aplica_a]?.classes || ""}`}>{APLICA_A[g.aplica_a]?.label || g.aplica_a}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-teus-text_dark font-semibold">{g.tipo_gasto}</td>
                    <td className="px-3 py-3 text-xs text-teus-text_muted truncate max-w-[200px]" title={g.concepto || ""}>{g.concepto || "—"}</td>
                    <td className="px-3 py-3 text-xs text-teus-text_muted">{g.proveedor?.nombre || "—"}</td>
                    <td className="px-3 py-3 text-right font-bold text-teus-danger whitespace-nowrap">{fmtGsShort(g.monto)}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setEditing(g); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-teus-accent/10 text-teus-text_muted hover:text-teus-accent transition" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteGasto(g)} className="p-1.5 rounded-lg text-teus-text_muted hover:text-teus-danger hover:bg-teus-danger-light transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-teus-text_soft mt-4 px-1">Mostrando {filtered.length} gastos · {MESES_ES[month-1]} {year}</div>

      {showModal && <GastoModal gasto={editing} vehiculos={vehiculos} choferes={choferes} proveedores={proveedores} tiposGasto={tiposGasto} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadData(); }} />}
    </div>
  );
}

function GastoModal({ gasto, vehiculos, choferes, proveedores, tiposGasto, onClose, onSaved }: {
  gasto: Gasto | null;
  vehiculos: Vehiculo[]; choferes: Chofer[]; proveedores: Proveedor[]; tiposGasto: TipoGasto[];
  onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    fecha: gasto?.fecha || new Date().toISOString().split("T")[0],
    vehiculo_id: gasto?.vehiculo_id || "",
    aplica_a: gasto?.aplica_a || "tracto",
    tipo_gasto: gasto?.tipo_gasto || "",
    concepto: gasto?.concepto || "",
    proveedor_id: gasto?.proveedor_id || "",
    chofer_id: gasto?.chofer_id || "",
    nro_factura: gasto?.nro_factura || "",
    monto: gasto?.monto || 0,
    tipo_mtto: gasto?.tipo_mtto || "N/A",
    observacion: gasto?.observacion || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: any = {
      ...form,
      vehiculo_id: form.aplica_a === "oficina" ? null : (form.vehiculo_id || null),
      proveedor_id: form.proveedor_id || null,
      chofer_id: form.chofer_id || null,
      concepto: form.concepto || null,
      nro_factura: form.nro_factura || null,
      observacion: form.observacion || null,
    };
    try {
      if (gasto) {
        const { error } = await supabase.from("gastos").update(payload).eq("id", gasto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gastos").insert(payload);
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) { setError(err.message || "Error al guardar"); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full bg-white border border-teus-border_light rounded-lg px-3 py-2 mt-1 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20";
  const labelCls = "text-xs font-bold text-teus-text_muted uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-teus-text_dark/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-teus-border_light rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-teus-border_light sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-teus-text_dark">{gasto ? "Editar Gasto" : "Nuevo Gasto"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-teus-hover_light text-teus-text_muted hover:text-teus-text_dark transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Aplica a *</label>
              <select value={form.aplica_a} onChange={(e) => setForm({ ...form, aplica_a: e.target.value as any })} className={inputCls}>
                <option value="tracto">Tracto</option>
                <option value="semirremolque">Semirremolque</option>
                <option value="equipo_completo">Equipo completo</option>
                <option value="oficina">Oficina (no vehículo)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>N° Factura</label>
              <input type="text" value={form.nro_factura} onChange={(e) => setForm({ ...form, nro_factura: e.target.value })} placeholder="001-001-000123" className={inputCls + " font-mono"} />
            </div>
          </div>

          {form.aplica_a !== "oficina" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Equipo *</label>
                <select value={form.vehiculo_id} onChange={(e) => setForm({ ...form, vehiculo_id: e.target.value })} required className={inputCls}>
                  <option value="">— Elegir —</option>
                  {vehiculos.filter(v => form.aplica_a === "equipo_completo" ? v.tipo === "tracto" : v.tipo === form.aplica_a).map(v => <option key={v.id} value={v.id}>{v.alias || v.nombre_equipo} · {v.chapa}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Chofer (opcional)</label>
                <select value={form.chofer_id} onChange={(e) => setForm({ ...form, chofer_id: e.target.value })} className={inputCls}>
                  <option value="">— Sin asignar —</option>
                  {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de gasto *</label>
              <select value={form.tipo_gasto} onChange={(e) => setForm({ ...form, tipo_gasto: e.target.value })} required className={inputCls}>
                <option value="">— Elegir —</option>
                {tiposGasto.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Proveedor</label>
              <select value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })} className={inputCls}>
                <option value="">— Sin proveedor —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Concepto / Descripción</label>
            <input type="text" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Cambio de cubiertas delanteras" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Monto (Gs.) *</label>
              <input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: parseInt(e.target.value) || 0 })} required className={inputCls} />
              {form.monto > 0 && <div className="text-[10px] text-teus-danger font-bold mt-1">= {fmtGs(form.monto)}</div>}
            </div>
            <div>
              <label className={labelCls}>Tipo de mantenimiento</label>
              <select value={form.tipo_mtto} onChange={(e) => setForm({ ...form, tipo_mtto: e.target.value as any })} className={inputCls}>
                <option value="N/A">N/A</option>
                <option value="Planificado">Planificado</option>
                <option value="Imprevisto">Imprevisto</option>
              </select>
            </div>
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
              {gasto ? "Guardar cambios" : "Crear gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
