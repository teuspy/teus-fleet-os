"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, X, Fuel, Search, Loader2, Calendar, TrendingUp } from "lucide-react";

type Vehiculo = { id: string; chapa: string; alias: string | null; tipo: string };
type Proveedor = { id: string; nombre: string; gs_por_litro: number | null; tipo?: string };

type Recarga = {
  id: string;
  fecha: string;
  vehiculo_id: string;
  proveedor_id: string;
  litros: number;
  gs_por_litro: number;
  monto_total: number;
  observacion: string | null;
  vehiculos?: { chapa: string; alias: string | null };
  proveedores?: { nombre: string };
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtFecha(fechaStr: string) {
  if (!fechaStr) return "";
  const [y, m, d] = fechaStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function fmtGs(n: number) {
return "₲ " + Math.round(n || 0).toLocaleString("es-PY");
}

export default function RecargasCombustiblePage() {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Recarga | null>(null);
  const [filterVeh, setFilterVeh] = useState<string>("todos");
  const [filterProv, setFilterProv] = useState<string>("todos");
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    const desde = `${year}-${String(month).padStart(2, "0")}-01`;
    const hastaMes = month === 12 ? 1 : month + 1;
    const hastaAnio = month === 12 ? year + 1 : year;
    const hasta = `${hastaAnio}-${String(hastaMes).padStart(2, "0")}-01`;

    const [rec, vehs, provs] = await Promise.all([
      supabase.from("recargas_combustible")
        .select("*, vehiculos(chapa, alias), proveedores(nombre)")
        .gte("fecha", desde)
        .lt("fecha", hasta)
        .order("fecha", { ascending: false }),
      supabase.from("vehiculos").select("id, chapa, alias, tipo").eq("activo", true).order("chapa"),
      supabase.from("proveedores").select("id, nombre, gs_por_litro, tipo").eq("activo", true).order("nombre"),
    ]);

    if (rec.data) setRecargas(rec.data as Recarga[]);
    if (vehs.data) setVehiculos(vehs.data as Vehiculo[]);
    if (provs.data) setProveedores(provs.data as Proveedor[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [year, month]);

  const filtered = useMemo(() => {
    return recargas.filter((r) => {
      if (filterVeh !== "todos" && r.vehiculo_id !== filterVeh) return false;
      if (filterProv !== "todos" && r.proveedor_id !== filterProv) return false;
      if (search && !`${r.vehiculos?.chapa || ""} ${r.vehiculos?.alias || ""} ${r.proveedores?.nombre || ""} ${r.observacion || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [recargas, filterVeh, filterProv, search]);

  const totales = useMemo(() => {
    const totalLitros = filtered.reduce((s, r) => s + Number(r.litros || 0), 0);
    const totalMonto = filtered.reduce((s, r) => s + Number(r.monto_total || 0), 0);
    const porProveedor: Record<string, { litros: number; monto: number; nombre: string }> = {};
    for (const r of filtered) {
      const key = r.proveedor_id;
      if (!porProveedor[key]) porProveedor[key] = { litros: 0, monto: 0, nombre: r.proveedores?.nombre || "?" };
      porProveedor[key].litros += Number(r.litros || 0);
      porProveedor[key].monto += Number(r.monto_total || 0);
    }
    return { totalLitros, totalMonto, porProveedor };
  }, [filtered]);

  async function eliminar(r: Recarga) {
    if (!confirm(`¿Eliminar recarga del ${fmtFecha(r.fecha)} — ${r.litros} lts?`)) return;
    await supabase.from("recargas_combustible").delete().eq("id", r.id);
    loadData();
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Fuel className="w-8 h-8 text-teus-accent" />
            Recargas de Combustible
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Recargas fuera de viajes (para conciliación con proveedores)
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Recarga
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 shadow-card">
          <div className="text-xs font-semibold uppercase text-teus-text_muted tracking-wider flex items-center gap-2">
            <Fuel className="w-4 h-4" /> Total litros del mes
          </div>
          <div className="text-3xl font-black mt-2 text-teus-text_dark">{totales.totalLitros.toLocaleString("es-PY")} <span className="text-sm text-teus-text_soft">lts</span></div>
        </div>
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 shadow-card">
          <div className="text-xs font-semibold uppercase text-teus-text_muted tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Monto total del mes
          </div>
          <div className="text-3xl font-black mt-2 text-teus-accent">{fmtGs(totales.totalMonto)}</div>
        </div>
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 shadow-card">
          <div className="text-xs font-semibold uppercase text-teus-text_muted tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Cantidad de recargas
          </div>
          <div className="text-3xl font-black mt-2 text-teus-text_dark">{filtered.length}</div>
        </div>
      </div>

      {Object.keys(totales.porProveedor).length > 0 && (
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-6 shadow-card">
          <div className="text-sm font-bold mb-3 text-teus-text_dark">📊 Por proveedor este mes (para conciliar)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(totales.porProveedor).map(([id, p]) => (
              <div key={id} className="bg-teus-bg_soft rounded-lg p-3 border border-teus-border_light">
                <div className="font-bold text-teus-text_dark">{p.nombre}</div>
                <div className="text-xs text-teus-text_muted mt-1">{p.litros.toLocaleString("es-PY")} lts</div>
                <div className="text-sm font-bold text-teus-accent mt-1">{fmtGs(p.monto)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-2 bg-white border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none">
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 bg-white border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none">
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterVeh} onChange={(e) => setFilterVeh(e.target.value)}
          className="px-3 py-2 bg-white border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none">
          <option value="todos">Todos los vehículos</option>
          {vehiculos.map(v => <option key={v.id} value={v.id}>{v.alias || v.chapa} ({v.chapa})</option>)}
        </select>
        <select value={filterProv} onChange={(e) => setFilterProv(e.target.value)}
          className="px-3 py-2 bg-white border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none">
          <option value="todos">Todos los proveedores</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none" />
        </div>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Cargando recargas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-teus-text_muted">
            No hay recargas en este período. Registrá la primera con el botón de arriba.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Vehículo</th>
                <th className="text-left px-4 py-3">Proveedor</th>
                <th className="text-right px-4 py-3">Litros</th>
                <th className="text-right px-4 py-3">Gs/L</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Observación</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-teus-border_light hover:bg-teus-bg_soft/50">
                  <td className="px-4 py-3 font-medium">{fmtFecha(r.fecha)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-teus-text_dark">{r.vehiculos?.alias || r.vehiculos?.chapa}</div>
                    <div className="text-xs text-teus-text_soft font-mono">{r.vehiculos?.chapa}</div>
                  </td>
                  <td className="px-4 py-3">{r.proveedores?.nombre || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.litros).toLocaleString("es-PY")}</td>
                  <td className="px-4 py-3 text-right font-mono text-teus-text_muted">{Number(r.gs_por_litro).toLocaleString("es-PY")}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-teus-accent">{fmtGs(r.monto_total)}</td>
                  <td className="px-4 py-3 text-xs text-teus-text_muted">{r.observacion || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditing(r); setShowModal(true); }}
                        className="p-1.5 hover:bg-teus-accent/10 text-teus-accent rounded transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminar(r)}
                        className="p-1.5 hover:bg-teus-danger/10 text-teus-danger rounded transition">
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

      {showModal && (
        <RecargaModal
          recarga={editing}
          vehiculos={vehiculos}
          proveedores={proveedores}
          onClose={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function RecargaModal({ recarga, vehiculos, proveedores, onClose }: {
  recarga: Recarga | null; vehiculos: Vehiculo[]; proveedores: Proveedor[]; onClose: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    fecha: recarga?.fecha?.split("T")[0] || new Date().toISOString().slice(0, 10),
    vehiculo_id: recarga?.vehiculo_id || "",
    proveedor_id: recarga?.proveedor_id || "",
    litros: recarga?.litros?.toString() || "",
    gs_por_litro: recarga?.gs_por_litro?.toString() || "",
    observacion: recarga?.observacion || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function onProveedorChange(id: string) {
    const p = proveedores.find(x => x.id === id);
    setForm(f => ({ ...f, proveedor_id: id, gs_por_litro: p?.gs_por_litro ? String(p.gs_por_litro) : f.gs_por_litro }));
  }

  const total = (parseFloat(form.litros) || 0) * (parseFloat(form.gs_por_litro) || 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    const payload = {
      fecha: form.fecha,
      vehiculo_id: form.vehiculo_id,
      proveedor_id: form.proveedor_id,
      litros: parseFloat(form.litros),
      gs_por_litro: parseFloat(form.gs_por_litro),
      observacion: form.observacion.trim() || null,
    };
    const { error } = recarga
      ? await supabase.from("recargas_combustible").update(payload).eq("id", recarga.id)
      : await supabase.from("recargas_combustible").insert(payload);
    if (error) { setErr(error.message); setSaving(false); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-teus-border_light sticky top-0 bg-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Fuel className="w-5 h-5 text-teus-accent" />
            {recarga ? "Editar Recarga" : "Nueva Recarga de Combustible"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-teus-text_muted uppercase">Fecha *</label>
              <input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-teus-text_muted uppercase">Vehículo *</label>
              <select required value={form.vehiculo_id} onChange={(e) => setForm({ ...form, vehiculo_id: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none">
                <option value="">— Elegir —</option>
                {vehiculos.map(v => <option key={v.id} value={v.id}>{v.alias || v.chapa} ({v.chapa})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-teus-text_muted uppercase">Proveedor *</label>
            <select required value={form.proveedor_id} onChange={(e) => onProveedorChange(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none">
              <option value="">— Elegir —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.gs_por_litro ? ` (${Number(p.gs_por_litro).toLocaleString("es-PY")} Gs/L)` : ""}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-teus-text_muted uppercase">Litros *</label>
              <input required type="number" step="0.01" min="0.01" value={form.litros} onChange={(e) => setForm({ ...form, litros: e.target.value })}
                placeholder="Ej: 20"
                className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-teus-text_muted uppercase">Gs por litro *</label>
              <input required type="number" step="1" min="1" value={form.gs_por_litro} onChange={(e) => setForm({ ...form, gs_por_litro: e.target.value })}
                placeholder="Ej: 8200"
                className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none" />
            </div>
          </div>

          <div className="bg-teus-accent/10 border border-teus-accent/30 rounded-lg p-3">
            <div className="text-xs uppercase text-teus-text_muted font-bold">Total (calculado)</div>
            <div className="text-2xl font-black text-teus-accent mt-1">₲ {total.toLocaleString("es-PY")}</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-teus-text_muted uppercase">Observación</label>
            <textarea rows={2} value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              placeholder="Ej: Recarga en surtidor de la ruta"
              className="w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none" />
          </div>

          {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{err}</div>}

          <div className="flex justify-end gap-2 pt-4 border-t border-teus-border_light">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-teus-border_light rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teus-accent hover:bg-teus-accent-2 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
              {saving ? "Guardando..." : recarga ? "Actualizar" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
