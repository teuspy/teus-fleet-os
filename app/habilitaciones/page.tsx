import ComingSoon from "@/components/ComingSoon";
import { FileText } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Habilitaciones"
      subtitle="DINATRAN + Municipal por vehículo"
      icon={FileText}
      features={[
        { title: "Registro por vehículo", desc: "F. emisión, F. vencimiento, N° certificado" },
        { title: "Semáforo visual", desc: "🟢 Vigente · 🟡 Por vencer · 🔴 Vencida" },
        { title: "Alertas 60/30/15 días", desc: "Notificación anticipada de vencimientos" },
        { title: "Histórico de renovaciones", desc: "Todas las habilitaciones anteriores" }
      ]}
    />
  );
}
