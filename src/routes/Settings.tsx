import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import type { SavedPaymentMethod, ThemeMode } from "../types";

function Toggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      aria-checked={value}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
        value ? "border-primary bg-primary" : "border-line-light bg-white dark:border-line-dark dark:bg-input-dark"
      }`}
      onClick={() => onChange(!value)}
      role="switch"
      type="button"
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          value ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ThemeOption({
  value,
  current,
  title,
  description,
  onSelect,
}: {
  value: ThemeMode;
  current: ThemeMode;
  title: string;
  description: string;
  onSelect: (value: ThemeMode) => void;
}) {
  const selected = value === current;

  return (
    <button
      className={`rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-primary bg-blue-50 shadow-[0_0_0_1px_#135bec] dark:bg-surface-dark-alt"
          : "border-line-light bg-white hover:border-primary/35 dark:border-line-dark dark:bg-surface-dark dark:hover:border-primary/35"
      }`}
      onClick={() => onSelect(value)}
      type="button"
    >
      <div
        className={`mb-4 h-28 rounded-xl border ${
          value === "light"
            ? "border-blue-100 bg-gradient-to-br from-white via-blue-50 to-slate-100"
            : "border-line-dark bg-gradient-to-br from-[#081120] via-[#0d1b33] to-[#153766]"
        }`}
      />
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/60">{description}</p>
    </button>
  );
}

function paymentSummary(method: SavedPaymentMethod) {
  if (method.provider === "card") {
    return `${method.card_brand ?? "Card"} ending in ${method.last4 ?? "0000"}`;
  }

  if (method.provider === "paypal") {
    return method.paypal_email ?? "PayPal account";
  }

  return method.wallet_email ?? "Google Pay wallet";
}

export default function Settings() {
  const { showToast } = useToast();
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("usuario");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [saving, setSaving] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [publicProfile, setPublicProfile] = useState(true);
  const [attendingList, setAttendingList] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [stats, setStats] = useState({
    purchases: 0,
    unreadNotifications: 0,
    registeredEvents: 0,
    attendedEvents: 0,
  });

  useEffect(() => {
    if (!user) return;

    setEmail(user.email || "");
    setRole(user.role || "usuario");
    setFullName(user.full_name || "");
    setTheme(user.theme || "dark");
    setPublicProfile(user.public_profile);
    setAttendingList(user.attending_list_public);
    setNewsletter(user.newsletter_enabled);
    setTwoFactor(user.two_factor_enabled);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoadingMeta(false);
      return;
    }

    const fetchMeta = async () => {
      try {
        const [
          methodsResult,
          purchasesResult,
          notificationsResult,
          attendanceResult,
        ] = await Promise.all([
          supabase
            .from("saved_payment_methods")
            .select("*")
            .eq("user_id", user.id)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase.from("ticket_purchases").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false),
          supabase.from("event_attendance").select("status").eq("user_id", user.id),
        ]);

        if (methodsResult.error) throw methodsResult.error;
        if (purchasesResult.error) throw purchasesResult.error;
        if (notificationsResult.error) throw notificationsResult.error;
        if (attendanceResult.error) throw attendanceResult.error;

        const attendance = attendanceResult.data ?? [];

        setMethods((methodsResult.data ?? []) as SavedPaymentMethod[]);
        setStats({
          purchases: purchasesResult.count ?? 0,
          unreadNotifications: notificationsResult.count ?? 0,
          registeredEvents: attendance.filter((item) => item.status === "registered").length,
          attendedEvents: attendance.filter((item) => item.status === "attended").length,
        });
      } catch (error) {
        console.error(error);
        showToast("No se pudieron cargar tus ajustes extendidos");
      } finally {
        setLoadingMeta(false);
      }
    };

    void fetchMeta();
  }, [showToast, user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const dirty = useMemo(() => {
    if (!user) return false;

    return (
      fullName !== (user.full_name || "") ||
      theme !== user.theme ||
      publicProfile !== user.public_profile ||
      attendingList !== user.attending_list_public ||
      newsletter !== user.newsletter_enabled ||
      twoFactor !== user.two_factor_enabled
    );
  }, [attendingList, fullName, newsletter, publicProfile, theme, twoFactor, user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        theme,
        public_profile: publicProfile,
        attending_list_public: attendingList,
        newsletter_enabled: newsletter,
        two_factor_enabled: twoFactor,
      });
      showToast("Settings saved");
    } catch (error) {
      console.error(error);
      showToast("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    if (!user) return;

    setFullName(user.full_name || "");
    setTheme(user.theme);
    setPublicProfile(user.public_profile);
    setAttendingList(user.attending_list_public);
    setNewsletter(user.newsletter_enabled);
    setTwoFactor(user.two_factor_enabled);
    showToast("Changes discarded");
  };

  const setDefaultMethod = async (methodId: string) => {
    if (!user) return;

    try {
      const activeDefault = methods.find((method) => method.is_default);

      if (activeDefault?.id && activeDefault.id !== methodId) {
        const { error: clearError } = await supabase
          .from("saved_payment_methods")
          .update({ is_default: false })
          .eq("id", activeDefault.id);
        if (clearError) throw clearError;
      }

      const { error } = await supabase
        .from("saved_payment_methods")
        .update({ is_default: true })
        .eq("id", methodId)
        .eq("user_id", user.id);

      if (error) throw error;

      setMethods((current) =>
        current.map((method) => ({
          ...method,
          is_default: method.id === methodId,
        })),
      );
      showToast("Default payment method updated");
    } catch (error) {
      console.error(error);
      showToast("Could not update the default payment method");
    }
  };

  const removeMethod = async (methodId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("saved_payment_methods").delete().eq("id", methodId).eq("user_id", user.id);
      if (error) throw error;

      setMethods((current) => current.filter((method) => method.id !== methodId));
      showToast("Payment method removed");
    } catch (error) {
      console.error(error);
      showToast("Could not remove the payment method");
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 text-slate-900 dark:text-white">
      <div className="space-y-8">
        <section className="panel overflow-hidden">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.3fr_0.9fr] md:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Settings</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">Control your account from one place</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-blue-100/68">
                Profile, theme, privacy, notifications and saved checkout methods all persist in Supabase.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="panel-alt p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Purchases</p>
                <p className="mt-3 text-2xl font-black">{stats.purchases}</p>
              </div>
              <div className="panel-alt p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Unread</p>
                <p className="mt-3 text-2xl font-black">{stats.unreadNotifications}</p>
              </div>
              <div className="panel-alt p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Registered</p>
                <p className="mt-3 text-2xl font-black">{stats.registeredEvents}</p>
              </div>
              <div className="panel-alt p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/55">Attended</p>
                <p className="mt-3 text-2xl font-black">{stats.attendedEvents}</p>
              </div>
            </div>
          </div>
        </section>

        {user?.role === "root" ? (
          <section className="panel-alt flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-bold text-primary dark:text-blue-100">Root access enabled</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-blue-100/68">
                You can manage content, purchases and users from the admin module.
              </p>
            </div>
            <Link className="btn-primary" to="/admin">
              Open admin panel
            </Link>
          </section>
        ) : null}

        <section className="grid gap-8">
          <div className="panel p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-line-light pb-4 dark:border-line-dark">
              <div>
                <h2 className="text-xl font-bold">Account profile</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/58">Core identity fields stored in your profile.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-blue-100/84">Full name</label>
                <input
                  className="field"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your real name"
                  value={fullName}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-blue-100/84">Role</label>
                <input className="field cursor-not-allowed opacity-70" disabled value={role.toUpperCase()} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-blue-100/84">Email</label>
                <input className="field cursor-not-allowed opacity-70" disabled value={email} />
              </div>
            </div>
          </div>

          <div className="panel p-6 md:p-8">
            <h2 className="text-xl font-bold">Appearance and privacy</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/58">
              Preview your theme instantly. It is persisted only when you save.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ThemeOption
                current={theme}
                description="White surfaces and clean blue accents."
                onSelect={setTheme}
                title="Light"
                value="light"
              />
              <ThemeOption
                current={theme}
                description="Deep blue surfaces across the whole product."
                onSelect={setTheme}
                title="Dark"
                value="dark"
              />
            </div>

            <div className="mt-8 space-y-5">
              <div className="flex items-center justify-between gap-6 rounded-2xl border border-line-light bg-blue-50/60 p-4 dark:border-line-dark dark:bg-surface-dark-alt">
                <div>
                  <p className="font-semibold">Public profile</p>
                  <p className="text-sm text-slate-500 dark:text-blue-100/60">Allow other users to see your profile card.</p>
                </div>
                <Toggle onChange={setPublicProfile} value={publicProfile} />
              </div>
              <div className="flex items-center justify-between gap-6 rounded-2xl border border-line-light bg-blue-50/60 p-4 dark:border-line-dark dark:bg-surface-dark-alt">
                <div>
                  <p className="font-semibold">Public attendance list</p>
                  <p className="text-sm text-slate-500 dark:text-blue-100/60">Expose upcoming attended events on your public profile.</p>
                </div>
                <Toggle onChange={setAttendingList} value={attendingList} />
              </div>
              <div className="flex items-center justify-between gap-6 rounded-2xl border border-line-light bg-blue-50/60 p-4 dark:border-line-dark dark:bg-surface-dark-alt">
                <div>
                  <p className="font-semibold">Newsletter</p>
                  <p className="text-sm text-slate-500 dark:text-blue-100/60">Receive release notes and event recommendations.</p>
                </div>
                <Toggle onChange={setNewsletter} value={newsletter} />
              </div>
              <div className="flex items-center justify-between gap-6 rounded-2xl border border-line-light bg-blue-50/60 p-4 dark:border-line-dark dark:bg-surface-dark-alt">
                <div>
                  <p className="font-semibold">Two-step verification flag</p>
                  <p className="text-sm text-slate-500 dark:text-blue-100/60">Stores your preference so the next auth layer can use it.</p>
                </div>
                <Toggle onChange={setTwoFactor} value={twoFactor} />
              </div>
            </div>
          </div>

          <div className="panel p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Saved checkout methods</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/58">
                  Methods are created from checkout. Only masked references are stored.
                </p>
              </div>
              <Link className="btn-secondary" to="/checkout">
                Go to checkout
              </Link>
            </div>

            <div className="mt-6">
              {loadingMeta ? (
                <div className="rounded-2xl border border-line-light p-6 text-sm text-slate-500 dark:border-line-dark dark:text-blue-100/60">
                  Loading saved methods...
                </div>
              ) : methods.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line-light p-6 text-sm text-slate-500 dark:border-line-dark dark:text-blue-100/60">
                  No saved methods yet. Complete a checkout and choose to save the masked method.
                </div>
              ) : (
                <div className="space-y-3">
                  {methods.map((method) => (
                    <div
                      key={method.id}
                      className="flex flex-col gap-4 rounded-2xl border border-line-light bg-white p-4 dark:border-line-dark dark:bg-surface-dark-alt md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{method.label}</p>
                          {method.is_default ? (
                            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-blue-100/60">{paymentSummary(method)}</p>
                      </div>
                      <div className="flex gap-2">
                        {!method.is_default ? (
                          <button className="btn-secondary" onClick={() => void setDefaultMethod(method.id)} type="button">
                            Set default
                          </button>
                        ) : null}
                        <button className="btn-ghost text-red-500 dark:text-red-300" onClick={() => void removeMethod(method.id)} type="button">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button className="btn-ghost" onClick={resetChanges} type="button">
            Discard
          </button>
          <button className="btn-primary min-w-[180px] disabled:opacity-50" disabled={!dirty || saving} onClick={() => void handleSave()} type="button">
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </div>
    </main>
  );
}
