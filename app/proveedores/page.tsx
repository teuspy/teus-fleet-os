import ComingSoon from "@/components/ComingSoon";
import { Fuel } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Proveedores"
      subtitle="Combustibleras, talleres, gomerías, repuestos"
      icon={Fuel}
      features={[
        { title: "Categorización", desc: "Combustible · Taller · Gomería · Repuestos · Electricista" },
        { title: "Precios de combustible", desc: "Gs/litro por proveedor, actualizable" },
        { title: "Historial de gastos", desc: "Todo lo que compraste a cada proveedor" },
        { title: "Análisis comparativo", desc: "Qué proveedor es más barato en cada rubro" }
      ]}
    />
  );
}
