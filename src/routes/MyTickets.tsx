import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type TicketEvent = {
  id: string;
  title: string;
  category: string;
  date_label: string;
  time_label: string;
  location: string;
  date_iso: string;
};

type TicketPurchaseWithEvent = {
  id: string;
  order_number: string;
  ticket_code: string;
  ticket_name: string;
  quantity: number;
  total_price: number;
  payment_method: string;
  status: string;
  events: TicketEvent[] | TicketEvent | null;
};

export default function MyTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketPurchaseWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTickets = async () => {
      try {
        const { data, error } = await supabase
          .from("ticket_purchases")
          .select("id, order_number, ticket_code, ticket_name, quantity, total_price, payment_method, status, events(id, title, category, date_label, time_label, location, date_iso)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTickets((data ?? []) as unknown as TicketPurchaseWithEvent[]);
      } catch (error) {
        console.error("Error fetching tickets", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchTickets();
  }, [user]);

  const normalizeEvent = (ticket: TicketPurchaseWithEvent) =>
    Array.isArray(ticket.events) ? ticket.events[0] ?? null : ticket.events ?? null;

  if (loading) {
    return <main className="mx-auto w-full max-w-6xl px-6 py-12 text-center text-slate-500 dark:text-blue-100/65"><p>Cargando tus boletos...</p></main>;
  }

  const now = Date.now();
  const active = tickets.filter((ticket) => {
    const dateIso = normalizeEvent(ticket)?.date_iso;
    return ticket.status !== "cancelled" && (!dateIso || new Date(dateIso).getTime() >= now);
  });
  const past = tickets.filter((ticket) => {
    const dateIso = normalizeEvent(ticket)?.date_iso;
    return dateIso ? new Date(dateIso).getTime() < now : false;
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-6 py-12 text-slate-900 dark:text-white">
      <section className="panel p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Mis boletos</p>
        <h2 className="mt-2 text-3xl font-bold">Tus accesos</h2>
        <p className="mt-2 text-slate-600 dark:text-blue-100/65">Revisa tus accesos activos y tu historial de compras.</p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-bold">Activos</h3>
        {active.length === 0 ? (
          <div className="panel p-6 text-center text-slate-500 dark:text-blue-100/65">Sin boletos activos.</div>
        ) : (
          <div className="grid gap-4">
            {active.map((ticket) => {
              const eventInfo = normalizeEvent(ticket);
              return (
                <div key={ticket.id} className="panel p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-primary">{eventInfo?.category}</p>
                      <h4 className="mt-2 text-lg font-bold">{eventInfo?.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-blue-100/65">{eventInfo?.date_label} • {eventInfo?.time_label}</p>
                      <p className="text-sm text-slate-500 dark:text-blue-100/55">{eventInfo?.location}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold">Ticket: {ticket.ticket_name} (x{ticket.quantity})</p>
                      <p className="mt-1 text-slate-500 dark:text-blue-100/55">Order: {ticket.order_number}</p>
                      <p className="mt-1 text-primary">Total: ${Number(ticket.total_price).toFixed(2)}</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-emerald-500">{ticket.status}</p>
                    </div>
                  </div>
                  {eventInfo?.id ? (
                    <div className="mt-4 flex flex-wrap gap-4 border-t border-line-light pt-4 dark:border-line-dark">
                      <Link className="text-sm font-semibold text-primary" to={`/my-tickets/${ticket.id}`}>Abrir boleto</Link>
                      <Link className="text-sm font-semibold text-slate-500 dark:text-blue-100/60" to={`/event/${eventInfo.id}`}>Ver evento</Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-bold">Pasados</h3>
        {past.length === 0 ? (
          <div className="panel p-6 text-center text-slate-500 dark:text-blue-100/65">Sin boletos anteriores.</div>
        ) : (
          <div className="grid gap-4">
            {past.map((ticket) => {
              const eventInfo = normalizeEvent(ticket);
              return (
                <div key={ticket.id} className="panel p-6 opacity-75">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">{eventInfo?.category}</p>
                  <h4 className="mt-2 text-lg font-bold">{eventInfo?.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-blue-100/65">{eventInfo?.date_label} • {eventInfo?.time_label}</p>
                  <p className="text-sm text-slate-500 dark:text-blue-100/55">{eventInfo?.location}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-line-light pt-4 text-sm dark:border-line-dark">
                    <span className="font-semibold">Ticket: {ticket.ticket_name} (x{ticket.quantity})</span>
                    <span className="font-bold text-primary">${Number(ticket.total_price).toFixed(2)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">
                    <span>{ticket.order_number}</span>
                    <span>{ticket.payment_method}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
