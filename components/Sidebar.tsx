"use client";

import Link from "next/link";
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
      { href: "/rutas", label: "Rutas", icon: MapPin },
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
      <div className="px-4 pt-6 pb-4 border-b border-teus-border">
        <div className="flex items-center gap-3 px-2">
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute top-0 left-0 w-3 h-3 bg-teus-accent rounded-sm" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-teus-accent rounded-sm" />
            <div className="absolute bottom-0.5 right-4 w-2 h-2 bg-teus-accent rounded-full" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight leading-none">
              teu<span className="text-teus-accent">s</span>
              <span className="text-teus-accent">.</span>
            </div>
            <div className="text-[9px] text-teus-text-dim tracking-[2px] uppercase mt-0.5">
              Fleet OS
            </div>
          </div>
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
