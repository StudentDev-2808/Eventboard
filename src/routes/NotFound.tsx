import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
        <h2 className="text-2xl font-bold">Pagina no encontrada</h2>
        <p className="mt-2 text-slate-300">Regresa al dashboard para continuar.</p>
        <Link className="mt-6 inline-flex rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400" to="/">
          Ir al dashboard
        </Link>
      </div>
    </main>
  );
}
