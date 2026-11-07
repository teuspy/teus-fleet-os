"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useUserRole } from "@/lib/supabase/useUserRole";

// ============================================================
// TIPOS
// ============================================================

type Chofer = {
  id: string;
  nombre: string;
  vehiculo_id: string | null;
};

type Vehiculo = {
  id: string;
  patente: string;
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

const ESTADO_COLOR: Record<Informe["estado"], string> = {
  pendiente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  en_proceso: "bg-blue-100 text-blue-800 border-blue-300",
  solucionado: "bg-green-100 text-green-800 border-green-300",
  cancelado: "bg-gray-200 text-gray-700 border-gray-400",
};

const ESTADO_EMOJI: Record<Informe["estado"], string> = {
  pendiente: "🟡",
  en_proceso: "🔵",
  solucionado: "🟢",
  cancelado: "⚫",
};

function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// ============================================================
// CHIP coordinador/admin que creó o modificó
// ============================================================

function ChipUsuario({
  perfil,
  label,
  esAdminViendo,
}: {
  perfil?: UsuarioPerfil;
  label: "Creado" | "Modificado";
  esAdminViendo: boolean;
}) {
  // Solo admin ve chips, y solo cuando fue un coordinador
  if (!esAdminViendo || !perfil || perfil.rol !== "coordinador") return null;

  const nombre = perfil.nombre_completo || perfil.email;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 border border-purple-300 rounded px-1.5 py-0.5 ml-1"
      title={`${label} por ${nombre}`}
    >
      👤 {label === "Creado" ? "C" : "M"}:{nombre.split(" ")[0]}
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

  const { rol, loading: rolLoading, isAdmin } = useUserRole();

  const [informes, setInformes] = useState<Informe[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [perfiles, setPerfiles] = useState<UsuarioPerfil[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("pendiente");
  const [busqueda, setBusqueda] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Informe | null>(null);

  // -------- CARGA INICIAL --------
  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarTodo() {
    setLoading(true);
    const [chRes, vRes, pRes, iRes] = await Promise.all([
      supabase.from("choferes").select("id, nombre, vehiculo_id").order("nombre"),
      supabase.from("vehiculos").select("id, patente, marca, modelo").order("patente"),
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

    // Enriquecer informes con joins manuales
    const informesEnriquecidos = informesData.map((inf) => ({
      ...inf,
      chofer: choferesData.find((c) => c.id === inf.chofer_id),
      vehiculo: vehiculosData.find((v) => v.id === inf.vehiculo_id),
      creado_por_perfil: perfilesData.find((p) => p.id === inf.creado_por),
      modificado_por_perfil: perfilesData.find((p) => p.id === inf.modificado_por),
    }));

    setChoferes(choferesData);
    setVehiculos(vehiculosData);
    setPerfiles(perfilesData);
    setInformes(informesEnriquecidos);
    setLoading(false);
  }

  // -------- FILTRADO --------
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
          (i.chofer?.nombre || "").toLowerCase().includes(q) ||
          (i.vehiculo?.patente || "").toLowerCase().includes(q)
      );
    }
    return lista;
  }, [informes, filtroEstado, busqueda]);

  // -------- CONTADORES POR ESTADO --------
  const contadores = useMemo(() => {
    return {
      pendiente: informes.filter((i) => i.estado === "pendiente").length,
      en_proceso: informes.filter((i) => i.estado === "en_proceso").length,
      solucionado: informes.filter((i) => i.estado === "solucionado").length,
      cancelado: informes.filter((i) => i.estado === "cancelado").length,
      todos: informes.length,
    };
  }, [informes]);

  // -------- ACCIONES --------
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
    if (error) {
      alert("Error al cambiar estado: " + error.message);
      return;
    }
    await cargarTodo();
  }

  async function eliminarInforme(inf: Informe) {
    if (!isAdmin) return;
    if (!confirm(`¿Eliminar informe ${inf.numero}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("informes_flota").delete().eq("id", inf.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    await cargarTodo();
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (rolLoading || loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Cargando informes de flota...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            📋 Informes de Flota
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro de novedades y problemas reportados sobre los equipos
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
        >
          + Nuevo informe
        </button>
      </div>

      {/* TARJETAS DE ESTADO (clickeables = filtro rápido) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(["pendiente", "en_proceso", "solucionado", "cancelado", "todos"] as EstadoFiltro[]).map(
          (estado) => {
            const activo = filtroEstado === estado;
            const label =
              estado === "todos" ? "Todos" : ESTADO_LABEL[estado as Informe["estado"]];
            const emoji = estado === "todos" ? "📊" : ESTADO_EMOJI[estado as Informe["estado"]];
            return (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`p-3 rounded-lg border-2 transition text-left ${
                  activo
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span>{emoji}</span>
                  <span>{label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-800 mt-1">
                  {contadores[estado]}
                </div>
              </button>
            );
          }
        )}
      </div>

      {/* BÚSQUEDA */}
      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número, descripción, chofer o patente..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* TABLA */}
      {informesFiltrados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
          No hay informes
          {filtroEstado !== "todos" && ` con estado "${ESTADO_LABEL[filtroEstado as Informe["estado"]]}"`}.
          <div className="mt-3">
            <button
              onClick={abrirNuevo}
              className="text-blue-600 hover:underline font-medium"
            >
              + Crear el primero
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">N°</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Chofer</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Vehículo</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Equipo</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Descripción</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Estado</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {informesFiltrados.map((inf) => (
                  <tr key={inf.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">
                      {inf.numero}
                      <ChipUsuario
                        perfil={inf.creado_por_perfil}
                        label="Creado"
                        esAdminViendo={isAdmin}
                      />
                      {inf.modificado_por && inf.modificado_por !== inf.creado_por && (
                        <ChipUsuario
                          perfil={inf.modificado_por_perfil}
                          label="Modificado"
                          esAdminViendo={isAdmin}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {formatearFecha(inf.fecha_informe)}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {inf.chofer?.nombre || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-800 font-medium">
                      {inf.vehiculo?.patente || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {TIPO_EQUIPO_LABEL[inf.tipo_equipo]}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-xs">
                      <div className="line-clamp-2" title={inf.descripcion}>
                        {inf.descripcion}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={inf.estado}
                        onChange={(e) =>
                          cambiarEstadoRapido(inf, e.target.value as Informe["estado"])
                        }
                        className={`text-xs font-medium border rounded px-2 py-1 cursor-pointer ${ESTADO_COLOR[inf.estado]}`}
                      >
                        <option value="pendiente">🟡 Pendiente</option>
                        <option value="en_proceso">🔵 En proceso</option>
                        <option value="solucionado">🟢 Solucionado</option>
                        <option value="cancelado">⚫ Cancelado</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => abrirEditar(inf)}
                          className="text-blue-600 hover:text-blue-800 px-2 py-1 text-xs font-medium"
                          title="Ver/Editar"
                        >
                          Ver
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => eliminarInforme(inf)}
                            className="text-red-600 hover:text-red-800 px-2 py-1 text-xs font-medium"
                            title="Eliminar"
                          >
                            🗑
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
      {isAdmin && (
        <div className="mt-4 text-xs text-gray-500 flex flex-wrap gap-3 items-center">
          <span className="inline-flex items-center gap-1">
            <span className="bg-purple-100 text-purple-700 border border-purple-300 rounded px-1.5 py-0.5">
              👤 C:Nombre
            </span>
            = creado por coordinador
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="bg-purple-100 text-purple-700 border border-purple-300 rounded px-1.5 py-0.5">
              👤 M:Nombre
            </span>
            = modificado por coordinador
          </span>
        </div>
      )}

      {/* MODAL */}
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

  // Al cambiar chofer → autocompletar vehículo
  function onChangeChofer(nuevoChoferId: string) {
    setChoferId(nuevoChoferId);
    const chofer = choferes.find((c) => c.id === nuevoChoferId);
    if (chofer?.vehiculo_id) {
      setVehiculoId(chofer.vehiculo_id);
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

    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {esNuevo ? "📋 Nuevo informe de flota" : `📋 Informe ${informe!.numero}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha del informe *
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Chofer */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Chofer *
            </label>
            <select
              value={choferId}
              onChange={(e) => onChangeChofer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar chofer...</option>
              {choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Vehículo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Vehículo * <span className="text-gray-400">(se autocompleta al elegir chofer)</span>
            </label>
            <select
              value={vehiculoId}
              onChange={(e) => setVehiculoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar vehículo...</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.patente} {v.marca || v.modelo ? `— ${v.marca || ""} ${v.modelo || ""}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de equipo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipo de equipo afectado *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["tractocamion", "semirremolque", "equipo_completo"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoEquipo(tipo)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition ${
                    tipoEquipo === tipo
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {TIPO_EQUIPO_LABEL[tipo]}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Descripción del problema / novedad *
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={5}
              placeholder="Ej: El chofer reporta un problema con el borne de la batería. Hace falta revisar para no quedar en ruta..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as Informe["estado"])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pendiente">🟡 Pendiente</option>
              <option value="en_proceso">🔵 En proceso</option>
              <option value="solucionado">🟢 Solucionado</option>
              <option value="cancelado">⚫ Cancelado</option>
            </select>
          </div>

          {/* Observaciones de seguimiento */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Observaciones / seguimiento
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Notas internas de seguimiento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
          >
            {guardando ? "Guardando..." : esNuevo ? "Crear informe" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
