import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardAdmin() {
  const [stats, setStats] = useState({
    users: 0,
    events: 0,
    purchases: 0,
    revenue: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const [usersOpt, eventsOpt, purchasesOpt] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("ticket_purchases").select("total_price"),
      ]);

      const revenue = purchasesOpt.data?.reduce((acc, curr) => acc + Number(curr.total_price), 0) || 0;

      setStats({
        users: usersOpt.count || 0,
        events: eventsOpt.count || 0,
        purchases: purchasesOpt.data?.length || 0,
        revenue,
      });
    }

    void loadStats();
  }, []);

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resumen Administrativo</h1>
        <div className="flex gap-3">
          <Link className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold" to="/admin/events">
            Gestionar eventos
          </Link>
          <Link className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" to="/admin/users">
            Gestionar usuarios
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-card-bg p-6">
          <p className="text-sm text-white/50">Usuarios Registrados</p>
          <p className="mt-2 text-3xl font-bold">{stats.users}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card-bg p-6">
          <p className="text-sm text-white/50">Eventos Activos</p>
          <p className="mt-2 text-3xl font-bold">{stats.events}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card-bg p-6">
          <p className="text-sm text-white/50">Boletos Vendidos</p>
          <p className="mt-2 text-3xl font-bold">{stats.purchases}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card-bg p-6">
          <p className="text-sm text-white/50">Ingresos Totales</p>
          <p className="mt-2 text-3xl font-bold text-primary">${stats.revenue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
