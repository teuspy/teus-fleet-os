import ComingSoon from "@/components/ComingSoon";
import { MapPin } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Rutas Maestras"
      subtitle="Distancias precargadas de tus rutas frecuentes"
      icon={MapPin}
      features={[
        { title: "22 rutas precargadas", desc: "Villeta-CDE 700km, PSF-CDE 676km, TERPORT-Encarnación, etc." },
        { title: "Agregar nuevas", desc: "+ Nueva ruta con origen, destino, km ida y vuelta" },
        { title: "Integración Google Maps", desc: "Opcional: cálculo automático de km para rutas nuevas" },
        { title: "Peajes estimados", desc: "Costo aproximado por ruta" }
      ]}
    />
  );
}
