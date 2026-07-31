"use client";

import { useEffect, useState } from "react";
import { Bell, Send, RefreshCw, CheckCircle2, AlertTriangle, Loader2, Smartphone } from "lucide-react";

type Resultado = {
  success: boolean;
  fecha: string;
  total_alertas: number;
  notificacion_enviada: boolean;
  tipo_prioridad: string;
  alertas: string[];
};

export default function AlertasPage() {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkNow(mandarNtfy: boolean) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/cron/check-alertas${mandarNtfy ? "?test=1" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResultado(data);
    } catch (err: any) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkNow(false);
  }, []);

  return (
    <div className="px-8 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Bell className="w-8 h-8 text-teus-accent" />
            Centro de Alertas
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">
            Estado en vivo. Notificaciones al celular vía ntfy.sh
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => checkNow(false)} disabled={loading}
            className="border border-teus-border_light hover:bg-gray-50 text-teus-text_dark font-semibold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </button>
          <button onClick={() => checkNow(true)} disabled={loading}
            className="bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-5 py-2.5 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm flex items-center gap-2 disabled:opacity-50">
            <Send className="w-4 h-4" />
            Enviar prueba al celular
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold text-blue-900">📱 Notificaciones activas en tu celular</div>
          <div className="text-blue-700 text-xs mt-1">
            Topic: <code className="bg-white px-1.5 py-0.5 rounded font-mono">ntfy.sh/teus-alertas-flota</code> ·
            Chequeo automático: <strong>diario a las 7:00 hs Paraguay</strong>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700">Error: {error}</div>}

      {loading && !resultado && (
        <div className="p-12 text-center text-teus-text_muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Chequeando alertas...
        </div>
      )}

      {resultado && (
        <>
          <div className={`rounded-xl p-5 mb-6 border ${
            resultado.total_alertas === 0 ? "bg-green-50 border-green-200"
              : resultado.tipo_prioridad === "urgent" ? "bg-red-50 border-red-200"
                : "bg-yellow-50 border-yellow-200"
          }`}>
            <div className="flex items-center gap-3">
              {resultado.total_alertas === 0 ? (
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              ) : (
                <AlertTriangle className={`w-10 h-10 ${resultado.tipo_prioridad === "urgent" ? "text-red-600" : "text-yellow-600"}`} />
              )}
              <div>
                <div className={`text-2xl font-black ${
                  resultado.total_alertas === 0 ? "text-green-800"
                    : resultado.tipo_prioridad === "urgent" ? "text-red-800" : "text-yellow-800"
                }`}>
                  {resultado.total_alertas === 0 ? "✅ Todo bajo control"
                    : `${resultado.total_alertas} alerta${resultado.total_alertas > 1 ? "s" : ""} pendiente${resultado.total_alertas > 1 ? "s" : ""}`}
                </div>
                <div className="text-xs text-teus-text_muted mt-0.5">
                  Última revisión: {new Date(resultado.fecha).toLocaleString("es-PY")}
                </div>
              </div>
            </div>
          </div>

          {resultado.alertas.length > 0 ? (
            <div className="bg-teus-card_light border border-teus-border_light rounded-xl overflow-hidden shadow-card">
              <div className="px-5 py-3 bg-teus-bg_soft border-b border-teus-border_light">
                <div className="text-sm font-bold text-teus-text_dark">Detalle de alertas</div>
              </div>
              <div className="divide-y divide-teus-border_light">
                {resultado.alertas.map((alerta, i) => (
                  <div key={i} className="px-5 py-4 text-sm hover:bg-teus-bg_soft/50">{alerta}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-teus-card_light border border-teus-border_light rounded-xl p-8 text-center shadow-card">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <div className="text-lg font-bold text-teus-text_dark">Todos los sistemas verdes</div>
              <div className="text-sm text-teus-text_muted mt-2">
                Ningún mantenimiento próximo. Ninguna habilitación por vencer en los próximos 20 días.
              </div>
            </div>
          )}

          <div className="mt-8 bg-teus-card_light border border-teus-border_light rounded-xl p-5 shadow-card">
            <h3 className="text-sm font-bold text-teus-text_dark mb-3">🧠 Cómo funcionan las alertas</h3>
            <div className="grid grid-cols-2 gap-4 text-xs text-teus-text_muted">
              <div>
                <div className="font-semibold text-teus-text_dark mb-1">🔧 Mantenimientos</div>
                <ul className="space-y-1">
                  <li>🟡 Aviso diario desde <strong>19.000 km</strong></li>
                  <li>🔴 Aviso diario cuando pasa los <strong>20.000 km</strong></li>
                  <li>🛑 Se apaga al registrar el mantenimiento</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-teus-text_dark mb-1">📄 Habilitaciones</div>
                <ul className="space-y-1">
                  <li>🟡 Aviso diario desde <strong>20 días antes</strong></li>
                  <li>🟠 Aviso desde <strong>15 días antes</strong></li>
                  <li>🔴 Aviso desde <strong>7 días antes</strong></li>
                  <li>⚫ Aviso hasta que renueves la habilitación</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
