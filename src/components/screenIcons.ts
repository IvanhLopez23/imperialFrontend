import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Package,
  Scissors,
  CalendarCheck,
  CalendarDays,
  Users,
  Contact,
  Palette,
  LayoutList,
  User,
  Circle,
  type LucideIcon,
} from "lucide-react";

// Claves guardadas en la columna `screens.icon` de la DB
export const SCREEN_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  ventas: Receipt,
  productos: ShoppingBag,
  almacen: Package,
  servicios: Scissors,
  citas: CalendarCheck,
  calendario: CalendarDays,
  barberos: Users,
  clientes: Contact,
  branding: Palette,
  cuenta: User,
  pantallas: LayoutList,
  circle: Circle,
};

export const ICON_KEYS = Object.keys(SCREEN_ICONS);
