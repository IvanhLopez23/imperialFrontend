// Fecha "hoy" en hora LOCAL del navegador (America/Mexico_City).
// No usar toISOString(): es UTC y en la noche da el día siguiente (+6h).
export function todayLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
