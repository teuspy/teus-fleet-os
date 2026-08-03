"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Wallet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Circle,
} from "lucide-react";

type Viaje = {
  id: string;
  fecha: string;
  vehiculo_id: string | null;
  vehiculo_externo_id: string | null;
  viatico: number;
  origen: string;
  destino: string;
  chofer_id: string | null;
  vehiculo?: { alias: string | null; chapa: string } | null;
  chofer?: { nombre: string } | null;
};

type PagoViatico = {
  id: string;
  fecha_pago: string;
  monto: number;
  semana_inicio: string;
  notas: string | null;
  created_at: string;
};

// ---------- Helpers de fecha ----------
function getLunes(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function fmtGs(n: number): string {
  return "Gs. " + Math.round(n).toLocaleString("es-PY");
}

function fmtFechaCorta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function fmtFechaLarga(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// ---------- Componente principal ----------
export default function ConciliacionViaticos() {
  const supabase = createClient();
  const [lunes, setLunes] = useState<Date>(getLunes(new Date()));
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [pagos, setPagos] = useState<PagoViatico[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(toISO(new Date()));
  const [nuevasNotas, setNuevasNotas] = useState("");

  const domingo = useMemo(() => addDays(lunes, 6), [lunes]);
  const semanaISO = toISO(lunes);

  async function loadData() {
    setLoading(true);

    const [viajesRes, vehRes, chofRes, pagosRes] = await Promise.all([
      supabase
        .from("viajes")
        .select("*")
        .gte("fecha", toISO(lunes))
        .lte("fecha", toISO(domingo)),
      supabase.from("vehiculos").select("id, alias, chapa"),
      supabase.from("choferes").select("id, nombre"),
      supabase
        .from("pagos_viatico")
        .select("*")
        .eq("semana_inicio", semanaISO)
        .order("fecha_pago", { ascending: true }),
    ]);

    const vehiculosMap = new Map(
      ((vehRes.data as any[]) || []).map((v) => [v.id, v])
    );
    const choferesMap = new Map(
      ((chofRes.data as any[]) || []).map((c) => [c.id, c])
    );

    const viajesEnriquecidos: Viaje[] = ((viajesRes.data as any[]) || [])
      .filter((v: any) => !v.vehiculo_externo_id)
      .map((v: any) => ({
        ...v,
        vehiculo: v.vehiculo_id ? vehiculosMap.get(v.vehiculo_id) : null,
        chofer: v.chofer_id ? choferesMap.get(v.chofer_id) : null,
      }));

    setViajes(viajesEnriquecidos);
    setPagos((pagosRes.data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanaISO]);

  const totalGenerado = useMemo(
    () => viajes.reduce((s, v) => s + (v.viatico || 0), 0),
    [viajes]
  );
  const totalPagado = useMemo(
    () => pagos.reduce((s, p) => s + (p.monto || 0), 0),
    [pagos]
  );
  const saldo = totalGenerado - totalPagado;

  let estado: "pagado" | "parcial" | "pendiente" | "sin_movimiento";
  if (totalGenerado === 0) estado = "sin_movimiento";
  else if (saldo <= 0) estado = "pagado";
  else if (totalPagado > 0) estado = "parcial";
  else estado = "pendiente";

  const estadoConfig = {
    pagado: {
      label: "PAGADO",
      color: "bg-green-500 text-white",
      icon: CheckCircle2,
      bgSaldo: "bg-green-50 border-green-200",
      textSaldo: "text-green-700",
    },
    parcial: {
      label: "PARCIAL",
      color: "bg-yellow-500 text-white",
      icon: AlertCircle,
      bgSaldo: "bg-yellow-50 border-yellow-200",
      textSaldo: "text-yellow-700",
    },
    pendiente: {
      label: "PENDIENTE",
      color: "bg-red-500 text-white",
      icon: AlertCircle,
      bgSaldo: "bg-red-50 border-red-200",
      textSaldo: "text-red-700",
    },
    sin_movimiento: {
      label: "SIN MOVIMIENTO",
      color: "bg-gray-400 text-white",
      icon: Circle,
      bgSaldo: "bg-gray-50 border-gray-200",
      textSaldo: "text-gray-600",
    },
  };
  const cfg = estadoConfig[estado];

  async function registrarPago() {
    const monto = parseFloat(nuevoMonto.replace(/[^\d.]/g, ""));
    if (!monto || monto <= 0) {
      alert("Ingresá un monto válido");
      return;
    }
    if (!nuevaFecha) {
      alert("Ingresá la fecha del pago");
      return;
    }
    const { error } = await supabase.from("pagos_viatico").insert({
      fecha_pago: nuevaFecha,
      monto,
      semana_inicio: semanaISO,
      notas: nuevasNotas || null,
    });
    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }
    setNuevoMonto("");
    setNuevasNotas("");
    setMostrarForm(false);
    loadData();
  }

  async function eliminarPago(id: string) {
    if (!confirm("¿Eliminar este pago?")) return;
    const { error } = await supabase.from("pagos_viatico").delete().eq("id", id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    loadData();
  }

  function semanaAnterior() {
    setLunes(addDays(lunes, -7));
  }
  function semanaSiguiente() {
    setLunes(addDays(lunes, 7));
  }
  function semanaActual() {
    setLunes(getLunes(new Date()));
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Wallet className="w-8 h-8 text-green-700" />
        <h1 className="text-2xl font-black text-gray-900">
          Conciliación Viáticos Semanal
        </h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Pagos semanales a David (TL) · Soporta pagos parciales
      </p>

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex items-center justify-between">
        <button
          onClick={semanaAnterior}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase font-bold">Semana</div>
          <div className="text-lg font-black text-gray-900">
            Lun {fmtFechaLarga(lunes)} → Dom {fmtFechaLarga(domingo)}
          </div>
          <button
            onClick={semanaActual}
            className="text-xs text-green-700 hover:underline mt-1"
          >
            Ir a semana actual
          </button>
        </div>
        <button
          onClick={semanaSiguiente}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-700" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs text-gray-500 uppercase font-bold">
                Viáticos generados
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {fmtGs(totalGenerado)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {viajes.length} viajes con camión propio
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs text-gray-500 uppercase font-bold">
                Total pagado
              </div>
              <div className="text-2xl font-black text-green-700 mt-1">
                {fmtGs(totalPagado)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {pagos.length} {pagos.length === 1 ? "pago" : "pagos"} registrados
              </div>
            </div>
            <div className={`rounded-xl border-2 p-4 ${cfg.bgSaldo}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase font-bold text-gray-500">
                  Saldo pendiente
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.color}`}
                >
                  {cfg.label}
                </span>
              </div>
              <div className={`text-2xl font-black mt-1 ${cfg.textSaldo}`}>
                {fmtGs(Math.max(0, saldo))}
              </div>
              {saldo < 0 && (
                <div className="text-xs text-green-700 mt-1">
                  Pagaste {fmtGs(Math.abs(saldo))} de más
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <h2 className="text-lg font-black text-gray-900 mb-3">
              Viajes con camión propio ({viajes.length})
            </h2>
            {viajes.length === 0 ? (
              <div className="text-sm text-gray-500 py-6 text-center">
                Sin viajes con camión propio en esta semana
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Equipo</th>
                      <th className="text-left p-2">Chofer</th>
                      <th className="text-left p-2">Ruta</th>
                      <th className="text-right p-2">Viático</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viajes.map((v) => (
                      <tr key={v.id} className="border-t hover:bg-gray-50">
                        <td className="p-2">{fmtFechaCorta(v.fecha)}</td>
                        <td className="p-2 font-bold">
                          {v.vehiculo?.alias || v.vehiculo?.chapa || "—"}
                        </td>
                        <td className="p-2">{v.chofer?.nombre || "—"}</td>
                        <td className="p-2">
                          {v.origen} → {v.destino}
                        </td>
                        <td className="p-2 text-right font-bold">
                          {fmtGs(v.viatico || 0)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-green-600 bg-gray-50 font-black">
                      <td colSpan={4} className="p-2 text-right">
                        TOTAL VIÁTICOS SEMANA
                      </td>
                      <td className="p-2 text-right text-green-700">
                        {fmtGs(totalGenerado)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-gray-900">
                Pagos de esta semana ({pagos.length})
              </h2>
              {!mostrarForm && (
                <button
                  onClick={() => setMostrarForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Registrar pago
                </button>
              )}
            </div>

            {mostrarForm && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <h3 className="font-bold text-sm mb-3">Nuevo pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">
                      Monto (Gs.)
                    </label>
                    <input
                      type="number"
                      value={nuevoMonto}
                      onChange={(e) => setNuevoMonto(e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                      placeholder="3000000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">
                      Fecha del pago
                    </label>
                    <input
                      type="date"
                      value={nuevaFecha}
                      onChange={(e) => setNuevaFecha(e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">
                      Notas (opcional)
                    </label>
                    <input
                      type="text"
                      value={nuevasNotas}
                      onChange={(e) => setNuevasNotas(e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                      placeholder="Pago parcial, efectivo..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={registrarPago}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Guardar pago
                  </button>
                  <button
                    onClick={() => {
                      setMostrarForm(false);
                      setNuevoMonto("");
                      setNuevasNotas("");
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {pagos.length === 0 ? (
              <div className="text-sm text-gray-500 py-6 text-center">
                Sin pagos registrados para esta semana
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Fecha pago</th>
                      <th className="text-left p-2">Notas</th>
                      <th className="text-right p-2">Monto</th>
                      <th className="text-center p-2 w-16">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="p-2">{fmtFechaCorta(p.fecha_pago)}</td>
                        <td className="p-2 text-gray-600">{p.notas || "—"}</td>
                        <td className="p-2 text-right font-bold text-green-700">
                          {fmtGs(p.monto)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => eliminarPago(p.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-green-500 bg-green-50 font-black">
                      <td colSpan={2} className="p-2 text-right">
                        TOTAL PAGADO
                      </td>
                      <td className="p-2 text-right text-green-700">
                        {fmtGs(totalPagado)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
