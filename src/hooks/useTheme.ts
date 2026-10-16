import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "barberia-theme";

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  } catch {
    /* noop */
  }
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => initial());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Actualiza el color de la barra del sistema (PWA)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#cfc7a8" : "#0e1210");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((t) => (t === "light" ? "dark" : "light")),
    []
  );

  return { theme, toggle };
}
