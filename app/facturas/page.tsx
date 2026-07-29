import ComingSoon from "@/components/ComingSoon";
import { FileText } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Facturas y Cobros"
      subtitle="Control de facturación y cobranza"
      icon={FileText}
      features={[
        { title: "Facturación electrónica", desc: "Nro. factura, cliente, monto, fecha emisión y vencimiento" },
        { title: "Estado de cobro", desc: "Pagado · Pendiente · Vencida · Crédito" },
        { title: "DSO por cliente", desc: "Días promedio de cobro por cada cliente" },
        { title: "Aging report", desc: "Cuánto te deben a 30/60/90 días" }
      ]}
    />
  );
}
