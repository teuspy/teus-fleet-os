import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Feature = { title: string; desc: string };

export default function ComingSoon({
  title,
  subtitle,
  icon: Icon = Sparkles,
  features = [],
}: {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  features?: Feature[];
}) {
  return (
    <div className="px-8 py-6 pb-16 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-teus-text_dark flex items-center gap-3">
            <Icon className="w-8 h-8 text-teus-accent" />
            {title}
          </h1>
          <p className="text-sm text-teus-text_muted mt-1">{subtitle}</p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-teus-text_muted hover:text-teus-accent transition flex items-center gap-2 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Link>
      </div>

      {/* Card centrada */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="bg-teus-card_light border border-teus-border_light rounded-3xl p-10 text-center relative overflow-hidden animate-slide-up shadow-card">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-teus-accent/10 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teus-accent/10 border border-teus-accent/30 mb-6 animate-pulse-slow">
                <Icon className="w-10 h-10 text-teus-accent" />
              </div>

              <div className="inline-block bg-teus-accent/10 border border-teus-accent/30 text-teus-accent text-[10px] font-black uppercase tracking-[2px] px-3 py-1 rounded-full mb-4">
                Próximamente
              </div>

              <h2 className="text-3xl font-black tracking-tight mb-3 text-teus-text_dark">{title}</h2>
              <p className="text-teus-text_muted leading-relaxed max-w-md mx-auto">
                Esta sección está en construcción. La estamos armando en las próximas iteraciones para que quede al mismo nivel que Vehículos.
              </p>

              {features.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-[2px] text-teus-accent font-black mt-8 mb-3">
                    Va a incluir
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                    {features.map((f) => (
                      <div
                        key={f.title}
                        className="bg-teus-hover_light border border-teus-border_light rounded-xl p-4 hover:border-teus-accent transition"
                      >
                        <div className="text-sm font-bold text-teus-text_dark">{f.title}</div>
                        <div className="text-xs text-teus-text_muted mt-1">{f.desc}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Link
                href="/dashboard"
                className="mt-8 inline-block bg-teus-accent hover:bg-teus-accent-2 text-white font-bold px-6 py-3 rounded-lg shadow-accent-glow transition-all hover:-translate-y-0.5 text-sm"
              >
                ← Volver al Dashboard
              </Link>
            </div>
          </div>

          <div className="text-center text-[10px] text-teus-text_soft mt-6 tracking-[2px] uppercase font-semibold">
            TEUS FLEET OS · v1.1
          </div>
        </div>
      </div>
    </div>
  );
}
