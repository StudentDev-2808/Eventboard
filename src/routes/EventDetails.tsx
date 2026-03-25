import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { setCart } from "../lib/storage";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import type { EventItem, TicketType } from "../types";

type ReviewProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

type EventReviewItem = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: ReviewProfile | ReviewProfile[] | null;
};

const speakers = [
  { name: "Dr. Sarah Chen", title: "AI Ethicist, Google", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCxQME8_rcDcU5kogarq3KxtQv-NKYngXnecg8SkkBn4JNx4BQJphsbYnJHztToKtE0n2q5ccIcfh57UOr05tJXQzfkbFgBNd3y3Vb29KoDLA_Edl9UIoaZhU5vb2d6ArxZmbWERQApy5xiIEC6ukRSYrnzGRYYv9Q3EhW4JtVzr7MPFapTQ9jAXpXg9bIB7UQJY7fNdejs7CcbD5sb7MqGfP-wI7IpzpnSitD7qOq9c7Mqlk56GoDKRlvQ_5oE128L5OXC92T6EWWc" },
  { name: "Marcus Vane", title: "Lead Architect, Meta", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuApgH8Ali0q4x9_QTF_aiC4oTBTbRyZ_A1xrb_f9u53AiZ72IIogYw7gkdkaLJhSBK7xJDZEq5zJAtuOY-RVqx6grVoiFoq7i8dlkdLkNyou_31bsDARApXiMgqiQ_Vu8buEpR3xJwabXGD5VcISsyC2YR7Cl3PYCZagXtPEfLSD6DB8zgD3_t7yn_m285v6algzIy6N0uwh-Y8zMKVwErrXcPg4eoBxQMIvfPiwlZL7UHn4LGIkaHzzYl13sRNOzZHhiKiEPD7C9U_" },
  { name: "Elena Rodriguez", title: "CTO, Robotics Hub", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBjHyFLcCZti-DymhSet-yEiWkXJaMHRE1HZPXPUTzayEP9fuOB9sA_EnP6NQMckfVxzijDetY-6FsFs49VEoDM9eaaWenLGa1xcjOVSvc4zQ1L6s6Er-W8PfY3cGvON4PHLAdi9_dvKpNCxefRT4_4nQSw5-1-UseKjXDCpKWWQQe8ukBr8RPsL7xqYqK5olJvJd88Oo8aHyr9bCkTVU5ZOAowR_Q0xXqOArWgEX3PF7aSamP_DrUiQUo0PzLmY7ixH8ifSKqXMKLb" },
  { name: "David Park", title: "Partner, Y-Combinator", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKnxwILgEttLazfi7NgFBZXBuCTSF0xwYaKKq6o08M7BKWTuDVxBVxtc3ZiDnAKhYN2MWD3Z6ywe8Orq2eDa4ng8SDWrRdigIdFv2FgB4PxpixC_9t-uKuV4keZjZUEas_q7A0Bd5lv8i_xz_rfy3e2rq-iwNLBAjmFpVZkgYaeg13yp9F-js4mcphT-3bMiunD_rmw1AySkB610PuXBWXsjt4_26HU0zc4ypmfjs0_yFJEfaOW8gIDGPLoKF8AsiOCldpKxueWm0R" },
];

function normalizeReviewProfile(profile: EventReviewItem["profiles"]) {
  return Array.isArray(profile) ? profile[0] ?? null : profile;
}

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [eventItem, setEventItem] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketId, setTicketId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<EventReviewItem[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [hasOwnReview, setHasOwnReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      if (!id) return;

      const [eventResult, reviewsResult, purchasesResult, attendanceResult] = await Promise.all([
        supabase.from("events").select("*, ticket_types(*)").eq("id", id).single(),
        supabase
          .from("event_reviews")
          .select("id, user_id, rating, comment, created_at, profiles(full_name, avatar_url)")
          .eq("event_id", id)
          .order("created_at", { ascending: false }),
        user
          ? supabase.from("ticket_purchases").select("id", { head: true, count: "exact" }).eq("event_id", id).eq("user_id", user.id)
          : Promise.resolve({ count: 0, error: null }),
        user
          ? supabase.from("event_attendance").select("id, status").eq("event_id", id).eq("user_id", user.id)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (eventResult.error) {
        showToast("Error loading event details");
        setLoading(false);
        return;
      }
      if (reviewsResult.error) {
        showToast("Could not load reviews");
      }
      if (purchasesResult.error) {
        showToast("Could not verify your purchase history");
      }
      if (attendanceResult.error) {
        showToast("Could not verify attendance status");
      }

      const typedEvent = eventResult.data as EventItem;
      setEventItem(typedEvent);
      const availableTickets = typedEvent.ticket_types?.filter((ticketType: TicketType) => ticketType.status !== "soldout");
      if (availableTickets?.length) {
        setTicketId(availableTickets[0].id);
      }

      const nextReviews = (reviewsResult.data ?? []) as EventReviewItem[];
      const attendanceRows = attendanceResult.data ?? [];
      const canReviewByAttendance = attendanceRows.some((row) => row.status === "attended" || row.status === "registered");
      const canReviewByPurchase = (purchasesResult.count ?? 0) > 0;

      setReviews(nextReviews);
      setCanReview(Boolean(user) && (canReviewByAttendance || canReviewByPurchase));
      setHasOwnReview(nextReviews.some((review) => review.user_id === user?.id));
      setLoading(false);
    }

    void fetchEvent();
  }, [id, showToast, user]);

  const ticket = eventItem?.ticket_types?.find((ticketType) => ticketType.id === ticketId);
  const total = ticket ? Number(ticket.price) * qty : 0;
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  const handleCheckout = () => {
    if (!eventItem || !ticket) return;
    setCart({ eventId: eventItem.id, ticketId: ticket.id, ticketName: ticket.name, qty, unitPrice: Number(ticket.price), createdAt: Date.now() });
    showToast("Selection sent to checkout");
    navigate("/checkout");
  };

  const submitReview = async () => {
    if (!user || !eventItem) return;
    if (!canReview) {
      showToast("You need a purchase or attendance record to review this event");
      return;
    }
    if (reviewComment.trim().length < 12) {
      showToast("Write a more detailed review");
      return;
    }

    try {
      setSubmittingReview(true);
      const { data, error } = await supabase
        .from("event_reviews")
        .upsert(
          {
            user_id: user.id,
            event_id: eventItem.id,
            rating: reviewRating,
            comment: reviewComment.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,event_id" },
        )
        .select("id, user_id, rating, comment, created_at, profiles(full_name, avatar_url)")
        .single();

      if (error) throw error;

      const nextReview = data as EventReviewItem;
      setReviews((current) => [nextReview, ...current.filter((review) => review.id !== nextReview.id)]);
      setHasOwnReview(true);
      setReviewComment("");
      showToast("Review saved");
    } catch (error) {
      console.error(error);
      showToast("Could not save the review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="min-h-screen py-20 text-center text-slate-500 dark:text-blue-100/65">Loading event...</div>;
  if (!eventItem) return <div className="min-h-screen py-20 text-center text-slate-500 dark:text-blue-100/65">Event not found.</div>;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 pb-20 pt-6 text-slate-900 dark:text-white">
      <div className="relative mb-12 aspect-[21/9] w-full overflow-hidden rounded-2xl">
        <img src={eventItem.image} alt={eventItem.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#081120]/90 via-[#081120]/50 to-transparent p-8 md:p-12">
          <div className="mb-6 flex gap-3">
            <span className="rounded-full border border-primary/50 bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-100">
              {eventItem.category}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
              Fast selling
            </span>
          </div>
          <h1 className="mb-6 text-5xl font-extrabold tracking-tighter text-white md:text-7xl">{eventItem.title}</h1>
          <div className="flex flex-wrap items-center gap-8 text-sm text-blue-100/80">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              <span>{eventItem.date_label} - {eventItem.time_label}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <span>{eventItem.location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          <section className="panel p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <span className="material-symbols-outlined text-primary">info</span>
              </div>
              <h3 className="text-2xl font-bold">About the event</h3>
            </div>
            <div className="space-y-4 text-lg text-slate-600 dark:text-blue-100/70">
              <p>{eventItem.hero}</p>
              <p>Join a community-driven experience with sessions, networking and content built around discovery and attendance.</p>
            </div>
          </section>

          <section className="panel p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <span className="material-symbols-outlined text-primary">reviews</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Reviews</h3>
                  <p className="text-sm text-slate-500 dark:text-blue-100/58">Visible to all users. Publishing requires a purchase or attendance record.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-primary">{averageRating ? averageRating.toFixed(1) : "-"}</p>
                <p className="text-sm text-slate-500 dark:text-blue-100/58">{reviews.length} review(s)</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-line-light bg-blue-50/50 p-5 dark:border-line-dark dark:bg-surface-dark-alt">
                <h4 className="text-lg font-bold">Share your experience</h4>
                <p className="mt-2 text-sm text-slate-500 dark:text-blue-100/60">
                  {canReview ? "You can publish a review for this event." : "Buy or register for the event to unlock reviews."}
                </p>
                {hasOwnReview ? (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">You already have a review. Saving again updates it.</p>
                ) : null}
                <div className="mt-5 flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewRating(value)}
                      className={`flex size-11 items-center justify-center rounded-xl border text-sm font-bold ${
                        value <= reviewRating
                          ? "border-primary bg-primary text-white"
                          : "border-line-light bg-white text-slate-500 dark:border-line-dark dark:bg-surface-dark dark:text-blue-100/60"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <textarea
                  className="field mt-4 min-h-[140px]"
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="What stood out? Was the organization solid? Would you attend again?"
                />
                <button
                  type="button"
                  onClick={() => void submitReview()}
                  disabled={submittingReview || !canReview}
                  className="btn-primary mt-4 w-full justify-center disabled:opacity-50"
                >
                  {submittingReview ? "Saving..." : hasOwnReview ? "Update review" : "Publish review"}
                </button>
              </div>

              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line-light p-6 text-sm text-slate-500 dark:border-line-dark dark:text-blue-100/58">
                    No reviews yet. Be the first attendee to leave one.
                  </div>
                ) : (
                  reviews.map((review) => {
                    const profile = normalizeReviewProfile(review.profiles);
                    const avatar = profile?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name ?? "Evento")}&background=135bec&color=fff`;
                    return (
                      <article key={review.id} className="rounded-2xl border border-line-light bg-white p-5 dark:border-line-dark dark:bg-surface-dark-alt">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img src={avatar} alt={profile?.full_name ?? "Reviewer"} className="size-11 rounded-full object-cover" />
                            <div>
                              <p className="font-semibold">{profile?.full_name ?? "Anonymous attendee"}</p>
                              <p className="text-xs text-slate-500 dark:text-blue-100/58">{new Date(review.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="rounded-full bg-primary/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                            {review.rating}/5
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-blue-100/68">{review.comment}</p>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section className="panel p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <span className="material-symbols-outlined text-primary">groups</span>
              </div>
              <h3 className="text-2xl font-bold">Featured speakers</h3>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {speakers.map((speaker) => (
                <div key={speaker.name} className="text-center">
                  <div className="mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border-2 border-line-light bg-white p-1 dark:border-line-dark dark:bg-surface-dark-alt">
                    <img className="h-full w-full rounded-full object-cover" src={speaker.image} alt={speaker.name} />
                  </div>
                  <h4 className="text-sm font-bold">{speaker.name}</h4>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-500 dark:text-blue-100/60">{speaker.title}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="panel p-8">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold">
              <span className="material-symbols-outlined text-primary">confirmation_number</span>
              Select your tickets
            </h3>
            <div className="space-y-4">
              {eventItem.ticket_types?.map((ticketType) => (
                <button
                  key={ticketType.id}
                  disabled={ticketType.status === "soldout"}
                  onClick={() => setTicketId(ticketType.id)}
                  className={`w-full rounded-xl border p-5 text-left transition ${
                    ticketType.id === ticketId
                      ? "border-primary bg-blue-50 dark:bg-surface-dark-alt"
                      : "border-line-light bg-white hover:border-primary/40 dark:border-line-dark dark:bg-surface-dark dark:hover:border-primary/40"
                  } ${ticketType.status === "soldout" ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">{ticketType.name}</p>
                      <p className="text-xs text-slate-500 dark:text-blue-100/60">{ticketType.description}</p>
                    </div>
                    <span className="text-lg font-bold text-primary">${Number(ticketType.price)}</span>
                  </div>
                </button>
              ))}
            </div>

            {ticket ? (
              <>
                <div className="mt-6 flex items-center justify-between rounded-xl border border-line-light bg-blue-50/60 px-4 py-3 dark:border-line-dark dark:bg-surface-dark-alt">
                  <span className="text-sm font-semibold text-slate-700 dark:text-blue-100/80">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex size-8 items-center justify-center rounded-lg bg-white dark:bg-surface-dark" type="button">
                      -
                    </button>
                    <span className="text-sm font-semibold">{qty}</span>
                    <button onClick={() => setQty(qty + 1)} className="flex size-8 items-center justify-center rounded-lg bg-white dark:bg-surface-dark" type="button">
                      +
                    </button>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-line-light bg-white p-4 text-sm text-slate-600 dark:border-line-dark dark:bg-surface-dark-alt dark:text-blue-100/70">
                  <div className="flex items-center justify-between">
                    <span>{ticket.name}</span>
                    <span>${Number(ticket.price).toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={handleCheckout} className="mt-6 w-full rounded-xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-500" type="button">
                  Buy tickets
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
