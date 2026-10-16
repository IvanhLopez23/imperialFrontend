import { useCallback, useEffect, useSyncExternalStore } from "react";
import { get, put } from "../api/client";
import type { Theme } from "./useTheme";

export const BRANDING_KEY = "imperial-branding"; // legacy: solo para migrar a DB una vez

// Variables editables por el usuario (por tema)
export const EDITABLE_VARS = [
  { v: "--bg-primary", label: "Fondo principal" },
  { v: "--bg-surface", label: "Superficies / tarjetas" },
  { v: "--text-primary", label: "Texto principal" },
  { v: "--accent-gold", label: "Dorado / acentos" },
  { v: "--color-success", label: "Éxito / disponible" },
  { v: "--color-danger", label: "Error / ocupado" },
  { v: "--color-inactive", label: "Inactivo / pausa" },
] as const;

// Valores por defecto (espejo de styles.css)
export const VAR_DEFAULTS: Record<Theme, Record<string, string>> = {
  light: {
    "--bg-primary": "#e3dfc9",
    "--bg-surface": "#faf8ee",
    "--text-primary": "#111111",
    "--accent-gold": "#b39a6a",
    "--color-success": "#538b7a",
    "--color-danger": "#d93829",
    "--color-inactive": "#7e857c",
  },
  dark: {
    "--bg-primary": "#121614",
    "--bg-surface": "#1c2320",
    "--text-primary": "#f0efe9",
    "--accent-gold": "#cbb380",
    "--color-success": "#63a692",
    "--color-danger": "#eb5344",
    "--color-inactive": "#9ba199",
  },
};

export interface BrandingSettings {
  businessName: string;
  logo: string | null; // dataURL
  menuIcon: string; // icono cuando el menú está contraído
  radius: number; // px de esquinas redondeadas globales
  whatsappNumber: string; // número para reservas por WhatsApp (solo dígitos, con lada país)
  overrides: { light: Record<string, string>; dark: Record<string, string> };
}

const DEFAULTS: BrandingSettings = {
  businessName: "Imperial",
  logo: null,
  menuIcon: "✂️",
  radius: 12,
  whatsappNumber: "",
  overrides: { light: {}, dark: {} },
};

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(24, Math.max(0, Math.round(n))) : fallback;
}

function normalize(raw: any): BrandingSettings {
  return {
    businessName: typeof raw?.businessName === "string" && raw.businessName ? raw.businessName : DEFAULTS.businessName,
    logo: typeof raw?.logo === "string" && raw.logo ? raw.logo : null,
    menuIcon: typeof raw?.menuIcon === "string" && raw.menuIcon ? raw.menuIcon : DEFAULTS.menuIcon,
    radius: num(raw?.radius, DEFAULTS.radius),
    whatsappNumber: typeof raw?.whatsappNumber === "string" ? raw.whatsappNumber : "",
    overrides: {
      light: raw?.overrides?.light && typeof raw.overrides.light === "object" ? raw.overrides.light : {},
      dark: raw?.overrides?.dark && typeof raw.overrides.dark === "object" ? raw.overrides.dark : {},
    },
  };
}

let state: BrandingSettings = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function setState(s: BrandingSettings) {
  state = s;
  listeners.forEach((l) => l());
}

// Aplica los overrides del tema activo como custom properties inline
// (tienen prioridad sobre styles.css)
export function applyBranding(theme: Theme, s: BrandingSettings = state) {
  const root = document.documentElement;
  const all = new Set([...Object.keys(VAR_DEFAULTS.light), ...Object.keys(VAR_DEFAULTS.dark)]);
  all.forEach((v) => root.style.removeProperty(v));
  const o = s.overrides[theme] ?? {};
  Object.entries(o).forEach(([k, v]) => {
    if (v) root.style.setProperty(k, v);
  });
  root.style.setProperty("--radius", `${num(s.radius, 12)}px`);
}

export function effectiveColor(theme: Theme, v: string): string {
  return state.overrides[theme]?.[v] ?? VAR_DEFAULTS[theme][v] ?? "#000000";
}

// Migra una vez lo que hubiera en localStorage (versiones anteriores) a la DB
async function migrateLegacy(): Promise<void> {
  try {
    const raw = localStorage.getItem(BRANDING_KEY);
    if (!raw) return;
    const parsed = normalize(JSON.parse(raw));
    const isDefault = JSON.stringify(parsed) === JSON.stringify(DEFAULTS);
    localStorage.removeItem(BRANDING_KEY);
    if (!isDefault) await put("/settings/branding", parsed);
  } catch {
    /* noop */
  }
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    await migrateLegacy();
    const data = await get("/settings/branding");
    setState(normalize(data));
  } catch {
    /* sin API: se usan los valores por defecto */
  }
}

export function useBranding() {
  const settings = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state
  );

  useEffect(() => {
    hydrate();
  }, []);

  // Guardado explícito en DB de toda la configuración
  const commitAll = useCallback(
    async (
      name: string,
      logo: string | null,
      menuIcon: string,
      radius: number,
      overrides: BrandingSettings["overrides"],
      whatsappNumber: string
    ) => {
      const payload = {
        businessName: name,
        logo,
        menuIcon: menuIcon || DEFAULTS.menuIcon,
        radius: num(radius, 12),
        whatsappNumber: whatsappNumber || "",
        overrides: { light: { ...overrides.light }, dark: { ...overrides.dark } },
      };
      const saved = await put("/settings/branding", payload);
      setState(normalize(saved));
    },
    []
  );

  return { settings, commitAll };
}
