import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import type { EventItem } from "../types";

const categories = ["Todos", "Technology", "Music", "Art", "AI Lab"];

export default function Dashboard() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [active, setActive] = useState<string>("Todos");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ favorites: 0, activeTickets: 0 });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const eventRequest = supabase.from("events").select("*").order("date_iso", { ascending: true });
      const favoritesRequest = user
        ? supabase.from("favorite_events").select("event_id", { count: "exact", head: true }).eq("user_id", user.id)
        : Promise.resolve({ count: 0, error: null } as const);
      const purchasesRequest = user
        ? supabase
            .from("ticket_purchases")
            .select("id, events(date_iso)")
            .eq("user_id", user.id)
            .neq("status", "cancelled")
        : Promise.resolve({ data: [], error: null } as const);

      const [eventsResponse, favoritesResponse, purchasesResponse] = await Promise.all([
        eventRequest,
        favoritesRequest,
        purchasesRequest,
      ]);

      if (eventsResponse.error) {
        showToast("Error al cargar eventos");
      } else {
        setEvents((eventsResponse.data ?? []) as EventItem[]);
      }

      const now = Date.now();
      const activeTickets =
        purchasesResponse.data?.filter((purchase) => {
          const eventRow = (purchase.events as { date_iso?: string }[] | null)?.[0];
          return !eventRow?.date_iso || new Date(eventRow.date_iso).getTime() >= now;
        }).length ?? 0;

      setStats({
        favorites: favoritesResponse.count ?? 0,
        activeTickets,
      });
      setLoading(false);
    }

    void fetchData();
  }, [showToast, user?.id]);

  const filtered = useMemo(() => {
    if (active === "Todos") return events;
    return events.filter((eventItem) => eventItem.category === active);
  }, [active, events]);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-6 text-slate-900 dark:text-white">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-10">
          <section className="panel overflow-hidden p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-cyan-400" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Dashboard</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">Encuentra tu próximo evento.</h2>
                <p className="mt-2 max-w-2xl text-slate-600 dark:text-blue-100/70">
                  Descubre experiencias, controla tus compras y mantén visibles tus favoritos desde un solo lugar.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="btn-primary" to="/discovery">
                  Explorar
                </Link>
                <Link className="btn-secondary" to="/my-tickets">
                  Mis Tickets
                </Link>
              </div>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="panel-alt p-5">
                <p className="text-sm text-slate-500 dark:text-blue-100/65">Tickets activos</p>
                <p className="mt-2 text-3xl font-bold">{stats.activeTickets}</p>
              </div>
              <div className="panel-alt p-5">
                <p className="text-sm text-slate-500 dark:text-blue-100/65">Favoritos guardados</p>
                <p className="mt-2 text-3xl font-bold">{stats.favorites}</p>
              </div>
            </div>
          </section>

          <section className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActive(cat);
                  showToast(`Filtro aplicado: ${cat}`);
                }}
                className={
                  cat === active
                    ? "btn-primary"
                    : "rounded-full border border-line-light bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-blue-50 dark:border-line-dark dark:bg-surface-dark dark:text-blue-100 dark:hover:bg-surface-dark-alt"
                }
              >
                {cat}
              </button>
            ))}
          </section>

          <section>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">En tendencia</h3>
              <Link className="text-sm font-semibold text-primary" to="/discovery">
                Ver todos
              </Link>
            </div>
            {loading ? (
              <p className="text-slate-500 dark:text-blue-100/65">Cargando eventos...</p>
            ) : (
              <div className="masonry-grid">
                {filtered.map((eventItem) => (
                  <article key={eventItem.id} className="masonry-item">
                    <Link
                      to={`/event/${eventItem.id}`}
                      className="group block overflow-hidden rounded-2xl border border-line-light bg-white transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl dark:border-line-dark dark:bg-surface-dark"
                    >
                      <div className="relative">
                        <img
                          className="h-56 w-full object-cover transition-transform group-hover:scale-105"
                          src={eventItem.image}
                          alt={eventItem.title}
                        />
                        <span className="absolute left-4 top-4 rounded-full bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                          {eventItem.category}
                        </span>
                      </div>
                      <div className="space-y-2 p-6">
                        <h4 className="text-lg font-bold">{eventItem.title}</h4>
                        <p className="text-sm text-slate-500 dark:text-blue-100/65">
                          {eventItem.date_label} • {eventItem.location}
                        </p>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="panel p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/65">
              Acceso rápido
            </h3>
            <div className="space-y-2">
              <Link className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-blue-50 dark:hover:bg-surface-dark-alt" to="/discovery">
                <span className="text-sm font-semibold">Explorar</span>
                <span className="material-symbols-outlined text-base text-slate-400 dark:text-blue-100/50">arrow_forward</span>
              </Link>
              <Link className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-blue-50 dark:hover:bg-surface-dark-alt" to="/my-tickets">
                <span className="text-sm font-semibold">Mis Tickets</span>
                <span className="material-symbols-outlined text-base text-slate-400 dark:text-blue-100/50">arrow_forward</span>
              </Link>
              <Link className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-blue-50 dark:hover:bg-surface-dark-alt" to="/settings">
                <span className="text-sm font-semibold">Ajustes</span>
                <span className="material-symbols-outlined text-base text-slate-400 dark:text-blue-100/50">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="panel p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/65">
              Soporte
            </h3>
            <div className="space-y-2 text-sm">
              <a
                href="mailto:soporte@eventboard.app?subject=Soporte%20EventBoard"
                className="block rounded-lg px-3 py-2 hover:bg-blue-50 dark:hover:bg-surface-dark-alt"
              >
                Contactar soporte
              </a>
              <a
                href="mailto:feedback@eventboard.app?subject=Feedback%20EventBoard"
                className="block rounded-lg px-3 py-2 hover:bg-blue-50 dark:hover:bg-surface-dark-alt"
              >
                Enviar feedback
              </a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
