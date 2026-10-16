import { useState } from "react";
import { get, post, put, del } from "../api/client";
import { Pencil, Trash2 } from "lucide-react";
import { usePaginated } from "../hooks/usePaginated";
import Pagination from "../components/Pagination";

const emptyForm = { name: "", phone: "" };

export default function Barberos() {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const team = usePaginated<any>((p) => get("/barbers", p), []);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const openEdit = (b: any) => {
    setForm({ name: b.name ?? "", phone: b.phone ?? "" });
    setEditing(b.id);
    setDrawerOpen(true);
  };

  const submit = async (e: any) => {
    e.preventDefault();
    if (editing) await put(`/barbers/${editing}`, form);
    else await post("/barbers", form);
    closeDrawer();
    team.reload();
  };

  return (
    <>
      <div className="page-head">
        <h1>Barberos</h1>
        <button onClick={() => setDrawerOpen(true)}>+ Agregar barbero</button>
      </div>
      <div className="panel">
        <h3>Equipo</h3>
        <table><thead><tr><th>Nombre</th><th>Tel</th><th></th></tr></thead>
          <tbody>
            {team.loading && <tr><td colSpan={3}>Cargando...</td></tr>}
            {!team.loading && team.data.map((b) => (
              <tr key={b.id}><td>{b.name}</td><td>{b.phone}</td>
                <td>
                  <div className="row actions">
                    <button className="ghost icon-btn" title="Editar barbero" onClick={() => openEdit(b)}>
                      <Pencil size={16} />
                    </button>
                    <button className="danger icon-btn" title="Eliminar barbero" onClick={async () => { if (confirm("Eliminar barbero?")) { await del(`/barbers/${b.id}`); team.reload(); } }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td></tr>
            ))}
          </tbody></table>
        <Pagination page={team.page} totalPages={team.totalPages} total={team.total} limit={team.limit} onPage={team.setPage} onLimit={team.setLimit} />
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>{editing ? `Editar barbero #${editing}` : "Agregar barbero"}</h2>
              <button className="ghost" onClick={closeDrawer}>✕</button>
            </div>
            <form onSubmit={submit} className="drawer-body">
              <div className="field">
                <label>Nombre del barbero</label>
                <input placeholder="Ej. Carlos Méndez" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <small>Nombre visible al asignar citas.</small>
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input placeholder="Ej. 555-0001" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <small>Contacto del barbero (opcional).</small>
              </div>
              <div className="drawer-foot">
                <button type="submit">{editing ? "Guardar cambios" : "Agregar"}</button>
                <button type="button" className="ghost" onClick={closeDrawer}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
