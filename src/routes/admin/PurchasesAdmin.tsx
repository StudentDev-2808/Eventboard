import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../context/ToastContext";

type PurchaseRecord = {
  id: string;
  ticket_name: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  profiles: { email: string }[] | null;
  events: { title: string }[] | null;
};

export default function PurchasesAdmin() {
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_purchases")
        .select("id, ticket_name, quantity, total_price, status, created_at, profiles(email), events(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPurchases((data ?? []) as unknown as PurchaseRecord[]);
    } catch (error) {
      console.error(error);
      showToast("No se pudieron cargar las compras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPurchases();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("ticket_purchases").update({ status }).eq("id", id);
    if (error) {
      showToast("No se pudo actualizar el estado");
      return;
    }

    setPurchases((current) => current.map((purchase) => (purchase.id === id ? { ...purchase, status } : purchase)));
    showToast("Estado de compra actualizado");
  };

  if (loading) return <div className="p-8 text-white">Cargando compras...</div>;

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-bold">Registro de Compras</h1>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-card-bg">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">Usuario</th>
              <th className="p-4 font-semibold">Evento</th>
              <th className="p-4 font-semibold">Ticket</th>
              <th className="p-4 font-semibold">Total</th>
              <th className="p-4 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {purchases.map((purchase) => {
              const profile = purchase.profiles?.[0];
              const eventInfo = purchase.events?.[0];

              return (
                <tr key={purchase.id} className="hover:bg-white/5">
                  <td className="p-4 text-white/70">{new Date(purchase.created_at).toLocaleString()}</td>
                  <td className="p-4">{profile?.email || "Usuario eliminado"}</td>
                  <td className="p-4">{eventInfo?.title || "Evento desconocido"}</td>
                  <td className="p-4">{purchase.ticket_name} (x{purchase.quantity})</td>
                  <td className="p-4 font-bold text-primary">${Number(purchase.total_price).toFixed(2)}</td>
                  <td className="p-4">
                    <select
                      value={purchase.status}
                      onChange={(event) => void updateStatus(purchase.id, event.target.value)}
                      className="rounded border border-white/10 bg-slate-950 px-3 py-2 text-xs"
                    >
                      <option value="completed">completed</option>
                      <option value="pending">pending</option>
                      <option value="cancelled">cancelled</option>
                      <option value="refunded">refunded</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-white/50">No hay compras registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
