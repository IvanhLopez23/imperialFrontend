import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { get } from "../api/client";
import { todayLocal } from "../utils/dates";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { initials } from "../utils/initials";

interface Props {
  title: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
  logo: string | null;
  businessName: string;
}

function todayStr() {
  return todayLocal();
}

export default function TopNavbar({ title, collapsed, onToggleSidebar, onOpenMobile, logo, businessName }: Props) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [todayCount, setTodayCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    get("/appointments", { date: todayStr(), limit: 1, status: "pending" })
      .then((r: any) => setTodayCount(r.total ?? 0))
      .catch(() => {});
  }, [location.pathname]);

  // Cierra el menú del perfil al hacer clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const goProfile = () => {
    setMenuOpen(false);
    navigate("/configuracion/cuenta");
  };

  const doLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/administrador", { replace: true });
  };

  const initial = (businessName || "A").trim().charAt(0).toUpperCase();
  const userName = user?.name || user?.username || "Admin";

  return (
    <header className="topnavbar">
      <button
        className="ghost collapse-btn-header only-mobile"
        onClick={onOpenMobile}
        title="Abrir menú"
      >
        ☰
      </button>
      <span className="nav-brand" title={businessName}>
        {logo ? (
          <img src={logo} alt={businessName} className="nav-logo" />
        ) : (
          <span className="nav-brand-initial">{initial}</span>
        )}
        <span className="nav-business">{businessName || "Imperial"}</span>
      </span>
      <span className="nav-divider" />
      <h2 className="nav-title">{title}</h2>
      <button
        className="ghost collapse-btn-header only-desktop"
        onClick={onToggleSidebar}
        title={collapsed ? "Desplegar menú" : "Contraer menú"}
      >
        {collapsed ? "»" : "«"}
      </button>
      <span className="nav-spacer" />
      <button
        className="ghost theme-icon-btn bell-btn"
        onClick={() => navigate("/citas")}
        title={`Citas pendientes de hoy (${todayCount})`}
      >
        <Bell size={18} />
        {todayCount > 0 && <span className="badge-count">{todayCount}</span>}
      </button>
      <button
        className="ghost theme-icon-btn"
        onClick={toggle}
        title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>
      <div className="profile-wrap" ref={menuRef}>
        <button
          type="button"
          className="profile profile-link"
          onClick={() => setMenuOpen((o) => !o)}
          title="Mi cuenta"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={userName} className="avatar avatar-img" />
          ) : (
            <span className="avatar">{initials(userName)}</span>
          )}
          <span className="profile-meta">
            <b>{userName}</b>
            <small>{user?.role === "admin" ? "Administrador" : user?.role ?? ""}</small>
          </span>
        </button>
        {menuOpen && (
          <div className="profile-menu" role="menu">
            <button type="button" role="menuitem" onClick={goProfile}>
              Ir a mi perfil
            </button>
            <button type="button" role="menuitem" className="danger-item" onClick={doLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
