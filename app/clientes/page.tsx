import ComingSoon from "@/components/ComingSoon";
import { Building2 } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Clientes"
      subtitle="Base de clientes de TEUS"
      icon={Building2}
      features={[
        { title: "ABM completo", desc: "Nombre, RUC, contacto, teléfono, email, días de crédito" },
        { title: "Historial de fletes", desc: "Todos los viajes hechos para cada cliente" },
        { title: "Facturas emitidas", desc: "Total facturado y monto pendiente por cliente" },
        { title: "Ranking de facturación", desc: "Top clientes por volumen de negocio" }
      ]}
    />
  );
}
