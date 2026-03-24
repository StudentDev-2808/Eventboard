import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-background-dark text-slate-100">
      <aside className="flex w-64 flex-col border-r border-line-dark bg-surface-dark">
        <div className="border-b border-line-dark p-6">
          <h2 className="text-xl font-bold tracking-widest text-blue-100">AdminPanel</h2>
          <p className="mt-2 text-xs text-blue-100/65">Control total del contenido visible para usuarios.</p>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          <NavLink to="/admin" end className={({ isActive }) => `block rounded-lg px-4 py-2 ${isActive ? "bg-surface-dark-alt text-white" : "hover:bg-surface-dark-alt/70"}`}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/events" className={({ isActive }) => `block rounded-lg px-4 py-2 ${isActive ? "bg-surface-dark-alt text-white" : "hover:bg-surface-dark-alt/70"}`}>
            Eventos
          </NavLink>
          <NavLink to="/admin/purchases" className={({ isActive }) => `block rounded-lg px-4 py-2 ${isActive ? "bg-surface-dark-alt text-white" : "hover:bg-surface-dark-alt/70"}`}>
            Compras
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `block rounded-lg px-4 py-2 ${isActive ? "bg-surface-dark-alt text-white" : "hover:bg-surface-dark-alt/70"}`}>
            Usuarios
          </NavLink>
          <NavLink to="/" className="mt-4 block rounded-lg px-4 py-2 text-blue-200 hover:bg-surface-dark-alt/70">
            Volver a la App
          </NavLink>
        </nav>
        <div className="flex items-center justify-between border-t border-line-dark p-4">
          <div className="truncate text-sm">
            <p className="font-semibold text-white">{user?.full_name ?? user?.email}</p>
            <p className="text-blue-100/65">{user?.role}</p>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="rounded-lg p-2 hover:bg-surface-dark-alt"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background-dark p-8">
        <Outlet />
      </main>
    </div>
  );
}
