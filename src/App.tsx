import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Servicios from "./pages/Servicios";
import Almacen from "./pages/Almacen";
import Citas from "./pages/Citas";
import CalendarioConfig from "./pages/CalendarioConfig";
import Ventas from "./pages/Ventas";
import Barberos from "./pages/Barberos";
import Clientes from "./pages/Clientes";
import Branding from "./pages/Branding";
import Reservar from "./pages/Reservar";
import Login from "./pages/Login";
import Cuenta from "./pages/Cuenta";
import InstallPrompt from "./components/InstallPrompt";
import { AuthProvider, RequireAuth } from "./hooks/useAuth";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/administrador" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/almacen" element={<Almacen />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/citas" element={<Citas />} />
            <Route path="/calendario" element={<CalendarioConfig />} />
            <Route path="/barberos" element={<Barberos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/cuenta" element={<Navigate to="/configuracion/cuenta" replace />} />
            <Route path="/configuracion/cuenta" element={<Cuenta />} />
            <Route path="/configuracion/branding" element={<Branding />} />
            <Route path="/branding" element={<Navigate to="/configuracion/branding" replace />} />
          </Route>
        </Routes>
        <InstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}
