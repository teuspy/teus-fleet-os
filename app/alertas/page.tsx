import ComingSoon from "@/components/ComingSoon";
import { Bell } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Alertas"
      subtitle="Notificaciones del sistema"
      icon={Bell}
      features={[
        { title: "Centro de alertas", desc: "Historial de todas las alertas del sistema" },
        { title: "Habilitaciones por vencer", desc: "DINATRAN y municipal próximos a vencer" },
        { title: "Mantenimientos pendientes", desc: "Vehículos que llegaron al km de servicio" },
        { title: "Facturas vencidas", desc: "Cobros pendientes con días de mora" }
      ]}
    />
  );
}
