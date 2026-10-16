import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Home, LogOut, Settings, Store, type LucideIcon } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useBranding, applyBranding } from "../hooks/useBranding";
import { SCREEN_ICONS } from "./screenIcons";
import { get } from "../api/client";
import TopNavbar from "./TopNavbar";
import { useAuth } from "../hooks/useAuth";

interface ScreenItem {
  id: number;
  label: string;
  path: string;
  icon: string;
  position: number;
  active: boolean;
}

// Fallback local por si la API no responde: el menú nunca se rompe
const FALLBACK: ScreenItem[] = [
  { id: 1, label: "Dashboard", path: "/", icon: "dashboard", position: 1, active: true },
  { id: 2, label: "Ventas", path: "/ventas", icon: "ventas", position: 2, active: true },
  { id: 3, label: "Productos", path: "/productos", icon: "productos", position: 3, active: true },
  { id: 4, label: "Almacén", path: "/almacen", icon: "almacen", position: 4, active: true },
  { id: 5, label: "Servicios", path: "/servicios", icon: "servicios", position: 5, active: true },
  { id: 6, label: "Citas", path: "/citas", icon: "citas", position: 6, active: true },
  { id: 7, label: "Calendario", path: "/calendario", icon: "calendario", position: 7, active: true },
  { id: 8, label: "Barberos", path: "/barberos", icon: "barberos", position: 8, active: true },
  { id: 9, label: "Clientes", path: "/clientes", icon: "clientes", position: 9, active: true },
  { id: 10, label: "Branding", path: "/configuracion/branding", icon: "branding", position: 10, active: true },
];

interface Category {
  key: string;
  label: string;
  icon: LucideIcon;
  paths?: string[];
  prefix?: string;
}

const CATEGORIES: Category[] = [
  { key: "inicio", label: "Inicio", icon: Home, paths: ["/"] },
  { key: "ventas", label: "Ventas", icon: Store, paths: ["/ventas", "/productos", "/almacen", "/servicios"] },
  { key: "agenda", label: "Agenda", icon: CalendarDays, paths: ["/citas", "/calendario", "/barberos", "/clientes"] },
  { key: "config", label: "Configuración", icon: Settings, prefix: "/configuracion" },
];

const GROUP_PREFIX = "/configuracion";
const SIDEBAR_KEY = "barberia-sidebar";

function inCategory(s: ScreenItem, c: Category): boolean {
  if (c.prefix) return s.path.startsWith(c.prefix + "/");
  return c.paths?.includes(s.path) ?? false;
}

export default function Layout() {
  const { theme } = useTheme();
  const branding = useBranding();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "collapsed";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [screens, setScreens] = useState<ScreenItem[]>(FALLBACK);

  useEffect(() => {
    applyBranding(theme, branding.settings);
  }, [theme, branding.settings]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      /* noop */
    }
  }, [collapsed]);

  useEffect(() => {
    get("/screens")
      .then((rows: any) => {
        const list = Array.isArray(rows) ? rows : [];
        const act = list.filter((s) => s.active);
        if (act.length > 0) setScreens(act);
      })
      .catch(() => {
        /* sin API: se usa el fallback local */
      });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const screensFor = (c: Category): ScreenItem[] => {
    const mine = screens.filter((s) => inCategory(s, c));
    // Las rutas no clasificadas caen en Inicio para no perderlas
    if (c.key === "inicio") {
      const rest = screens.filter((s) => !CATEGORIES.some((cc) => inCategory(s, cc)));
      return [...mine, ...rest];
    }
    return mine;
  };

  const activeCat =
    CATEGORIES.find((c) => screensFor(c).some((s) => s.path === location.pathname)) ?? CATEGORIES[0];

  const activeTitle =
    screens.find((s) => s.path === location.pathname)?.label ?? activeCat.label;

  const goCategory = (c: Category) => {
    const items = screensFor(c);
    if (items.length === 0) return;
    navigate(items[0].path);
    // Al elegir una categoría desde el rail contraído, despliega el menú
    // para mostrar sus submenús sin tener que pulsar el botón del encabezado.
    if (collapsed) setCollapsed(false);
  };

  const doLogout = async () => {
    await logout();
    navigate("/administrador", { replace: true });
  };

  const renderLink = (l: ScreenItem) => {
    const Icon = SCREEN_ICONS[l.icon] ?? SCREEN_ICONS.circle;
    return (
      <NavLink key={l.path} to={l.path} end={l.path === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
        <span className="nav-icon">
          <Icon size={18} />
        </span>
        <span className="nav-label">{l.label}</span>
        <span className="nav-tip">{l.label}</span>
      </NavLink>
    );
  };

  return (
    <div className={`shell${collapsed ? " collapsed" : ""}${mobileOpen ? " menu-open" : ""}`}>
      <TopNavbar
        title={activeTitle}
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((c) => !c)}
        onOpenMobile={() => setMobileOpen(true)}
        logo={branding.settings.logo}
        businessName={branding.settings.businessName}
      />
      <div className="body-row">
        {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
        <aside className="sidebar">
          <div className="rail">
            {CATEGORIES.filter((c) => c.key !== "config").map((c) => (
              <button
                key={c.key}
                className={`rail-btn${activeCat.key === c.key ? " active" : ""}`}
                onClick={() => goCategory(c)}
                title={c.label}
              >
                <c.icon size={20} />
                <span className="rail-tip">{c.label}</span>
              </button>
            ))}
            <div className="rail-bottom">
              <button
                className={`rail-btn${activeCat.key === "config" ? " active" : ""}`}
                onClick={() => goCategory(CATEGORIES[3])}
                title="Configuración"
              >
                <Settings size={20} />
                <span className="rail-tip">Configuración</span>
              </button>
              <button className="rail-btn rail-logout" onClick={doLogout} title="Cerrar sesión">
                <LogOut size={20} />
                <span className="rail-tip">Cerrar sesión</span>
              </button>
            </div>
          </div>
          <div className="submenu">
            <h4>{activeCat.label}</h4>
            <nav>{screensFor(activeCat).map(renderLink)}</nav>
          </div>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
