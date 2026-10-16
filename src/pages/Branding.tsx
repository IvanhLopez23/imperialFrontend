import { useState } from "react";
import { Palette } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import {
  useBranding,
  EDITABLE_VARS,
  VAR_DEFAULTS,
} from "../hooks/useBranding";
import type { Theme } from "../hooks/useTheme";
import PageHeader from "../components/PageHeader";

const brand = [
  { name: "Verde Salvia · Disponible", hex: "#538B7A", use: "Casillas libres / éxito" },
  { name: "Crema Vintage · Fondo claro", hex: "#E3DFC9", use: "Fondo principal en modo claro" },
  { name: "Dorado Ocre · Acentos", hex: "#B39A6A", use: "Bordes, cabeceras y botones" },
  { name: "Rojo Alerta · Ocupado", hex: "#D93829", use: "Ocupado / cancelado / errores" },
  { name: "Negro Tradicional · Texto", hex: "#111111", use: "Texto y encabezados" },
  { name: "Gris Neutro · Pausa", hex: "#7E857C", use: "Deshabilitado / descansos" },
];

const themeVars = [
  { v: "--bg-primary", light: "#E3DFC9", dark: "#121614", use: "Fondo principal" },
  { v: "--bg-surface", light: "#FAF8EE", dark: "#1C2320", use: "Tarjetas / paneles / tablas" },
  { v: "--text-primary", light: "#111111", dark: "#F0EFE9", use: "Texto principal" },
  { v: "--accent-gold", light: "#B39A6A", dark: "#CBB380", use: "Acentos / bordes / botones" },
  { v: "--color-success", light: "#538B7A", dark: "#63A692", use: "Disponible / éxito" },
  { v: "--color-danger", light: "#D93829", dark: "#EB5344", use: "Ocupado / error" },
  { v: "--color-inactive", light: "#7E857C", dark: "#9BA199", use: "Pausa / deshabilitado" },
];

// Texto legible sobre cada muestra según luminosidad
function onColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? "#111111" : "#ffffff";
}

export default function Branding() {
  const { theme: activeTheme } = useTheme();
  const branding = useBranding();
  const [copied, setCopied] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);
  const [editTheme, setEditTheme] = useState<Theme>(activeTheme);

  // Borrador: los cambios se aplican al pulsar "Guardar cambios"
  const [draftName, setDraftName] = useState(branding.settings.businessName);
  const [draftLogo, setDraftLogo] = useState<string | null>(branding.settings.logo);
  const [draftOverrides, setDraftOverrides] = useState(branding.settings.overrides);
  const [draftWhatsapp, setDraftWhatsapp] = useState(branding.settings.whatsappNumber);

  const saved = branding.settings;
  const dirty =
    JSON.stringify({ n: draftName, l: draftLogo, o: draftOverrides, w: draftWhatsapp }) !==
    JSON.stringify({ n: saved.businessName, l: saved.logo, o: saved.overrides, w: saved.whatsappNumber });

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* portapapeles no disponible */
    }
  };

  const onLogoFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1024 * 1024) {
      alert("Logo muy pesado (máx 1 MB). Usa una imagen más liviana.");
      return;
    }
    const r = new FileReader();
    r.onload = () => setDraftLogo(String(r.result));
    r.readAsDataURL(f);
  };

  const save = async () => {
    await branding.commitAll(draftName.trim() || "Imperial", draftLogo, saved.menuIcon, saved.radius, {
      light: { ...draftOverrides.light },
      dark: { ...draftOverrides.dark },
    }, draftWhatsapp);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2000);
  };

  const discard = () => {
    setDraftName(saved.businessName);
    setDraftLogo(saved.logo);
    setDraftOverrides(saved.overrides);
    setDraftWhatsapp(saved.whatsappNumber);
  };

  const setDraftColor = (v: string, hex: string) =>
    setDraftOverrides((prev) => ({ ...prev, [editTheme]: { ...prev[editTheme], [v]: hex } }));

  const clearDraftColor = (v: string) =>
    setDraftOverrides((prev) => {
      const next = { ...prev[editTheme] };
      delete next[v];
      return { ...prev, [editTheme]: next };
    });

  const overrides = draftOverrides[editTheme] ?? {};
  const customCount =
    Object.keys(draftOverrides.light).length + Object.keys(draftOverrides.dark).length;

  return (
    <>
      <PageHeader
        category="Personalización"
        title="Apariencia y Marca"
        icon={<Palette size={14} />}
        description={
          dirty
            ? "Tienes cambios sin guardar. Pulsa Guardar cambios para aplicarlos en todo el panel."
            : "Identidad del local, colores por tema y paleta de referencia de la marca."
        }
        actions={
          <>
            {dirty && (
              <button className="ghost" onClick={discard}>
                Descartar
              </button>
            )}
            <button onClick={save} disabled={!dirty}>
              {savedTick ? "✓ Guardado" : "Guardar cambios"}
            </button>
          </>
        }
      />

      <div className="content-grid">
        <div className="main-col">
          <div className="panel">
            <h3>🪪 Identidad del local</h3>
            <div className="field">
              <label>Nombre del local</label>
              <input
                placeholder="Ej. Imperial"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              <small>Se muestra en la barra superior y en el menú cuando no hay logo.</small>
            </div>
            <div className="field">
              <label>Logo</label>
              {draftLogo ? (
                <div>
                  <img src={draftLogo} alt="logo actual" className="logo-preview" />
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="ghost" onClick={() => setDraftLogo(null)}>Quitar logo</button>
                  </div>
                  <div style={{ height: 8 }} />
                </div>
              ) : null}
              <input type="file" accept="image/*" onChange={(e) => onLogoFile(e.target.files?.[0])} />
              <small>Si no hay logo se muestra el nombre del local. Máx 1 MB (PNG/JPG).</small>
            </div>
          </div>

          <div className="panel">
            <h3>📱 Reservas por WhatsApp</h3>
            <div className="field">
              <label>Número de WhatsApp</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Ej. 5215512345678"
                value={draftWhatsapp}
                onChange={(e) => setDraftWhatsapp(e.target.value)}
              />
              <small>Solo dígitos, con lada de país (ej. 52 + los 10 dígitos). Es el número que recibe las reservas desde la landing.</small>
            </div>
            <div className="field">
              <label>Enlace público de reservas</label>
              <div className="row" style={{ alignItems: "center" }}>
                <input readOnly value={`${window.location.origin}/reservar`} onFocus={(e) => e.target.select()} />
                <button
                  type="button"
                  className="ghost"
                  style={{ flex: "0 0 auto", minWidth: 0 }}
                  onClick={() => window.open("/reservar", "_blank")}
                >
                  Abrir
                </button>
              </div>
              <small>Comparte este enlace con tus clientes (bio de redes, QR, etc.).</small>
            </div>
          </div>

          <div className="panel">
            <h3>🎨 Colores personalizados {customCount > 0 && <span className="badge ok">{customCount}</span>}</h3>
            <div className="seg">
              {(["light", "dark"] as const).map((m) => (
                <button key={m} className={editTheme === m ? "" : "ghost"} onClick={() => setEditTheme(m)}>
                  {m === "light" ? "☀️ Claro" : "🌙 Oscuro"}
                </button>
              ))}
              <button
                className="ghost"
                onClick={() => setDraftOverrides({ light: {}, dark: {} })}
              >
                Restablecer
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              {EDITABLE_VARS.map(({ v, label }) => {
                const current = overrides[v] ?? VAR_DEFAULTS[editTheme][v];
                const customized = v in overrides;
                return (
                  <div key={v} className="var-row">
                    <span className="swatch-dot" style={{ background: current }} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <b style={{ fontSize: 13 }}>{label}</b><br />
                      <code style={{ fontSize: 12 }}>{v}</code>
                    </div>
                    <input
                      type="color"
                      className="color-input"
                      value={current}
                      onChange={(e) => setDraftColor(v, e.target.value)}
                      title="Elegir color"
                    />
                    {customized && (
                      <button className="ghost" onClick={() => clearDraftColor(v)} title="Volver al valor por defecto">↺</button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="muted-sm">Edita los colores del tema {editTheme === "light" ? "claro" : "oscuro"}. Recuerda pulsar Guardar cambios.</p>
          </div>
        </div>

        <div className="side-col">
          <div className="panel">
            <h3>⭐ Colores de marca</h3>
            <div className="swatches">
              {brand.map((c) => (
                <div key={c.hex} className="swatch" onClick={() => copy(c.hex)} title="Copiar HEX">
                  <div className="swatch-color" style={{ background: c.hex, color: onColor(c.hex) }}>
                    {copied === c.hex ? "¡Copiado!" : c.hex}
                  </div>
                  <div className="swatch-body">
                    <b>{c.name}</b>
                    <small>{c.use}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(["light", "dark"] as const).map((mode) => (
            <div key={mode} className="panel">
              <h3>{mode === "light" ? "☀️ Claro (defecto)" : "🌙 Oscuro (defecto)"}</h3>
              {themeVars.map((t) => {
                const hex = mode === "light" ? t.light : t.dark;
                return (
                  <div key={t.v} className="var-row" onClick={() => copy(hex)} style={{ cursor: "pointer" }} title="Copiar HEX">
                    <span className="swatch-dot" style={{ background: hex }} />
                    <code>{t.v}</code>
                    <span className="swatch-hex">{copied === hex ? "¡Copiado!" : hex}</span>
                    <small>{t.use}</small>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
