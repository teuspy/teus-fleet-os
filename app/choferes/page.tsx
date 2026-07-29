import ComingSoon from "@/components/ComingSoon";
import { Users } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Choferes"
      subtitle="Gestión del personal de conducción"
      icon={Users}
      features={[
        { title: "ABM completo", desc: "Nombre, cédula, teléfono, salario, vehículo asignado" },
        { title: "Activar/Desactivar", desc: "Preserva histórico al liquidar personal" },
        { title: "Ranking de performance", desc: "Utilidad neta por chofer, viajes hechos, badges" },
        { title: "Historial de viajes", desc: "Todos los viajes que hizo cada chofer" }
      ]}
    />
  );
}
