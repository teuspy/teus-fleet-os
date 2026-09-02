"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wrench, Plus, X, Loader2, CheckCircle2, AlertTriangle, Truck, History, Edit2, Trash2 } from "lucide-react";

type VehKm = {
  id: string;
  chapa: string;
  alias: string | null;
  tipo: string;
  km_baseline: number;
  fecha_corte_km: string | null;
  intervalo_mantenimiento_km: number;
  km_desde_corte: number;
  km_actuales: number;
  km_restantes: number;
  estado_mant: "vencido" | "urgente" | "por_vencer" | "vigente";
};

type Proveedor = { id: string; nombre: string };

type Mantenimiento = {
  id: string;
  vehiculo_id: string;
  fecha_realizado: string;
  km_al_momento: number;
  tipo: string;
  taller: string | null;
  monto: number;
  observaciones: string | null;
  proximo_km: number | null;
  fecha_entrada_taller: string | null;
  fecha_salida_taller: string | null;
  dias_esperando_repuesto: number;
  sistema_afectado: string | null;
  tipo_intervencion: string | null;
  es_repetido: boolean;
  taller_id: string | null;
  motivo_causa: string | null;
  costo_repuestos: number;
  costo_mano_obra: number;
  otros_costos: number;
  vehiculos?: { chapa: string; alias: string | null };
  taller_ref?: { nombre: string } | null;
};

const TIPOS_MANT = [
  "general", "aceite motor", "filtros", "frenos", "cubiertas",
  "correa distribución", "embrague", "suspensión", "batería", "otro"
];

const SISTEMAS_AFECTADOS = [
  { valor: "motor", label: "🔧 Motor" },
  { valor: "caja", label: "⚙️ Caja" },
  { valor: "embrague", label: "🔗 Embrague" },
  { valor: "frenos", label: "🛑 Frenos" },
  { valor: "suspension", label: "🔩 Suspensión" },
  { valor: "electrico", label: "⚡ Eléctrico" },
  { valor: "neumaticos", label: "🛞 Neumáticos" },
  { valor: "semirremolque", label: "🚛 Semirremolque" },
  { valor: "otro", label: "❓ Otro" },
];

function diffDays(desde: string, hasta: string): number {
  const d1 = new Date(desde + "T00:00:00");
  const d2 = new Date(hasta + "T00:00:00");
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function MantenimientosPage() {
  const supabase = createClient();
  const [vehiculos, setVehiculos] = useState<VehKm[]>([]);
  const [historial, setHistorial] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Mantenimiento | null>(null);
  const [preSelectedVeh, setPreSelectedVeh] = useState<VehKm | null>(null);

  async function loadData() {
    setLoading(true);
    const [vehRes, mantRes] = await Promise.all([
      supabase.from("v_vehiculos_km").select("*").order("km_restantes"),
      supabase.from("mantenimientos").select("*, vehiculos(chapa, alias), taller_ref:taller_id(nombre)").order("fecha_realizado", { ascending: false }).limit(50),
    ]);
    if (vehRes.data) setVehiculos(vehRes.data as VehKm[]);
    if (mantRes.data) setHistorial(mantRes.data as Mantenimiento[]);
    setLoading(false);
  }
  useEffect(() => { loadData(); }, []);

  async function registrarMant(veh: VehKm) {
    setPreSelectedVeh(veh);
    setEditing(null);
    setShowModal(true);
  }

  async function eliminarMant(m: Mantenimiento) {
    if (!confirm(`¿Eliminar mantenimiento del ${m.fecha_realizado}?`)) return;
    await supabase.from("mantenimientos").delete().eq("id", m.id);
    loadData();
  }

  const vencidos = vehiculos.filter((v) => v.estado_mant === "vencido");
  const urgentes = vehiculos.filter((v) => v.estado_mant === "urgente");
  const porVencer = vehiculos.filter((v) => v.estado_mant === "por_vencer");
  const vigentes = vehiculos.filter((v) => v.estado_mant === "vigente");

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Wrench className="w-8 h-8 text-teus-accent" />
            Mantenimientos
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Control de km, taller, sistema afectado y días fuera de servicio
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setPreSelectedVeh(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar Mantenimiento
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="Vencidos" count={vencidos.length} color="red" icon={<AlertTriangle className="w-5 h-5" />} />
        <KpiCard label="Urgentes (< 1.000 km)" count={urgentes.length} color="orange" icon={<AlertTriangle className="w-5 h-5" />} />
        <KpiCard label="Por vencer (< 3.000 km)" count={porVencer.length} color="yellow" icon={<AlertTriangle className="w-5 h-5" />} />
        <KpiCard label="Vigentes" count={vigentes.length} color="green" icon={<CheckCircle2 className="w-5 h-5" />} />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Truck className="w-5 h-5 text-teus-accent" />
          Estado de la flota
        </h2>
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Cargando flota...
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {vehiculos.map((v) => <VehiculoCard key={v.id} veh={v} onRegistrar={() => registrarMant(v)} />)}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <History className="w-5 h-5 text-teus-accent" />
          Historial reciente ({historial.length})
        </h2>
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
          {historial.length === 0 ? (
            <div className="p-12 text-center text-teus-text_muted">
              Todavía no hay mantenimientos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-teus-bg_soft text-xs uppercase text-teus-text_muted">
                  <tr>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Vehículo</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Sistema</th>
                    <th className="text-left px-4 py-3">Intervención</th>
                    <th className="text-right px-4 py-3">Km</th>
                    <th className="text-left px-4 py-3">Taller</th>
                    <th className="text-right px-4 py-3">Días fuera</th>
                    <th className="text-right px-4 py-3">Costo total</th>
                    <th className="text-right px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((m) => {
                    const diasFuera = m.fecha_entrada_taller && m.fecha_salida_taller
                      ? diffDays(m.fecha_entrada_taller, m.fecha_salida_taller)
                      : null;
                    const totalDesglosado = (m.costo_repuestos || 0) + (m.costo_mano_obra || 0) + (m.otros_costos || 0);
                    const costoMostrar = totalDesglosado > 0 ? totalDesglosado : m.monto;
                    const sistemaLbl = SISTEMAS_AFECTADOS.find(s => s.valor === m.sistema_afectado)?.label || "—";
                    return (
                      <tr key={m.id} className={`border-t border-teus-border_light hover:bg-teus-bg_soft/50 ${m.es_repetido ? "bg-orange-50/40" : ""}`}>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{new Date(m.fecha_realizado).toLocaleDateString("es-PY")}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-teus-text_dark">{m.vehiculos?.alias || m.vehiculos?.chapa}</div>
                          <div className="text-xs text-teus-text_soft">{m.vehiculos?.chapa}</div>
                        </td>
                        <td className="px-4 py-3 capitalize">{m.tipo}</td>
                        <td className="px-4 py-3 text-xs">{sistemaLbl}{m.es_repetido && <span className="ml-1 text-orange-600 font-bold" title="Reparación repetida">🔁</span>}</td>
                        <td className="px-4 py-3 text-xs capitalize">{m.tipo_intervencion || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono">{m.km_al_momento.toLocaleString()}</td>
                        <td className="px-4 py-3 text-teus-text_muted text-xs">{m.taller_ref?.nombre || m.taller || "-"}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {diasFuera !== null ? <span className={diasFuera > 5 ? "text-red-600 font-bold" : diasFuera > 2 ? "text-orange-600" : ""}>{diasFuera}d</span> : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {costoMostrar > 0 ? `₲ ${costoMostrar.toLocaleString()}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditing(m); setPreSelectedVeh(null); setShowModal(true); }} className="p-1.5 hover:bg-teus-accent/10 text-teus-accent rounded transition">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => eliminarMant(m)} className="p-1.5 hover:bg-teus-danger/10 text-teus-danger rounded transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      </div>

      {showModal && (
        <MantModal
          mant={editing}
          preSelectedVeh={preSelectedVeh}
          onClose={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function KpiCard({ label, count, color, icon }: { label: string; count: number; color: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    red: "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    green: "bg-green-50 border-green-200 text-green-700",
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-4xl font-black mt-2">{count}</div>
    </div>
  );
}

function VehiculoCard({ veh, onRegistrar }: { veh: VehKm; onRegistrar: () => void }) {
  const pct = Math.min((veh.km_actuales / veh.intervalo_mantenimiento_km) * 100, 100);
  const colorMap: Record<string, string> = {
    vencido: "bg-red-500 text-white",
    urgente: "bg-orange-500 text-white",
    por_vencer: "bg-yellow-400 text-yellow-950",
    vigente: "bg-teus-accent text-white",
  };
  const barColorMap: Record<string, string> = {
    vencido: "bg-red-500",
    urgente: "bg-orange-500",
    por_vencer: "bg-yellow-400",
    vigente: "bg-teus-accent",
  };
  const labelMap: Record<string, string> = {
    vencido: "🔴 VENCIDO",
    urgente: "🟠 URGENTE",
    por_vencer: "🟡 POR VENCER",
    vigente: "🟢 VIGENTE",
  };
  return (
    <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-5 shadow-card hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-2xl font-black text-teus-text_dark">{veh.alias || veh.chapa}</div>
          <div className="text-xs text-teus-text_soft font-mono">{veh.chapa}</div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-black ${colorMap[veh.estado_mant]}`}>
          {labelMap[veh.estado_mant]}
        </span>
      </div>
      <div className="my-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-teus-text_muted">Km actuales</span>
          <span className="font-mono font-bold text-teus-text_dark">
            {veh.km_actuales.toLocaleString()} / {veh.intervalo_mantenimiento_km.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${barColorMap[veh.estado_mant]} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div>
          <div className="text-teus-text_soft">Baseline</div>
          <div className="font-mono font-semibold">{veh.km_baseline.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-teus-text_soft">Desde corte</div>
          <div className="font-mono font-semibold">+{veh.km_desde_corte.toLocaleString()}</div>
        </div>
        <div className="col-span-2">
          <div className="text-teus-text_soft">Km restantes</div>
          <div className={`font-mono font-black text-lg ${veh.estado_mant === "vencido" ? "text-red-600" : veh.estado_mant === "urgente" ? "text-orange-600" : veh.estado_mant === "por_vencer" ? "text-yellow-700" : "text-teus-accent"}`}>
            {veh.km_restantes.toLocaleString()} km
          </div>
        </div>
      </div>
      <button
        onClick={onRegistrar}
        className="w-full py-2 bg-teus-text_dark hover:bg-black text-white text-sm font-bold rounded-lg transition"
      >
        Registrar mantenimiento
      </button>
    </div>
  );
}

function MantModal({ mant, preSelectedVeh, onClose }: { mant: Mantenimiento | null; preSelectedVeh: VehKm | null; onClose: () => void }) {
  const supabase = createClient();
  const [vehiculos, setVehiculos] = useState<VehKm[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [form, setForm] = useState({
    vehiculo_id: mant?.vehiculo_id || preSelectedVeh?.id || "",
    fecha_realizado: mant?.fecha_realizado || new Date().toISOString().slice(0, 10),
    km_al_momento: mant?.km_al_momento?.toString() || preSelectedVeh?.km_actuales?.toString() || "",
    tipo: mant?.tipo || "general",
    // Nuevos:
    sistema_afectado: mant?.sistema_afectado || "",
    tipo_intervencion: mant?.tipo_intervencion || "",
    es_repetido: mant?.es_repetido || false,
    motivo_causa: mant?.motivo_causa || "",
    taller_id: mant?.taller_id || "",
    taller: mant?.taller || "",
    fecha_entrada_taller: mant?.fecha_entrada_taller || "",
    fecha_salida_taller: mant?.fecha_salida_taller || "",
    dias_esperando_repuesto: mant?.dias_esperando_repuesto?.toString() || "0",
    costo_repuestos: mant?.costo_repuestos?.toString() || "0",
    costo_mano_obra: mant?.costo_mano_obra?.toString() || "0",
    otros_costos: mant?.otros_costos?.toString() || "0",
    monto: mant?.monto?.toString() || "",
    observaciones: mant?.observaciones || "",
    resetear_baseline: !mant,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("v_vehiculos_km").select("*").order("chapa"),
      supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    ]).then(([v, p]) => {
      if (v.data) setVehiculos(v.data as VehKm[]);
      if (p.data) setProveedores(p.data as Proveedor[]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cálculos derivados
  const totalDesglosado = useMemo(() =>
    (parseInt(form.costo_repuestos) || 0) +
    (parseInt(form.costo_mano_obra) || 0) +
    (parseInt(form.otros_costos) || 0),
    [form.costo_repuestos, form.costo_mano_obra, form.otros_costos]
  );

  const diasFueraServicio = useMemo(() => {
    if (!form.fecha_entrada_taller || !form.fecha_salida_taller) return null;
    return diffDays(form.fecha_entrada_taller, form.fecha_salida_taller);
  }, [form.fecha_entrada_taller, form.fecha_salida_taller]);

  const diasEsperandoRep = parseInt(form.dias_esperando_repuesto) || 0;

  // Validaciones frontend
  const validaciones = useMemo(() => {
    const errores: string[] = [];
    if (form.fecha_entrada_taller && form.fecha_salida_taller && form.fecha_salida_taller < form.fecha_entrada_taller) {
      errores.push("La fecha de salida no puede ser anterior a la fecha de entrada");
    }
    if (diasFueraServicio !== null && diasEsperandoRep > diasFueraServicio) {
      errores.push(`Días esperando repuesto (${diasEsperandoRep}) no puede superar días totales en taller (${diasFueraServicio})`);
    }
    return errores;
  }, [form.fecha_entrada_taller, form.fecha_salida_taller, diasFueraServicio, diasEsperandoRep]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (validaciones.length > 0) {
      setErr(validaciones[0]);
      return;
    }
    setSaving(true);
    setErr(null);

    const km = parseInt(form.km_al_momento);
    // Si desglosó costos, monto = suma. Si no, respeta el valor manual
    const montoFinal = totalDesglosado > 0 ? totalDesglosado : (parseInt(form.monto) || 0);

    const payload: any = {
      vehiculo_id: form.vehiculo_id,
      fecha_realizado: form.fecha_realizado,
      km_al_momento: km,
      tipo: form.tipo,
      taller: form.taller.trim() || null,
      taller_id: form.taller_id || null,
      monto: montoFinal,
      observaciones: form.observaciones.trim() || null,
      proximo_km: km + 20000,
      sistema_afectado: form.sistema_afectado || null,
      tipo_intervencion: form.tipo_intervencion || null,
      es_repetido: form.es_repetido,
      motivo_causa: form.motivo_causa.trim() || null,
      fecha_entrada_taller: form.fecha_entrada_taller || null,
      fecha_salida_taller: form.fecha_salida_taller || null,
      dias_esperando_repuesto: diasEsperandoRep,
      costo_repuestos: parseInt(form.costo_repuestos) || 0,
      costo_mano_obra: parseInt(form.costo_mano_obra) || 0,
      otros_costos: parseInt(form.otros_costos) || 0,
    };

    const { error: mantErr } = mant
      ? await supabase.from("mantenimientos").update(payload).eq("id", mant.id)
      : await supabase.from("mantenimientos").insert(payload);

    if (mantErr) { setErr(mantErr.message); setSaving(false); return; }

    if (!mant && form.resetear_baseline) {
      const nowIso = new Date().toISOString();
      const { error: vehErr } = await supabase
        .from("vehiculos")
        .update({ km_baseline: 0, fecha_corte_km: nowIso })
        .eq("id", form.vehiculo_id);
      if (vehErr) { setErr("Mantenimiento guardado pero no se pudo resetear el contador: " + vehErr.message); setSaving(false); return; }
    }
    onClose();
  }

  const vehSel = vehiculos.find(v => v.id === form.vehiculo_id);
  const inputCls = "w-full mt-1 px-3 py-2 border border-teus-border_light rounded-lg text-sm focus:border-teus-accent outline-none";
  const labelCls = "text-xs font-semibold text-teus-text_muted uppercase";
  const sectionCls = "bg-teus-bg_soft/50 border border-teus-border_light rounded-lg p-4";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-teus-border_light sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teus-accent" />
            {mant ? "Editar Mantenimiento" : "Registrar Mantenimiento"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={save} className="p-6 space-y-4">
          {/* Sección 1: Datos generales */}
          <div className={sectionCls}>
            <div className="text-xs font-black text-teus-text_dark mb-3">📋 DATOS GENERALES</div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Vehículo *</label>
                <select required value={form.vehiculo_id} onChange={(e) => {
                  const v = vehiculos.find(x => x.id === e.target.value);
                  setForm({ ...form, vehiculo_id: e.target.value, km_al_momento: v?.km_actuales.toString() || "" });
                }} className={inputCls}>
                  <option value="">Seleccionar vehículo...</option>
                  {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.alias || v.chapa} ({v.chapa}) — {v.km_actuales.toLocaleString()} km</option>)}
                </select>
              </div>
              {vehSel && (
                <div className="bg-white rounded-lg p-3 text-xs border border-teus-border_light">
                  <div>Km actuales: <strong className="font-mono">{vehSel.km_actuales.toLocaleString()}</strong> · Desde último corte: <strong className="font-mono">+{vehSel.km_desde_corte.toLocaleString()}</strong></div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Fecha realizado *</label>
                  <input required type="date" value={form.fecha_realizado} onChange={(e) => setForm({ ...form, fecha_realizado: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Km al momento *</label>
                  <input required type="number" min="0" value={form.km_al_momento} onChange={(e) => setForm({ ...form, km_al_momento: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Categoría</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
                    {TIPOS_MANT.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Reparación */}
          <div className={sectionCls}>
            <div className="text-xs font-black text-teus-text_dark mb-3">🔧 REPARACIÓN</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Sistema afectado</label>
                <select value={form.sistema_afectado} onChange={(e) => setForm({ ...form, sistema_afectado: e.target.value })} className={inputCls}>
                  <option value="">— No especificado —</option>
                  {SISTEMAS_AFECTADOS.map((s) => <option key={s.valor} value={s.valor}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tipo intervención</label>
                <select value={form.tipo_intervencion} onChange={(e) => setForm({ ...form, tipo_intervencion: e.target.value })} className={inputCls}>
                  <option value="">— No especificado —</option>
                  <option value="preventivo">🛡️ Preventivo</option>
                  <option value="correctivo">🔧 Correctivo</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Motivo / Causa</label>
                <input type="text" value={form.motivo_causa} onChange={(e) => setForm({ ...form, motivo_causa: e.target.value })}
                  placeholder="Ej: junta motor rota, calentamiento excesivo, etc." className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <input type="checkbox" checked={form.es_repetido} onChange={(e) => setForm({ ...form, es_repetido: e.target.checked })} className="accent-orange-600" />
                  <span className="text-sm text-orange-900 font-semibold">🔁 Reparación repetida (misma falla ya apareció antes)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Sección 3: Taller y tiempos */}
          <div className={sectionCls}>
            <div className="text-xs font-black text-teus-text_dark mb-3">🏭 TALLER Y TIEMPOS</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Taller (proveedor)</label>
                <select value={form.taller_id} onChange={(e) => {
                  const p = proveedores.find(x => x.id === e.target.value);
                  setForm({ ...form, taller_id: e.target.value, taller: p?.nombre || form.taller });
                }} className={inputCls}>
                  <option value="">— Elegir taller/proveedor —</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Taller (texto libre, si no está en la lista)</label>
                <input type="text" value={form.taller} onChange={(e) => setForm({ ...form, taller: e.target.value })}
                  placeholder="Nombre del taller (fallback)" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha entrada taller</label>
                <input type="date" value={form.fecha_entrada_taller} onChange={(e) => setForm({ ...form, fecha_entrada_taller: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha salida taller</label>
                <input type="date" value={form.fecha_salida_taller} onChange={(e) => setForm({ ...form, fecha_salida_taller: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Días esperando repuesto</label>
                <input type="number" min="0" value={form.dias_esperando_repuesto} onChange={(e) => setForm({ ...form, dias_esperando_repuesto: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Días fuera de servicio (auto)</label>
                <div className={`${inputCls} bg-gray-50 font-bold ${diasFueraServicio !== null && diasFueraServicio > 5 ? "text-red-600" : diasFueraServicio !== null && diasFueraServicio > 2 ? "text-orange-600" : "text-teus-text_dark"}`}>
                  {diasFueraServicio !== null ? `${diasFueraServicio} días` : "— (cargar fechas)"}
                </div>
              </div>
            </div>
          </div>

          {/* Sección 4: Costos */}
          <div className={sectionCls}>
            <div className="text-xs font-black text-teus-text_dark mb-3">💰 COSTOS DESGLOSADOS</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Repuestos ₲</label>
                <input type="number" min="0" value={form.costo_repuestos} onChange={(e) => setForm({ ...form, costo_repuestos: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mano de obra ₲</label>
                <input type="number" min="0" value={form.costo_mano_obra} onChange={(e) => setForm({ ...form, costo_mano_obra: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Otros costos ₲</label>
                <input type="number" min="0" value={form.otros_costos} onChange={(e) => setForm({ ...form, otros_costos: e.target.value })} className={inputCls}
                  placeholder="grúa, traslado..." />
              </div>
              <div className="col-span-3 bg-white rounded-lg p-3 border-2 border-teus-accent">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-teus-text_dark">💵 Total (repuestos + mano obra + otros):</span>
                  <span className="text-xl font-black text-teus-accent">₲ {totalDesglosado.toLocaleString("es-PY")}</span>
                </div>
                {totalDesglosado === 0 && (
                  <div className="mt-2 pt-2 border-t border-teus-border_light">
                    <label className={labelCls}>O monto único (legacy, si no desglosás)</label>
                    <input type="number" min="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })}
                      placeholder="0" className={inputCls} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className={inputCls} />
          </div>

          {!mant && (
            <div className="bg-teus-accent/10 border border-teus-accent/30 rounded-lg p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.resetear_baseline} onChange={(e) => setForm({ ...form, resetear_baseline: e.target.checked })} className="mt-0.5" />
                <div className="text-sm">
                  <div className="font-bold text-teus-text_dark">Resetear contador de km del vehículo</div>
                  <div className="text-xs text-teus-text_muted mt-0.5">
                    Marcá esto si el mantenimiento se hizo AHORA. Reinicia el conteo a 0 para volver a alertar en 20.000 km.
                  </div>
                </div>
              </label>
            </div>
          )}

          {validaciones.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              <strong>⚠️ Validación:</strong>
              <ul className="list-disc ml-5 mt-1">
                {validaciones.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </div>
          )}

          {err && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{err}</div>}

          <div className="flex justify-end gap-2 pt-4 border-t border-teus-border_light">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-teus-border_light rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving || validaciones.length > 0} className="px-4 py-2 bg-teus-accent hover:bg-teus-accent-2 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
              {saving ? "Guardando..." : mant ? "Actualizar" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
