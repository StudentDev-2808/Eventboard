import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { loginWithGoogle, loginWithEmail, registerEmail, isAuthed, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (isAuthed && user) {
      navigate(user.role === "root" ? "/admin" : "/");
    }
  }, [isAuthed, user, navigate]);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        await loginWithEmail(form.email, form.password);
        showToast("Sesión iniciada");
      } else {
        await registerEmail(form.email, form.password, form.name);
        showToast("Cuenta creada. Revisa tu correo si la confirmación está activa.");
      }
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center gap-10 px-6 py-16">
        <div className="hidden flex-1 lg:block">
          <div className="rounded-[2rem] bg-gradient-to-br from-primary via-blue-500 to-cyan-400 p-10 text-white shadow-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/75">EventBoard</p>
            <h1 className="mt-4 text-5xl font-black leading-tight">Organiza y controla la vida del sitio desde una sola plataforma.</h1>
            <p className="mt-5 max-w-xl text-base text-white/80">
              Gestiona eventos, compras, usuarios, favoritos y todo el contenido visible para tus asistentes.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="panel p-10 shadow-2xl">
            <p className="text-center text-xs uppercase tracking-[0.2em] text-primary">EventBoard</p>
            <h2 className="mt-4 text-center text-3xl font-bold">{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h2>
            <p className="mt-3 text-center text-slate-600 dark:text-blue-100/65">
              Accede con email y contraseña o continúa con Google usando Supabase Auth.
            </p>

            <div className="mt-6 grid grid-cols-2 rounded-xl bg-blue-50 p-1 dark:bg-surface-dark-alt">
              <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-primary text-white" : "text-slate-500 dark:text-blue-100/65"}`} onClick={() => setMode("login")}>Entrar</button>
              <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-primary text-white" : "text-slate-500 dark:text-blue-100/65"}`} onClick={() => setMode("register")}>Registro</button>
            </div>

            <div className="mt-6 space-y-4">
              {mode === "register" && <input className="field" placeholder="Nombre completo" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />}
              <input className="field" placeholder="correo@dominio.com" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <input className="field" placeholder="Contraseña" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              <button onClick={() => void submit()} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
                {loading ? "Procesando..." : mode === "login" ? "Entrar con email" : "Crear cuenta"}
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400 dark:text-blue-100/45">
              <div className="h-px flex-1 bg-line-light dark:bg-line-dark" />o<div className="h-px flex-1 bg-line-light dark:bg-line-dark" />
            </div>

            <button onClick={() => void loginWithGoogle()} className="btn-secondary w-full py-3">
              Continuar con Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
