"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useUserRole } from "@/lib/supabase/useUserRole";
import { AlertCircle, Plus, Search, X, Trash2, Pencil } from "lucide-react";

// ============================================================
// TIPOS
// ============================================================

type Chofer = {
  id: string;
  nombre_completo: string;
  vehiculo_asignado_id: string | null;
};

type Vehiculo = {
  id: string;
  chapa: string;
  nombre_equipo: string | null;
  alias: string | null;
  marca: string | null;
  modelo: string | null;
};

type UsuarioPerfil = {
  id: string;
  nombre_completo: string | null;
  email: string;
  rol: "admin" | "coordinador";
};

type Informe = {
  id: string;
  numero: string;
  fecha_informe: string;
  chofer_id: string;
  vehiculo_id: string;
  tipo_equipo: "tractocamion" | "semirremolque" | "equipo_completo";
  descripcion: string;
  estado: "pendiente" | "en_proceso" | "solucionado" | "cancelado";
  observaciones: string | null;
  creado_por: string | null;
  creado_at: string;
  modificado_por: string | null;
  modificado_at: string | null;
  chofer?: Chofer;
  vehiculo?: Vehiculo;
  creado_por_perfil?: UsuarioPerfil;
  modificado_por_perfil?: UsuarioPerfil;
};

type EstadoFiltro = "todos" | "pendiente" | "en_proceso" | "solucionado" | "cancelado";

// ============================================================
// HELPERS
// ============================================================

const TIPO_EQUIPO_LABEL: Record<Informe["tipo_equipo"], string> = {
  tractocamion: "Tractocamión",
  semirremolque: "Semirremolque",
  equipo_completo: "Equipo completo",
};

const ESTADO_LABEL: Record<Informe["estado"], string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  solucionado: "Solucionado",
  cancelado: "Cancelado",
};

// Pill styles matching the system palette (same look as Viajes / Facturas)
const ESTADO_PILL: Record<Informe["estado"], string> = {
  pendiente:
    "bg-teus-warn-light text-teus-warn border border-amber-200",
  en_proceso:
    "bg-blue-50 text-blue-700 border border-blue-200",
  solucionado:
    "bg-teus-success-light text-teus-success border border-emerald-200",
  cancelado:
    "bg-gray-100 text-teus-text_muted border border-gray-200",
};

function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function nombreVehiculo(v?: Vehiculo): string {
  if (!v) return "—";
  const alias = v.alias || v.nombre_equipo;
  return alias ? `${v.chapa} · ${alias}` : v.chapa;
}

// ============================================================
// CHIP coordinador (solo visible a admin, solo si fue coordinador)
// ============================================================

function ChipUsuario({
  perfil,
  label,
  esAdminViendo,
}: {
  perfil?: UsuarioPerfil;
  label: "C" | "M";
  esAdminViendo: boolean;
}) {
  if (!esAdminViendo || !perfil || perfil.rol !== "coordinador") return null;
  const nombre = (perfil.nombre_completo || perfil.email).split(" ")[0];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 ml-1 font-medium"
      title={`${label === "C" ? "Creado" : "Modificado"} por ${perfil.nombre_completo || perfil.email}`}
    >
      {label}:{nombre}
    </span>
  );
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function InformesFlotaPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { loading: rolLoading, isAdmin } = useUserRole();

  const [informes, setInformes] = useState<Informe[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("pendiente");
  const [busqueda, setBusqueda] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Informe | null>(null);

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarTodo() {
    setLoading(true);
    const [chRes, vRes, pRes, iRes] = await Promise.all([
      supabase
        .from("choferes")
        .select("id, nombre_completo, vehiculo_asignado_id")
        .eq("activo", true)
        .order("nombre_completo"),
      supabase
        .from("vehiculos")
        .select("id, chapa, nombre_equipo, alias, marca, modelo")
        .eq("activo", true)
        .order("chapa"),
      supabase.from("usuarios_perfil").select("id, nombre_completo, email, rol"),
      supabase
        .from("informes_flota")
        .select("*")
        .order("fecha_informe", { ascending: false })
        .order("creado_at", { ascending: false }),
    ]);

    const choferesData = (chRes.data as Chofer[]) || [];
    const vehiculosData = (vRes.data as Vehiculo[]) || [];
    const perfilesData = (pRes.data as UsuarioPerfil[]) || [];
    const informesData = (iRes.data as Informe[]) || [];

    const informesEnriquecidos = informesData.map((inf) => ({
      ...inf,
      chofer: choferesData.find((c) => c.id === inf.chofer_id),
      vehiculo: vehiculosData.find((v) => v.id === inf.vehiculo_id),
      creado_por_perfil: perfilesData.find((p) => p.id === inf.creado_por),
      modificado_por_perfil: perfilesData.find((p) => p.id === inf.modificado_por),
    }));

    setChoferes(choferesData);
    setVehiculos(vehiculosData);
    setInformes(informesEnriquecidos);
    setLoading(false);
  }

  const informesFiltrados = useMemo(() => {
    let lista = informes;
    if (filtroEstado !== "todos") {
      lista = lista.filter((i) => i.estado === filtroEstado);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        (i) =>
          i.numero.toLowerCase().includes(q) ||
          i.descripcion.toLowerCase().includes(q) ||
          (i.chofer?.nombre_completo || "").toLowerCase().includes(q) ||
          (i.vehiculo?.chapa || "").toLowerCase().includes(q) ||
          (i.vehiculo?.alias || "").toLowerCase().includes(q)
      );
    }
    return lista;
  }, [informes, filtroEstado, busqueda]);

  const contadores = useMemo(
    () => ({
      pendiente: informes.filter((i) => i.estado === "pendiente").length,
      en_proceso: informes.filter((i) => i.estado === "en_proceso").length,
      solucionado: informes.filter((i) => i.estado === "solucionado").length,
      cancelado: informes.filter((i) => i.estado === "cancelado").length,
      todos: informes.length,
    }),
    [informes]
  );

  function abrirNuevo() {
    setEditando(null);
    setModalOpen(true);
  }
  function abrirEditar(inf: Informe) {
    setEditando(inf);
    setModalOpen(true);
  }

  async function cambiarEstadoRapido(inf: Informe, nuevoEstado: Informe["estado"]) {
    const { error } = await supabase
      .from("informes_flota")
      .update({ estado: nuevoEstado })
      .eq("id", inf.id);
    if (error) return alert("Error: " + error.message);
    await cargarTodo();
  }

  async function eliminarInforme(inf: Informe) {
    if (!isAdmin) return;
    if (!confirm(`¿Eliminar informe ${inf.numero}?`)) return;
    const { error } = await supabase.from("informes_flota").delete().eq("id", inf.id);
    if (error) return alert("Error: " + error.message);
    await cargarTodo();
  }

  // ============================================================

  if (rolLoading || loading) {
    return (
      <div className="min-h-screen bg-teus-bg_light p-6">
        <div className="text-teus-text_muted text-sm">Cargando informes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teus-bg_light">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-teus-accent/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-teus-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-teus-text_dark leading-tight">
                Informes de Flota
              </h1>
              <p className="text-sm text-teus-text_muted mt-0.5">
                Registro de novedades y problemas reportados sobre los equipos
              </p>
            </div>
          </div>
          <button
            onClick={abrirNuevo}
            className="inline-flex items-center gap-2 bg-teus-accent hover:bg-teus-accent-2 text-white px-4 py-2.5 rounded-lg font-semibold shadow-accent-glow transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo Informe
          </button>
        </div>

        {/* KPI CARDS por estado (clickeables = filtro) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(
            ["pendiente", "en_proceso", "solucionado", "cancelado", "todos"] as EstadoFiltro[]
          ).map((estado) => {
            const activo = filtroEstado === estado;
            const label =
              estado === "todos" ? "Total" : ESTADO_LABEL[estado as Informe["estado"]];
            const num = contadores[estado];

            const acc =
              estado === "pendiente"
                ? "text-teus-warn"
                : estado === "en_proceso"
                ? "text-blue-600"
                : estado === "solucionado"
                ? "text-teus-success"
                : estado === "cancelado"
                ? "text-teus-text_muted"
                : "text-teus-text_dark";

            return (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`bg-teus-card_light rounded-xl shadow-card hover:shadow-card-hover border transition text-left p-4 ${
                  activo
                    ? "border-teus-accent ring-2 ring-teus-accent/20"
                    : "border-teus-border_light"
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-teus-text_soft">
                  {label}
                </div>
                <div className={`text-3xl font-bold mt-1 ${acc}`}>{num}</div>
              </button>
            );
          })}
        </div>

        {/* BÚSQUEDA */}
        <div className="bg-teus-card_light rounded-xl shadow-card border border-teus-border_light p-4 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-teus-text_soft" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número, descripción, chofer o chapa..."
              className="w-full pl-10 pr-3 py-2 bg-teus-bg_light border border-teus-border_light rounded-lg text-sm text-teus-text_dark placeholder:text-teus-text_soft focus:outline-none focus:ring-2 focus:ring-teus-accent/30 focus:border-teus-accent"
            />
          </div>
        </div>

        {/* TABLA */}
        {informesFiltrados.length === 0 ? (
          <div className="bg-teus-card_light rounded-xl shadow-card border border-teus-border_light p-12 text-center">
            <AlertCircle className="w-10 h-10 text-teus-text_soft mx-auto mb-3" />
            <div className="text-teus-text_muted text-sm">
              No hay informes
              {filtroEstado !== "todos" &&
                ` con estado "${ESTADO_LABEL[filtroEstado as Informe["estado"]]}"`}
              .
            </div>
            <button
              onClick={abrirNuevo}
              className="inline-flex items-center gap-2 mt-4 text-teus-accent hover:text-teus-accent-2 font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Crear el primero
            </button>
          </div>
        ) : (
          <div className="bg-teus-card_light rounded-xl shadow-card border border-teus-border_light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-teus-hover_light border-b border-teus-border_light">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-teus-text_muted">
                      N°
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-teus-text_muted">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-teus-text_muted">
                      Chofer
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-teus-text_muted">
                      Vehículo
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-teus-text_muted">
                      Equipo
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-teus-text_muted">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-teus-text_muted">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-teus-text_muted">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teus-border_light">
                  {informesFiltrados.map((inf) => (
                    <tr
                      key={inf.id}
                      className="hover:bg-teus-hover_light transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-teus-text_dark">
                          {inf.numero}
                        </div>
                        <div className="mt-0.5">
                          <ChipUsuario
                            perfil={inf.creado_por_perfil}
                            label="C"
                            esAdminViendo={isAdmin}
                          />
                          {inf.modificado_por &&
                            inf.modificado_por !== inf.creado_por && (
                              <ChipUsuario
                                perfil={inf.modificado_por_perfil}
                                label="M"
                                esAdminViendo={isAdmin}
                              />
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-teus-text_dark whitespace-nowrap">
                        {formatearFecha(inf.fecha_informe)}
                      </td>
                      <td className="px-4 py-3 text-teus-text_dark font-medium">
                        {inf.chofer?.nombre_completo || "—"}
                      </td>
                      <td className="px-4 py-3 text-teus-text_dark">
                        <span className="font-semibold">{inf.vehiculo?.chapa || "—"}</span>
                        {(inf.vehiculo?.alias || inf.vehiculo?.nombre_equipo) && (
                          <span className="text-teus-text_soft">
                            {" · "}
                            {inf.vehiculo?.alias || inf.vehiculo?.nombre_equipo}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-teus-text_muted">
                        {TIPO_EQUIPO_LABEL[inf.tipo_equipo]}
                      </td>
                      <td className="px-4 py-3 text-teus-text_dark max-w-xs">
                        <div className="line-clamp-2" title={inf.descripcion}>
                          {inf.descripcion}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={inf.estado}
                          onChange={(e) =>
                            cambiarEstadoRapido(inf, e.target.value as Informe["estado"])
                          }
                          className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1 cursor-pointer outline-none ${ESTADO_PILL[inf.estado]}`}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_proceso">En proceso</option>
                          <option value="solucionado">Solucionado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => abrirEditar(inf)}
                            className="p-1.5 text-teus-text_muted hover:text-teus-accent hover:bg-teus-accent/10 rounded transition"
                            title="Ver / Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => eliminarInforme(inf)}
                              className="p-1.5 text-teus-text_muted hover:text-teus-danger hover:bg-teus-danger-light rounded transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEYENDA de chips (solo admin) */}
        {isAdmin && informes.some((i) => i.creado_por_perfil?.rol === "coordinador") && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-teus-text_muted">
            <span className="inline-flex items-center gap-1">
              <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 font-medium text-[10px]">
                C:Nombre
              </span>
              <span>creado por coordinador</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 font-medium text-[10px]">
                M:Nombre
              </span>
              <span>modificado por coordinador</span>
            </span>
          </div>
        )}
      </div>

      {modalOpen && (
        <ModalInforme
          informe={editando}
          choferes={choferes}
          vehiculos={vehiculos}
          supabase={supabase}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await cargarTodo();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL CREAR / EDITAR
// ============================================================

function ModalInforme({
  informe,
  choferes,
  vehiculos,
  supabase,
  onClose,
  onSaved,
}: {
  informe: Informe | null;
  choferes: Chofer[];
  vehiculos: Vehiculo[];
  supabase: ReturnType<typeof createBrowserClient>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esNuevo = !informe;

  const [fecha, setFecha] = useState(
    informe?.fecha_informe || new Date().toISOString().split("T")[0]
  );
  const [choferId, setChoferId] = useState(informe?.chofer_id || "");
  const [vehiculoId, setVehiculoId] = useState(informe?.vehiculo_id || "");
  const [tipoEquipo, setTipoEquipo] = useState<Informe["tipo_equipo"]>(
    informe?.tipo_equipo || "equipo_completo"
  );
  const [descripcion, setDescripcion] = useState(informe?.descripcion || "");
  const [estado, setEstado] = useState<Informe["estado"]>(informe?.estado || "pendiente");
  const [observaciones, setObservaciones] = useState(informe?.observaciones || "");
  const [guardando, setGuardando] = useState(false);

  function onChangeChofer(nuevoChoferId: string) {
    setChoferId(nuevoChoferId);
    const chofer = choferes.find((c) => c.id === nuevoChoferId);
    if (chofer?.vehiculo_asignado_id) {
      setVehiculoId(chofer.vehiculo_asignado_id);
    }
  }

  async function guardar() {
    if (!choferId || !vehiculoId || !descripcion.trim()) {
      alert("Completá chofer, vehículo y descripción.");
      return;
    }
    setGuardando(true);

    const payload = {
      fecha_informe: fecha,
      chofer_id: choferId,
      vehiculo_id: vehiculoId,
      tipo_equipo: tipoEquipo,
      descripcion: descripcion.trim(),
      estado,
      observaciones: observaciones.trim() || null,
    };

    const { error } = esNuevo
      ? await supabase.from("informes_flota").insert([payload])
      : await supabase.from("informes_flota").update(payload).eq("id", informe!.id);

    setGuardando(false);

    if (error) return alert("Error al guardar: " + error.message);
    onSaved();
  }

  const inputCls =
    "w-full px-3 py-2 bg-teus-bg_light border border-teus-border_light rounded-lg text-sm text-teus-text_dark focus:outline-none focus:ring-2 focus:ring-teus-accent/30 focus:border-teus-accent";
  const labelCls =
    "block text-[11px] font-semibold uppercase tracking-wider text-teus-text_muted mb-1.5";

  return (
    <div className="fixed inset-0 bg-teus-text_dark/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-teus-card_light rounded-xl shadow-card-hover w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-teus-card_light border-b border-teus-border_light px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-teus-accent" />
            <h2 className="text-lg font-bold text-teus-text_dark">
              {esNuevo ? "Nuevo informe" : `Informe ${informe!.numero}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-teus-text_muted hover:text-teus-text_dark hover:bg-teus-hover_light rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Fecha */}
          <div>
            <label className={labelCls}>Fecha del informe *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Chofer */}
          <div>
            <label className={labelCls}>Chofer *</label>
            <select
              value={choferId}
              onChange={(e) => onChangeChofer(e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar chofer...</option>
              {choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_completo}
                </option>
              ))}
            </select>
          </div>

          {/* Vehículo */}
          <div>
            <label className={labelCls}>
              Vehículo *{" "}
              <span className="text-teus-text_soft normal-case tracking-normal font-normal">
                (se autocompleta al elegir chofer)
              </span>
            </label>
            <select
              value={vehiculoId}
              onChange={(e) => setVehiculoId(e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar vehículo...</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {nombreVehiculo(v)}
                  {v.marca || v.modelo ? ` — ${v.marca || ""} ${v.modelo || ""}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de equipo */}
          <div>
            <label className={labelCls}>Tipo de equipo afectado *</label>
            <div className="grid grid-cols-3 gap-2">
              {(["tractocamion", "semirremolque", "equipo_completo"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoEquipo(tipo)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-semibold border-2 transition ${
                    tipoEquipo === tipo
                      ? "border-teus-accent bg-teus-accent/10 text-teus-accent"
                      : "border-teus-border_light bg-teus-card_light text-teus-text_muted hover:border-teus-text_soft"
                  }`}
                >
                  {TIPO_EQUIPO_LABEL[tipo]}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción del problema / novedad *</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={5}
              placeholder="Ej: El chofer reporta un problema con el borne de la batería. Hace falta revisar para no quedar en ruta..."
              className={`${inputCls} resize-y`}
            />
          </div>

          {/* Estado */}
          <div>
            <label className={labelCls}>Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as Informe["estado"])}
              className={inputCls}
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="solucionado">Solucionado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className={labelCls}>Observaciones / seguimiento</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Notas internas de seguimiento..."
              className={`${inputCls} resize-y`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-teus-card_light border-t border-teus-border_light px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-teus-border_light rounded-lg text-teus-text_muted hover:bg-teus-hover_light font-semibold text-sm transition"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teus-accent hover:bg-teus-accent-2 disabled:opacity-50 text-white rounded-lg font-semibold text-sm shadow-accent-glow transition"
          >
            {guardando ? "Guardando..." : esNuevo ? "Crear informe" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
