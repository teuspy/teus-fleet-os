"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Fuel, Loader2, ArrowRight, FileText, CheckCircle } from "lucide-react";
import Link from "next/link";

type Proveedor = {
  id: string;
  nombre: string;
  gs_por_litro: number | null;
  activo: boolean;
};

type SaldoProveedor = {
  proveedor: Proveedor;
  viajesPendientes: number;
  recargasPendientes: number;
  litrosPendientes: number;
  montoPendiente: number;
};

function fmtGs(n: number) {
  return "Gs. " + Math.round(n || 0).toLocaleString("es-PY");
}

export default function CombustibleDashboardPage() {
  const supabase = createClient();
  const [saldos, setSaldos] = useState<SaldoProveedor[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    const [provRes, viajesRes, recargasRes] = await Promise.all([
      supabase.from("proveedores")
        .select("id, nombre, gs_por_litro, activo")
        .eq("tipo", "combustible")
        .order("nombre"),
      supabase.from("viajes")
        .select("proveedor_combustible_id, litros, costo_combustible, insumos_estacion_monto")
        .not("proveedor_combustible_id", "is", null)
        .is("arreglo_combustible_id", null)
        .is("vehiculo_externo_id", null),
      supabase.from("recargas_combustible")
        .select("proveedor_id, litros, monto_total")
        .not("proveedor_id", "is", null)
        .is("arreglo_combustible_id", null),
    ]);

    const proveedores = (provRes.data || []) as Proveedor[];
    const viajes = (viajesRes.data || []) as any[];
    const recargas = (recargasRes.data || []) as any[];

    const saldosCalc: SaldoProveedor[] = proveedores.map(p => {
      const vsP = viajes.filter(v => v.proveedor_combustible_id === p.id);
      const rsP = recargas.filter(r => r.proveedor_id === p.id);
      const litrosV = vsP.reduce((s, v) => s + (v.litros || 0), 0);
      const litrosR = rsP.reduce((s, r) => s + (r.litros || 0), 0);
      const combV = vsP.reduce((s, v) => s + (v.costo_combustible || 0), 0);
      const insumosV = vsP.reduce((s, v) => s + (v.insumos_estacion_monto || 0), 0);
      const combR = rsP.reduce((s, r) => s + (r.monto_total || 0), 0);
      return {
        proveedor: p,
        viajesPendientes: vsP.length,
        recargasPendientes: rsP.length,
        litrosPendientes: litrosV + litrosR,
        montoPendiente: combV + insumosV + combR,
      };
    });

    // Mostrar activos siempre, inactivos solo si tienen saldo pendiente
    const filtrados = saldosCalc.filter(s => s.proveedor.activo || s.montoPendiente > 0);
    // Ordenar: primero los que tienen deuda, después los al día
    filtrados.sort((a, b) => b.montoPendiente - a.montoPendiente);

    setSaldos(filtrados);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const totalGeneral = saldos.reduce((s, x) => s + x.montoPendiente, 0);
  const litrosGeneral = saldos.reduce((s, x) => s + x.litrosPendientes, 0);
  const viajesGeneral = saldos.reduce((s, x) => s + x.viajesPendientes, 0);
  const estacionesConDeuda = saldos.filter(s => s.montoPendiente > 0).length;

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-teus-text_dark flex items-center gap-3">
            <Fuel className="w-8 h-8 text-amber-600" />
            Combustible — Arreglos por proveedor
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Deudas pendientes con cada estación de servicio. Elegí un rango y cerrá el arreglo cuando pagues.
          </p>
        </div>
        <Link
          href="/combustible/historial"
          className="bg-teus-card_light border border-teus-border_light hover:bg-teus-bg_soft px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Historial de arreglos cerrados
        </Link>
      </div>

      <div className="bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl p-6 shadow-2xl mb-6">
        <div className="text-xs uppercase tracking-widest opacity-80 mb-2">💰 Total pendiente en todas las estaciones</div>
        <div className="text-4xl font-black">{fmtGs(totalGeneral)}</div>
        <div className="text-sm mt-2 opacity-90">
          {litrosGeneral.toLocaleString("es-PY")} lts · {viajesGeneral} viajes · {estacionesConDeuda} {estacionesConDeuda === 1 ? "estación con deuda" : "estaciones con deuda"}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-teus-text_muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando saldos...
        </div>
      ) : saldos.length === 0 ? (
        <div className="p-16 text-center text-teus-text_muted bg-teus-card_light border border-teus-border_light rounded-xl">
          <Fuel className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-bold">No hay proveedores de combustible activos.</p>
          <p className="text-xs mt-2">Andá a Configuración → Proveedores y agregá tus estaciones (Puma, Copasa, Petrosul, etc.).</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {saldos.map(s => {
            const alDia = s.montoPendiente === 0;
            return (
              <div key={s.proveedor.id} className={`bg-teus-card_light border-2 rounded-2xl p-5 shadow-card ${alDia ? "border-green-300" : "border-amber-400"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-teus-text_dark">{s.proveedor.nombre}</h3>
                      {!s.proveedor.activo && <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-bold">INACTIVO</span>}
                    </div>
                    <div className="text-xs text-teus-text_muted mt-1">
                      Precio actual: {s.proveedor.gs_por_litro ? `${fmtGs(s.proveedor.gs_por_litro)}/L` : "no configurado"}
                    </div>
                  </div>
                  {alDia && (
                    <div className="text-green-600 flex items-center gap-1 text-sm font-bold">
                      <CheckCircle className="w-5 h-5" />
                      Al día
                    </div>
                  )}
                </div>

                {!alDia ? (
                  <>
                    <div className="bg-white rounded-lg p-4 border border-amber-200 mb-3">
                      <div className="text-xs uppercase font-bold text-amber-700 mb-1">Debés</div>
                      <div className="text-3xl font-black text-amber-900">{fmtGs(s.montoPendiente)}</div>
                      <div className="text-xs text-amber-700 mt-1">
                        {s.litrosPendientes.toLocaleString("es-PY")} lts · {s.viajesPendientes} viajes{s.recargasPendientes > 0 ? ` + ${s.recargasPendientes} recargas sueltas` : ""}
                      </div>
                    </div>
                    <Link
                      href={`/combustible/${s.proveedor.id}`}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
                    >
                      Ver arreglo y cerrar cuenta
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center py-4 text-sm text-teus-text_muted bg-green-50 border border-green-200 rounded-lg">
                      Sin viajes ni recargas pendientes con esta estación.
                    </div>
                    <Link
                      href={`/combustible/${s.proveedor.id}`}
                      className="w-full bg-teus-bg_soft hover:bg-teus-card_light border border-teus-border_light text-teus-text_dark px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition"
                    >
                      Ver detalle / hacer arreglo adelantado
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
