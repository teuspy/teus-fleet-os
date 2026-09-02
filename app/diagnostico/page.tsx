"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileSpreadsheet, Loader2, Download, Calendar } from "lucide-react";
import * as XLSX from "xlsx";

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function fmtFecha(iso: string | null): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}
function mesLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${MESES[parseInt(m)-1]} ${y}`;
}
function mesKey(iso: string): string {
  const [y, m] = iso.split("T")[0].split("-");
  return `${y}-${m}`;
}

export default function DiagnosticoPage() {
  const supabase = createClient();
  const [fechaDesde, setFechaDesde] = useState("2026-07-01");
  const [fechaHasta, setFechaHasta] = useState(toISO(new Date()));
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState("");

  async function exportar() {
    if (!fechaDesde || !fechaHasta) {
      alert("Elegí un rango de fechas");
      return;
    }
    setExporting(true);
    setProgress("📥 Cargando datos...");

    try {
      const [
        viajesRes, facturasRes, gastosRes, gastosFijosRes, mantenimientosRes,
        vehiculosRes, choferesRes, clientesRes, proveedoresRes,
        recargasRes, pagosViaticoRes
      ] = await Promise.all([
        supabase.from("viajes")
          .select("*, cliente:cliente_id(nombre), vehiculo:vehiculo_id(nombre_equipo, chapa), chofer:chofer_id(nombre_completo), factura:factura_id(nro_factura)")
          .gte("fecha", fechaDesde).lte("fecha", fechaHasta).order("fecha"),
        supabase.from("facturas")
          .select("*, cliente:cliente_id(nombre)")
          .gte("fecha_emision", fechaDesde).lte("fecha_emision", fechaHasta).order("fecha_emision"),
        supabase.from("gastos").select("*, proveedor:proveedor_id(nombre), vehiculo:vehiculo_id(nombre_equipo)")
          .gte("fecha", fechaDesde).lte("fecha", fechaHasta).order("fecha"),
        supabase.from("gastos_fijos").select("*"),
        supabase.from("mantenimientos").select("*, vehiculo:vehiculo_id(nombre_equipo, chapa)")
          .gte("fecha", fechaDesde).lte("fecha", fechaHasta).order("fecha"),
        supabase.from("vehiculos").select("*").order("nombre_equipo"),
        supabase.from("choferes").select("*").order("nombre_completo"),
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("proveedores").select("*").order("nombre"),
        supabase.from("recargas_combustible").select("*, proveedor:proveedor_id(nombre)")
          .gte("fecha", fechaDesde).lte("fecha", fechaHasta),
        supabase.from("pagos_viatico").select("*")
          .gte("fecha_pago", fechaDesde).lte("fecha_pago", fechaHasta),
      ]);

      const viajes = (viajesRes.data as any[]) || [];
      const facturas = (facturasRes.data as any[]) || [];
      const gastos = (gastosRes.data as any[]) || [];
      const gastosFijos = (gastosFijosRes.data as any[]) || [];
      const mantenimientos = (mantenimientosRes.data as any[]) || [];
      const vehiculos = (vehiculosRes.data as any[]) || [];
      const clientes = (clientesRes.data as any[]) || [];

      setProgress("📊 Armando Resumen Ejecutivo...");

      // Meses en el rango
      const mesesUnicos = new Set<string>();
      const dIni = new Date(fechaDesde);
      const dFin = new Date(fechaHasta);
      const cursor = new Date(dIni.getFullYear(), dIni.getMonth(), 1);
      while (cursor <= dFin) {
        mesesUnicos.add(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}`);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      const meses = Array.from(mesesUnicos).sort();

      const wb = XLSX.utils.book_new();

      // ===================== HOJA 1: RESUMEN EJECUTIVO =====================
      const totalGastosFijosMes = gastosFijos.reduce((s, g) => s + (g.monto_mensual || 0), 0);
      const resumenRows: any[][] = [
        ["RESUMEN EJECUTIVO MENSUAL - TEUS LOGISTICS"],
        [`Período: ${fmtFecha(fechaDesde)} al ${fmtFecha(fechaHasta)}`],
        [""],
        ["Mes", "Facturación", "Cobrado", "Por Cobrar", "Viajes Total", "Viajes Propios", "Viajes Terceros", "Ingreso Operativo", "Costos Directos", "Margen Bruto", "Gastos Variables", "Gastos Fijos", "Mantenimientos", "Resultado Operativo", "Km Recorridos"],
      ];

      let totFact = 0, totCob = 0, totPorCob = 0, totViajes = 0, totVP = 0, totVT = 0;
      let totIng = 0, totCD = 0, totMB = 0, totGV = 0, totGF = 0, totMant = 0, totRes = 0, totKm = 0;

      for (const mes of meses) {
        const vMes = viajes.filter(v => mesKey(v.fecha) === mes);
        const fMes = facturas.filter(f => mesKey(f.fecha_emision) === mes);
        const gMes = gastos.filter(g => mesKey(g.fecha) === mes);
        const mMes = mantenimientos.filter(m => mesKey(m.fecha) === mes);

        const fact = fMes.filter(f => f.estado !== "anulada").reduce((s, f) => s + (f.monto || 0), 0);
        const cob = fMes.filter(f => f.estado === "pagado").reduce((s, f) => s + (f.monto || 0), 0);
        const porCob = fact - cob;
        const nViajes = vMes.length;
        const vProp = vMes.filter(v => !v.vehiculo_externo_id).length;
        const vTer = vMes.filter(v => v.vehiculo_externo_id).length;
        const ing = vMes.reduce((s, v) => s + (v.precio_flete || 0) + (v.ingresos_extras_monto || 0), 0);
        const cd = vMes.reduce((s, v) => s + (v.costo_combustible || 0) + (v.viatico || 0) + (v.otros_costos || 0) + (v.insumos_estacion_monto || 0), 0);
        const mb = ing - cd;
        const gv = gMes.reduce((s, g) => s + (g.monto || 0), 0);
        const gf = totalGastosFijosMes;
        const mant = mMes.reduce((s, m) => s + (m.costo_total || m.costo || 0), 0);
        const res = mb - gv - gf - mant;
        const km = vMes.reduce((s, v) => s + (v.km_viaje || 0), 0);

        resumenRows.push([mesLabel(mes + "-01"), fact, cob, porCob, nViajes, vProp, vTer, ing, cd, mb, gv, gf, mant, res, km]);
        totFact += fact; totCob += cob; totPorCob += porCob; totViajes += nViajes; totVP += vProp; totVT += vTer;
        totIng += ing; totCD += cd; totMB += mb; totGV += gv; totGF += gf; totMant += mant; totRes += res; totKm += km;
      }
      resumenRows.push(["TOTAL", totFact, totCob, totPorCob, totViajes, totVP, totVT, totIng, totCD, totMB, totGV, totGF, totMant, totRes, totKm]);

      const ws1 = XLSX.utils.aoa_to_sheet(resumenRows);
      ws1["!cols"] = [{wch:12},{wch:15},{wch:15},{wch:15},{wch:12},{wch:14},{wch:14},{wch:16},{wch:15},{wch:15},{wch:15},{wch:14},{wch:15},{wch:18},{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws1, "1. Resumen Ejecutivo");

      setProgress("📋 Armando Operaciones...");

      // ===================== HOJA 2: OPERACIONES =====================
      const opRows: any[][] = [
        ["ID","Fecha","Cliente","Vehículo","Chapa","Chofer","Origen","Destino","Km","Contenedor","Litros","Gs/Litro","Costo Combustible","Viático","Otros Costos","Insumos Extra Est.","Detalle Insumos","Ingresos Extras","Detalle Ingresos","Precio Flete","Flete Cliente Total","Aliado Externo","Chofer Externo","Precio Pagado Aliado","Comisión 5%","Utilidad Bruta","N° Factura","Estado","Observación"],
      ];
      for (const v of viajes) {
        opRows.push([
          v.id, fmtFecha(v.fecha), v.cliente?.nombre || "-",
          v.vehiculo?.nombre_equipo || "-", v.vehiculo?.chapa || "-",
          v.chofer?.nombre_completo || "-",
          v.origen, v.destino, v.km_viaje || 0, v.nro_contenedor || "-",
          v.litros || 0, v.gs_por_litro || 0, v.costo_combustible || 0,
          v.viatico || 0, v.otros_costos || 0, v.insumos_estacion_monto || 0,
          v.insumos_estacion_detalle || "-", v.ingresos_extras_monto || 0,
          v.ingresos_extras_detalle || "-", v.precio_flete || 0,
          (v.precio_flete || 0) + (v.ingresos_extras_monto || 0),
          v.vehiculo_externo_id || "-", v.chofer_externo_nombre || "-",
          v.precio_pagado_al_externo || 0, v.comision_recibida || 0,
          v.utilidad_bruta || 0, v.factura?.nro_factura || "-",
          v.estado, v.observacion || "-",
        ]);
      }
      const ws2 = XLSX.utils.aoa_to_sheet(opRows);
      XLSX.utils.book_append_sheet(wb, ws2, "2. Operaciones");

      setProgress("🚛 Armando Rentabilidad por Camión...");

      // ===================== HOJA 3: RENTABILIDAD POR CAMIÓN =====================
      const rentHeader = ["Camión","Chapa"];
      for (const mes of meses) {
        rentHeader.push(`${mesLabel(mes+"-01")} Viajes`, `${mesLabel(mes+"-01")} Facturación`, `${mesLabel(mes+"-01")} Costos Directos`, `${mesLabel(mes+"-01")} Utilidad`);
      }
      rentHeader.push("Total Viajes", "Total Facturación", "Total Costos", "Total Utilidad", "Km Totales", "Mantenimientos");
      const rentRows: any[][] = [rentHeader];

      for (const veh of vehiculos) {
        const row: any[] = [veh.nombre_equipo, veh.chapa || "-"];
        let tV = 0, tF = 0, tC = 0, tU = 0, tKm = 0;
        for (const mes of meses) {
          const vMes = viajes.filter(v => v.vehiculo_id === veh.id && mesKey(v.fecha) === mes);
          const nV = vMes.length;
          const fac = vMes.reduce((s, v) => s + (v.precio_flete || 0) + (v.ingresos_extras_monto || 0), 0);
          const cd = vMes.reduce((s, v) => s + (v.costo_combustible || 0) + (v.viatico || 0) + (v.otros_costos || 0) + (v.insumos_estacion_monto || 0), 0);
          const ut = vMes.reduce((s, v) => s + (v.utilidad_bruta || 0), 0);
          row.push(nV, fac, cd, ut);
          tV += nV; tF += fac; tC += cd; tU += ut;
        }
        const vTotal = viajes.filter(v => v.vehiculo_id === veh.id);
        tKm = vTotal.reduce((s, v) => s + (v.km_viaje || 0), 0);
        const mantVeh = mantenimientos.filter(m => m.vehiculo_id === veh.id).reduce((s, m) => s + (m.costo_total || m.costo || 0), 0);
        row.push(tV, tF, tC, tU, tKm, mantVeh);
        rentRows.push(row);
      }
      const ws3 = XLSX.utils.aoa_to_sheet(rentRows);
      XLSX.utils.book_append_sheet(wb, ws3, "3. Rentabilidad Camión");

      setProgress("🤝 Armando Operaciones Tercerizadas...");

      // ===================== HOJA 4: TERCERIZADAS =====================
      const terRows: any[][] = [
        ["Fecha","Cliente","Aliado","Chofer Externo","Ruta","Contenedor","Precio Facturado","Precio Pagado Aliado","Comisión 5%","Estadía","Margen Neto","Estado"],
      ];
      const tercerizadas = viajes.filter(v => v.vehiculo_externo_id);
      for (const v of tercerizadas) {
        const pagado = v.precio_pagado_al_externo || v.precio_flete || 0;
        const com = v.comision_recibida || 0;
        const est = v.ingresos_extras_monto || 0;
        const margen = (v.precio_flete || 0) - pagado + com + est;
        terRows.push([
          fmtFecha(v.fecha), v.cliente?.nombre || "-", v.vehiculo_externo_id,
          v.chofer_externo_nombre || "-", `${v.origen}→${v.destino}`,
          v.nro_contenedor || "-", v.precio_flete || 0, pagado, com, est, margen, v.estado,
        ]);
      }
      const ws4 = XLSX.utils.aoa_to_sheet(terRows);
      XLSX.utils.book_append_sheet(wb, ws4, "4. Tercerizadas");

      setProgress("👥 Armando Clientes...");

      // ===================== HOJA 5: CLIENTES =====================
      const cliRows: any[][] = [
        ["Cliente","Viajes","Facturación","Cobrado","Por Cobrar","Costos Directos","Margen Bruto","Margen %","Última operación"],
      ];
      for (const c of clientes) {
        const vCli = viajes.filter(v => v.cliente_id === c.id);
        if (vCli.length === 0) continue;
        const fCli = facturas.filter(f => f.cliente_id === c.id && f.estado !== "anulada");
        const nV = vCli.length;
        const fact = fCli.reduce((s, f) => s + (f.monto || 0), 0);
        const cob = fCli.filter(f => f.estado === "pagado").reduce((s, f) => s + (f.monto || 0), 0);
        const porCob = fact - cob;
        const cd = vCli.reduce((s, v) => s + (v.costo_combustible || 0) + (v.viatico || 0) + (v.otros_costos || 0) + (v.insumos_estacion_monto || 0), 0);
        const ing = vCli.reduce((s, v) => s + (v.precio_flete || 0) + (v.ingresos_extras_monto || 0), 0);
        const mb = ing - cd;
        const mpct = ing > 0 ? (mb / ing * 100).toFixed(1) + "%" : "-";
        const ultOp = vCli.map(v => v.fecha).sort().pop();
        cliRows.push([c.nombre, nV, fact, cob, porCob, cd, mb, mpct, ultOp ? fmtFecha(ultOp) : "-"]);
      }
      const ws5 = XLSX.utils.aoa_to_sheet(cliRows);
      XLSX.utils.book_append_sheet(wb, ws5, "5. Clientes");

      setProgress("💾 Descargando archivo...");
      const nombreArchivo = `Diagnostico-TEUS-${fechaDesde}_a_${fechaHasta}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);

      setProgress("✅ ¡Listo!");
      setTimeout(() => setProgress(""), 3000);
    } catch (err: any) {
      alert("Error al exportar: " + (err.message || "desconocido"));
      setProgress("");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <FileSpreadsheet className="w-8 h-8 text-teus-accent" />
        <h1 className="text-2xl font-black text-teus-text_dark">Diagnóstico TEUS</h1>
      </div>
      <p className="text-sm text-teus-text_muted mb-6">
        Exportá toda la información operativa y financiera en un Excel completo para análisis externo
      </p>

      <div className="bg-white rounded-2xl shadow p-6 border border-teus-border_light">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider block mb-1">Fecha desde</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teus-accent" />
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-teus-text_muted uppercase tracking-wider block mb-1">Fecha hasta</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teus-accent" />
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-sm font-bold text-blue-900 mb-2">📋 Este Excel incluye 5 hojas críticas:</div>
          <ul className="text-xs text-blue-800 space-y-0.5 ml-4 list-disc">
            <li><strong>Resumen Ejecutivo</strong> mensual con facturación, cobros, margen y resultado operativo</li>
            <li><strong>Operaciones</strong>: detalle completo de cada viaje con costos, ingresos, utilidad</li>
            <li><strong>Rentabilidad por Camión</strong>: matriz mensual por vehículo</li>
            <li><strong>Operaciones Tercerizadas</strong>: viajes con camión de TL o Elvio</li>
            <li><strong>Clientes</strong>: facturación, cobros, margen, saldo por cliente</li>
          </ul>
          <div className="text-[10px] text-blue-700 mt-3 font-bold">
            Próxima versión sumará: Proveedores, Gastos, Mantenimientos, Cuentas por Cobrar/Pagar, Reconciliación TL, Calidad de datos, Diccionario.
          </div>
        </div>

        <button
          onClick={exportar}
          disabled={exporting}
          className="w-full bg-teus-accent hover:bg-teus-accent-2 text-white px-6 py-3 rounded-lg text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {exporting ? "Generando..." : "📊 Exportar Diagnóstico TEUS"}
        </button>

        {progress && (
          <div className="mt-4 text-center text-sm text-teus-accent font-bold">{progress}</div>
        )}
      </div>
    </div>
  );
}
