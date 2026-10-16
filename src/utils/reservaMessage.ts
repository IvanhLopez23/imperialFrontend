// Interpreta el mensaje de WhatsApp que envía la landing de reservas y extrae
// los datos de la cita. Formato esperado (generado por /reservar):
//
//   ¡Hola Imperial! Quiero reservar una cita 💈
//
//   👤 Nombre: Juan Pérez
//   📞 Teléfono: 5512345678
//   ✂️ Servicio: Corte clásico
//   📅 Fecha: viernes 17 de octubre (2025-10-17)
//   🕐 Hora: 10:30
//   📝 Notas: ...

export interface ParsedReserva {
  name?: string;
  phone?: string;
  service?: string;
  date?: string; // ISO YYYY-MM-DD
  time?: string; // HH:MM
  notes?: string;
}

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

// "viernes 17 de octubre" -> "2025-10-17" (usa el año actual; si ya pasó, el próximo)
function parseSpanishDate(text: string): string | undefined {
  const m = text.toLowerCase().match(/(\d{1,2})\s*de\s*([a-záéíóúñ]+)/);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = MONTHS[m[2]];
  if (!month || day < 1 || day > 31) return undefined;
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (candidate < today) year += 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseReservaMessage(raw: string): ParsedReserva {
  const out: ParsedReserva = {};
  for (const line of (raw || "").split(/\r?\n/)) {
    // Ignora emojis/viñetas iniciales y detecta "Etiqueta: valor"
    const m = line.match(/^\s*[^\p{L}]*?(nombre|tel[eé]fono|servicio|fecha|hora|notas)\s*:\s*(.+?)\s*$/iu);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();

    if (key.startsWith("nom")) out.name = value;
    else if (key.startsWith("tel")) out.phone = value.replace(/\D/g, "").slice(0, 10);
    else if (key.startsWith("serv")) out.service = value;
    else if (key.startsWith("fec")) {
      const iso = value.match(/\d{4}-\d{2}-\d{2}/);
      out.date = iso ? iso[0] : parseSpanishDate(value);
    } else if (key.startsWith("hor")) {
      out.time = value.match(/\b(\d{1,2}:\d{2})\b/)?.[1];
    } else if (key.startsWith("nota")) out.notes = value;
  }
  return out;
}
