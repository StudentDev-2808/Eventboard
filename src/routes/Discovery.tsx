import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import type { EventItem } from "../types";

const categories = ["Todos", "Music", "Technology", "Art", "AI Lab"];

const categoryStyle: Record<string, string> = {
  Music: "bg-[#FF2D55]",
  Technology: "bg-[#5856D6]",
  Art: "bg-[#FF9500]",
  "AI Lab": "bg-[#5856D6]",
};

export default function Discovery() {
  const [active, setActive] = useState<string>("Todos");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q");

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*, ticket_types(price)")
        .order("date_iso", { ascending: true });

      if (!error && data) {
        setEvents((data ?? []) as EventItem[]);
      } else {
        showToast("No se pudieron cargar los eventos");
      }

      setLoading(false);
    }

    void fetchEvents();
  }, [showToast]);

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) {
        setFavorites(new Set());
        return;
      }

      const { data, error } = await supabase.from("favorite_events").select("event_id").eq("user_id", user.id);

      if (!error) {
        setFavorites(new Set((data ?? []).map((favorite) => favorite.event_id)));
      }
    }

    void fetchFavorites();
  }, [user?.id]);

  const filtered = useMemo(() => {
    let filteredEvents = events;

    if (active !== "Todos") {
      filteredEvents = filteredEvents.filter((eventItem) => eventItem.category === active);
    }

    if (q) {
      filteredEvents = filteredEvents.filter((eventItem) =>
        [eventItem.title, eventItem.category, eventItem.venue_name, eventItem.location]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
      );
    }

    return filteredEvents;
  }, [active, events, q]);

  const toggleFavorite = async (eventId: string, eventTitle: string) => {
    if (!user) {
      showToast("Inicia sesión para guardar favoritos");
      return;
    }

    const isFavorite = favorites.has(eventId);
    const nextFavorites = new Set(favorites);

    if (isFavorite) {
      const { error } = await supabase.from("favorite_events").delete().eq("user_id", user.id).eq("event_id", eventId);
      if (error) {
        showToast("No se pudo quitar de favoritos");
        return;
      }

      nextFavorites.delete(eventId);
      setFavorites(nextFavorites);
      showToast("Evento removido de favoritos");
      return;
    }

    const { error } = await supabase.from("favorite_events").insert({
      user_id: user.id,
      event_id: eventId,
    });

    if (error) {
      showToast("No se pudo guardar en favoritos");
      return;
    }

    nextFavorites.add(eventId);
    setFavorites(nextFavorites);
    await createNotification({
      title: "Favorito guardado",
      message: `${eventTitle} fue agregado a tus favoritos.`,
      link: `/event/${eventId}`,
      type: "favorite",
    });
    showToast("Evento agregado a favoritos");
  };

  return (
    <main className="mx-auto min-h-[80vh] w-full max-w-[1400px] px-6 py-6 text-slate-900 dark:text-white">
      <section className="panel mb-8 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Discovery</p>
            <h2 className="mt-2 text-3xl font-black">Explora experiencias en vivo</h2>
            <p className="mt-2 text-slate-600 dark:text-blue-100/70">
              Filtra por categoría, guarda favoritos y encuentra el siguiente evento que quieres vivir.
            </p>
          </div>
          {q ? (
            <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-primary dark:bg-surface-dark-alt dark:text-blue-100">
              Búsqueda activa: {q}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mb-8 flex items-center gap-3 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActive(cat);
              showToast(`Filtro aplicado: ${cat}`);
            }}
            className={
              cat === active
                ? "flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-white shadow-lg shadow-primary/20"
                : "flex shrink-0 items-center gap-2 rounded-full border border-line-light bg-white px-5 py-2.5 font-medium text-slate-800 dark:border-line-dark dark:bg-surface-dark dark:text-blue-100"
            }
          >
            <span className="material-symbols-outlined text-lg">grid_view</span>
            {cat}
          </button>
        ))}
      </div>

      {q && (
        <div className="mb-4">
          <h3 className="text-xl font-bold">Buscando: "{q}"</h3>
          <p className="text-slate-500 dark:text-blue-100/65">{filtered.length} resultados</p>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 dark:text-blue-100/65">Cargando exploración...</p>
      ) : (
        <div className="masonry-grid">
          {filtered.map((eventItem) => {
            const minPrice =
              eventItem.ticket_types && eventItem.ticket_types.length > 0
                ? Math.min(...eventItem.ticket_types.map((ticketType) => Number(ticketType.price)))
                : 0;

            const isFavorite = favorites.has(eventItem.id);

            return (
              <div key={eventItem.id} className="masonry-item">
                <Link
                  to={`/event/${eventItem.id}`}
                  className="group relative block overflow-hidden rounded-2xl border border-line-light bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 dark:border-line-dark dark:bg-surface-dark"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${eventItem.image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-20 transition-opacity group-hover:opacity-100" />
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        void toggleFavorite(eventItem.id, eventItem.title);
                      }}
                      className={`absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/35 text-white transition-colors ${
                        isFavorite ? "text-red-500" : "hover:text-red-500"
                      }`}
                      aria-label="Guardar favorito"
                    >
                      <span className="material-symbols-outlined">{isFavorite ? "favorite" : "favorite_border"}</span>
                    </button>
                    <div className="absolute bottom-3 left-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white ${
                          categoryStyle[eventItem.category] ?? "bg-primary"
                        }`}
                      >
                        {eventItem.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="mb-2 text-lg font-bold leading-tight transition-colors group-hover:text-primary">
                      {eventItem.title}
                    </h3>
                    <p className="mb-4 flex items-center gap-1.5 text-sm text-slate-600 dark:text-blue-100/65">
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      {eventItem.date_label} • {eventItem.time_label}
                    </p>
                    <div className="flex items-center justify-between border-t border-line-light pt-4 dark:border-line-dark">
                      <span className="font-bold text-primary">Desde ${minPrice}</span>
                      <span className="material-symbols-outlined text-slate-400 transition-transform group-hover:translate-x-1 dark:text-blue-100/40">
                        arrow_forward
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
