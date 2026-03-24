import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../context/ToastContext";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

const ROOT_EMAIL = "angelsanchezvelez146@gmail.com";

export default function UsersAdmin() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setUsers((data ?? []) as Profile[]);
    } catch (error) {
      console.error(error);
      showToast("No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const updateRole = async (id: string, role: string) => {
    const targetUser = users.find((user) => user.id === id);
    if (!targetUser) return;
    if (targetUser.email.toLowerCase() === ROOT_EMAIL) {
      showToast("La cuenta root principal es inmutable");
      return;
    }

    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      showToast("No se pudo actualizar el rol");
      return;
    }

    setUsers((current) => current.map((user) => (user.id === id ? { ...user, role } : user)));
    showToast("Rol actualizado");
  };

  if (loading) return <div className="p-8 text-white">Cargando usuarios...</div>;

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
      <div className="overflow-x-auto rounded-xl border border-line-dark bg-surface-dark shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line-dark bg-surface-dark-alt">
            <tr>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Nombre</th>
              <th className="p-4 font-semibold">Rol</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold">Fecha Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-dark">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-dark-alt/70">
                <td className="p-4">{user.email}</td>
                <td className="p-4">{user.full_name || "-"}</td>
                <td className="p-4">
                  {user.email.toLowerCase() === ROOT_EMAIL ? (
                    <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                      root
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(event) => void updateRole(user.id, event.target.value)}
                      className={`rounded px-3 py-2 text-xs ${user.role === "root" ? "bg-red-500/20 text-red-300" : "bg-blue-500/20 text-blue-300"}`}
                    >
                      <option value="usuario">usuario</option>
                      <option value="root">root</option>
                    </select>
                  )}
                </td>
                <td className="p-4">
                  {user.email.toLowerCase() === ROOT_EMAIL ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Inmutable</span>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/55">Editable</span>
                  )}
                </td>
                <td className="p-4">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-blue-100/50">No hay usuarios</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
