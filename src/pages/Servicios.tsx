import { useState } from "react";
import { get, post, put, del } from "../api/client";
import { usePaginated } from "../hooks/usePaginated";
import { useDebouncedValue } from "../hooks/useDebounce";
import Pagination from "../components/Pagination";
import SearchInput from "../components/SearchInput";
import type { ServiceItem } from "../types";

const emptyForm = { name: "", price: "0", durationMinutes: 30, description: "", active: true };

export default function Servicios() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 400);
  const query = q === "" ? "" : debouncedQ;
  const [form, setForm] = useState<any>(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const servs = usePaginated<ServiceItem>((p, signal) => get("/services", { ...p, q: query }, signal), [query]);

  const onType = (v: string) => {
    setQ(v);
    servs.setPage(1);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (s: ServiceItem) => {
    setForm({ ...s });
    setEditing(s.id);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async (e: any) => {
    e.preventDefault();
    if (editing) await put(`/services/${editing}`, form);
    else await post("/services", form);
    closeDrawer();
    servs.reload();
  };

  return (
    <>
      <div className="page-head">
        <h1>Servicios de barbería</h1>
        <button onClick={openCreate}>+ Agregar servicio</button>
      </div>
      <div className="panel">
        <SearchInput value={q} onChange={onType} placeholder="Buscar servicio por nombre..." busy={q !== query || servs.loading} />
        <table style={{ marginTop: 12 }}><thead><tr><th>Servicio</th><th>Precio</th><th>Duración</th><th></th></tr></thead>
          <tbody>
            {servs.loading && <tr><td colSpan={4}>Cargando...</td></tr>}
            {!servs.loading && servs.data.map((s) => (
              <tr key={s.id}><td>{s.name}<br /><small className="muted">{s.description}</small></td><td>${s.price}</td><td>{s.durationMinutes} min</td>
                <td><button className="ghost" onClick={() => openEdit(s)}>Editar</button>{" "}
                  <button className="danger" onClick={async () => { if (confirm("Eliminar?")) { await del(`/services/${s.id}`); servs.reload(); } }}>X</button></td></tr>
            ))}
          </tbody></table>
        <Pagination page={servs.page} totalPages={servs.totalPages} total={servs.total} limit={servs.limit} onPage={servs.setPage} onLimit={servs.setLimit} />
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>{editing ? `Editar servicio #${editing}` : "Agregar servicio"}</h2>
              <button className="ghost" onClick={closeDrawer}>✕</button>
            </div>
            <form onSubmit={submit} className="drawer-body">
              <div className="field">
                <label>Nombre del servicio</label>
                <input placeholder="Ej. Corte + barba" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <small>Nombre visible en el catálogo, citas y ventas.</small>
              </div>
              <div className="field">
                <label>Precio del servicio</label>
                <input type="number" step="0.01" min={0} placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <small>Precio que paga el cliente por este servicio.</small>
              </div>
              <div className="field">
                <label>Duración (minutos)</label>
                <input type="number" value={30} disabled readOnly />
                <small>Fijo: todas las citas duran 30 minutos. La hora de fin se calcula sola.</small>
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea placeholder="Detalles del servicio..." value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <small>Texto descriptivo que verá el cliente (ej. incluye lavado, acabado, etc.).</small>
              </div>
              <label className="check">
                <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Servicio activo (visible para citas y ventas)
              </label>
              <div className="drawer-foot">
                <button type="submit">{editing ? "Guardar cambios" : "Crear servicio"}</button>
                <button type="button" className="ghost" onClick={closeDrawer}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
