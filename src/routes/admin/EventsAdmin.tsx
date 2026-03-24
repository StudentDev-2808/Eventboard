import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../context/ToastContext";
import type { EventItem, TicketType } from "../../types";

type EventWithTickets = EventItem & { ticket_types?: TicketType[] };

type TicketFormItem = {
  id: string;
  name: string;
  price: string;
  description: string;
  badge: string;
  status: string;
};

const emptyEvent = {
  id: "",
  title: "",
  category: "Technology",
  date_label: "",
  time_label: "",
  date_iso: "",
  location: "",
  venue_name: "",
  organizer_name: "",
  image: "",
  hero: "",
};

const emptyTickets: TicketFormItem[] = [
  { id: "general", name: "General", price: "", description: "", badge: "", status: "" },
  { id: "vip", name: "VIP", price: "", description: "", badge: "", status: "" },
];

export default function EventsAdmin() {
  const { showToast } = useToast();
  const [events, setEvents] = useState<EventWithTickets[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyEvent);
  const [tickets, setTickets] = useState<TicketFormItem[]>(emptyTickets);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*, ticket_types(*)")
        .order("date_iso", { ascending: true });
      if (error) throw error;
      setEvents((data ?? []) as EventWithTickets[]);
    } catch (error) {
      console.error(error);
      showToast("No se pudieron cargar los eventos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyEvent);
    setTickets(emptyTickets);
    setImageFile(null);
    setImagePreview("");
  };

  const startEdit = (eventItem: EventWithTickets) => {
    setEditingId(eventItem.id);
    setForm({
      id: eventItem.id,
      title: eventItem.title,
      category: eventItem.category,
      date_label: eventItem.date_label,
      time_label: eventItem.time_label,
      date_iso: eventItem.date_iso,
      location: eventItem.location,
      venue_name: eventItem.venue_name,
      organizer_name: eventItem.organizer_name,
      image: eventItem.image,
      hero: eventItem.hero,
    });
    setImageFile(null);
    setImagePreview(eventItem.image);
    setTickets(
      eventItem.ticket_types?.length
        ? eventItem.ticket_types.map((ticket) => ({
            id: ticket.id,
            name: ticket.name,
            price: String(ticket.price),
            description: ticket.description,
            badge: ticket.badge ?? "",
            status: ticket.status ?? "",
          }))
        : emptyTickets,
    );
  };

  const uploadEventImage = async () => {
    if (!imageFile) return form.image;

    const fileExt = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `${form.id || crypto.randomUUID()}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("event-assets").upload(filePath, imageFile, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("event-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const saveEvent = async () => {
    if (!form.id || !form.title || !form.date_iso) {
      showToast("Completa al menos id, título y fecha ISO");
      return;
    }
    if (!form.image && !imageFile) {
      showToast("Agrega una imagen por archivo o URL");
      return;
    }

    const validTickets = tickets.filter((ticket) => ticket.id && ticket.name && ticket.price);
    if (validTickets.length === 0) {
      showToast("Agrega al menos un tipo de boleto válido");
      return;
    }

    try {
      setSaving(true);
      const nextImage = await uploadEventImage();
      const { error: eventError } = await supabase.from("events").upsert({
        ...form,
        image: nextImage,
        date_iso: new Date(form.date_iso).toISOString(),
      });
      if (eventError) throw eventError;

      await supabase.from("ticket_types").delete().eq("event_id", form.id);
      const { error: ticketsError } = await supabase.from("ticket_types").insert(
        validTickets.map((ticket) => ({
          id: ticket.id,
          event_id: form.id,
          name: ticket.name,
          price: Number(ticket.price),
          description: ticket.description,
          badge: ticket.badge || null,
          status: ticket.status || null,
        })),
      );
      if (ticketsError) throw ticketsError;

      showToast(editingId ? "Evento actualizado" : "Evento creado");
      resetForm();
      await fetchEvents();
    } catch (error) {
      console.error(error);
      showToast("No se pudo guardar el evento");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      showToast("Evento eliminado");
      await fetchEvents();
      if (editingId === eventId) resetForm();
    } catch (error) {
      console.error(error);
      showToast("No se pudo eliminar el evento");
    }
  };

  if (loading) return <div className="p-8 text-blue-100">Cargando eventos...</div>;

  return (
    <div className="space-y-8 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Eventos</h1>
        <button onClick={resetForm} className="rounded-lg bg-surface-dark-alt px-4 py-2 text-sm font-semibold text-white hover:bg-primary">
          Nuevo evento
        </button>
      </div>

      <section className="rounded-xl border border-line-dark bg-surface-dark p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold">{editingId ? "Editar evento" : "Crear evento"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="id"
            value={form.id}
            onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="date label"
            value={form.date_label}
            onChange={(event) => setForm((current) => ({ ...current, date_label: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="time label"
            value={form.time_label}
            onChange={(event) => setForm((current) => ({ ...current, time_label: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="date iso"
            value={form.date_iso}
            onChange={(event) => setForm((current) => ({ ...current, date_iso: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="location"
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="venue name"
            value={form.venue_name}
            onChange={(event) => setForm((current) => ({ ...current, venue_name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="organizer name"
            value={form.organizer_name}
            onChange={(event) => setForm((current) => ({ ...current, organizer_name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
            placeholder="image url"
            value={form.image}
            onChange={(event) => {
              setForm((current) => ({ ...current, image: event.target.value }));
              if (!imageFile) setImagePreview(event.target.value);
            }}
          />
          <textarea
            className="min-h-[120px] rounded-lg border border-line-dark bg-input-dark px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary md:col-span-2"
            placeholder="hero"
            value={form.hero}
            onChange={(event) => setForm((current) => ({ ...current, hero: event.target.value }))}
          />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <label className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100/60">Imagen del evento</label>
            <input
              accept="image/*"
              className="block w-full rounded-lg border border-dashed border-line-dark bg-input-dark px-4 py-3 text-sm text-blue-100 file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              type="file"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setImageFile(nextFile);
                setImagePreview(nextFile ? URL.createObjectURL(nextFile) : form.image);
              }}
            />
            <p className="text-xs text-blue-100/50">Puedes subir un archivo de imagen o dejar una URL pública.</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-line-dark bg-surface-dark-alt">
            {imagePreview ? (
              <img src={imagePreview} alt="Vista previa" className="h-48 w-full object-cover" />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-blue-100/45">Sin vista previa</div>
            )}
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-100/60">Boletos</h3>
          {tickets.map((ticket, index) => (
            <div key={`${ticket.id}-${index}`} className="grid gap-3 rounded-xl border border-line-dark bg-surface-dark-alt p-4 md:grid-cols-[1fr_1.2fr_0.8fr_1.6fr_1fr_1fr_auto]">
              <input className="rounded bg-input-dark px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary" placeholder="id" value={ticket.id} onChange={(event) => setTickets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, id: event.target.value } : item))} />
              <input className="rounded bg-input-dark px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary" placeholder="nombre" value={ticket.name} onChange={(event) => setTickets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
              <div className="rounded border border-line-dark bg-input-dark px-3 py-2">
                <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-blue-100/45">Precio</label>
                <input className="w-full bg-transparent text-sm text-white outline-none" placeholder="0.00" value={ticket.price} onChange={(event) => setTickets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} />
              </div>
              <input className="rounded bg-input-dark px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary" placeholder="descripción" value={ticket.description} onChange={(event) => setTickets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} />
              <input className="rounded bg-input-dark px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary" placeholder="badge" value={ticket.badge} onChange={(event) => setTickets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, badge: event.target.value } : item))} />
              <input className="rounded bg-input-dark px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary" placeholder="status" value={ticket.status} onChange={(event) => setTickets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value } : item))} />
              <button
                type="button"
                onClick={() => setTickets((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200"
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            onClick={() => setTickets((current) => [...current, { id: "", name: "", price: "", description: "", badge: "", status: "" }])}
            className="rounded-lg bg-surface-dark-alt px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
          >
            Agregar tipo de boleto
          </button>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={saveEvent} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear evento"}
          </button>
          {editingId ? <button onClick={resetForm} className="rounded-lg bg-surface-dark-alt px-4 py-2 text-sm font-semibold text-white hover:bg-surface-dark">Cancelar edición</button> : null}
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-line-dark bg-surface-dark shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line-dark bg-surface-dark-alt">
            <tr>
              <th className="p-4 font-semibold">Título</th>
              <th className="p-4 font-semibold">Categoría</th>
              <th className="p-4 font-semibold">Boletos</th>
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">Ubicación</th>
              <th className="p-4 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-dark">
            {events.map((eventItem) => (
              <tr key={eventItem.id} className="hover:bg-surface-dark-alt/70">
                <td className="p-4 font-medium">{eventItem.title}</td>
                <td className="p-4"><span className="rounded bg-primary/15 px-2 py-1 text-xs text-blue-100">{eventItem.category}</span></td>
                <td className="p-4">
                  <div className="space-y-1 text-xs text-blue-100/75">
                    {eventItem.ticket_types?.map((ticket) => (
                      <div key={`${eventItem.id}-${ticket.id}`} className="flex items-center justify-between gap-3">
                        <span>{ticket.name}</span>
                        <span className="font-semibold text-white">${Number(ticket.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-4">{eventItem.date_label}</td>
                <td className="p-4 text-blue-100/55">{eventItem.location}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(eventItem)} className="rounded bg-surface-dark-alt px-3 py-1 text-xs font-semibold text-white hover:bg-primary">Editar</button>
                    <button onClick={() => void deleteEvent(eventItem.id)} className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-blue-100/50">No hay eventos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
