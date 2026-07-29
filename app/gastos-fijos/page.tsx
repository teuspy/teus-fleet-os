import ComingSoon from "@/components/ComingSoon";
import { DollarSign } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Gastos Fijos Mensuales"
      subtitle="Configuración de costos fijos"
      icon={DollarSign}
      features={[
        { title: "9 gastos precargados", desc: "Préstamos, salarios, alquiler, seguros, GPS, etc." },
        { title: "Editable mensual", desc: "Ajustás montos cuando cambian" },
        { title: "Categorías", desc: "Financiero · Salarios · Seguros · Operativos · Administrativos" },
        { title: "Break-even automático", desc: "Cuántos viajes necesitás para cubrir estos costos" }
      ]}
    />
  );
}
