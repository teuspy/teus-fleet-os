import ComingSoon from "@/components/ComingSoon";
import { ClipboardList } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Producción / Viajes"
      subtitle="Registro y seguimiento de viajes de flota"
      icon={ClipboardList}
      features={[
        { title: "Carga rápida de viaje", desc: "Origen, destino, cliente, contenedor, chofer, combustible, flete" },
        { title: "Autocompletado de rutas", desc: "Km calculados automático desde tabla de rutas maestras" },
        { title: "Utilidad bruta en vivo", desc: "Cálculo automático precio − combustible − viático − otros" },
        { title: "Estado del viaje", desc: "Pendiente · Facturado · Cobrado · Cancelado" }
      ]}
    />
  );
}
