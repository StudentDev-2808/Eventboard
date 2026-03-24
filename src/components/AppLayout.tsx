import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Notifications } from "./Notifications";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-semibold transition-colors ${
    isActive
      ? "text-slate-900 dark:text-white"
      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
  }`;

export function AppLayout() {
  const { user, logout, updateProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleTheme = async () => {
    if (!user) return;
    const nextTheme = user.theme === "dark" ? "light" : "dark";
    try {
      await updateProfile({ theme: nextTheme });
      showToast(`Tema ${nextTheme === "dark" ? "oscuro" : "claro"} activado`);
    } catch (error) {
      console.error(error);
      showToast("No se pudo cambiar el tema");
    }
  };

  const userName = useMemo(() => user?.full_name ?? "Invitado", [user?.full_name]);
  const userEmail = useMemo(() => user?.email ?? "", [user?.email]);

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    const query = event.currentTarget.value.trim();
    navigate(query ? `/discovery?q=${encodeURIComponent(query)}` : "/discovery");
  };

  const profileImage = user?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=135bec&color=fff`;

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-line-light bg-white/90 backdrop-blur dark:border-line-dark dark:bg-surface-dark/90">
        <div className="mx-auto flex min-h-16 max-w-[1400px] flex-wrap items-center gap-4 px-6 py-3">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded bg-primary text-white">
              <span className="material-symbols-outlined">event_seat</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">EventBoard</h1>
          </NavLink>

          <div className="order-3 w-full flex-1 md:order-none md:max-w-xl">
            <label className="relative block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                className="h-10 w-full rounded-lg border border-line-light bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-line-dark dark:bg-input-dark"
                placeholder="Busca eventos, sedes, o creadores"
                onKeyDown={handleSearch}
                type="search"
              />
            </label>
          </div>

          <button
            className="ml-auto flex size-9 items-center justify-center rounded-lg border border-line-light text-slate-600 lg:hidden dark:border-line-dark dark:text-blue-100"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Abrir navegación"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <nav className={`${mobileOpen ? "flex" : "hidden"} w-full items-center gap-4 lg:flex lg:w-auto lg:gap-6`}>
            <NavLink to="/" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Inicio
            </NavLink>
            <NavLink to="/discovery" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Explorar
            </NavLink>
            <NavLink to="/my-tickets" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Mis Tickets
            </NavLink>
            <NavLink to="/settings" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Ajustes
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => void toggleTheme()}
              className="size-9 rounded-lg bg-blue-50 text-slate-700 transition-colors dark:bg-surface-dark-alt dark:text-blue-100"
              aria-label="Cambiar tema"
            >
              <span className="material-symbols-outlined">
                {user?.theme === "dark" ? "dark_mode" : "light_mode"}
              </span>
            </button>
            <Notifications />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="size-10 overflow-hidden rounded-full border border-line-light dark:border-line-dark"
                aria-label="Abrir menú de perfil"
              >
                <img className="h-full w-full object-cover" src={profileImage} alt="Avatar" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line-light bg-white shadow-xl dark:border-line-dark dark:bg-surface-dark">
                  <div className="border-b border-line-light px-4 py-3 dark:border-line-dark">
                    <p className="truncate text-sm font-semibold">{userName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-blue-100/70">{userEmail}</p>
                  </div>
                  {user?.role === "root" && (
                    <NavLink
                      className="block bg-blue-50 px-4 py-2 text-sm font-medium text-primary hover:bg-blue-100 dark:bg-surface-dark-alt dark:text-blue-100 dark:hover:bg-surface-dark"
                      to="/admin"
                    >
                      Panel Administrativo
                    </NavLink>
                  )}
                  <NavLink className="block px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-surface-dark-alt" to="/my-tickets">
                    Mis Tickets
                  </NavLink>
                  <NavLink className="block px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-surface-dark-alt" to="/settings">
                    Ajustes
                  </NavLink>
                  <button
                    onClick={() => void handleLogout()}
                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      {user?.role === "root" ? (
        <div className="border-b border-line-light bg-blue-50/80 dark:border-line-dark dark:bg-surface-dark-alt/80">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-semibold text-primary dark:text-blue-100">Modo administrador activo</p>
              <p className="text-xs text-slate-600 dark:text-blue-100/70">
                Tu cuenta `root` puede crear, leer, modificar y eliminar contenido del sitio desde el panel.
              </p>
            </div>
            <NavLink to="/admin" className="btn-primary whitespace-nowrap">
              Abrir Panel
            </NavLink>
          </div>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
