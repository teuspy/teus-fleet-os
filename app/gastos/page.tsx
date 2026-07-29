import ComingSoon from "@/components/ComingSoon";
import { DollarSign } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Gastos de Flota"
      subtitle="Gastos variables por vehículo"
      icon={DollarSign}
      features={[
        { title: "Carga con foto de factura", desc: "Sacás foto y se sube automático a Supabase Storage" },
        { title: "Categorización", desc: "Repuesto · Reparación · Combustible · Gomería · etc." },
        { title: "Aplicado a", desc: "Tracto · Semirremolque · Equipo completo · Oficina" },
        { title: "Reportes por vehículo", desc: "Gasto mensual por unidad y ranking" }
      ]}
    />
  );
}
