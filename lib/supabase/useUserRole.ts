"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "coordinador" | null;

type UserInfo = {
  rol: UserRole;
  nombre: string;
  email: string;
  loading: boolean;
  isAdmin: boolean;
  isCoordinador: boolean;
};

export function useUserRole(): UserInfo {
  const [rol, setRol] = useState<UserRole>(null);
  const [nombre, setNombre] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function cargarRol() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) {
        if (mounted) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("usuarios_perfil")
        .select("rol, nombre_completo, email")
        .eq("id", user.id)
        .single();
      if (!mounted) return;
      if (data) {
        setRol(data.rol as UserRole);
        setNombre(data.nombre_completo || "");
        setEmail(data.email || user.email || "");
      } else {
        setRol("admin");
        setEmail(user.email || "");
      }
      setLoading(false);
    }
    cargarRol();
    return () => { mounted = false; };
  }, []);

  return {
    rol,
    nombre,
    email,
    loading,
    isAdmin: rol === "admin",
    isCoordinador: rol === "coordinador",
  };
}
