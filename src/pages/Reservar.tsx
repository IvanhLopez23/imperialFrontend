import { useEffect, useMemo, useState } from "react";
import { get } from "../api/client";
import { applyBranding } from "../hooks/useBranding";
import type { Theme } from "../hooks/useTheme";
import { todayLocal } from "../utils/dates";

interface Service {
  id: number;
  name: string;
  price: string;
  description?: string | null;
  active?: boolean;
}

interface Slot {
  start: string;
  end: string;
}

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

// Fecha legible en español (America/Mexico_City por hora local)
function prettyDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

export default function Reservar() {
  const [businessName, setBusinessName] = useState("Imperial");
  const [logo, setLogo] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [working, setWorking] = useState(true);
  const [reason, setReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [sent, setSent] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  // Marca + servicios al cargar
  useEffect(() => {
    get("/settings/branding")
      .then((b: any) => {
        if (b?.businessName) setBusinessName(b.businessName);
        setLogo(b?.logo ?? null);
        setWhatsapp(onlyDigits(b?.whatsappNumber ?? ""));
        try {
          const t: Theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
          applyBranding(t, b);
        } catch {
          /* sin branding: se usan los colores por defecto */
        }
      })
      .catch(() => {});
    get("/services", { limit: 100 })
      .then((r: any) => setServices((r?.data ?? []).filter((s: Service) => s.active !== false)))
      .catch(() => {});
  }, []);

  // Disponibilidad según la fecha elegida (solo lectura)
  useEffect(() => {
    if (!date) {
      setSlots([]);
      setTime("");
      setWorking(true);
      setReason("");
      return;
    }
    setLoadingSlots(true);
    setTime("");
    get("/appointments/availability", { date })
      .then((r: any) => {
        setWorking(!!r?.working);
        setReason(r?.reason ?? "");
        setSlots(Array.isArray(r?.slots) ? r.slots : []);
      })
      .catch(() => {
        setWorking(false);
        setReason("No se pudo consultar la disponibilidad");
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [date]);

  const serviceName = useMemo(
    () => services.find((s) => String(s.id) === serviceId)?.name ?? "",
    [services, serviceId]
  );

  const validPhone = /^\d{10}$/.test(phone);
  const canSend =
    whatsapp.length >= 10 && name.trim().length > 1 && validPhone && !!serviceId && !!date && !!time;

  const send = () => {
    if (!canSend) return;
    const lines = [
      `¡Hola ${businessName}! Quiero reservar una cita 💈`,
      "",
      `👤 Nombre: ${name.trim()}`,
      `📞 Teléfono: ${phone}`,
      `✂️ Servicio: ${serviceName}`,
      `📅 Fecha: ${prettyDate(date)} (${date})`,
      `🕐 Hora: ${time}`,
    ];
    if (notes.trim()) lines.push(`📝 Notas: ${notes.trim()}`);
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank");
    setSent(true);
  };

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-brand">
          {logo ? <img src={logo} alt={businessName} /> : null}
          <h1>{businessName}</h1>
        </div>
        <p className="landing-sub">Reserva tu cita en segundos. Te confirmamos por WhatsApp.</p>

        {whatsapp.length < 10 && (
          <div className="alert" style={{ marginBottom: 16 }}>
            <b>Aún no hay número de WhatsApp configurado.</b>
            <p className="muted-sm" style={{ margin: "6px 0 0" }}>
              El local debe agregarlo en Personalización → Branding → Reservas por WhatsApp.
            </p>
          </div>
        )}

        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
        </div>

        <div className="field">
          <label>Teléfono (10 dígitos)</label>
          <input
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 10))}
            placeholder="5512345678"
          />
          {phone.length > 0 && !validPhone && (
            <small style={{ color: "var(--color-danger)" }}>Debe tener 10 dígitos.</small>
          )}
        </div>

        <div className="field">
          <label>Servicio</label>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Selecciona un servicio...</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {Number(s.price) > 0 ? ` · $${s.price}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Fecha</label>
          <input type="date" min={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="field">
          <label>Hora</label>
          {loadingSlots ? (
            <p className="muted-sm">Cargando horarios...</p>
          ) : !working ? (
            <p className="muted-sm">{reason || "Día no laborable"}</p>
          ) : slots.length === 0 ? (
            <p className="muted-sm">Sin horarios disponibles ese día.</p>
          ) : (
            <div className="landing-slots">
              {slots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  className={`landing-slot${time === s.start ? " active" : ""}`}
                  onClick={() => setTime(s.start)}
                >
                  {s.start}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. corte + barba, referencia, etc."
          />
        </div>

        <button className="landing-wa" disabled={!canSend} onClick={send}>
          Reservar por WhatsApp
        </button>
        {sent && (
          <p className="muted-sm" style={{ marginTop: 10 }}>
            Abriendo WhatsApp... Si no se abrió, revisa el bloqueo de ventanas emergentes.
          </p>
        )}
      </div>
    </div>
  );
}
