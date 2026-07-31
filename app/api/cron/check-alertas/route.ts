import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NTFY_TOPIC = "teus-alertas-flota";

type VehKm = {
  chapa: string;
  alias: string | null;
  km_actuales: number;
  km_restantes: number;
  intervalo_mantenimiento_km: number;
  estado_mant: "vencido" | "urgente" | "por_vencer" | "vigente";
};

type Habilitacion = {
  id: string;
  tipo: string;
  fecha_vencimiento: string;
  nro_certificado: string | null;
  vehiculos: { chapa: string; alias: string | null } | null;
};

async function enviarNtfy(titulo: string, mensaje: string, prioridad: "high" | "urgent" | "default" = "high") {
  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        "Title": titulo,
        "Priority": prioridad,
        "Tags": "truck,warning",
      },
      body: mensaje,
    });
    return res.ok;
  } catch (err) {
    console.error("Error ntfy:", err);
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const esTest = url.searchParams.get("test") === "1";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const debug: any = {
    tiene_url: !!supabaseUrl,
    tiene_service_key: !!serviceKey,
    service_key_prefix: serviceKey ? serviceKey.substring(0, 12) + "..." : null,
  };

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      success: false,
      error: "Faltan variables de entorno",
      debug,
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const alertas: string[] = [];
  const ahora = new Date();
  let hayCritico = false;

  // 1) MANTENIMIENTOS
  const { data: vehiculos, error: errVeh } = await supabase
    .from("v_vehiculos_km")
    .select("*")
    .order("km_restantes");

  debug.vehiculos_count = vehiculos?.length ?? 0;
  debug.vehiculos_error = errVeh?.message ?? null;
  debug.vehiculos_raw = vehiculos;

  if (vehiculos) {
    for (const v of vehiculos as VehKm[]) {
      const nombre = v.alias || v.chapa;
      const umbralAlerta = v.intervalo_mantenimiento_km - 1000;

      if (v.km_actuales >= v.intervalo_mantenimiento_km) {
        alertas.push(`🔴 ${nombre} (${v.chapa}): MANT. VENCIDO — ${v.km_actuales.toLocaleString()} km / ${v.intervalo_mantenimiento_km.toLocaleString()} límite. Programá el service YA.`);
        hayCritico = true;
      } else if (v.km_actuales >= umbralAlerta) {
        alertas.push(`🟡 ${nombre} (${v.chapa}): Próximo mantenimiento — faltan ${v.km_restantes.toLocaleString()} km. Programá turno con tu taller.`);
      }
    }
  }

  // 2) HABILITACIONES
  const { data: habs, error: errHab } = await supabase
    .from("habilitaciones")
    .select("id, tipo, fecha_vencimiento, nro_certificado, vehiculos(chapa, alias)")
    .not("fecha_vencimiento", "is", null);

  debug.habs_count = habs?.length ?? 0;
  debug.habs_error = errHab?.message ?? null;

  if (habs) {
    for (const h of habs as unknown as Habilitacion[]) {
      const vencimiento = new Date(h.fecha_vencimiento);
      const diffMs = vencimiento.getTime() - ahora.getTime();
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const chapa = h.vehiculos?.chapa || "?";
      const alias = h.vehiculos?.alias || chapa;
      const tipoUpper = h.tipo.toUpperCase();
      const fechaFmt = vencimiento.toLocaleDateString("es-PY");
      const cert = h.nro_certificado ? ` (cert. ${h.nro_certificado})` : "";

      if (diffDias < 0) {
        alertas.push(`⚫ ${alias} (${chapa}): ${tipoUpper} VENCIDA hace ${Math.abs(diffDias)} días (${fechaFmt})${cert}. Riesgo de multa caminera.`);
        hayCritico = true;
      } else if (diffDias === 0) {
        alertas.push(`🔴 ${alias} (${chapa}): ${tipoUpper} VENCE HOY (${fechaFmt})${cert}`);
        hayCritico = true;
      } else if (diffDias <= 7) {
        alertas.push(`🔴 ${alias} (${chapa}): ${tipoUpper} vence en ${diffDias} días (${fechaFmt})${cert} — URGENTE`);
        hayCritico = true;
      } else if (diffDias <= 15) {
        alertas.push(`🟠 ${alias} (${chapa}): ${tipoUpper} vence en ${diffDias} días (${fechaFmt})${cert}`);
      } else if (diffDias <= 20) {
        alertas.push(`🟡 ${alias} (${chapa}): ${tipoUpper} vence en ${diffDias} días (${fechaFmt})${cert} — Programá renovación`);
      }
    }
  }

  let enviadoOk = false;
  if (alertas.length > 0) {
    const titulo = `🚛 TEUS FLEET — ${alertas.length} alerta${alertas.length > 1 ? "s" : ""}`;
    const mensaje = alertas.join("\n\n");
    enviadoOk = await enviarNtfy(titulo, mensaje, hayCritico ? "urgent" : "high");
  } else if (esTest) {
    enviadoOk = await enviarNtfy(
      "🚛 TEUS FLEET — Sistema OK",
      "✅ No hay alertas pendientes.\nTodos los vehículos y habilitaciones están al día.\n\nEste mensaje es una prueba del sistema.",
      "default"
    );
  }

  return NextResponse.json({
    success: true,
    fecha: ahora.toISOString(),
    total_alertas: alertas.length,
    notificacion_enviada: enviadoOk,
    tipo_prioridad: hayCritico ? "urgent" : "high",
    alertas,
    debug,
  });
}
