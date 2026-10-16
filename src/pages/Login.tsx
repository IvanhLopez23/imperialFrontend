import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { post } from "../api/client";
import { useAuth } from "../hooks/useAuth";

type Step = "login" | "forgot" | "code" | "reset" | "done";

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const from = (location.state as any)?.from || "/";

  const [step, setStep] = useState<Step>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Recuperación
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Si ya hay sesión, entra directo
  useEffect(() => {
    if (user) navigate(from === "/administrador" ? "/" : from, { replace: true });
  }, [user, from, navigate]);

  const go = (s: Step) => {
    setError("");
    setInfo("");
    setStep(s);
  };

  const doLogin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      navigate(from === "/administrador" ? "/" : from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  const doForgot = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/auth/forgot", { username });
      setCode("");
      go("code");
      setInfo("Si el usuario existe, enviamos un código de 6 dígitos por correo al correo asociado.");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "No se pudo enviar el código");
    } finally {
      setBusy(false);
    }
  };

  const doVerify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post<{ resetToken: string }>("/auth/verify-code", { username, code });
      setResetToken(r.resetToken);
      go("reset");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Código incorrecto");
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/auth/reset", { resetToken, newPassword });
      setPassword("");
      setNewPassword("");
      setConfirm("");
      setCode("");
      setResetToken("");
      go("done");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "No se pudo cambiar la contraseña");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <span className="auth-logo">💈</span>
          <h1>Imperial · Administrador</h1>
          <p className="muted-sm">
            {step === "login" && "Inicia sesión para entrar al panel."}
            {step === "forgot" && "Escribe tu usuario y te enviamos un código por correo."}
            {step === "code" && "Introduce el código de 6 dígitos que recibiste."}
            {step === "reset" && "Elige tu nueva contraseña."}
            {step === "done" && "¡Listo! Ya puedes iniciar sesión."}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {info && step !== "login" && <div className="auth-info">{info}</div>}

        {step === "login" && (
          <form onSubmit={doLogin} className="auth-form">
            <div className="field">
              <label>Usuario</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
            <button type="button" className="ghost auth-link" onClick={() => go("forgot")}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {step === "forgot" && (
          <form onSubmit={doForgot} className="auth-form">
            <div className="field">
              <label>Usuario</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
              <small>El código llegará al correo asociado a tu usuario.</small>
            </div>
            <button type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Enviando…" : "Enviar código por correo"}
            </button>
            <button type="button" className="ghost auth-link" onClick={() => go("login")}>
              ← Volver a iniciar sesión
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={doVerify} className="auth-form">
            <div className="field">
              <label>Código de 6 dígitos</label>
              <input
                className="auth-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(onlyDigits(e.target.value).slice(0, 6))}
                placeholder="000000"
                autoFocus
                required
              />
            </div>
            <button type="submit" disabled={busy || code.length !== 6} style={{ width: "100%" }}>
              {busy ? "Validando…" : "Validar código"}
            </button>
            <button type="button" className="ghost auth-link" onClick={() => go("forgot")}>
              ← Cambiar usuario / reenviar
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={doReset} className="auth-form">
            <div className="field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                autoFocus
                required
              />
            </div>
            <div className="field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <button type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Guardando…" : "Cambiar contraseña"}
            </button>
            <button type="button" className="ghost auth-link" onClick={() => go("login")}>
              ← Volver a iniciar sesión
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="auth-form">
            <button type="button" style={{ width: "100%" }} onClick={() => go("login")}>
              Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
