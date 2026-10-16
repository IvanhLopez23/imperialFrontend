// Iniciales para el avatar por defecto: las dos primeras letras del nombre.
export function initials(nameOrUser: string): string {
  const s = (nameOrUser || "").trim();
  if (!s) return "?";
  return s.slice(0, 2).toUpperCase();
}
