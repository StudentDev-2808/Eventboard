import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toDataURL } from "qrcode";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

type TicketEvent = {
  id: string;
  title: string;
  category: string;
  date_label: string;
  time_label: string;
  location: string;
  venue_name: string;
  organizer_name: string;
  image: string;
  date_iso: string;
};

type TicketPurchaseRecord = {
  id: string;
  order_number: string;
  ticket_code: string;
  ticket_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string;
  payment_reference: string | null;
  status: string;
  created_at: string;
  events: TicketEvent[] | TicketEvent | null;
};

type AttendanceRecord = {
  status: "registered" | "attended" | "missed";
  attended_at: string | null;
};

function statusTone(status: string) {
  if (status === "attended") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200";
  if (status === "missed") return "bg-amber-500/15 text-amber-700 dark:text-amber-200";
  return "bg-primary/12 text-primary dark:text-blue-100";
}

export default function TicketPass() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<TicketPurchaseRecord | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (!ticketId || !user) {
      setLoading(false);
      return;
    }

    const fetchPass = async () => {
      try {
        const [purchaseResult, attendanceResult] = await Promise.all([
          supabase
            .from("ticket_purchases")
            .select("id, order_number, ticket_code, ticket_name, quantity, unit_price, total_price, payment_method, payment_reference, status, created_at, events(id, title, category, date_label, time_label, location, venue_name, organizer_name, image, date_iso)")
            .eq("id", ticketId)
            .eq("user_id", user.id)
            .single(),
          supabase.from("event_attendance").select("status, attended_at").eq("purchase_id", ticketId).maybeSingle(),
        ]);

        if (purchaseResult.error) throw purchaseResult.error;
        if (attendanceResult.error) throw attendanceResult.error;

        setPurchase(purchaseResult.data as unknown as TicketPurchaseRecord);
        setAttendance((attendanceResult.data as AttendanceRecord | null) ?? null);
      } catch (error) {
        console.error(error);
        showToast("Could not load this ticket");
      } finally {
        setLoading(false);
      }
    };

    void fetchPass();
  }, [showToast, ticketId, user]);

  useEffect(() => {
    if (!purchase) return;

    const payload = JSON.stringify({
      ticketId: purchase.id,
      orderNumber: purchase.order_number,
      ticketCode: purchase.ticket_code,
      issuedAt: purchase.created_at,
    });

    void toDataURL(payload, {
      margin: 1,
      width: 220,
      color: {
        dark: "#081120",
        light: "#FFFFFF",
      },
    }).then(setQrCodeUrl);
  }, [purchase]);

  const eventInfo = useMemo(() => {
    if (!purchase?.events) return null;
    return Array.isArray(purchase.events) ? purchase.events[0] ?? null : purchase.events;
  }, [purchase]);

  if (loading) {
    return <main className="mx-auto w-full max-w-6xl px-6 py-16 text-center text-slate-500 dark:text-blue-100/65">Loading ticket...</main>;
  }

  if (!purchase || !eventInfo) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="panel p-10 text-center">
          <h1 className="text-2xl font-bold">Ticket not found</h1>
          <p className="mt-2 text-slate-600 dark:text-blue-100/65">This pass is not available for your account.</p>
          <Link className="btn-primary mt-6 inline-flex" to="/my-tickets">
            Back to my tickets
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 text-slate-900 dark:text-white">
      <section className="panel overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative min-h-[320px] overflow-hidden">
            <img alt={eventInfo.title} className="absolute inset-0 h-full w-full object-cover" src={eventInfo.image} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#081120]/95 via-[#081120]/50 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-8">
              <span className="w-fit rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">
                {eventInfo.category}
              </span>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">{eventInfo.title}</h1>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-blue-100/82">
                <span>{eventInfo.date_label}</span>
                <span>{eventInfo.time_label}</span>
                <span>{eventInfo.location}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 dark:bg-surface-dark lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Mobile ticket</p>
                <h2 className="mt-2 text-2xl font-black">Ready to scan</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${statusTone(attendance?.status ?? "registered")}`}>
                {attendance?.status ?? "registered"}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line-light p-4 dark:border-line-dark">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Order number</p>
                <p className="mt-2 font-semibold">{purchase.order_number}</p>
              </div>
              <div className="rounded-2xl border border-line-light p-4 dark:border-line-dark">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Ticket code</p>
                <p className="mt-2 font-semibold">{purchase.ticket_code}</p>
              </div>
              <div className="rounded-2xl border border-line-light p-4 dark:border-line-dark">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Ticket type</p>
                <p className="mt-2 font-semibold">{purchase.ticket_name}</p>
              </div>
              <div className="rounded-2xl border border-line-light p-4 dark:border-line-dark">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Quantity</p>
                <p className="mt-2 font-semibold">{purchase.quantity}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => window.print()} type="button">
                Print ticket
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(purchase.ticket_code);
                  showToast("Ticket code copied");
                }}
                type="button"
              >
                Copy code
              </button>
              <Link className="btn-secondary" to={`/event/${eventInfo.id}`}>
                Event details
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Entry pass</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/58">
                Show this code at the venue. The QR contains your ticket id, order number and issued timestamp.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-[280px_1fr]">
            <div className="rounded-[28px] border border-line-light bg-white p-5 dark:border-line-dark dark:bg-surface-dark-alt">
              {qrCodeUrl ? <img alt="Ticket QR" className="mx-auto w-full max-w-[220px]" src={qrCodeUrl} /> : null}
              <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-center font-mono text-xs tracking-[0.34em] text-white">
                {purchase.ticket_code}
              </div>
            </div>

            <div className="space-y-4">
              <div className="panel-alt p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Venue access</p>
                <p className="mt-2 text-lg font-semibold">{eventInfo.venue_name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/60">{eventInfo.location}</p>
              </div>
              <div className="panel-alt p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Organizer</p>
                <p className="mt-2 text-lg font-semibold">{eventInfo.organizer_name}</p>
              </div>
              <div className="panel-alt p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Event time</p>
                <p className="mt-2 text-lg font-semibold">
                  {eventInfo.date_label} at {eventInfo.time_label}
                </p>
              </div>
              <div className="panel-alt p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Attendance state</p>
                <p className="mt-2 text-lg font-semibold capitalize">{attendance?.status ?? "registered"}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/60">
                  Purchase and attendance are separated. Buying a ticket registers the pass but does not mark attendance automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="panel p-6">
            <h3 className="text-lg font-bold">Order details</h3>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-blue-100/58">Issued</span>
                <span className="font-semibold">{new Date(purchase.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-blue-100/58">Method</span>
                <span className="font-semibold capitalize">{purchase.payment_method}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-blue-100/58">Reference</span>
                <span className="font-semibold">{purchase.payment_reference ?? "N/A"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-blue-100/58">Unit price</span>
                <span className="font-semibold">${Number(purchase.unit_price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-line-light pt-4 dark:border-line-dark">
                <span className="font-bold">Total</span>
                <span className="text-lg font-black text-primary">${Number(purchase.total_price).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <h3 className="text-lg font-bold">Next actions</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-blue-100/60">
              <li>Keep this pass available on your phone before arriving at the venue.</li>
              <li>Print it if you want a backup copy for venue access.</li>
              <li>After the event you can attach reviews to attended events without mixing them with purchases.</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
