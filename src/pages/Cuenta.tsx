import { useRef, useState, type FormEvent } from "react";
import { post, put } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { initials } from "../utils/initials";

// Reduce la imagen a 256px y la devuelve como dataURL JPEG (avatares ligeros)
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo debe ser una imagen"));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Imagen muy pesada (máx 4 MB)"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function Cuenta() {
  const { user, refreshUser, setUser } = useAuth();

  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  const onAvatarFile = async (file?: File) => {
    if (!file) return;
    setProfileError("");
    try {
      setAvatar(await fileToAvatar(file));
    } catch (err: any) {
      setProfileError(err?.message ?? "No se pudo procesar la imagen");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setSavedProfile(false);
    try {
      const updated = await put("/auth/me", {
        name,
        phone: phone.replace(/\D/g, "") || null,
        email: email.trim() || null,
        avatar: avatar || null,
      });
      setUser(updated);
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2000);
      await refreshUser();
    } catch (err: any) {
      setProfileError(err?.response?.data?.error ?? "No se pudo guardar");
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwMsg("");
    if (newPassword !== confirm) {
      setPwError("Las contraseñas no coinciden");
      return;
    }
    try {
      await post("/auth/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setPwMsg("Contraseña actualizada. Tus otras sesiones se cerraron.");
    } catch (err: any) {
      setPwError(err?.response?.data?.error ?? "No se pudo cambiar la contraseña");
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Mi cuenta</h1>
      </div>

      <div className="content-grid">
        <div className="main-col">
          <div className="panel">
            <h3>👤 Datos del usuario</h3>
            <form onSubmit={saveProfile}>
              <div className="field">
                <label>Foto de perfil</label>
                <div className="avatar-editor">
                  {avatar ? (
                    <img src={avatar} alt="Foto de perfil" className="avatar avatar-lg avatar-img" />
                  ) : (
                    <span className="avatar avatar-lg">{initials(name || user?.username || "")}</span>
                  )}
                  <div className="avatar-actions">
                    <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
                      Subir foto
                    </button>
                    {avatar && (
                      <button type="button" className="ghost" onClick={() => setAvatar("")}>
                        Quitar foto
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => onAvatarFile(e.target.files?.[0])}
                  />
                </div>
                <small>Si no subes foto, se muestran las dos primeras letras de tu nombre.</small>
              </div>
              <div className="field">
                <label>Usuario</label>
                <input value={user?.username ?? ""} readOnly disabled />
                <small>El nombre de usuario no se puede cambiar.</small>
              </div>
              <div className="field">
                <label>Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div className="field">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  autoComplete="email"
                />
                <small>A este correo llega el código de recuperación de contraseña.</small>
              </div>
              <div className="field">
                <label>Teléfono de contacto</label>
                <input
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="5215512345678"
                />
                <small>Opcional, solo dígitos. Número de contacto del local.</small>
              </div>
              {profileError && <div className="auth-error" style={{ marginBottom: 10 }}>{profileError}</div>}
              <button type="submit">{savedProfile ? "✓ Guardado" : "Guardar datos"}</button>
            </form>
          </div>

          <div className="panel">
            <h3>🔑 Cambiar contraseña</h3>
            <form onSubmit={changePassword}>
              <div className="field">
                <label>Contraseña actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="field">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
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
              {pwError && <div className="auth-error" style={{ marginBottom: 10 }}>{pwError}</div>}
              {pwMsg && <div className="auth-info" style={{ marginBottom: 10 }}>{pwMsg}</div>}
              <button type="submit">Cambiar contraseña</button>
            </form>
          </div>
        </div>

        <div className="side-col">
          <div className="panel">
            <h3>🔐 Sesión</h3>
            <p className="muted-sm">
              Estás conectado como <b>{user?.username}</b> ({user?.role}).
              {user?.email ? ` Recuperación por correo a ${user.email}.` : " Aún no tienes correo asociado."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
