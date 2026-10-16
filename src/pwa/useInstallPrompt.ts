import { useCallback, useEffect, useState } from "react";

// Evento no tipado en lib.dom
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "imperial-pwa-install-dismissed";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (window.navigator as any).standalone === true // iOS Safari
  );
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  // iPad moderno se identifica como Mac con touch
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // evita el mini-infobar nativo; usamos el nuestro
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const mq = window.matchMedia("(display-mode: standalone)");
    const onMq = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    mq.addEventListener?.("change", onMq);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onMq);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome;
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
  }, []);

  return {
    /** true si el navegador permite disparar el prompt nativo (Chrome/Edge/Android) */
    canPrompt: !!deferred,
    /** true en iOS/iPadOS, donde hay que instalarla manualmente desde Compartir */
    ios: isIOS(),
    /** true si ya corre como app instalada */
    installed,
    dismissed,
    promptInstall,
    dismiss,
  };
}
