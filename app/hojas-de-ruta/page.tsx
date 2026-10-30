"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, Plus, Download, Edit, X, Loader2, Search, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import jsPDF from "jspdf";

type Chofer = { id: string; nombre_completo: string };
type Vehiculo = { id: string; alias: string | null; chapa: string };
type Cliente = { id: string; nombre: string };

type HojaRuta = {
  id: string;
  numero: string;
  fecha_emision: string;
  chofer_id: string | null;
  vehiculo_id: string | null;
  cliente_id: string | null;
  tipo_contenedor: string | null;
  nro_contenedor: string | null;
  booking_referencia: string | null;
  peso_kg: number | null;
  retiro_lugar: string | null;
  entrega_direccion: string | null;
  entrega_fecha: string | null;
  entrega_hora: string | null;
  devolucion_lugar: string | null;
  devolucion_fecha: string | null;
  instrucciones: string | null;
  estado: string;
  chofer?: { nombre_completo: string } | null;
  vehiculo?: { alias: string | null; chapa: string } | null;
  cliente?: { nombre: string } | null;
};

const TIPOS_CONTENEDOR = ["DRY 20'", "DRY 40'", "DRY 40' HC", "Reefer 20'", "Reefer 40'", "Open Top", "Flat Rack", "Carga suelta"];
const TERMINALES = ["TERPORT - Villeta", "PSF - Puerto San Francisco", "CAACUPEMI", "FENIX", "SAN JOSE", "Otro"];

const ESTADOS: Record<string, { label: string; bg: string; text: string }> = {
  emitida: { label: "Emitida", bg: "bg-green-100", text: "text-green-800" },
  en_curso: { label: "En curso", bg: "bg-yellow-100", text: "text-yellow-800" },
  completada: { label: "Completada", bg: "bg-gray-200", text: "text-gray-700" },
  anulada: { label: "Anulada", bg: "bg-red-100", text: "text-red-800" },
};

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

export default function HojasDeRutaPage() {
  const supabase = createClient();
  const [hojas, setHojas] = useState<HojaRuta[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<HojaRuta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [showOpcionales, setShowOpcionales] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const [form, setForm] = useState({
    chofer_id: "",
    vehiculo_id: "",
    cliente_id: "",
    tipo_contenedor: "",
    nro_contenedor: "",
    booking_referencia: "",
    peso_kg: "",
    retiro_lugar: "",
    entrega_direccion: "",
    entrega_fecha: "",
    entrega_hora: "",
    devolucion_lugar: "",
    devolucion_fecha: "",
    instrucciones: "",
  });

  const [proximoNumero, setProximoNumero] = useState<string>("");

  async function loadData() {
    setLoading(true);
    const [hojasRes, choferesRes, vehiculosRes, clientesRes] = await Promise.all([
      supabase.from("hojas_de_ruta")
        .select("*, chofer:chofer_id(nombre_completo), vehiculo:vehiculo_id(alias, chapa), cliente:cliente_id(nombre)")
        .order("created_at", { ascending: false }),
      supabase.from("choferes").select("id, nombre_completo").eq("activo", true).order("nombre_completo"),
      supabase.from("vehiculos").select("id, alias, chapa").eq("activo", true).eq("tipo", "tracto").order("alias"),
      supabase.from("clientes").select("id, nombre").eq("activo", true).order("nombre"),
    ]);
    setHojas((hojasRes.data as unknown as HojaRuta[]) || []);
    setChoferes(choferesRes.data || []);
    setVehiculos(vehiculosRes.data || []);
    setClientes(clientesRes.data || []);
    setLoading(false);
  }

  async function fetchProximoNumero() {
    const { data } = await supabase.rpc("generar_numero_hoja_ruta");
    if (data) setProximoNumero(data);
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setForm({
      chofer_id: "", vehiculo_id: "", cliente_id: "", tipo_contenedor: "",
      nro_contenedor: "", booking_referencia: "", peso_kg: "",
      retiro_lugar: "", entrega_direccion: "", entrega_fecha: "", entrega_hora: "",
      devolucion_lugar: "", devolucion_fecha: "", instrucciones: "",
    });
    setShowOpcionales(false);
  }

  async function abrirNueva() {
    resetForm();
    setEditando(null);
    await fetchProximoNumero();
    setModalOpen(true);
  }

  function abrirEditar(h: HojaRuta) {
    setForm({
      chofer_id: h.chofer_id || "",
      vehiculo_id: h.vehiculo_id || "",
      cliente_id: h.cliente_id || "",
      tipo_contenedor: h.tipo_contenedor || "",
      nro_contenedor: h.nro_contenedor || "",
      booking_referencia: h.booking_referencia || "",
      peso_kg: h.peso_kg?.toString() || "",
      retiro_lugar: h.retiro_lugar || "",
      entrega_direccion: h.entrega_direccion || "",
      entrega_fecha: h.entrega_fecha?.split("T")[0] || "",
      entrega_hora: h.entrega_hora || "",
      devolucion_lugar: h.devolucion_lugar || "",
      devolucion_fecha: h.devolucion_fecha?.split("T")[0] || "",
      instrucciones: h.instrucciones || "",
    });
    const tieneOpcionales = h.nro_contenedor || h.booking_referencia || h.peso_kg || h.devolucion_lugar || h.instrucciones;
    setShowOpcionales(!!tieneOpcionales);
    setEditando(h);
    setProximoNumero(h.numero);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setEditando(null);
    resetForm();
  }

  async function guardar(descargar: boolean) {
    if (!form.chofer_id) { alert("Elegí un chofer"); return; }
    if (!form.cliente_id) { alert("Elegí un cliente"); return; }
    setGuardando(true);
    try {
      const payload = {
        chofer_id: form.chofer_id || null,
        vehiculo_id: form.vehiculo_id || null,
        cliente_id: form.cliente_id || null,
        tipo_contenedor: form.tipo_contenedor || null,
        nro_contenedor: form.nro_contenedor || null,
        booking_referencia: form.booking_referencia || null,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        retiro_lugar: form.retiro_lugar || null,
        entrega_direccion: form.entrega_direccion || null,
        entrega_fecha: form.entrega_fecha || null,
        entrega_hora: form.entrega_hora || null,
        devolucion_lugar: form.devolucion_lugar || null,
        devolucion_fecha: form.devolucion_fecha || null,
        instrucciones: form.instrucciones || null,
      };

      let hojaGuardada: HojaRuta;

      if (editando) {
        const { data, error } = await supabase.from("hojas_de_ruta")
          .update(payload).eq("id", editando.id)
          .select("*, chofer:chofer_id(nombre_completo), vehiculo:vehiculo_id(alias, chapa), cliente:cliente_id(nombre)")
          .single();
        if (error) throw error;
        hojaGuardada = data as unknown as HojaRuta;
      } else {
        const { data, error } = await supabase.from("hojas_de_ruta")
          .insert({ ...payload, numero: proximoNumero })
          .select("*, chofer:chofer_id(nombre_completo), vehiculo:vehiculo_id(alias, chapa), cliente:cliente_id(nombre)")
          .single();
        if (error) throw error;
        hojaGuardada = data as unknown as HojaRuta;
      }

      await loadData();
      cerrarModal();

      if (descargar) {
        setTimeout(() => generarPDF(hojaGuardada), 300);
      }
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

  function generarPDF(h: HojaRuta) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const verdeOsc: [number, number, number] = [6, 61, 50];
    const verdeBr: [number, number, number] = [34, 214, 111];
    const ivory: [number, number, number] = [245, 244, 239];
    const gris: [number, number, number] = [110, 120, 115];
    const ink: [number, number, number] = [21, 32, 28];

    // HEADER
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

    // CHOFER + EQUIPO
    doc.setFillColor(...ivory);
    doc.rect(0, 28, W, 28, "F");
    doc.setTextColor(...gris);
    doc.setFontSize(8);
    doc.text("CHOFER", 15, 36);
    doc.text("EQUIPO", W / 2, 36);
    doc.setTextColor(...verdeOsc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(h.chofer?.nombre_completo || "-", 15, 46);
    const vehTxt = h.vehiculo?.alias ? `${h.vehiculo.alias} · ${h.vehiculo.chapa}` : (h.vehiculo?.chapa || "-");
    doc.text(vehTxt, W / 2, 46);

    // CLIENTE + CONTENEDOR
    doc.setDrawColor(224, 221, 211);
    doc.line(0, 56, W, 56);
    doc.setTextColor(...gris);
    doc.setFontSize(8);
    doc.text("CLIENTE", 15, 64);
    doc.text("CONTENEDOR", W / 2, 64);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(h.cliente?.nombre || "-", 15, 72);
    doc.text(h.tipo_contenedor || "-", W / 2, 72);

    const extras: string[] = [];
    if (h.nro_contenedor) extras.push(`N° ${h.nro_contenedor}`);
    if (h.booking_referencia) extras.push(`Booking: ${h.booking_referencia}`);
    if (h.peso_kg) extras.push(`${h.peso_kg.toLocaleString("es-PY")} kg`);
    if (extras.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...gris);
      doc.text(extras.join("  ·  "), W / 2, 78);
    }

    // RETIRO
    doc.line(0, 84, W, 84);
    doc.setFillColor(...verdeBr);
    doc.rect(0, 84, 3, 28, "F");
    doc.setFillColor(250, 250, 247);
    doc.rect(3, 84, W - 3, 28, "F");
    doc.setTextColor(...verdeOsc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("RETIRO", 15, 93);
    doc.setTextColor(...ink);
    doc.setFontSize(13);
    doc.text(h.retiro_lugar || "-", 15, 103);

    // ENTREGA
    doc.line(0, 112, W, 112);
    doc.setFillColor(...verdeBr);
    doc.rect(0, 112, 3, 32, "F");
    doc.setFillColor(250, 250, 247);
    doc.rect(3, 112, W - 3, 32, "F");
    doc.setTextColor(...verdeOsc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("ENTREGA", 15, 121);
    if (h.entrega_fecha) {
      const txtFH = `${fmtFecha(h.entrega_fecha)}${h.entrega_hora ? "  ·  " + fmtHora(h.entrega_hora) + " hs" : ""}`;
      doc.setFontSize(11);
      doc.text(txtFH, W - 15, 121, { align: "right" });
    }
    doc.setTextColor(...ink);
    doc.setFontSize(13);
    const direccionLines = doc.splitTextToSize(h.entrega_direccion || "-", W - 30);
    doc.text(direccionLines, 15, 132);

    let y = 144;

    // DEVOLUCIÓN
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

    // INSTRUCCIONES
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

    // FOOTER
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
          h.numero, h.chofer?.nombre_completo, h.cliente?.nombre,
          h.nro_contenedor, h.retiro_lugar, h.entrega_direccion,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [hojas, filtroEstado, busqueda]);

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
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Chofer</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Ruta</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Estado</th>
                  <th className="text-right p-3 font-bold text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {hojasFiltradas.map(h => {
                  const estado = ESTADOS[h.estado] || ESTADOS.emitida;
                  return (
                    <tr key={h.id} className="border-t border-teus-border_light hover:bg-teus-bg_soft/40">
                      <td className="p-3 font-bold text-teus-accent-dark font-mono">{h.numero}</td>
                      <td className="p-3">{fmtFechaCorta(h.fecha_emision)}</td>
                      <td className="p-3 font-semibold">{h.chofer?.nombre_completo || "-"}</td>
                      <td className="p-3">{h.cliente?.nombre || "-"}</td>
                      <td className="p-3 text-teus-text_muted text-xs">
                        {h.retiro_lugar ? h.retiro_lugar.split(" - ")[0] : "-"} → {h.entrega_direccion ? h.entrega_direccion.substring(0, 20) : "-"}
                      </td>
                      <td className="p-3">
                        <span className={`${estado.bg} ${estado.text} text-[10px] px-2 py-1 rounded-full font-bold`}>{estado.label}</span>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => generarPDF(h)} title="Descargar PDF"
                          className="text-teus-accent hover:text-teus-accent-2 p-1">
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

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-5 pb-3 border-b">
              <div>
                <h2 className="text-xl font-black text-teus-text_dark">
                  {editando ? `Editar hoja ${editando.numero}` : "Nueva hoja de ruta"}
                </h2>
                <p className="text-xs text-teus-text_muted mt-1">
                  {editando ? `Última modificación: ${fmtFecha(editando.fecha_emision)}` : `Se asignará el N° ${proximoNumero || "..."} al guardar`}
                </p>
              </div>
              <button onClick={cerrarModal} className="text-teus-text_muted hover:text-teus-text_dark">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase font-bold text-teus-accent tracking-widest mb-2">Operación</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Chofer *</label>
                    <select value={form.chofer_id} onChange={e => setForm({ ...form, chofer_id: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                      <option value="">Elegir chofer...</option>
                      {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Vehículo</label>
                    <select value={form.vehiculo_id} onChange={e => setForm({ ...form, vehiculo_id: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                      <option value="">Elegir vehículo...</option>
                      {vehiculos.map(v => <option key={v.id} value={v.id}>{v.alias || v.chapa} · {v.chapa}</option>)}
                    </select>
                  </div>
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
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-bold text-teus-accent tracking-widest mb-2">Retiro</div>
                <div>
                  <label className="text-xs font-bold text-teus-text_dark">Puerto / terminal</label>
                  <select value={form.retiro_lugar} onChange={e => setForm({ ...form, retiro_lugar: e.target.value })}
                    className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1">
                    <option value="">Elegir terminal...</option>
                    {TERMINALES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.retiro_lugar === "Otro" && (
                    <input type="text" placeholder="Especificá el lugar"
                      onChange={e => setForm({ ...form, retiro_lugar: e.target.value })}
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-2" />
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-bold text-teus-accent tracking-widest mb-2">Entrega</div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-teus-text_dark">Dirección de entrega</label>
                    <input type="text" value={form.entrega_direccion}
                      onChange={e => setForm({ ...form, entrega_direccion: e.target.value })}
                      placeholder="Av. Industrial 1234, CDE"
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-teus-text_dark">Fecha llegada</label>
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

              <button type="button" onClick={() => setShowOpcionales(!showOpcionales)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-teus-text_muted border border-dashed border-teus-border_light rounded-lg hover:bg-teus-bg_soft">
                {showOpcionales ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showOpcionales ? "Ocultar" : "Agregar"} datos opcionales (N° contenedor, booking, peso, devolución, instrucciones)
              </button>

              {showOpcionales && (
                <div className="space-y-4 border-l-2 border-teus-accent pl-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">N° contenedor</label>
                      <input type="text" value={form.nro_contenedor}
                        onChange={e => setForm({ ...form, nro_contenedor: e.target.value })}
                        placeholder="TGBU 1234567"
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1 font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-teus-text_dark">Booking / referencia</label>
                      <input type="text" value={form.booking_referencia}
                        onChange={e => setForm({ ...form, booking_referencia: e.target.value })}
                        placeholder="BK-2026-9876"
                        className="w-full bg-white border rounded-lg px-3 py-2 text-sm mt-1" />
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

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button onClick={cerrarModal} disabled={guardando}
                className="bg-white border border-teus-border_light hover:bg-teus-bg_soft text-teus-text_dark px-4 py-2.5 rounded-lg text-sm font-bold">
                Cancelar
              </button>
              <button onClick={() => guardar(false)} disabled={guardando}
                className="bg-white border-2 border-teus-accent-dark text-teus-accent-dark hover:bg-teus-bg_soft px-4 py-2.5 rounded-lg text-sm font-bold">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Guardar"}
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
