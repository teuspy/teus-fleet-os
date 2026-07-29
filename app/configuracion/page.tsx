import ComingSoon from "@/components/ComingSoon";
import { Settings } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Configuración"
      subtitle="Ajustes del sistema"
      icon={Settings}
      features={[
        { title: "Usuarios y roles", desc: "Admin · Contador · Operador · Chofer" },
        { title: "Datos de la empresa", desc: "RUC, logo, dirección, cotización USD" },
        { title: "Preferencias", desc: "Idioma, moneda principal, tema" },
        { title: "Integraciones", desc: "WhatsApp, Google Maps, contador, bancos" }
      ]}
    />
  );
}
