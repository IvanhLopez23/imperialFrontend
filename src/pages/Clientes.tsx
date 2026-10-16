import { useState } from "react";
import { get, post, put, del } from "../api/client";
import { Pencil, Trash2 } from "lucide-react";
import { usePaginated } from "../hooks/usePaginated";
import { useDebouncedValue } from "../hooks/useDebounce";
import Pagination from "../components/Pagination";
import SearchInput from "../components/SearchInput";

const emptyClient = { name: "", phone: "", email: "", notes: "", vip: false };

export default function Clientes() {
  const [form, setForm] = useState(emptyClient);
  const [editing, setEditing] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 400);
  const query = q === "" ? "" : debouncedQ;

  const clients = usePaginated<any>((p, signal) => get("/customers", { ...p, q: query }, signal), [query]);

  const onType = (v: string) => {
    setQ(v);
    clients.setPage(1);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(emptyClient);
  };

  const openEdit = (c: any) => {
    setForm({
      name: c.name ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
      vip: !!c.vip,
    });
    setEditing(c.id);
    setDrawerOpen(true);
  };

  const submit = async (e: any) => {
    e.preventDefault();
    if (editing) await put(`/customers/${editing}`, form);
    else await post("/customers", form);
    closeDrawer();
    clients.reload();
  };

  const toggleVip = async (c: any) => {
    await put(`/customers/${c.id}`, { vip: !c.vip });
    clients.reload();
  };

  return (
    <>
      <div className="page-head">
        <h1>Clientes</h1>
        <button onClick={() => setDrawerOpen(true)}>+ Agregar cliente</button>
      </div>

      <div className="panel">
        <h3>Directorio</h3>
        <SearchInput value={q} onChange={onType} placeholder="Buscar por nombre o teléfono..." busy={q !== query || clients.loading} />
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>VIP</th><th></th></tr></thead>
          <tbody>
            {clients.loading && <tr><td colSpan={5}>Cargando...</td></tr>}
            {!clients.loading && clients.data.map((c) => (
              <tr key={c.id}>
                <td>{c.name} {c.vip ? <span className="badge ok">VIP</span> : null}</td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                <td>
                  <button
                    className={c.vip ? "" : "ghost"}
                    title={c.vip ? "Quitar VIP" : "Marcar VIP"}
                    onClick={() => toggleVip(c)}
                  >
                    {c.vip ? "★" : "☆"}
                  </button>
                </td>
                <td>
                  <div className="row actions">
                    <button className="ghost icon-btn" title="Editar cliente" onClick={() => openEdit(c)}>
                      <Pencil size={16} />
                    </button>
                    <button className="danger icon-btn" title="Eliminar cliente" onClick={async () => { if (confirm("Eliminar cliente?")) { await del(`/customers/${c.id}`); clients.reload(); } }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={clients.page} totalPages={clients.totalPages} total={clients.total} limit={clients.limit} onPage={clients.setPage} onLimit={clients.setLimit} />
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>{editing ? `Editar cliente #${editing}` : "Agregar cliente"}</h2>
              <button className="ghost" onClick={closeDrawer}>✕</button>
            </div>
            <form onSubmit={submit} className="drawer-body">
              <div className="field">
                <label>Nombre del cliente</label>
                <input placeholder="Ej. Juan Pérez" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <small>Nombre visible al agendar citas.</small>
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input placeholder="10 dígitos" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 15) })} />
                <small>Para confirmar citas y vincular su historial.</small>
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="Ej. juan@correo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <small>Contacto alternativo (opcional).</small>
              </div>
              <div className="field">
                <label>Notas</label>
                <textarea placeholder="Preferencias, alergias..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <small>Información útil para atenderlo (opcional).</small>
              </div>
              <label className="check">
                <input type="checkbox" checked={!!form.vip} onChange={(e) => setForm({ ...form, vip: e.target.checked })} />
                Cliente VIP
              </label>
              <div className="drawer-foot">
                <button type="submit">{editing ? "Guardar cambios" : "Agregar cliente"}</button>
                <button type="button" className="ghost" onClick={closeDrawer}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
