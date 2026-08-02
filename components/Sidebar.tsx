"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Truck,
  Users,
  Building2,
  MapPin,
  Wrench,
  FileText,
  DollarSign,
  Fuel,
  ClipboardList,
  Settings,
  LogOut,
  Bell,
  Trophy,
  Award,
  BarChart3,
  Medal,
} from "lucide-react";

const navSections = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/viajes", label: "Producción / Viajes", icon: ClipboardList },
      { href: "/gastos", label: "Gastos de Flota", icon: DollarSign },
      { href: "/facturas", label: "Facturas y Cobros", icon: FileText },
    ],
  },
  {
    title: "Rankings",
    items: [
      { href: "/rankings/equipos", label: "Ranking Equipos", icon: Trophy },
      { href: "/rankings/choferes", label: "Ranking Choferes", icon: Medal },
      { href: "/rankings/clientes", label: "Ranking Clientes", icon: Award },
      { href: "/rankings/gastos", label: "Ranking Gastos", icon: BarChart3 },
    ],
  },
  {
    title: "Flota",
    items: [
      { href: "/vehiculos", label: "Vehículos", icon: Truck },
      { href: "/choferes", label: "Choferes", icon: Users },
      { href: "/mantenimientos", label: "Mantenimientos", icon: Wrench },
      { href: "/habilitaciones", label: "Habilitaciones", icon: FileText },
    ],
  },
  {
    title: "Catálogos",
    items: [
      { href: "/clientes", label: "Clientes", icon: Building2 },
      { href: "/proveedores", label: "Proveedores", icon: Fuel },
      { href: "/tipos-gasto", label: "Tipos de Gasto", icon: DollarSign },
      { href: "/rutas", label: "Rutas", icon: MapPin },
      { href: "/recargas-combustible", label: "Recargas Combustible", icon: Fuel },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/gastos-fijos", label: "Gastos Fijos", icon: DollarSign },
      { href: "/alertas", label: "Alertas", icon: Bell },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 h-screen sticky top-0 bg-gradient-to-b from-teus-bg to-teus-bg-2 border-r border-teus-border flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-teus-border">
        <div className="flex items-center justify-center px-2">
          <Image
            src="/logo-teus-blanco.png"
            alt="TEUS Fleet OS"
            width={140}
            height={50}
            priority
            className="h-auto w-[140px] object-contain"
          />
        </div>
        <div className="text-[9px] text-teus-text-dim tracking-[3px] uppercase text-center mt-2">
          Fleet OS
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navSections.map((section) => (
          <div key={section.title} className="mb-1">
            <div className="text-[10px] text-teus-text-dim/50 uppercase tracking-[2px] px-3 py-2 mt-2">
              {section.title}
            </div>
            {section.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-teus-accent/15 text-teus-accent border-l-2 border-teus-accent pl-[10px]"
                      : "text-teus-text-dim hover:bg-teus-card hover:text-white hover:translate-x-0.5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-teus-border">
        <div className="px-3 py-2 mb-2">
          <div className="text-[10px] text-teus-text-dim uppercase tracking-wider">
            Conectado como
          </div>
          <div className="text-sm font-semibold truncate">{userEmail}</div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-teus-text-dim hover:bg-teus-danger/10 hover:text-teus-danger transition"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
