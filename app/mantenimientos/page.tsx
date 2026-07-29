import ComingSoon from "@/components/ComingSoon";
import { Wrench } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Mantenimientos Programados"
      subtitle="Preventivo por kilómetros"
      icon={Wrench}
      features={[
        { title: "Programa por km", desc: "Aceite motor 20k, filtros 15k, cubiertas 80k, etc." },
        { title: "Contador automático", desc: "Suma los km de cada viaje al odómetro del vehículo" },
        { title: "Alertas anticipadas", desc: "Aviso cuando falten 1500 km para el próximo servicio" },
        { title: "WhatsApp integration", desc: "Notificación al celular cuando llegue el momento" }
      ]}
    />
  );
}
