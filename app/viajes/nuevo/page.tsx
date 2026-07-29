import ComingSoon from "@/components/ComingSoon";
import { Plus } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Nuevo Viaje"
      subtitle="Formulario de carga de viaje"
      icon={Plus}
      features={[
        { title: "Selección de vehículo", desc: "Dropdown con los 6 tractocamiones activos" },
        { title: "Chofer + Cliente", desc: "Autocompletado con tus 9 choferes y 25 clientes" },
        { title: "Ruta con km", desc: "Al elegir origen y destino, calcula km ida y vuelta automáticamente" },
        { title: "Combustible", desc: "Elegís proveedor, ingresás litros, calcula el costo Gs. automático" }
      ]}
    />
  );
}
