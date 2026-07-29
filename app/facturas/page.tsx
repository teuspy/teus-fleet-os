"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, X, FileText, Search, Loader2, Calendar, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";

type Cliente = { id: string; nombre: string; credito_dias: number };

type Factura = {
  id: string;
  nro_factura: string;
  cliente_id: string;
  fecha_emision: string;
  monto: number;
  credito_dias: number;
  fecha_vencimiento: string | null;
  fecha_cobro: string | null;
  estado: "pagado" | "pendiente" | "credito" | "vencida" | "anulada";
  observacion: string | null;
  cliente?: Cliente | null;
};

const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const ESTADOS: Record<string, { label: string; classes: string }> = {
  pagado: { label: "Pagado", classes: "bg-teus-success-light text-teus-success" },
  pendiente: { label: "Pendiente", classes: "bg-teus-warn-light text-teus-warn" },
  credito: { label: "Crédito", classes: "bg-blue-50 text-blue-700" },
  vencida: { label: "Vencida", classes: "bg-teus-danger-light text-teus-danger" },
  anulada: { label: "Anulada", classes: "bg-gray-100 text-gray-500 line-through" },
};

function fmtGs(n: number) { return "Gs. " + (n || 0).toLocaleString("es-PY"); }
function fmtGsShort(n: number) {
  if (!n) return "Gs. 0";
  if (n >= 1_000_000) return "Gs. " + (n / 1_000_000).toFixed(1).replace(".0","") + "M";
  if (n >= 1_000) return "Gs. " + (n / 1_000).toFixed(0) + "K";
  return "Gs. " + n.toLocaleString("es-PY");
}

function calcDiasVenc(fechaVenc: string | null): number | null {
  if (!fechaVenc) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const v = new Date(fechaVenc);
  return Math.floor((v.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export default function FacturasPage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(0);  // 0 = todos
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Factura | null>(null);
  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState<string>("");
  const [filterEstado, setFilterEstado] = useState<string>("");

  async function loadData() {
    setLoading(true);
    let q = supabase.from("facturas").select("*, cliente:cliente_id(id, nombre, credito_dias)").order("fecha_emision", { ascending: false });
    if (month > 0) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      q = q.gte("fecha_emision", startDate).lte("fecha_emision", endDate);
    } else {
      q = q.gte("fecha_emision", `${year}-01-01`).lte("fecha_emision", `${year}-12-31`);
    }
    const [{ data: facData }, { data: cliData }] = await Promise.all([
      q,
      supabase.from("clientes").select("id, nombre, credito_dias").eq("activo", true).order("nombre"),
    ]);
    if (facData) setFacturas(facData as Factura[]);
    if (cliData) setClientes(cliData as Cliente[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month]);

  const filtered = useMemo(() => facturas.filter(f => {
    if (filterCliente && f.cliente_id !== filterCliente) return false;
    if (filterEstado && f.estado !== filterEstado) return false;
    if (search && !`${f.nro_factura} ${f.cliente?.nombre || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [facturas, filterCliente, filterEstado, search]);

  const totales = useMemo(() => {
    const total = filtered.reduce((s, f) => s + (f.estado !== "anulada" ? f.monto : 0), 0);
    const pagado = filtered.filter(f => f.estado === "pagado").reduce((s, f) => s + f.monto, 0);
    const pendiente = filtered.filter(f => f.estado === "pendiente" || f.estado === "credito" || f.estado === "vencida").reduce((s, f) => s + f.monto, 0);
    const vencido = filtered.filter(f => {
      const dias = calcDiasVenc(f.fecha_vencimiento);
      return f.estado !== "pagado" && f.estado !== "anulada" && dias !== null && dias < 0;
    }).reduce((s, f) => s + f.monto, 0);
    return { total, pagado, pendiente, vencido, cantidad: filtered.length };
  }, [filtered]);

  async function deleteFactura(f: Factura) {
    if (!confirm(`¿Eliminar factura ${f.nro_factura}?\n\nEsta acción no se puede deshacer.`)) return;
    await supabase.from("facturas").delete().eq("id", f.id);
    loadData();
  }

  async function marcarPagado(f: Factura) {
    if (!confirm(`¿Marcar factura ${f.nro_factura} como PAGADA?`)) return;
    await supabase.from("facturas").update({ estado: "pagado", fecha_cobro: new Date().toISOString().split("T")[0] }).eq("id", f.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <FileText className="w-8 h-8 text-teus-accent" />
            Facturas y Cobros
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">Control de facturación y cobranza</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />Nueva Factura
        </button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <div className="flex items-center gap-2 text-teus-text_muted text-sm font-bold"><Calendar className="w-4 h-4" />Período:</div>
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20 font-semibold">
          <option value={0}>Todo el año</option>
          {MESES_ES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(+e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20 font-semibold">
          {[2024,2025,2026,2027,2028,2029].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
            <input type="text" placeholder="Buscar N° o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 bg-white border border-teus-border_light rounded-lg px-9 py-2 text-sm text-teus-text_dark placeholder-teus-text_soft focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20" />
          </div>
          <select value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Facturado" value={fmtGsShort(totales.total)} sub={`${totales.cantidad} facturas`} color="text_dark" icon={FileText} />
        <KpiCard label="Cobrado" value={fmtGsShort(totales.pagado)} sub="Ya en la cuenta" color="success" icon={TrendingUp} />
        <KpiCard label="Por cobrar" value={fmtGsShort(totales.pendiente)} sub="Pendiente + crédito" color="warn" icon={DollarSign} />
        <KpiCard label="Vencidas" value={fmtGsShort(totales.vencido)} sub="¡Cobrar urgente!" color="danger" icon={AlertTriangle} />
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teus-accent" />Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><FileText className="w-12 h-12 text-teus-text_soft mx-auto mb-3" /><div className="text-teus-text_muted text-sm">No hay facturas en este período</div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teus-hover_light">
                <tr className="text-left text-[10px] uppercase tracking-wider text-teus-text_muted border-b border-teus-border_light">
                  <th className="px-3 py-3 font-bold">N° Factura</th>
                  <th className="px-3 py-3 font-bold">Cliente</th>
                  <th className="px-3 py-3 font-bold">Emisión</th>
                  <th className="px-3 py-3 font-bold">Vence</th>
                  <th className="px-3 py-3 font-bold text-center">Días</th>
                  <th className="px-3 py-3 font-bold text-right">Monto</th>
                  <th className="px-3 py-3 font-bold">Estado</th>
                  <th className="px-3 py-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const dias = calcDiasVenc(f.fecha_vencimiento);
                  const vencidaAuto = f.estado !== "pagado" && f.estado !== "anulada" && dias !== null && dias < 0;
                  return (
                    <tr key={f.id} className={`border-b border-teus-border_light/60 hover:bg-teus-hover_light transition ${vencidaAuto ? "bg-teus-danger-light/30" : ""}`}>
                      <td className="px-3 py-3 font-mono text-xs font-bold text-teus-text_dark">{f.nro_factura}</td>
                      <td className="px-3 py-3 text-xs text-teus-text_dark font-semibold">{f.cliente?.nombre || "—"}</td>
                      <td className="px-3 py-3 text-xs text-teus-text_muted whitespace-nowrap">{new Date(f.fecha_emision).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "2-digit" })}</td>
                      <td className="px-3 py-3 text-xs text-teus-text_muted whitespace-nowrap">{f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}</td>
                      <td className="px-3 py-3 text-center">
                        {dias !== null && f.estado !== "pagado" && f.estado !== "anulada" ? (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${dias < 0 ? "bg-teus-danger-light text-teus-danger" : dias < 7 ? "bg-teus-warn-light text-teus-warn" : "bg-teus-success-light text-teus-success"}`}>
                            {dias < 0 ? `-${Math.abs(dias)}d` : `${dias}d`}
                          </span>
                        ) : <span className="text-xs text-teus-text_soft">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-teus-text_dark whitespace-nowrap">{fmtGsShort(f.monto)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${ESTADOS[f.estado]?.classes || ""}`}>
                          {vencidaAuto && f.estado !== "vencida" ? "VENCIDA" : ESTADOS[f.estado]?.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex gap-1">
                          {f.estado !== "pagado" && f.estado !== "anulada" && (
                            <button onClick={() => marcarPagado(f)} className="p-1.5 rounded-lg text-teus-text_muted hover:text-teus-success hover:bg-teus-success-light transition" title="Marcar como pagado">✓</button>
                          )}
                          <button onClick={() => { setEditing(f); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-teus-accent/10 text-teus-text_muted hover:text-teus-accent transition" title="Editar"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteFactura(f)} className="p-1.5 rounded-lg text-teus-text_muted hover:text-teus-danger hover:bg-teus-danger-light transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-teus-text_soft mt-4 px-1">Mostrando {filtered.length} facturas · {month > 0 ? `${MESES_ES[month-1]} ${year}` : `Año ${year}`}</div>

      {showModal && <FacturaModal factura={editing} clientes={clientes} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadData(); }} />}
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon: Icon }: any) {
  const colorMap: Record<string, string> = {
    text_dark: "text-teus-text_dark", success: "text-teus-success", warn: "text-teus-warn", danger: "text-teus-danger"
  };
  const bgMap: Record<string, string> = {
    text_dark: "bg-teus-accent/10", success: "bg-teus-success-light", warn: "bg-teus-warn-light", danger: "bg-teus-danger-light"
  };
  return (
    <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-4 shadow-card">
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">{label}</div>
        <div className={`w-8 h-8 rounded-lg ${bgMap[color]} flex items-center justify-center`}><Icon className={`w-4 h-4 ${colorMap[color]}`} /></div>
      </div>
      <div className={`text-xl font-black tracking-tight ${colorMap[color]}`}>{value}</div>
      <div className="text-[10px] text-teus-text_soft mt-1">{sub}</div>
    </div>
  );
}

function FacturaModal({ factura, clientes, onClose, onSaved }: {
  factura: Factura | null; clientes: Cliente[]; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    nro_factura: factura?.nro_factura || "",
    cliente_id: factura?.cliente_id || "",
    fecha_emision: factura?.fecha_emision || new Date().toISOString().split("T")[0],
    monto: factura?.monto || 0,
    credito_dias: factura?.credito_dias ?? 15,
    fecha_vencimiento: factura?.fecha_vencimiento || "",
    fecha_cobro: factura?.fecha_cobro || "",
    estado: factura?.estado || "pendiente",
    observacion: factura?.observacion || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto calc vencimiento
  function updateEmision(fecha: string) {
    const nueva: any = { ...form, fecha_emision: fecha };
    if (form.credito_dias > 0 && fecha) {
      const f = new Date(fecha);
      f.setDate(f.getDate() + form.credito_dias);
      nueva.fecha_vencimiento = f.toISOString().split("T")[0];
    }
    setForm(nueva);
  }
  function updateCredito(dias: number) {
    const nueva: any = { ...form, credito_dias: dias };
    if (dias > 0 && form.fecha_emision) {
      const f = new Date(form.fecha_emision);
      f.setDate(f.getDate() + dias);
      nueva.fecha_vencimiento = f.toISOString().split("T")[0];
    } else {
      nueva.fecha_vencimiento = "";
    }
    setForm(nueva);
  }
  function onClienteChange(id: string) {
    const c = clientes.find(x => x.id === id);
    const nueva: any = { ...form, cliente_id: id };
    if (c) {
      nueva.credito_dias = c.credito_dias;
      if (form.fecha_emision && c.credito_dias > 0) {
        const f = new Date(form.fecha_emision);
        f.setDate(f.getDate() + c.credito_dias);
        nueva.fecha_vencimiento = f.toISOString().split("T")[0];
      }
    }
    setForm(nueva);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const payload: any = {
      ...form,
      fecha_vencimiento: form.fecha_vencimiento || null,
      fecha_cobro: form.fecha_cobro || null,
      observacion: form.observacion || null,
    };
    try {
      if (factura) {
        const { error } = await supabase.from("facturas").update(payload).eq("id", factura.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("facturas").insert(payload);
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
          <h2 className="text-lg font-bold text-teus-text_dark">{factura ? "Editar Factura" : "Nueva Factura"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-teus-hover_light text-teus-text_muted hover:text-teus-text_dark transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>N° Factura *</label>
              <input type="text" value={form.nro_factura} onChange={(e) => setForm({ ...form, nro_factura: e.target.value })} required placeholder="0000123" className={inputCls + " font-mono"} />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as any })} className={inputCls}>
                {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Cliente *</label>
            <select value={form.cliente_id} onChange={(e) => onClienteChange(e.target.value)} required className={inputCls}>
              <option value="">— Elegir —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Fecha emisión *</label>
              <input type="date" value={form.fecha_emision} onChange={(e) => updateEmision(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Días crédito</label>
              <input type="number" value={form.credito_dias} onChange={(e) => updateCredito(parseInt(e.target.value) || 0)} placeholder="15" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vencimiento</label>
              <input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Monto (Gs.) *</label>
              <input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: parseInt(e.target.value) || 0 })} required className={inputCls} />
              {form.monto > 0 && <div className="text-[10px] text-teus-accent font-bold mt-1">= {fmtGs(form.monto)}</div>}
            </div>
            <div>
              <label className={labelCls}>Fecha de cobro (si pagada)</label>
              <input type="date" value={form.fecha_cobro} onChange={(e) => setForm({ ...form, fecha_cobro: e.target.value })} className={inputCls} />
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
              {factura ? "Guardar cambios" : "Crear factura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
