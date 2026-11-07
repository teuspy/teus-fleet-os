import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
 
type CookieToSet = { name: string; value: string; options?: CookieOptions };
 
// Rutas permitidas para el rol "coordinador"
// Todo lo demás queda bloqueado y redirige a /hojas-de-ruta
const RUTAS_COORDINADOR = [
  "/hojas-de-ruta",
  "/viajes",
  "/gastos",
  "/mantenimientos",
  "/habilitaciones",
  "/recargas-combustible",
  "/informes-flota",
];
 
function esRutaPermitidaCoordinador(pathname: string): boolean {
  return RUTAS_COORDINADOR.some(
    (ruta) => pathname === ruta || pathname.startsWith(ruta + "/")
  );
}
 
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
 
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
 
  const {
    data: { user },
  } = await supabase.auth.getUser();
 
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const isAuth = !!user;
  const isPublic = pathname === "/login" || pathname === "/";
 
  // Sin autenticar y en ruta privada → mandar a login
  if (!isAuth && !isPublic) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
 
  // Usuario autenticado: aplicar control de acceso por rol
  if (isAuth) {
    // Las rutas /api se saltean la verificación de rol
    // (se autentican por sesión en cada endpoint)
    if (pathname.startsWith("/api")) {
      return response;
    }
 
    // Leer el rol desde usuarios_perfil
    const { data: perfil } = await supabase
      .from("usuarios_perfil")
      .select("rol")
      .eq("id", user.id)
      .single();
 
    // Fallback: si no hay perfil cargado, tratarlo como admin
    // (para no bloquear usuarios viejos que todavía no fueron migrados)
    const rol = perfil?.rol || "admin";
 
    if (rol === "coordinador") {
      // Coordinador que llega al login o raíz → su home es Hojas de ruta
      if (pathname === "/login" || pathname === "/") {
        url.pathname = "/hojas-de-ruta";
        return NextResponse.redirect(url);
      }
 
      // Si la ruta no está en el whitelist del coordinador → redirigir
      if (!esRutaPermitidaCoordinador(pathname)) {
        url.pathname = "/hojas-de-ruta";
        return NextResponse.redirect(url);
      }
    } else {
      // Admin: comportamiento original (login → dashboard)
      if (pathname === "/login") {
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }
 
  return response;
}
 
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
 
