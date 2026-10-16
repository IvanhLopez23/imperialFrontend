import { useState } from "react";
import { useInstallPrompt } from "../pwa/useInstallPrompt";

// Banner flotante para instalar la PWA.
// - Android/Chrome: usa el prompt nativo (beforeinstallprompt).
// - iOS/Safari: muestra la instrucción "Compartir → Añadir a pantalla de inicio".
// - Se oculta si ya está instalada o si el usuario lo descartó.
export default function InstallPrompt() {
  const { canPrompt, ios, installed, dismissed, promptInstall, dismiss } = useInstallPrompt();
  const [busy, setBusy] = useState(false);

  if (installed || dismissed) return null;

  const showIOS = ios && !canPrompt;
  if (!canPrompt && !showIOS) return null;

  const install = async () => {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="install-banner" role="dialog" aria-label="Instalar aplicación">
      <span className="install-icon" aria-hidden>💈</span>
      <div className="install-text">
        <b>Instalar Imperial</b>
        <small>
          {showIOS
            ? "Toca Compartir (⬆️) y luego «Añadir a pantalla de inicio»."
            : "Ábrela como app: pantalla completa y acceso desde tu inicio."}
        </small>
      </div>
      {canPrompt && (
        <button type="button" onClick={install} disabled={busy}>
          {busy ? "Instalando…" : "Instalar"}
        </button>
      )}
      <button type="button" className="ghost install-close" onClick={dismiss} aria-label="Cerrar">
        ✕
      </button>
    </div>
  );
}
