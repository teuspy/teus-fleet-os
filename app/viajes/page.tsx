"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Edit2, Trash2, X, ClipboardList, Search, Loader2,
  Calendar, TrendingUp, DollarSign, Truck, MapPin,
} from "lucide-react";
type Vehiculo = { id: string; nombre_equipo: string; tipo: string; chapa: string };
type Chofer = { id: string; nombre_completo: string; vehiculo_asignado_id?: string | null };
type Cliente = { id: string; nombre: string; credito_dias: number };
type Ruta = { id: string; origen: string; destino: string; km_ida: number; km_vuelta: number; km_total: number };
type Proveedor = { id: string; nombre: string; gs_por_litro: number | null };
type Viaje = {
  id: string;
  fecha: string;
  vehiculo_id: string | null;
  chofer_id: string | null;
  cliente_id: string | null;
  ruta_id: string | null;
  nro_contenedor: string | null;
  origen: string;
  destino: string;
  km_viaje: number | null;
  proveedor_combustible_id: string | null;
  litros: number;
  gs_por_litro: number;
  costo_combustible: number;
  viatico: number;
  precio_flete: number;
  otros_costos: number;
  utilidad_bruta: number;
  estado: "pendiente" | "facturado" | "cobrado" | "cancelado";
  observacion: string | null;
  vehiculo_externo_id: string | null;
  chofer_externo_nombre: string | null;
  precio_pagado_al_externo: number;
  comision_recibida: number;
  insumos_estacion_monto: number;
  insumos_estacion_detalle: string | null;
  ingresos_extras_monto: number;
  ingresos_extras_detalle: string | null;
  vehiculo?: Vehiculo | null;
  chofer?: Chofer | null;
  cliente?: Cliente | null;
};
const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function fmtGs(n: number) {
 return "Gs. " + Math.round(n || 0).toLocaleString("es-PY");
}
function fmtGsShort(n: number) {
 return "Gs. " + Math.round(n || 0).toLocaleString("es-PY");
}
const ESTADOS: Record<string, { label: string; classes: string }> = {
  pendiente: { label: "Pendiente", classes: "bg-teus-warn-light text-teus-warn" },
  facturado: { label: "Facturado", classes: "bg-blue-50 text-blue-700" },
  cobrado: { label: "Cobrado", classes: "bg-teus-success-light text-teus-success" },
  cancelado: { label: "Cancelado", classes: "bg-teus-danger-light text-teus-danger" },
};
export default function ViajesPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Viaje | null>(null);
  const [search, setSearch] = useState("");
  const [filterEquipo, setFilterEquipo] = useState<string>("");
  const [filterEstado, setFilterEstado] = useState<string>("");
  async function loadData() {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];
    const [
      { data: viajesData },
      { data: vehData },
      { data: chofData },
      { data: cliData },
      { data: rutData },
      { data: provData },
    ] = await Promise.all([
      supabase
        .from("viajes")
        .select("*, vehiculo:vehiculo_id(id, nombre_equipo, tipo, chapa), chofer:chofer_id(id, nombre_completo), cliente:cliente_id(id, nombre, credito_dias)")
        .gte("fecha", startDate)
        .lte("fecha", endDate)
        .order("fecha", { ascending: false }),
      supabase.from("vehiculos").select("id, nombre_equipo, tipo, chapa").eq("activo", true).eq("tipo", "tracto").order("nombre_equipo"),
      supabase.from("choferes").select("id, nombre_completo, vehiculo_asignado_id").eq("activo", true).order("nombre_completo"),
      supabase.from("clientes").select("id, nombre, credito_dias").eq("activo", true).order("nombre"),
      supabase.from("rutas").select("*").eq("activa", true).order("origen"),
      supabase.from("proveedores").select("id, nombre, gs_por_litro").eq("tipo", "combustible").eq("activo", true).order("nombre"),
    ]);
    if (viajesData) setViajes(viajesData as Viaje[]);
    if (vehData) setVehiculos(vehData as Vehiculo[]);
    if (chofData) setChoferes(chofData as Chofer[]);
    if (cliData) setClientes(cliData as Cliente[]);
    if (rutData) setRutas(rutData as Ruta[]);
    if (provData) setProveedores(provData as Proveedor[]);
    setLoading(false);
  }
  useEffect(() => { loadData(); }, [year, month]);
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setShowModal(true);
      router.replace("/viajes");
    }
  }, [searchParams, router]);
  const filtered = useMemo(() => viajes.filter(v => {
    if (filterEquipo && v.vehiculo_id !== filterEquipo) return false;
    if (filterEstado && v.estado !== filterEstado) return false;
    if (search) {
      const q = search.toLowerCase();
      const searchStr = `${v.vehiculo?.nombre_equipo || ""} ${v.chofer?.nombre_completo || ""} ${v.cliente?.nombre || ""} ${v.nro_contenedor || ""} ${v.origen} ${v.destino}`.toLowerCase();
      if (!searchStr.includes(q)) return false;
    }
    return true;
  }), [viajes, filterEquipo, filterEstado, search]);
  const totales = useMemo(() => {
    const totalViajes = filtered.length;
    const facturacion = filtered.reduce((s, v) => s + (v.precio_flete || 0) + (v.ingresos_extras_monto || 0), 0);
    const utilidadBruta = filtered.reduce((s, v) => s + (v.utilidad_bruta || 0), 0);
    const kmTotal = filtered.reduce((s, v) => s + (v.km_viaje || 0), 0);
    return { totalViajes, facturacion, utilidadBruta, kmTotal };
  }, [filtered]);
  async function deleteViaje(v: Viaje) {
    if (!confirm(`¿Eliminar el viaje del ${v.fecha}?\n(${v.origen} → ${v.destino}, ${v.vehiculo?.nombre_equipo})\n\nEsta acción no se puede deshacer.`)) return;
    await supabase.from("viajes").delete().eq("id", v.id);
    loadData();
  }
  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-teus-accent" />
            Producción / Viajes
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Registro de fletes y utilidad por viaje
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Viaje
        </button>
      </div>
      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3 shadow-card">
        <div className="flex items-center gap-2 text-teus-text_muted text-sm font-bold">
          <Calendar className="w-4 h-4" />
          Período:
        </div>
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20 font-semibold">
          {MESES_ES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(+e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20 font-semibold">
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teus-text_soft" />
            <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 bg-white border border-teus-border_light rounded-lg px-9 py-2 text-sm text-teus-text_dark placeholder-teus-text_soft focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20" />
          </div>
          <select value={filterEquipo} onChange={(e) => setFilterEquipo(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            <option value="">Todos los equipos</option>
            {vehiculos.map(v => <option key={v.id} value={v.id}>{v.nombre_equipo}</option>)}
          </select>
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="bg-white border border-teus-border_light rounded-lg px-3 py-2 text-sm text-teus-text_dark focus:outline-none focus:border-teus-accent focus:ring-2 focus:ring-teus-accent/20">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="facturado">Facturado</option>
            <option value="cobrado">Cobrado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KpiCard label="Viajes" value={totales.totalViajes.toString()} icon={ClipboardList} sub={`${MESES_ES[month-1]} ${year}`} />
        <KpiCard label="Facturación" value={fmtGsShort(totales.facturacion)} icon={DollarSign} sub={fmtGs(totales.facturacion)} />
        <KpiCard label="Utilidad Bruta" value={fmtGsShort(totales.utilidadBruta)} icon={TrendingUp} sub={`${totales.facturacion ? ((totales.utilidadBruta/totales.facturacion)*100).toFixed(1) : 0}% margen`} />
        <KpiCard label="Km recorridos" value={totales.kmTotal.toLocaleString("es-PY")} icon={MapPin} sub="Total del mes" />
      </div>
      <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-12 text-center text-teus-text_muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teus-accent" />
            Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Truck className="w-12 h-12 text-teus-text_soft mx-auto mb-3" />
            <div className="text-teus-text_muted text-sm mb-4">
              {viajes.length === 0
                ? `Aún no hay viajes cargados para ${MESES_ES[month-1]} ${year}`
                : "No hay viajes que coincidan con los filtros"}
            </div>
            {viajes.length === 0 && (
              <button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-4 py-2 rounded-lg shadow-accent-glow text-sm inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Cargar primer viaje
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teus-hover_light">
                <tr className="text-left text-[10px] uppercase tracking-wider text-teus-text_muted border-b border-teus-border_light">
                  <th className="px-3 py-3 font-bold">Fecha</th>
                  <th className="px-3 py-3 font-bold">Equipo</th>
                  <th className="px-3 py-3 font-bold">Chofer</th>
                  <th className="px-3 py-3 font-bold">Cliente</th>
                  <th className="px-3 py-3 font-bold">Ruta</th>
                  <th className="px-3 py-3 font-bold">Contenedor</th>
                  <th className="px-3 py-3 font-bold text-right">Flete</th>
                  <th className="px-3 py-3 font-bold text-right">Utilidad</th>
                  <th className="px-3 py-3 font-bold">Estado</th>
                  <th className="px-3 py-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-teus-border_light/60 hover:bg-teus-hover_light transition">
                    <td className="px-3 py-3 text-teus-text_dark font-semibold text-xs whitespace-nowrap">
                      {(() => { const [y,m,d] = v.fecha.split("T")[0].split("-"); return `${d}/${m}`; })()}
                    </td>
                    <td className="px-3 py-3 font-bold text-teus-text_dark">{v.vehiculo?.nombre_equipo || "—"}</td>
                    <td className="px-3 py-3 text-xs text-teus-text_muted">{v.chofer?.nombre_completo || "—"}</td>
                    <td className="px-3 py-3 text-xs text-teus-text_dark font-semibold">{v.cliente?.nombre || "—"}</td>
                    <td className="px-3 py-3 text-xs text-teus-text_muted">
                      <span className="font-semibold text-teus-text_dark">{v.origen}</span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold text-teus-text_dark">{v.destino}</span>
                      {v.km_viaje ? <span className="ml-2 text-teus-accent font-bold">{v.km_viaje}km</span> : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-[10px] text-teus-text_muted">{v.nro_contenedor || "—"}</td>
                    <td className="px-3 py-3 text-right font-semibold text-teus-text_dark whitespace-nowrap">
                      {fmtGsShort(v.precio_flete)}
                      {(v.ingresos_extras_monto || 0) > 0 && (
                        <div className="text-[9px] text-blue-600 font-bold">+{fmtGsShort(v.ingresos_extras_monto)} extra</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-teus-accent whitespace-nowrap">{fmtGsShort(v.utilidad_bruta)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${ESTADOS[v.estado]?.classes || ""}`}>
                        {ESTADOS[v.estado]?.label || v.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setEditing(v); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-teus-accent/10 text-teus-text_muted hover:text-teus-accent transition" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteViaje(v)} className="p-1.5 rounded-lg text-teus-text_muted hover:text-teus-danger hover:bg-teus-danger-light transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="text-xs text-teus-text_soft mt-4 px-1">
        Mostrando {filtered.length} viaje{filtered.length !== 1 ? "s" : ""} · {MESES_ES[month-1]} {year}
      </div>
      {showModal && (
        <ViajeModal
          viaje={editing}
          vehiculos={vehiculos}
          choferes={choferes}
          clientes={clientes}
          rutas={rutas}
          proveedores={proveedores}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
function KpiCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: any; sub: string }) {
  return (
    <div className="bg-teus-card_light border border-teus-border_light rounded-2xl p-4 shadow-card hover:-translate-y-0.5 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] text-teus-text_muted uppercase tracking-[1.5px] font-bold">{label}</div>
        <div className="w-8 h-8 rounded-lg bg-teus-accent/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-teus-accent" />
        </div>
      </div>
      <div className="text-2xl font-black tracking-tight text-teus-text_dark">{value}</div>
      <div className="text-[10px] text-teus-text_soft mt-1">{sub}</div>
    </div>
  );
}
function ViajeModal({
  viaje, vehiculos, choferes, clientes, rutas, proveedores, onClose, onSaved,
}: {
  viaje: Viaje | null;
  vehiculos: Vehiculo[];
  choferes: Chofer[];
  clientes: Cliente[];
  rutas: Ruta[];
  proveedores: Proveedor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    fecha: viaje?.fecha || new Date().toISOString().split("T")[0],
    vehiculo_id: viaje?.vehiculo_id || "",
    chofer_id: viaje?.chofer_id || "",
    cliente_id: viaje?.cliente_id || "",
    ruta_id: viaje?.ruta_id || "",
    nro_contenedor: viaje?.nro_contenedor || "",
    origen: viaje?.origen || "",
    destino: viaje?.destino || "",
    km_viaje: viaje?.km_viaje || 0,
    proveedor_combustible_id: viaje?.proveedor_combustible_id || "",
    litros: viaje?.litros || 0,
    gs_por_litro: viaje?.gs_por_litro || 0,
    viatico: viaje?.viatico || 0,
    precio_flete: viaje?.precio_flete || 0,
    otros_costos: viaje?.otros_costos || 0,
    estado: viaje?.estado || "pendiente",
    observacion: viaje?.observacion || "",
    vehiculo_externo_id: viaje?.vehiculo_externo_id || "",
    chofer_externo_nombre: viaje?.chofer_externo_nombre || "",
    precio_pagado_al_externo: viaje?.precio_pagado_al_externo || 0,
    comision_recibida: viaje?.comision_recibida || 0,
    insumos_estacion_monto: viaje?.insumos_estacion_monto || 0,
    insumos_estacion_detalle: viaje?.insumos_estacion_detalle || "",
    ingresos_extras_monto: viaje?.ingresos_extras_monto || 0,
    ingresos_extras_detalle: viaje?.ingresos_extras_detalle || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rutaSearch, setRutaSearch] = useState("");
  const [idaYVuelta, setIdaYVuelta] = useState(true);
  function onRutaChange(rutaId: string) {
    const r = rutas.find(x => x.id === rutaId);
    if (r) {
      setForm(f => ({ ...f, ruta_id: rutaId, origen: r.origen, destino: r.destino, km_viaje: r.km_total }));
    } else {
      setForm(f => ({ ...f, ruta_id: rutaId }));
    }
  }
  function onVehiculoChange(vehId: string) {
    const chof = choferes.find(c => c.vehiculo_asignado_id === vehId);
    setForm(f => ({ ...f, vehiculo_id: vehId, chofer_id: chof?.id || f.chofer_id }));
  }
  function onProveedorChange(provId: string) {
    const p = proveedores.find(x => x.id === provId);
    setForm(f => ({ ...f, proveedor_combustible_id: provId, gs_por_litro: p?.gs_por_litro || f.gs_por_litro }));
  }
  const costoCombustible = form.litros * form.gs_por_litro;
  const utilidadBruta = form.vehiculo_externo_id === "TL"
    ? (form.precio_flete || 0) - (form.precio_pagado_al_externo || 0) + (form.comision_recibida || 0) - (form.insumos_estacion_monto || 0) + (form.ingresos_extras_monto || 0)
    : form.vehiculo_externo_id
      ? (form.precio_flete || 0) - (form.precio_pagado_al_externo || 0) - (form.insumos_estacion_monto || 0) + (form.ingresos_extras_monto || 0)
      : (form.precio_flete || 0) - costoCombustible - (form.viatico || 0) - (form.otros_costos || 0) - (form.insumos_estacion_monto || 0) + (form.ingresos_extras_monto || 0);
  const ingresosTotales = (form.precio_flete || 0) + (form.ingresos_extras_monto || 0);
  const margenPct = ingresosTotales > 0 ? (utilidadBruta / ingresosTotales) * 100 : 0;
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: any = {
      fecha: form.fecha,
      vehiculo_id: form.vehiculo_id || null,
      chofer_id: form.chofer_id || null,
      cliente_id: form.cliente_id || null,
      ruta_id: form.ruta_id || null,
      nro_contenedor: form.nro_contenedor || null,
      origen: form.origen,
      destino: form.destino,
      km_viaje: form.km_viaje || null,
      proveedor_combustible_id: form.proveedor_combustible_id || null,
      litros: form.litros || 0,
      gs_por_litro: form.gs_por_litro || 0,
      viatico: form.viatico || 0,
      precio_flete: form.precio_flete || 0,
     otros_costos: form.vehiculo_externo_id === "TL"
        ? (form.precio_pagado_al_externo || 0) - (form.comision_recibida || 0)
        : form.vehiculo_externo_id
          ? (form.precio_pagado_al_externo || 0)
          : (form.otros_costos || 0),
      estado: form.estado,
      observacion: form.observacion || null,
      vehiculo_externo_id: form.vehiculo_externo_id && form.vehiculo_externo_id !== "PENDIENTE" ? form.vehiculo_externo_id : null,
      chofer_externo_nombre: form.chofer_externo_nombre || null,
      precio_pagado_al_externo: form.precio_pagado_al_externo || 0,
      comision_recibida: form.comision_recibida || 0,
      insumos_estacion_monto: form.insumos_estacion_monto || 0,
      insumos_estacion_detalle: form.insumos_estacion_detalle || null,
      ingresos_extras_monto: form.ingresos_extras_monto || 0,
      ingresos_extras_detalle: form.ingresos_extras_detalle || null,
    };
    try {
      if (viaje) {
        const { error } = await supabase.from("viajes").update(payload).eq("id", viaje.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("viajes").insert(payload);
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
    <div className="fixed inset-0 bg-teus-text_dark/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white border border-teus-border_light rounded-2xl w-full max-w-3xl shadow-2xl animate-slide-up max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-teus-border_light sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-teus-text_dark">
              {viaje ? "Editar Viaje" : "Nuevo Viaje"}
            </h2>
            <p className="text-xs text-teus-text_muted mt-0.5">
              Los cálculos de utilidad se hacen automáticamente
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-teus-hover_light text-teus-text_muted hover:text-teus-text_dark transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as any })} className={inputCls}>
                <option value="pendiente">Pendiente</option>
                <option value="facturado">Facturado</option>
                <option value="cobrado">Cobrado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>N° Contenedor</label>
              <input type="text" value={form.nro_contenedor} onChange={(e) => setForm({ ...form, nro_contenedor: e.target.value.toUpperCase() })} placeholder="TCNU7842372" className={inputCls + " font-mono tracking-wider"} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Equipo (tracto) *</label>
              <select value={form.vehiculo_id} onChange={(e) => onVehiculoChange(e.target.value)} required={!form.vehiculo_externo_id} className={inputCls}>
                <option value="">— Elegir —</option>
                {vehiculos.map(v => <option key={v.id} value={v.id}>{v.nombre_equipo} · {v.chapa}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Chofer *</label>
              <select value={form.chofer_id} onChange={(e) => setForm({ ...form, chofer_id: e.target.value })} required={!form.vehiculo_externo_id} className={inputCls}>
                <option value="">— Elegir —</option>
                {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Cliente *</label>
              <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required className={inputCls}>
                <option value="">— Elegir —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-teus-hover_light border border-teus-border_light rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-teus-accent" />
              <div className="text-sm font-bold text-teus-text_dark">Ruta</div>
              <div className="text-[10px] text-teus-text_muted">(escribí para buscar destinos)</div>
            </div>
            <div className="mb-3">
              <input
                type="text"
                placeholder="🔍 Buscar destino (ej: vall, cde, encarna...)"
                value={rutaSearch}
                onChange={(e) => setRutaSearch(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-4">
                <label className={labelCls}>
                  Ruta preseteada
                  {rutaSearch && (
                    <span className="ml-2 text-teus-accent font-normal">
                      ({[...rutas].filter(r => `${r.origen} ${r.destino}`.toLowerCase().includes(rutaSearch.toLowerCase())).length} resultados)
                    </span>
                  )}
                </label>
                <select
                  value={form.ruta_id}
                  onChange={(e) => {
                    const r = rutas.find(x => x.id === e.target.value);
                    if (r) {
                      const km = idaYVuelta ? r.km_total : r.km_ida;
                      setForm(f => ({ ...f, ruta_id: e.target.value, origen: r.origen, destino: r.destino, km_viaje: km }));
                    } else {
                      setForm(f => ({ ...f, ruta_id: e.target.value }));
                    }
                  }}
                  className={inputCls}
                >
                  <option value="">— Manual (ingresá origen/destino abajo) —</option>
                  {[...rutas]
                    .filter(r => !rutaSearch || `${r.origen} ${r.destino}`.toLowerCase().includes(rutaSearch.toLowerCase()))
                    .sort((a, b) => {
                      if (a.origen === "Villeta" && b.origen !== "Villeta") return -1;
                      if (a.origen !== "Villeta" && b.origen === "Villeta") return 1;
                      return `${a.origen} ${a.destino}`.localeCompare(`${b.origen} ${b.destino}`);
                    })
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.origen} → {r.destino} · ida {r.km_ida}km / total {r.km_total}km
                      </option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className={labelCls}>Origen *</label>
                <input type="text" value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })} required placeholder="Villeta" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Destino *</label>
                <input type="text" value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} required placeholder="CDE" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>KM del viaje</label>
                <input type="number" value={form.km_viaje} onChange={(e) => setForm({ ...form, km_viaje: parseInt(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 bg-white border border-teus-border_light rounded-lg px-3 py-2 w-full cursor-pointer hover:border-teus-accent transition">
                  <input
                    type="checkbox"
                    checked={idaYVuelta}
                    onChange={(e) => {
                      const nueva = e.target.checked;
                      setIdaYVuelta(nueva);
                      const r = rutas.find(x => x.id === form.ruta_id);
                      if (r) {
                        setForm(f => ({ ...f, km_viaje: nueva ? r.km_total : r.km_ida }));
                      }
                    }}
                    className="w-4 h-4 accent-teus-accent"
                  />
                  <span className="text-xs font-semibold text-teus-text_dark">Ida y vuelta</span>
                </label>
              </div>
            </div>
            {form.ruta_id && (
              <div className="mt-3 text-xs text-teus-text_muted bg-white/50 rounded-lg px-3 py-2">
                💡 {idaYVuelta ? "Cuenta km ida + vuelta al contador de mantenimiento" : "Solo cuenta km de ida"}. Podés editar el KM manualmente si tuviste desvío.
              </div>
            )}
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={!!form.vehiculo_externo_id}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setForm({ ...form, vehiculo_externo_id: "", chofer_externo_nombre: "", precio_pagado_al_externo: 0, comision_recibida: 0 });
                  } else {
                    setForm({ ...form, vehiculo_externo_id: "PENDIENTE" });
                  }
                }}
                className="w-4 h-4" />
              <span className="text-sm font-bold text-teus-text_dark">🤝 Este viaje usó camión externo (TL, Elvio, etc.)</span>
            </label>
            {form.vehiculo_externo_id && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className={labelCls}>Aliado *</label>
                  <select value={form.vehiculo_externo_id === "PENDIENTE" ? "" : form.vehiculo_externo_id}
                    onChange={(e) => {
                      const aliadoId = e.target.value;
                      const pagado = form.precio_pagado_al_externo || 0;
                      setForm({ ...form, vehiculo_externo_id: aliadoId, comision_recibida: aliadoId === "TL" ? Math.round(pagado * 0.05) : 0 });
                    }} required className={inputCls}>
                    <option value="">— Elegir —</option>
                    <option value="TL">TL (David) — Socio 5% comisión</option>
                    <option value="ELVIO">Elvio González — Compra/venta</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Chofer externo (nombre)</label>
                  <input type="text" value={form.chofer_externo_nombre || ""}
                    onChange={(e) => setForm({ ...form, chofer_externo_nombre: e.target.value })}
                    placeholder="Ej: JORGE / MATIAS / etc." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Precio pagado al aliado (Gs)</label>
                  <input type="number" value={form.precio_pagado_al_externo || ""}
                    onChange={(e) => {
                      const nuevoPagado = parseInt(e.target.value) || 0;
                      const nuevaComision = form.vehiculo_externo_id === "TL" ? Math.round(nuevoPagado * 0.05) : form.comision_recibida;
                      setForm({ ...form, precio_pagado_al_externo: nuevoPagado, comision_recibida: nuevaComision });
                    }}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Comisión recibida (auto TL)</label>
                  <input type="number" value={form.comision_recibida || ""}
                    onChange={(e) => setForm({ ...form, comision_recibida: parseInt(e.target.value) || 0 })}
                    className={inputCls} />
                </div>
              </div>
            )}
          </div>
          <div className="bg-teus-hover_light border border-teus-border_light rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-bold text-teus-text_dark">⛽ Combustible</div>
              <div className="text-[10px] text-teus-text_muted">(al elegir proveedor, se autocompleta el precio por litro)</div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Proveedor</label>
                <select value={form.proveedor_combustible_id} onChange={(e) => onProveedorChange(e.target.value)} className={inputCls}>
                  <option value="">— Elegir —</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.gs_por_litro ? ` (${p.gs_por_litro} Gs/L)` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Litros</label>
                <input type="number" step="0.01" value={form.litros} onChange={(e) => setForm({ ...form, litros: parseFloat(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Gs / Litro</label>
                <input type="number" value={form.gs_por_litro} onChange={(e) => setForm({ ...form, gs_por_litro: parseInt(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div className="col-span-4 mt-1 text-xs text-teus-text_muted">
                Costo total combustible: <span className="font-bold text-teus-text_dark">{fmtGs(costoCombustible)}</span>
              </div>
            </div>
          </div>
          <div className="bg-teus-hover_light border border-teus-border_light rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-bold text-teus-text_dark">🛢️ Insumos extra en la estación (opcional)</div>
              <div className="text-[10px] text-teus-text_muted">(aceite, refrigerante, líquido de freno, agua destilada — se suma al débito con David)</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Descripción</label>
                <input type="text" value={form.insumos_estacion_detalle || ""}
                  onChange={(e) => setForm({ ...form, insumos_estacion_detalle: e.target.value })}
                  placeholder="Ej: 2 lts aceite + 1 refrigerante"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Monto (Gs.)</label>
                <input type="number" value={form.insumos_estacion_monto || ""}
                  onChange={(e) => setForm({ ...form, insumos_estacion_monto: parseInt(e.target.value) || 0 })}
                  className={inputCls} />
                <div className="text-[10px] text-teus-text_muted mt-1">{fmtGs(form.insumos_estacion_monto || 0)}</div>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-bold text-teus-text_dark">💰 Ingresos extras (opcional)</div>
              <div className="text-[10px] text-teus-text_muted">(estadías, reintegros peaje, adicionales — cobra el cliente, suma a tu utilidad)</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Descripción</label>
                <input type="text" value={form.ingresos_extras_detalle || ""}
                  onChange={(e) => setForm({ ...form, ingresos_extras_detalle: e.target.value })}
                  placeholder="Ej: Estadía 8hs puerto"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Monto (Gs.)</label>
                <input type="number" value={form.ingresos_extras_monto || ""}
                  onChange={(e) => setForm({ ...form, ingresos_extras_monto: parseInt(e.target.value) || 0 })}
                  className={inputCls} />
                <div className="text-[10px] text-blue-700 font-bold mt-1">{fmtGs(form.ingresos_extras_monto || 0)}</div>
              </div>
            </div>
          </div>
          <div className="bg-teus-hover_light border border-teus-border_light rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-teus-accent" />
              <div className="text-sm font-bold text-teus-text_dark">Precios y utilidad</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Precio flete (Gs.) *</label>
                <input type="number" value={form.precio_flete || ""} onChange={(e) => {
                const nuevoFlete = parseInt(e.target.value) || 0;
                setForm({ ...form, precio_flete: nuevoFlete });
              }} required className={inputCls} />
                <div className="text-[10px] text-teus-accent font-bold mt-1">{fmtGs(form.precio_flete)}</div>
              </div>
              <div>
                <label className={labelCls}>Viático</label>
                <input type="number" value={form.viatico} onChange={(e) => setForm({ ...form, viatico: parseInt(e.target.value) || 0 })} className={inputCls} />
                <div className="text-[10px] text-teus-text_muted mt-1">{fmtGs(form.viatico)}</div>
              </div>
              <div>
                <label className={labelCls}>Otros costos</label>
                <input type="number" value={form.otros_costos} onChange={(e) => setForm({ ...form, otros_costos: parseInt(e.target.value) || 0 })} className={inputCls} />
                <div className="text-[10px] text-teus-text_muted mt-1">{fmtGs(form.otros_costos)}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-white border border-teus-border_light rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-wider text-teus-text_muted font-bold">Ingresos</div>
                <div className="text-sm font-bold text-teus-text_dark mt-1">{fmtGs(ingresosTotales)}</div>
                {(form.ingresos_extras_monto || 0) > 0 && (
                  <div className="text-[9px] text-blue-700 mt-0.5">Flete {fmtGs(form.precio_flete)} + extras {fmtGs(form.ingresos_extras_monto)}</div>
                )}
              </div>
              <div className="bg-white border border-teus-border_light rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-wider text-teus-text_muted font-bold">Costos totales</div>
                <div className="text-sm font-bold text-teus-danger mt-1">− {fmtGs(costoCombustible + form.viatico + form.otros_costos + (form.insumos_estacion_monto || 0))}</div>
              </div>
              <div className="teus-highlight-bg border rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-wider text-teus-accent font-black">Utilidad bruta</div>
                <div className={`text-sm font-black mt-1 ${utilidadBruta >= 0 ? "text-teus-text_dark" : "text-teus-danger"}`}>
                  {fmtGs(utilidadBruta)}
                </div>
                <div className={`text-[10px] font-bold mt-0.5 ${utilidadBruta >= 0 ? "text-teus-accent" : "text-teus-danger"}`}>
                  {margenPct.toFixed(1)}% margen
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} rows={2} placeholder="Notas del viaje..." className={inputCls + " resize-none"} />
          </div>
          {error && (
            <div className="text-sm px-3 py-2 rounded-lg bg-teus-danger-light border border-teus-danger/30 text-teus-danger">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-teus-border_light text-teus-text_muted py-2.5 rounded-lg font-semibold text-sm hover:bg-teus-hover_light transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-teus-accent hover:bg-teus-accent-2 text-white py-2.5 rounded-lg font-bold text-sm shadow-accent-glow transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {viaje ? "Guardar cambios" : "Crear viaje"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
