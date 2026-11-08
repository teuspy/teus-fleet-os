"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserRole } from "@/lib/supabase/useUserRole";
import { ClipboardList, Plus, Download, Edit, X, Loader2, Search, Trash2, ChevronDown, ChevronUp, MessageCircle, Fuel, ArrowRightCircle, FileText } from "lucide-react";
import jsPDF from "jspdf";

type Chofer = { id: string; nombre_completo: string; telefono: string | null };
type Vehiculo = { id: string; alias: string | null; chapa: string };
type Cliente = { id: string; nombre: string };
type EstacionCombustible = { id: string; nombre: string };
type UsuarioPerfil = { id: string; nombre_completo: string | null; rol: string };

type ViajePrefill = {
  id: string;
  fecha: string;
  cliente_id: string | null;
  chofer_id: string | null;
  vehiculo_id: string | null;
  nro_contenedor: string | null;
  proveedor_combustible_id: string | null;
  hoja_ruta_id: string | null;
};

type HojaRuta = {
  id: string;
  numero: string;
  fecha_emision: string;
  chofer_id: string | null;
  vehiculo_id: string | null;
  cliente_id: string | null;
  chofer_externo_nombre: string | null;
  chofer_externo_telefono: string | null;
  equipo_externo: string | null;
  tipo_contenedor: string | null;
  nro_contenedor: string | null;
  tipo_operacion: string | null;
  peso_kg: number | null;
  retiro_lugar: string | null;
  retiro_fecha: string | null;
  entrega_direccion: string | null;
  entrega_fecha: string | null;
  entrega_hora: string | null;
  devolucion_lugar: string | null;
  devolucion_fecha: string | null;
  instrucciones: string | null;
  estado: string;
  creado_por: string | null;
  modificado_por: string | null;
  modificado_at: string | null;
  estacion_combustible_id: string | null;
  viaje_id: string | null;
  chofer?: { nombre_completo: string; telefono: string | null } | null;
  vehiculo?: { alias: string | null; chapa: string } | null;
  cliente?: { nombre: string } | null;
  estacion_combustible?: { nombre: string } | null;
};

const TIPOS_CONTENEDOR = ["DRY 20'", "DRY 40'", "DRY 40' HC", "Reefer 20'", "Reefer 40'", "Open Top", "Flat Rack", "Carga suelta"];
const TERMINALES = ["TERPORT - Villeta", "PSF - Puerto Seguro Fluvial", "CAACUPEMI", "FENIX", "SAN JOSE", "Otro"];
const CHOFER_EXTERNO_VALUE = "__externo__";

const ESTADOS: Record<string, { label: string; bg: string; text: string }> = {
  emitida: { label: "Emitida", bg: "bg-green-100", text: "text-green-800" },
  en_curso: { label: "En curso", bg: "bg-yellow-100", text: "text-yellow-800" },
  completada: { label: "Completada", bg: "bg-gray-200", text: "text-gray-700" },
  anulada: { label: "Anulada", bg: "bg-red-100", text: "text-red-800" },
};

function fmtGs(n: number) {
  return "Gs. " + Math.round(n || 0).toLocaleString("es-PY");
}
function fmtFecha(f: string | null): string {
  if (!f) return "-";
  const [y, m, d] = f.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}
function fmtFechaCorta(f: string | null): string {
  if (!f) return "-";
  const [, m, d] = f.split("T")[0].split("-");
  return `${d}/${m}`;
}
function fmtHora(h: string | null): string {
  if (!h) return "";
  return h.substring(0, 5);
}
function phoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let clean = phone.replace(/[^\d]/g, "");
  if (clean.startsWith("0")) clean = clean.substring(1);
  if (!clean.startsWith("595")) clean = "595" + clean;
  if (clean.length < 10) return null;
  return clean;
}
function labelDescargaCarga(tipo: string | null): string {
  if (tipo === "import") return "DESCARGA";
  if (tipo === "export") return "CARGA";
  return "DESCARGA / CARGA";
}
function fmtVehiculo(v?: { alias: string | null; chapa: string } | null): string {
  if (!v) return "-";
  const alias = v.alias || "";
  const chapa = v.chapa || "";
  if (alias && chapa) return `${alias} · ${chapa}`;
  return alias || chapa || "-";
}

export default function HojasDeRutaPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useUserRole();
  const [hojas, setHojas] = useState<HojaRuta[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estaciones, setEstaciones] = useState<EstacionCombustible[]>([]);
  const [perfiles, setPerfiles] = useState<Map<string, UsuarioPerfil>>(new Map());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<HojaRuta | null>(null);
  const [prefillViaje, setPrefillViaje] = useState<ViajePrefill | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [showOpcionales, setShowOpcionales] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [proximoNumero, setProximoNumero] = useState<string>("");

  const [form, setForm] = useState({
    cliente_id: "",
    chofer_id: "",
    vehiculo_id: "",
    chofer_externo_nombre: "",
    chofer_externo_telefono: "",
    equipo_externo: "",
    tipo_contenedor: "",
    tipo_operacion: "",
    nro_contenedor: "",
    peso_kg: "",
    retiro_lugar: "",
    retiro_fecha: "",
    entrega_direccion: "",
    entrega_fecha: "",
    entrega_hora: "",
    devolucion_lugar: "",
    devolucion_fecha: "",
    instrucciones: "",
    estacion_combustible_id: "",
  });

  const esChoferExterno = form.chofer_id === CHOFER_EXTERNO_VALUE;

  async function loadData() {
    setLoading(true);
    const [hojasRes, choferesRes, vehiculosRes, clientesRes, estacionesRes, perfilesRes] = await Promise.all([
      supabase.from("hojas_de_ruta")
        .select("*, chofer:chofer_id(nombre_completo, telefono), vehiculo:vehiculo_id(alias, chapa), cliente:cliente_id(nombre), estacion_combustible:estacion_combustible_id(nombre)")
        .order("created_at", { ascending: false }),
      supabase.from("choferes").select("id, nombre_completo, telefono").eq("activo", true).order("nombre_completo"),
      supabase.from("vehiculos").select("id, alias, chapa").eq("activo", true).eq("tipo", "tracto").order("alias"),
      supabase.from("clientes").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("proveedores").select("id, nombre").eq("activo", true).eq("tipo", "combustible").order("nombre"),
      supabase.from("usuarios_perfil").select("id, nombre_completo, rol"),
    ]);
    setHojas((hojasRes.data as unknown as HojaRuta[]) || []);
    setChoferes(choferesRes.data || []);
    setVehiculos(vehiculosRes.data || []);
    setClientes(clientesRes.data || []);
    setEstaciones(estacionesRes.data || []);
    if (perfilesRes.data) {
      const m = new Map<string, UsuarioPerfil>();
      perfilesRes.data.forEach((p: any) => m.set(p.id, p));
      setPerfiles(m);
    }
    setLoading(false);
  }

  async function fetchProximoNumero() {
    const { data } = await supabase.rpc("generar_numero_hoja_ruta");
    if (data) setProximoNumero(data);
  }

  useEffect(() => { loadData(); }, []);

  // Manejo de parámetros URL
  // ?from_viaje=xxx → generar hoja a partir de un viaje (pre-llenar modal)
  // ?hoja_id=xxx    → abrir hoja existente para editar
  useEffect(() => {
    const fromViaje = searchParams.get("from_viaje");
    const hojaIdParam = searchParams.get("hoja_id");

    if (fromViaje) {
      (async () => {
        const { data: viaje } = await supabase
          .from("viajes")
          .select("id, fecha, cliente_id, chofer_id, vehiculo_id, nro_contenedor, proveedor_combustible_id, hoja_ruta_id")
          .eq("id", fromViaje)
          .single();
        if (viaje) {
          if (viaje.hoja_ruta_id) {
            // El viaje ya tiene hoja — abrir esa hoja para editar
            const { data: hojaExistente } = await supabase
              .from("hojas_de_ruta")
              .select("*, chofer:chofer_id(nombre_completo, telefono), vehiculo:vehiculo_id(alias, chapa), cliente:cliente_id(nombre), estacion_combustible:estacion_combustible_id(nombre)")
              .eq("id", viaje.hoja_ruta_id)
              .single();
            if (hojaExistente) {
              abrirEditar(hojaExistente as unknown as HojaRuta);
            }
          } else {
            // Nueva hoja desde viaje
            resetForm();
            setEditando(null);
            setPrefillViaje(viaje as ViajePrefill);
            await fetchProximoNumero();
            setForm(f => ({
              ...f,
              cliente_id: viaje.cliente_id || "",
              chofer_id: viaje.chofer_id || "",
              vehiculo_id: viaje.vehiculo_id || "",
              nro_contenedor: viaje.nro_contenedor || "",
              retiro_fecha: viaje.fecha?.split("T")[0] || "",
              estacion_combustible_id: viaje.proveedor_combustible_id || "",
            }));
            // Si trae nro_contenedor lo mostramos en opcionales
            if (viaje.nro_contenedor) setShowOpcionales(true);
            setModalOpen(true);
          }
        }
        router.replace("/hojas-de-ruta");
      })();
      return;
    }

    if (hojaIdParam) {
      (async () => {
        const { data: hoja } = await supabase
          .from("hojas_de_ruta")
          .select("*, chofer:chofer_id(nombre_completo, telefono), vehiculo:vehiculo_id(alias, chapa), cliente:cliente_id(nombre), estacion_combustible:estacion_combustible_id(nombre)")
          .eq("id", hojaIdParam)
          .single();
        if (hoja) {
          abrirEditar(hoja as unknown as HojaRuta);
        }
        router.replace("/hojas-de-ruta");
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function resetForm() {
    setForm({
      cliente_id: "", chofer_id: "", vehiculo_id: "",
      chofer_externo_nombre: "", chofer_externo_telefono: "", equipo_externo: "",
      tipo_contenedor: "", tipo_operacion: "", nro_contenedor: "", peso_kg: "",
      retiro_lugar: "", retiro_fecha: "",
      entrega_direccion: "", entrega_fecha: "", entrega_hora: "",
      devolucion_lugar: "", devolucion_fecha: "", instrucciones: "",
      estacion_combustible_id: "",
    });
    setShowOpcionales(false);
    setPrefillViaje(null);
  }

  async function abrirNueva() {
    resetForm();
    setEditando(null);
    await fetchProximoNumero();
    setModalOpen(true);
  }

  function abrirEditar(h: HojaRuta) {
    setForm({
      cliente_id: h.cliente_id || "",
      chofer_id: h.chofer_externo_nombre ? CHOFER_EXTERNO_VALUE : (h.chofer_id || ""),
      vehiculo_id: h.vehiculo_id || "",
      chofer_externo_nombre: h.chofer_externo_nombre || "",
      chofer_externo_telefono: h.chofer_externo_telefono || "",
      equipo_externo: h.equipo_externo || "",
      tipo_contenedor: h.tipo_contenedor || "",
      tipo_operacion: h.tipo_operacion || "",
      nro_contenedor: h.nro_contenedor || "",
      peso_kg: h.peso_kg?.toString() || "",
      retiro_lugar: h.retiro_lugar || "",
      retiro_fecha: h.retiro_fecha?.split("T")[0] || "",
      entrega_direccion: h.entrega_direccion || "",
      entrega_fecha: h.entrega_fecha?.split("T")[0] || "",
      entrega_hora: h.entrega_hora || "",
      devolucion_lugar: h.devolucion_lugar || "",
      devolucion_fecha: h.devolucion_fecha?.split("T")[0] || "",
      instrucciones: h.instrucciones || "",
      estacion_combustible_id: h.estacion_combustible_id || "",
    });
    const tieneOp = h.nro_contenedor || h.tipo_operacion || h.peso_kg || h.devolucion_lugar || h.instrucciones;
    setShowOpcionales(!!tieneOp);
    setEditando(h);
    setPrefillViaje(null);
    setProximoNumero(h.numero);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setEditando(null);
    resetForm();
  }

  async function guardar(descargar: boolean) {
    if (!form.cliente_id) { alert("Elegí un cliente"); return; }
    if (!form.chofer_id) { alert("Elegí un chofer"); return; }
    if (esChoferExterno && !form.chofer_externo_nombre.trim()) {
      alert("Ingresá el nombre del chofer externo"); return;
    }
    setGuardando(true);
    try {
      const payload = {
        cliente_id: form.cliente_id || null,
        chofer_id: esChoferExterno ? null : (form.chofer_id || null),
        vehiculo_id: esChoferExterno ? null : (form.vehiculo_id || null),
        chofer_externo_nombre: esChoferExterno ? (form.chofer_externo_nombre.trim() || null) : null,
        chofer_externo_telefono: esChoferExterno ? (form.chofer_externo_telefono.trim() || null) : null,
        equipo_externo: esChoferExterno ? (form.equipo_externo.trim() || null) : null,
        tipo_contenedor: form.tipo_contenedor || null,
        tipo_operacion: form.tipo_operacion || null,
        nro_contenedor: form.nro_contenedor || null,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        retiro_lugar: form.retiro_lugar || null,
        retiro_fecha: form.retiro_fecha || null,
        entrega_direccion: form.entrega_direccion || null,
        entrega_fecha: form.entrega_fecha || null,
        entrega_hora: form.entrega_hora || null,
        devolucion_lugar: form.devolucion_lugar || null,
        devolucion_fecha: form.devolucion_fecha || null,
        instrucciones: form.instrucciones || null,
        estacion_combustible_id: form.estacion_combustible_id || null,
        viaje_id: prefillViaje?.id || null,
      };

      let hojaGuardada: HojaRuta;
      if (editando) {
        const { data, error } = await supabase.from("hojas_de_ruta")
          .update(payload).eq("id", editando.id)
          .select("*, chofer:chofer_id(nombre_completo, telefono), vehiculo:vehiculo_id(alias, chapa), cliente:cliente_id(nombre), estacion_combustible:estacion_combustible_id(nombre)")
          .single();
        if (error) throw error;
        hojaGuardada = data as unknown as HojaRuta;
      } else {
        const { data, error } = await supabase.from("hojas_de_ruta")
          .insert({ ...payload, numero: proximoNumero })
          .select("*, chofer:chofer_id(nombre_completo, telefono), vehiculo:vehiculo_id(alias, chapa), cliente:cliente_id(nombre), estacion_combustible:estacion_combustible_id(nombre)")
          .single();
        if (error) throw error;
        hojaGuardada = data as unknown as HojaRuta;
        // Si venimos desde un viaje, actualizar ese viaje para vincular la hoja
        if (prefillViaje?.id) {
          await supabase.from("viajes").update({ hoja_ruta_id: hojaGuardada.id }).eq("id", prefillViaje.id);
        }
      }
      await loadData();
      cerrarModal();
      if (descargar) setTimeout(() => generarPDF(hojaGuardada), 300);
    } catch (err: any) {
      alert("Error al guardar: " + (err.message || "desconocido"));
    } finally {
      setGuardando(false);
    }
  }

  async function anular(h: HojaRuta) {
    if (!confirm(`¿Anular la hoja de ruta ${h.numero}?`)) return;
    const { error } = await supabase.from("hojas_de_ruta").update({ estado: "anulada" }).eq("id", h.id);
    if (error) { alert("Error: " + error.message); return; }
    loadData();
  }

  function convertirEnViaje(h: HojaRuta) {
    if (h.viaje_id) {
      router.push(`/viajes?viaje_id=${h.viaje_id}`);
      return;
    }
    router.push(`/viajes?from_hoja=${h.id}`);
  }

  function abrirWhatsApp(h: HojaRuta) {
    const telefono = h.chofer_externo_nombre
      ? phoneForWhatsApp(h.chofer_externo_telefono)
      : phoneForWhatsApp(h.chofer?.telefono);
    if (!telefono) {
      alert("No hay teléfono guardado para este chofer.\n\nPara chofer propio: cargalo en el módulo /choferes.\nPara chofer externo: editá esta hoja y agregá el teléfono.");
      return;
    }
    const nombre = h.chofer_externo_nombre || h.chofer?.nombre_completo?.split(" ")[0] || "chofer";
    const equipoTxt = h.chofer_externo_nombre
      ? (h.equipo_externo || "")
      : (h.vehiculo?.alias ? `${h.vehiculo.alias} · ${h.vehiculo.chapa}` : "");
    const labelEntrega = h.tipo_operacion === "export" ? "Carga" : "Descarga";

    const partes = [
      `Hola ${nombre}, te paso la hoja de ruta *${h.numero}*.`,
      ``,
      `*Cliente:* ${h.cliente?.nombre || "-"}`,
    ];
    if (equipoTxt) partes.push(`*Equipo:* ${equipoTxt}`);
    if (h.tipo_contenedor) partes.push(`*Contenedor:* ${h.tipo_contenedor}`);
    partes.push(`*Retiro:* ${h.retiro_lugar || "-"}${h.retiro_fecha ? " (" + fmtFecha(h.retiro_fecha) + ")" : ""}`);
    partes.push(`*${labelEntrega}:* ${h.entrega_direccion || "-"}${h.entrega_fecha ? " (" + fmtFecha(h.entrega_fecha) + (h.entrega_hora ? " · " + fmtHora(h.entrega_hora) + " hs" : "") + ")" : ""}`);
    if (h.estacion_combustible?.nombre) {
      partes.push(`*⛽ Cargar combustible en:* ${h.estacion_combustible.nombre}`);
    }
    partes.push(``);
    partes.push(`Te adjunto el PDF a continuación.`);

    const mensaje = partes.join("\n");
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  }

  function generarPDF(h: HojaRuta) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const verdeOsc: [number, number, number] = [6, 61, 50];
    const verdeBr: [number, number, number] = [34, 214, 111];
    const ivory: [number, number, number] = [245, 244, 239];
    const gris: [number, number, number] = [110, 120, 115];
    const ink: [number, number, number] = [21, 32, 28];

    doc.setFillColor(...verdeOsc);
    doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(...verdeBr);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("teu's", 15, 17);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("END TO END LOGISTICS", 15, 23);
    doc.setFontSize(10);
    doc.text("Hoja de ruta", W - 15, 11, { align: "right" });
    doc.setTextColor(...verdeBr);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(h.numero, W - 15, 19, { align: "right" });
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(fmtFecha(h.fecha_emision), W - 15, 25, { align: "right" });

    doc.setFillColor(...ivory);
    doc.rect(0, 28, W, 32, "F");
    doc.setTextColor(...gris);
    doc.setFontSize(8);
    doc.text("CLIENTE", 15, 36);
    doc.text("CONTENEDOR", W / 2, 36);
    doc.setTextColor(...verdeOsc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(h.cliente?.nombre || "-", 15, 46);
    doc.text(h.tipo_contenedor || "-", W / 2, 46);

    if (h.tipo_operacion) {
      const label = h.tipo_operacion === "import" ? "IMPORT" : "EXPORT";
      const bgColor: [number, number, number] = h.tipo_operacion === "import" ? [217, 234, 211] : [252, 229, 205];
      const txtColor: [number, number, number] = h.tipo_operacion === "import" ? [56, 118, 29] : [153, 76, 0];
      doc.setFillColor(...bgColor);
      doc.roundedRect(15, 51, 20, 6, 1, 1, "F");
      doc.setTextColor(...txtColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(label, 25, 55, { align: "center" });
    }
    const extras: string[] = [];
    if (h.nro_contenedor) extras.push(`N° ${h.nro_contenedor}`);
    if (h.peso_kg) extras.push(`${h.peso_kg.toLocaleString("es-PY")} kg`);
    if (extras.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...gris);
      doc.text(extras.join("  ·  "), W / 2, 55);
    }

    doc.setDrawColor(224, 221, 211);
    doc.line(0, 60, W, 60);
    doc.setTextColor(...gris);
    doc.setFontSize(8);
    doc.text("CHOFER", 15, 68);
    doc.text("EQUIPO", W / 2, 68);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const nombreChofer = h.chofer_externo_nombre
      ? `${h.chofer_externo_nombre}`
      : (h.chofer?.nombre_completo || "-");
    doc.text(nombreChofer, 15, 76);
    if (h.chofer_externo_nombre) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...gris);
      doc.text("(externo)", 15, 80);
    }
    const equipoTxt = h.chofer_externo_nombre
      ? (h.equipo_externo || "-")
      : (h.vehiculo?.alias ? `${h.vehiculo.alias} · ${h.vehiculo.chapa}` : (h.vehiculo?.chapa || "-"));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ink);
    doc.text(equipoTxt, W / 2, 76);

    doc.line(0, 85, W, 85);
    doc.setFillColor(...verdeBr);
    doc.rect(0, 85, 3, 28, "F");
    doc.setFillColor(250, 250, 247);
    doc.rect(3, 85, W - 3, 28, "F");
    doc.setTextColor(...verdeOsc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("RETIRO", 15, 94);
    if (h.retiro_fecha) {
      doc.setFontSize(11);
      doc.text(fmtFecha(h.retiro_fecha), W - 15, 94, { align: "right" });
    }
    doc.setTextColor(...ink);
    doc.setFontSize(13);
    doc.text(h.retiro_lugar || "-", 15, 104);

    doc.line(0, 113, W, 113);
    doc.setFillColor(...verdeBr);
    doc.rect(0, 113, 3, 32, "F");
    doc.setFillColor(250, 250, 247);
    doc.rect(3, 113, W - 3, 32, "F");
    doc.setTextColor(...verdeOsc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(labelDescargaCarga(h.tipo_operacion), 15, 122);
    if (h.entrega_fecha) {
      const txtFH = `${fmtFecha(h.entrega_fecha)}${h.entrega_hora ? "  ·  " + fmtHora(h.entrega_hora) + " hs" : ""}`;
      doc.setFontSize(11);
      doc.text(txtFH, W - 15, 122, { align: "right" });
    }
    doc.setTextColor(...ink);
    doc.setFontSize(13);
    const direccionLines = doc.splitTextToSize(h.entrega_direccion || "-", W - 30);
    doc.text(direccionLines, 15, 133);

    let y = 145;

    // ⛽ CARGAR COMBUSTIBLE EN — bloque nuevo (solo si tiene estación)
    if (h.estacion_combustible?.nombre) {
      doc.line(0, y, W, y);
      doc.setFillColor(255, 243, 199); // amarillo claro
      doc.rect(0, y, W, 18, "F");
      doc.setFillColor(245, 158, 11); // borde naranja
      doc.rect(0, y, 3, 18, "F");
      doc.setTextColor(146, 64, 14); // naranja oscuro
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("CARGAR COMBUSTIBLE EN", 15, y + 7);
      doc.setFontSize(14);
      doc.text(h.estacion_combustible.nombre, 15, y + 14);
      y += 18;
    }

    if (h.devolucion_lugar) {
      doc.line(0, y, W, y);
      doc.setFillColor(255, 255, 255);
      doc.rect(0, y, W, 20, "F");
      doc.setTextColor(...gris);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("DEVOLUCIÓN DE VACÍO", 15, y + 8);
      doc.setTextColor(...ink);
      doc.setFontSize(11);
      doc.text(h.devolucion_lugar, 15, y + 16);
      if (h.devolucion_fecha) {
        doc.text(fmtFecha(h.devolucion_fecha), W - 15, y + 16, { align: "right" });
      }
      y += 20;
    }

    if (h.instrucciones) {
      doc.line(0, y, W, y);
      doc.setFillColor(...ivory);
      doc.rect(0, y, W, 30, "F");
      doc.setTextColor(...gris);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("INSTRUCCIONES", 15, y + 8);
      doc.setTextColor(...ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(h.instrucciones, W - 30);
      doc.text(lines, 15, y + 16);
      y += 30;
    }

    const footerY = 282;
    doc.setFillColor(...verdeOsc);
    doc.rect(0, footerY, W, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TEUS Logistics E.A.S.", 15, footerY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Villeta · Ciudad del Este · Paraguay", 15, footerY + 11);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("+595 995 690 900", W - 15, footerY + 6, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("teuspy.com", W - 15, footerY + 11, { align: "right" });

    doc.save(`${h.numero}.pdf`);
  }

  const hojasFiltradas = useMemo(() => {
    return hojas.filter(h => {
      if (filtroEstado !== "todos" && h.estado !== filtroEstado) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const texto = [
          h.numero, h.chofer?.nombre_completo, h.chofer_externo_nombre, h.cliente?.nombre,
          h.nro_contenedor, h.retiro_lugar, h.entrega_direccion,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [hojas, filtroEstado, busqueda]);

  function perfilDe(id: string | null): UsuarioPerfil | null {
    if (!id) return null;
    return perfiles.get(id) || null;
  }

  function ChipCoordinador({ perfil, tipo }: { perfil: UsuarioPerfil; tipo: "creado" | "modificado" }) {
    const icono = tipo === "creado" ? "✨" : "✎";
    const label = tipo === "creado" ? "Creado por" : "Modif. por";
    const bg = tipo === "creado" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-purple-100 text-purple-800 border-purple-300";
    return (
      <span
        title={`${label} ${perfil.nombre_completo || "Usuario"}`}
        className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${bg} ml-1`}
      >
        {icono} {perfil.nombre_completo || "Coord."}
      </span>
    );
  }

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-teus-text_dark flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-teus-accent" />
            Hojas de ruta
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Órdenes de trabajo para enviar al chofer por WhatsApp
          </p>
        </div>
        <button onClick={abrirNueva} className="bg-teus-accent hover:bg-teus-accent-2 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-accent-glow transition-all hover:-translate-y-0.5">
          <Plus className="w-4 h-4" /> Nueva hoja
        </button>
      </div>

      <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-4 mb-4 shadow-card">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-teus-text_muted" />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por chofer, cliente, N° de contenedor..."
              className="flex-1 bg-white border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="bg-white border rounded-lg px-3 py-1.5 text-sm font-semibold">
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-teus-text_muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando...
        </div>
      ) : hojasFiltradas.length === 0 ? (
        <div className="p-16 text-center bg-teus-card_light border border-teus-border_light rounded-xl">
          <ClipboardList className="w-12 h-12 mx-auto mb-2 text-teus-text_muted opacity-30" />
          <p className="font-bold text-teus-text_dark">No hay hojas de ruta todavía</p>
          <p className="text-xs text-teus-text_muted mt-1">Tocá "Nueva hoja" para crear la primera.</p>
        </div>
      ) : (
        <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teus-bg_soft">
                <tr>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">N°</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Fecha</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Chofer</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Tipo</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Ruta</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Estado</th>
                  <th className="text-right p-3 font-bold text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {hojasFiltradas.map(h => {
                  const estado = ESTADOS[h.estado] || ESTADOS.emitida;
                  const nombreChofer = h.chofer_externo_nombre || h.chofer?.nombre_completo || "-";
                  const creador = perfilDe(h.creado_por);
                  const modificador = perfilDe(h.modificado_por);
                  const creadorEsCoord = creador?.rol === "coordinador";
                  const modificadorEsCoord =
                    modificador?.rol === "coordinador" &&
                    h.modificado_por !== h.creado_por;
                  return (
                    <tr key={h.id} className="border-t border-teus-border_light hover:bg-teus-bg_soft/40">
                      <td className="p-3 font-bold text-teus-accent-dark font-mono">
                        <div className="flex items-center flex-wrap gap-y-1">
                          <span>{h.numero}</span>
                          {h.viaje_id && (
                            <span
                              title="Esta hoja ya fue convertida en viaje"
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-blue-100 text-blue-800 border-blue-300 ml-1"
                            >
                              <FileText className="w-2.5 h-2.5" /> VIAJE
                            </span>
                          )}
                          {isAdmin && creadorEsCoord && creador && (
                            <ChipCoordinador perfil={creador} tipo="creado" />
                          )}
                          {isAdmin && modificadorEsCoord && modificador && (
                            <ChipCoordinador perfil={modificador} tipo="modificado" />
                          )}
                        </div>
                      </td>
                      <td className="p-3">{fmtFechaCorta(h.fecha_emision)}</td>
                      <td className="p-3 font-semibold">{h.cliente?.nombre || "-"}</td>
                      <td className="p-3">
                        {nombreChofer}
                        {h.chofer_externo_nombre && <span className="ml-1 text-[9px] bg-gray-200 text-gray-700 px-1 py-0.5 rounded font-bold">EXT</span>}
                      </td>
                      <td className="p-3">
                        {h.tipo_operacion && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${h.tipo_operacion === "import" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                            {h.tipo_operacion.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-teus-text_muted text-xs">
                        {h.retiro_lugar ? h.retiro_lugar.split(" - ")[0] : "-"} → {h.entrega_direccion ? h.entrega_direccion.substring(0, 20) : "-"}
                      </td>
                      <td className="p-3">
                        <span className={`${estado.bg} ${estado.text} text-[10px] px-2 py-1 rounded-full font-bold`}>{estado.label}</span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => abrirWhatsApp(h)} title="Abrir WhatsApp"
                          className="text-green-600 hover:text-green-800 p-1">
                          <MessageCircle className="w-4 h-4 inline" />
                        </button>
                        <button onClick={() => generarPDF(h)} title="Descargar PDF"
                          className="text-teus-accent hover:text-teus-accent-2 p-1 ml-1">
                          <Download className="w-4 h-4 inline" />
                        </button>
                        <button onClick={() => abrirEditar(h)} title="Editar"
                          className="text-teus-text_muted hover:text-teus-text_dark p-1 ml-1">
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        {h.estado !== "anulada" && (
                          <button onClick={() => anular(h)} title="Anular"
                            className="text-red-500 hover:text-red-700 p-1 ml-1">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && hojasFiltradas.length > 0 && (
        <div className="text-xs text-teus-text_soft mt-4 px-1 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-full font-bold text-[10px]">VIAJE</span>
            = hoja ya convertida en viaje
          </span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full font-bold text-[10px]">✨ chip</span>
            = creado por el coordinador
          </span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full font-bold text-[10px]">✎ chip</span>
            = modificado por el coordinador
          </span>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-5 pb-3 border-b">
              <div>
                <h2 className="text-xl font-black text-teus-text_dark">
                  {editando
                    ? `Editar hoja ${editando.numero}`
                    : prefillViaje
                      ? "Generar hoja de ruta desde viaje"
                      : "Nueva hoja de ruta"}
                </h2>
                <p className="text-xs text-teus-text_muted mt-1">
                  {editando
                    ? `Última modificación: ${fmtFecha(editando.fecha_emision)}`
                    : `Se asignará el N° ${proximoNumero || "..."} al guardar`}
                </p>
              </div>
              <button onClick={cerrarModal} className="text-teus-text_muted hover:text-teus-text_dark">
                <X className="w-5 h-5" />
              </button>
            </div>

            {prefillViaje && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2">
                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  Esta hoja se está generando a partir de un viaje. Se precargaron cliente, chofer, vehículo y contenedor.
                  Al guardar, ambos quedarán vinculados automáticamente.
                  <strong className="block mt-1">Completá puerto de retiro, dirección de entrega y estación de combustible si corresponde.</strong>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase font-bold text-teus-accent tracking-widest mb-2">Operación</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Cliente *</label>
                    <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                      <option value="">Elegir cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Tipo contenedor</label>
                    <select value={form.tipo_contenedor} onChange={e => setForm({ ...form, tipo_contenedor: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                      <option value="">Elegir tipo...</option>
                      {TIPOS_CONTENEDOR.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Chofer *</label>
                    <select value={form.chofer_id} onChange={e => setForm({ ...form, chofer_id: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                      <option value="">Elegir chofer...</option>
                      {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                      <option value={CHOFER_EXTERNO_VALUE}>+ Chofer externo (otro)</option>
                    </select>
                  </div>
                  {!esChoferExterno ? (
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">Vehículo</label>
                      <select value={form.vehiculo_id} onChange={e => setForm({ ...form, vehiculo_id: e.target.value })}
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                        <option value="">Elegir vehículo...</option>
                        {vehiculos.map(v => <option key={v.id} value={v.id}>{v.alias || v.chapa} · {v.chapa}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">Equipo externo</label>
                      <input type="text" value={form.equipo_externo}
                        onChange={e => setForm({ ...form, equipo_externo: e.target.value })}
                        placeholder="Volvo FH · Chapa ABC123"
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                    </div>
                  )}
                </div>

                {esChoferExterno && (
                  <div className="grid grid-cols-2 gap-3 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div>
                      <label className="text-xs font-bold text-amber-900">Nombre del chofer externo *</label>
                      <input type="text" value={form.chofer_externo_nombre}
                        onChange={e => setForm({ ...form, chofer_externo_nombre: e.target.value })}
                        placeholder="Carlos Benitez"
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-amber-900">Teléfono WhatsApp</label>
                      <input type="text" value={form.chofer_externo_telefono}
                        onChange={e => setForm({ ...form, chofer_externo_telefono: e.target.value })}
                        placeholder="0981 123456"
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm mt-1" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] uppercase font-bold text-teus-accent tracking-widest mb-2">Retiro</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Puerto / terminal</label>
                    <select value={form.retiro_lugar} onChange={e => setForm({ ...form, retiro_lugar: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                      <option value="">Elegir terminal...</option>
                      {TERMINALES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Fecha de retiro</label>
                    <input type="date" value={form.retiro_fecha}
                      onChange={e => setForm({ ...form, retiro_fecha: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-bold text-teus-accent tracking-widest mb-2">Descarga / Carga</div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-teus-text_dark">Dirección</label>
                    <input type="text" value={form.entrega_direccion}
                      onChange={e => setForm({ ...form, entrega_direccion: e.target.value })}
                      placeholder="Av. Industrial 1234, CDE"
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Fecha</label>
                    <input type="date" value={form.entrega_fecha}
                      onChange={e => setForm({ ...form, entrega_fecha: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Hora</label>
                    <input type="time" value={form.entrega_hora}
                      onChange={e => setForm({ ...form, entrega_hora: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                </div>
              </div>

              {/* ⛽ CARGAR COMBUSTIBLE EN (opcional) */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Fuel className="w-4 h-4 text-amber-700" />
                  <div className="text-[11px] uppercase font-bold text-amber-800 tracking-widest">Combustible (opcional)</div>
                </div>
                <label className="text-xs font-bold text-amber-900">Cargar combustible en</label>
                <select value={form.estacion_combustible_id}
                  onChange={e => setForm({ ...form, estacion_combustible_id: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="">Sin estación asignada</option>
                  {estaciones.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <p className="text-[10px] text-amber-700 mt-1.5">
                  Si elegís una estación, aparece en el PDF que mandás al chofer. No incluye litros ni precio.
                </p>
              </div>

              <button type="button" onClick={() => setShowOpcionales(!showOpcionales)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-teus-text_muted border border-dashed border-teus-border_light rounded-lg hover:bg-teus-bg_soft">
                {showOpcionales ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showOpcionales ? "Ocultar" : "Agregar"} datos opcionales (tipo, N° contenedor, peso, devolución, instrucciones)
              </button>

              {showOpcionales && (
                <div className="space-y-4 border-l-2 border-teus-accent pl-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">Tipo de operación</label>
                      <select value={form.tipo_operacion}
                        onChange={e => setForm({ ...form, tipo_operacion: e.target.value })}
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                        <option value="">Sin definir</option>
                        <option value="import">Import</option>
                        <option value="export">Export</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">N° contenedor</label>
                      <input type="text" value={form.nro_contenedor}
                        onChange={e => setForm({ ...form, nro_contenedor: e.target.value })}
                        placeholder="TGBU 1234567"
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1 font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">Peso aprox. (kg)</label>
                      <input type="number" value={form.peso_kg}
                        onChange={e => setForm({ ...form, peso_kg: e.target.value })}
                        placeholder="24000"
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">Devolución de vacío</label>
                      <select value={form.devolucion_lugar}
                        onChange={e => setForm({ ...form, devolucion_lugar: e.target.value })}
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                        <option value="">Sin devolución</option>
                        {TERMINALES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">Fecha devolución</label>
                      <input type="date" value={form.devolucion_fecha}
                        onChange={e => setForm({ ...form, devolucion_fecha: e.target.value })}
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Instrucciones especiales</label>
                    <textarea value={form.instrucciones} rows={3}
                      onChange={e => setForm({ ...form, instrucciones: e.target.value })}
                      placeholder="Ej: Entregar por portón trasero. Horario de descarga 9-17 hs."
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t flex-wrap">
              {editando && (
                <button
                  onClick={() => convertirEnViaje(editando)}
                  disabled={guardando}
                  className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                    editando.viaje_id
                      ? "bg-blue-50 border-2 border-blue-500 text-blue-700 hover:bg-blue-100"
                      : "bg-white border-2 border-teus-accent text-teus-accent hover:bg-teus-accent/5"
                  }`}
                  title={editando.viaje_id ? "Ver viaje vinculado" : "Convertir esta hoja en viaje"}
                >
                  {editando.viaje_id ? (
                    <>
                      <FileText className="w-4 h-4" />
                      Ver viaje vinculado
                    </>
                  ) : (
                    <>
                      <ArrowRightCircle className="w-4 h-4" />
                      Convertir en viaje
                    </>
                  )}
                </button>
              )}
              <button onClick={cerrarModal} disabled={guardando}
                className="bg-white border border-teus-border_light hover:bg-teus-bg_soft text-teus-text_dark px-4 py-2.5 rounded-lg text-sm font-bold">
                Cancelar
              </button>
              <button onClick={() => guardar(false)} disabled={guardando}
                className="bg-white border-2 border-teus-accent-dark text-teus-accent-dark hover:bg-teus-bg_soft px-4 py-2.5 rounded-lg text-sm font-bold">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin inline" /> : prefillViaje ? "Guardar y vincular" : "Guardar"}
              </button>
              <button onClick={() => guardar(true)} disabled={guardando}
                className="bg-teus-accent hover:bg-teus-accent-2 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Guardar y descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
