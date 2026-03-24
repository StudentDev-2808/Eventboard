import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearCart, getCart } from "../lib/storage";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { EventItem, SavedPaymentMethod, TicketType } from "../types";

const paymentMethods = ["card", "paypal", "gpay"] as const;
const promoCodes: Record<string, number> = { WELCOME10: 0.1, EVENTBOARD15: 0.15 };

type PaymentMethodType = (typeof paymentMethods)[number];

type PaymentFields = {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  paypalEmail: string;
  googleWallet: string;
};

function detectCardBrand(digits: string) {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Card";
}

function luhnCheck(digits: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function parseExpiry(value: string) {
  const match = value.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return null;

  return { month, year };
}

function expiryIsValid(value: string) {
  const parsed = parseExpiry(value);
  if (!parsed) return false;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return parsed.year > currentYear || (parsed.year === currentYear && parsed.month >= currentMonth);
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function createOrderNumber() {
  const segment = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EV-${Date.now().toString().slice(-8)}-${segment}`;
}

function createTicketCode() {
  return `TKT-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

function buildPaymentReference(method: PaymentMethodType, fields: PaymentFields, savedMethod?: SavedPaymentMethod | null) {
  if (savedMethod) {
    if (savedMethod.provider === "card") {
      return `${savedMethod.card_brand ?? "Card"} **** ${savedMethod.last4 ?? "0000"}`;
    }
    if (savedMethod.provider === "paypal") {
      return savedMethod.paypal_email ?? "PayPal";
    }
    return savedMethod.wallet_email ?? "Google Pay";
  }

  if (method === "card") {
    const digits = fields.cardNumber.replace(/\D/g, "");
    return `${detectCardBrand(digits)} **** ${digits.slice(-4)}`;
  }
  if (method === "paypal") {
    return fields.paypalEmail.trim();
  }
  return fields.googleWallet.trim();
}

export default function Checkout() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const cart = getCart();
  const [method, setMethod] = useState<PaymentMethodType>("card");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [eventItem, setEventItem] = useState<EventItem | null>(null);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [activeSavedMethodId, setActiveSavedMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saveMethod, setSaveMethod] = useState(true);
  const [paymentFields, setPaymentFields] = useState<PaymentFields>({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
    paypalEmail: user?.email ?? "",
    googleWallet: user?.email ?? "",
  });

  useEffect(() => {
    if (!user) {
      setPaymentFields((current) => ({ ...current, paypalEmail: "", googleWallet: "" }));
      return;
    }

    setPaymentFields((current) => ({
      ...current,
      paypalEmail: current.paypalEmail || user.email,
      googleWallet: current.googleWallet || user.email,
    }));
  }, [user]);

  useEffect(() => {
    if (!cart) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [{ data: eventData, error: eventError }, { data: ticketData, error: ticketError }, methodsResult] =
          await Promise.all([
            supabase.from("events").select("*").eq("id", cart.eventId).single(),
            supabase.from("ticket_types").select("*").eq("event_id", cart.eventId).eq("id", cart.ticketId).single(),
            user
              ? supabase
                  .from("saved_payment_methods")
                  .select("*")
                  .eq("user_id", user.id)
                  .order("is_default", { ascending: false })
                  .order("created_at", { ascending: false })
              : Promise.resolve({ data: [], error: null }),
          ]);

        if (eventError) throw eventError;
        if (ticketError) throw ticketError;
        if (methodsResult.error) throw methodsResult.error;

        const typedMethods = (methodsResult.data ?? []) as SavedPaymentMethod[];

        setEventItem(eventData as EventItem);
        setTicket(ticketData as TicketType);
        setSavedMethods(typedMethods);

        const defaultMethod = typedMethods.find((item) => item.is_default) ?? typedMethods[0];
        if (defaultMethod) {
          setMethod(defaultMethod.provider);
          setActiveSavedMethodId(defaultMethod.id);
        }
      } catch (error) {
        console.error("Error fetching checkout data:", error);
        showToast("Could not load checkout details");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [cart, showToast, user]);

  const subtotal = cart ? cart.qty * cart.unitPrice : 0;
  const fee = Math.round(subtotal * 0.05 * 100) / 100;
  const taxes = Math.round(subtotal * 0.0825 * 100) / 100;
  const discount = useMemo(() => subtotal * promoDiscount, [promoDiscount, subtotal]);
  const total = Math.max(0, subtotal + fee + taxes - discount);
  const activeSavedMethod = savedMethods.find((item) => item.id === activeSavedMethodId) ?? null;

  const validation = useMemo(() => {
    const errors: string[] = [];

    if (method === "card") {
      if (activeSavedMethod && activeSavedMethod.provider === "card") {
        if (!/^\d{3,4}$/.test(paymentFields.cvc.trim())) {
          errors.push("Enter the security code for the saved card.");
        }
        if (activeSavedMethod.exp_month && activeSavedMethod.exp_year) {
          const expiryValue = `${String(activeSavedMethod.exp_month).padStart(2, "0")}/${String(activeSavedMethod.exp_year).slice(-2)}`;
          if (!expiryIsValid(expiryValue)) {
            errors.push("The saved card is expired.");
          }
        }
      } else {
        const digits = paymentFields.cardNumber.replace(/\D/g, "");
        if (paymentFields.cardName.trim().length < 3) {
          errors.push("Cardholder name is required.");
        }
        if (digits.length < 15 || !luhnCheck(digits)) {
          errors.push("Enter a valid card number.");
        }
        if (!expiryIsValid(paymentFields.expiry)) {
          errors.push("Enter a valid expiry date.");
        }
        if (!/^\d{3,4}$/.test(paymentFields.cvc.trim())) {
          errors.push("Enter a valid security code.");
        }
      }
    }

    if (method === "paypal" && !/\S+@\S+\.\S+/.test((activeSavedMethod?.paypal_email ?? paymentFields.paypalEmail).trim())) {
      errors.push("Enter a valid PayPal email.");
    }

    if (method === "gpay" && !/\S+@\S+\.\S+/.test((activeSavedMethod?.wallet_email ?? paymentFields.googleWallet).trim())) {
      errors.push("Enter a valid Google Pay email.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [activeSavedMethod, method, paymentFields]);

  const applyPromoCode = () => {
    const normalized = promoCode.trim().toUpperCase();
    const nextDiscount = promoCodes[normalized];
    if (!nextDiscount) {
      setPromoDiscount(0);
      showToast("Invalid promo code");
      return;
    }
    setPromoDiscount(nextDiscount);
    showToast(`Promo applied: ${normalized}`);
  };

  const saveMaskedMethod = async (referenceLabel: string) => {
    if (!user || activeSavedMethodId || !saveMethod) return;

    const isDefault = savedMethods.length === 0;

    const payload =
      method === "card"
        ? {
            user_id: user.id,
            provider: "card",
            label: `${detectCardBrand(paymentFields.cardNumber.replace(/\D/g, ""))} ending in ${paymentFields.cardNumber.replace(/\D/g, "").slice(-4)}`,
            holder_name: paymentFields.cardName.trim(),
            card_brand: detectCardBrand(paymentFields.cardNumber.replace(/\D/g, "")),
            last4: paymentFields.cardNumber.replace(/\D/g, "").slice(-4),
            exp_month: parseExpiry(paymentFields.expiry)?.month ?? null,
            exp_year: parseExpiry(paymentFields.expiry)?.year ?? null,
            paypal_email: null,
            wallet_email: null,
            is_default: isDefault,
          }
        : method === "paypal"
          ? {
              user_id: user.id,
              provider: "paypal",
              label: "PayPal",
              holder_name: null,
              card_brand: null,
              last4: null,
              exp_month: null,
              exp_year: null,
              paypal_email: paymentFields.paypalEmail.trim(),
              wallet_email: null,
              is_default: isDefault,
            }
          : {
              user_id: user.id,
              provider: "gpay",
              label: "Google Pay",
              holder_name: null,
              card_brand: null,
              last4: null,
              exp_month: null,
              exp_year: null,
              paypal_email: null,
              wallet_email: paymentFields.googleWallet.trim(),
              is_default: isDefault,
            };

    const { data, error } = await supabase.from("saved_payment_methods").insert(payload).select("*").single();
    if (error) throw error;

    setSavedMethods((current) => [data as SavedPaymentMethod, ...current]);
    setActiveSavedMethodId((data as SavedPaymentMethod).id);
    showToast(`${referenceLabel} saved for next checkout`);
  };

  const handlePurchase = async () => {
    if (!cart) {
      showToast("No tickets in checkout");
      return;
    }
    if (!user) {
      showToast("Sign in to complete the purchase");
      return;
    }
    if (!validation.valid) {
      showToast(validation.errors[0] ?? "Review the payment details");
      return;
    }

    const orderNumber = createOrderNumber();
    const ticketCode = createTicketCode();
    const paymentReference = buildPaymentReference(method, paymentFields, activeSavedMethod);

    try {
      setProcessing(true);

      const { data, error } = await supabase
        .from("ticket_purchases")
        .insert({
          user_id: user.id,
          event_id: cart.eventId,
          ticket_id: cart.ticketId,
          ticket_name: ticket?.name || cart.ticketName,
          order_number: orderNumber,
          ticket_code: ticketCode,
          quantity: cart.qty,
          unit_price: cart.unitPrice,
          total_price: total,
          payment_method: method,
          payment_reference: paymentReference,
          status: "completed",
        })
        .select("id")
        .single();

      if (error) throw error;

      await saveMaskedMethod(paymentReference);

      clearCart();
      showToast("Purchase completed");
      navigate(`/my-tickets/${data.id}`);
    } catch (error) {
      console.error(error);
      showToast("Could not complete the purchase");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16 text-center text-slate-500 dark:text-blue-100/65">
        <p>Loading checkout...</p>
      </main>
    );
  }

  if (!cart || !eventItem || !ticket) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="panel p-10 text-center">
          <h2 className="text-2xl font-bold">No tickets in checkout</h2>
          <p className="mt-2 text-slate-600 dark:text-blue-100/65">Pick an event first and come back to complete the order.</p>
          <button className="btn-primary mt-6" onClick={() => navigate("/discovery")} type="button">
            Go to discovery
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 text-slate-900 dark:text-white">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 px-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">Secure checkout</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Review, verify and deliver</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-blue-100/68">
              Payment processing is simulated, but card data validation, saved methods, order references and ticket delivery are real.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Cart", "Verification", "Delivery"].map((step, index) => (
              <div key={step} className="panel-alt p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Step {index + 1}</p>
                <p className="mt-2 font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <section className="space-y-8 lg:col-span-8">
          <div className="panel overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[280px_1fr]">
              <div className="h-64 overflow-hidden md:h-full">
                <img alt={eventItem.title} className="h-full w-full object-cover" src={eventItem.image} />
              </div>
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                    {eventItem.category}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:bg-surface-dark-alt dark:text-blue-100/68">
                    {ticket.name}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black">{eventItem.title}</h2>
                <div className="mt-5 grid gap-4 text-sm text-slate-600 dark:text-blue-100/70 sm:grid-cols-2">
                  <div className="rounded-2xl border border-line-light p-4 dark:border-line-dark">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Date</p>
                    <p className="mt-2 font-semibold">{eventItem.date_label}</p>
                    <p className="mt-1">{eventItem.time_label}</p>
                  </div>
                  <div className="rounded-2xl border border-line-light p-4 dark:border-line-dark">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Venue</p>
                    <p className="mt-2 font-semibold">{eventItem.venue_name}</p>
                    <p className="mt-1">{eventItem.location}</p>
                  </div>
                  <div className="rounded-2xl border border-line-light p-4 dark:border-line-dark">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Organizer</p>
                    <p className="mt-2 font-semibold">{eventItem.organizer_name}</p>
                  </div>
                  <div className="rounded-2xl border border-line-light p-4 dark:border-line-dark">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Quantity</p>
                    <p className="mt-2 font-semibold">{cart.qty} ticket(s)</p>
                    <p className="mt-1">{ticket.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {savedMethods.length > 0 ? (
            <div className="panel p-6 md:p-8">
              <div>
                <h3 className="text-xl font-bold">Saved methods</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/58">Use a masked method from your account to accelerate checkout.</p>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {savedMethods.map((item) => (
                  <button
                    key={item.id}
                    className={`rounded-2xl border p-4 text-left transition ${
                      activeSavedMethodId === item.id
                        ? "border-primary bg-blue-50 shadow-[0_0_0_1px_#135bec] dark:bg-surface-dark-alt"
                        : "border-line-light bg-white hover:border-primary/35 dark:border-line-dark dark:bg-surface-dark dark:hover:border-primary/35"
                    }`}
                    onClick={() => {
                      setMethod(item.provider);
                      setActiveSavedMethodId(item.id);
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{item.label}</p>
                      {item.is_default ? (
                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-blue-100/60">
                      {item.provider === "card"
                        ? `${item.card_brand ?? "Card"} ending in ${item.last4 ?? "0000"}`
                        : item.paypal_email ?? item.wallet_email}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="panel p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Verification method</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/58">
                  Card checks use Luhn validation, expiry validation and security code validation.
                </p>
              </div>
              {activeSavedMethodId ? (
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setActiveSavedMethodId(null);
                    setMethod("card");
                  }}
                  type="button"
                >
                  Use a new method
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {paymentMethods.map((value) => (
                <button
                  key={value}
                  className={`rounded-2xl border p-4 text-left transition ${
                    method === value
                      ? "border-primary bg-blue-50 shadow-[0_0_0_1px_#135bec] dark:bg-surface-dark-alt"
                      : "border-line-light bg-white hover:border-primary/35 dark:border-line-dark dark:bg-surface-dark dark:hover:border-primary/35"
                  }`}
                  onClick={() => {
                    setMethod(value);
                    setActiveSavedMethodId(null);
                  }}
                  type="button"
                >
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                    {value === "card" ? "Card" : value === "paypal" ? "PayPal" : "Google Pay"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-blue-100/60">
                    {value === "card"
                      ? "Enter and verify a new card."
                      : value === "paypal"
                        ? "Validate your PayPal account email."
                        : "Deliver to a Google Pay wallet email."}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-line-light bg-blue-50/50 p-5 dark:border-line-dark dark:bg-surface-dark-alt">
              {method === "card" && activeSavedMethod?.provider === "card" ? (
                <div className="grid gap-5 md:grid-cols-[1fr_180px]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Using saved card</p>
                    <p className="mt-2 text-lg font-semibold">
                      {activeSavedMethod.card_brand ?? "Card"} ending in {activeSavedMethod.last4 ?? "0000"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/60">
                      Expires {String(activeSavedMethod.exp_month ?? 0).padStart(2, "0")}/{String(activeSavedMethod.exp_year ?? 0).slice(-2)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/55">Security code</label>
                    <input
                      className="field"
                      inputMode="numeric"
                      maxLength={4}
                      onChange={(event) =>
                        setPaymentFields((current) => ({ ...current, cvc: event.target.value.replace(/\D/g, "").slice(0, 4) }))
                      }
                      placeholder="123"
                      value={paymentFields.cvc}
                    />
                  </div>
                </div>
              ) : null}

              {method === "card" && (!activeSavedMethod || activeSavedMethod.provider !== "card") ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/55">Cardholder name</label>
                    <input
                      className="field"
                      onChange={(event) => setPaymentFields((current) => ({ ...current, cardName: event.target.value }))}
                      placeholder="Alex Rivera"
                      value={paymentFields.cardName}
                    />
                  </div>
                  <div className="grid gap-5 md:grid-cols-[1fr_180px_140px]">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/55">Card number</label>
                      <input
                        className="field"
                        inputMode="numeric"
                        onChange={(event) =>
                          setPaymentFields((current) => ({
                            ...current,
                            cardNumber: formatCardNumber(event.target.value),
                          }))
                        }
                        placeholder="4242 4242 4242 4242"
                        value={paymentFields.cardNumber}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/55">Expiry</label>
                      <input
                        className="field"
                        inputMode="numeric"
                        onChange={(event) =>
                          setPaymentFields((current) => ({ ...current, expiry: formatExpiry(event.target.value) }))
                        }
                        placeholder="MM/YY"
                        value={paymentFields.expiry}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/55">CVC</label>
                      <input
                        className="field"
                        inputMode="numeric"
                        maxLength={4}
                        onChange={(event) =>
                          setPaymentFields((current) => ({ ...current, cvc: event.target.value.replace(/\D/g, "").slice(0, 4) }))
                        }
                        placeholder="123"
                        value={paymentFields.cvc}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-line-light bg-white px-4 py-3 text-sm dark:border-line-dark dark:bg-surface-dark">
                    <span className="font-semibold">Detected brand:</span>{" "}
                    {detectCardBrand(paymentFields.cardNumber.replace(/\D/g, ""))}
                  </div>
                </div>
              ) : null}

              {method === "paypal" ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/55">PayPal email</label>
                  <input
                    className="field"
                    onChange={(event) => setPaymentFields((current) => ({ ...current, paypalEmail: event.target.value }))}
                    placeholder="name@email.com"
                    value={activeSavedMethod?.provider === "paypal" ? activeSavedMethod.paypal_email ?? "" : paymentFields.paypalEmail}
                  />
                </div>
              ) : null}

              {method === "gpay" ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-100/55">Google Pay email</label>
                  <input
                    className="field"
                    onChange={(event) => setPaymentFields((current) => ({ ...current, googleWallet: event.target.value }))}
                    placeholder="wallet@email.com"
                    value={activeSavedMethod?.provider === "gpay" ? activeSavedMethod.wallet_email ?? "" : paymentFields.googleWallet}
                  />
                </div>
              ) : null}
            </div>

            {!activeSavedMethodId ? (
              <label className="mt-5 flex items-start gap-3 text-sm text-slate-600 dark:text-blue-100/65">
                <input
                  checked={saveMethod}
                  className="mt-0.5 size-4 rounded border-line-light text-primary focus:ring-primary dark:border-line-dark dark:bg-input-dark"
                  onChange={(event) => setSaveMethod(event.target.checked)}
                  type="checkbox"
                />
                <span>Save the masked payment reference for future checkouts. Full card numbers and CVC are never stored.</span>
              </label>
            ) : null}

            {validation.errors.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                {validation.errors[0]}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Verification ready. The order will generate a QR ticket and a printable pass.
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <div className="panel p-6 md:p-8">
              <h3 className="text-xl font-bold">Order summary</h3>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{ticket.name}</p>
                    <p className="text-slate-500 dark:text-blue-100/58">x{cart.qty}</p>
                  </div>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-blue-100/58">Service fee</span>
                  <span className="font-semibold">${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-blue-100/58">Taxes</span>
                  <span className="font-semibold">${taxes.toFixed(2)}</span>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-emerald-600 dark:text-emerald-300">Discount</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-300">-${discount.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-line-light pt-4 text-base dark:border-line-dark">
                  <span className="font-bold">Total</span>
                  <span className="text-xl font-black text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="relative">
                  <input
                    className="field pr-24"
                    onChange={(event) => setPromoCode(event.target.value)}
                    placeholder="Promo code"
                    type="text"
                    value={promoCode}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-primary"
                    onClick={applyPromoCode}
                    type="button"
                  >
                    Apply
                  </button>
                </div>

                <div className="rounded-2xl border border-line-light bg-blue-50/60 p-4 text-sm dark:border-line-dark dark:bg-surface-dark-alt">
                  <p className="font-semibold">Delivery</p>
                  <p className="mt-1 text-slate-500 dark:text-blue-100/58">
                    Your pass appears in My Tickets immediately after purchase with order number, QR and print mode.
                  </p>
                </div>

                <button
                  className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50"
                  disabled={processing}
                  onClick={() => void handlePurchase()}
                  type="button"
                >
                  {processing ? "Creating ticket..." : "Complete purchase"}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
