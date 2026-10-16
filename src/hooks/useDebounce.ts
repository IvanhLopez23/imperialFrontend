import { useEffect, useState } from "react";

// Retorna el valor tras `delay` ms sin cambios. Úsalo para no
// disparar la búsqueda en cada tecla (debounce 300-500ms).
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
