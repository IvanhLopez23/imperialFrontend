import { useState } from "react";
import { get, post, put, del } from "../api/client";
import { usePaginated } from "../hooks/usePaginated";
import { useDebouncedValue } from "../hooks/useDebounce";
import Pagination from "../components/Pagination";
import SearchInput from "../components/SearchInput";
import type { Product } from "../types";

const empty = { name: "", sku: "", category: "general", price: "0", cost: "0", stock: 0, minStock: 5, description: "", active: true };

export default function Productos() {
  const [q, setQ] = useState("");
  // Búsqueda en tiempo real: espera 400ms tras teclear; al borrar, restaura al instante
  const debouncedQ = useDebouncedValue(q, 400);
  const query = q === "" ? "" : debouncedQ;
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const prods = usePaginated<Product>((p, signal) => get("/products", { ...p, q: query }, signal), [query]);

  const onType = (v: string) => {
    setQ(v);
    prods.setPage(1);
  };

  const openCreate = () => {
    setForm(empty);
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({ ...p });
    setEditing(p.id);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(empty);
  };

  const submit = async (e: any) => {
    e.preventDefault();
    if (editing) await put(`/products/${editing}`, form);
    else await post("/products", form);
    closeDrawer();
    prods.reload();
  };

  return (
    <>
      <div className="page-head">
        <h1>Productos · catálogo ecommerce</h1>
        <button onClick={openCreate}>+ Agregar producto</button>
      </div>

      <div className="panel">
        <SearchInput value={q} onChange={onType} placeholder="Buscar por nombre o SKU..." busy={q !== query || prods.loading} />
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>SKU</th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {prods.loading && <tr><td colSpan={6}>Cargando...</td></tr>}
            {!prods.loading && prods.data.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td><td>{p.name}</td><td>${p.price}</td>
                <td>{p.stock <= p.minStock ? <span className="badge warn">{p.stock} bajo</span> : p.stock}</td>
                <td>{p.active ? <span className="badge ok">activo</span> : <span className="badge bad">inactivo</span>}</td>
                <td>
                  <button className="ghost" onClick={() => openEdit(p)}>Editar</button>{" "}
                  <button className="danger" onClick={async () => { if (confirm("Eliminar?")) { await del(`/products/${p.id}`); prods.reload(); } }}>X</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={prods.page} totalPages={prods.totalPages} total={prods.total} limit={prods.limit} onPage={prods.setPage} onLimit={prods.setLimit} />
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>{editing ? `Editar producto #${editing}` : "Agregar producto"}</h2>
              <button className="ghost" onClick={closeDrawer}>✕</button>
            </div>
            <form onSubmit={submit} className="drawer-body">
              <div className="field">
                <label>Nombre del producto</label>
                <input placeholder="Ej. Pomada mate" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <small>Nombre visible en el catálogo y en ventas.</small>
              </div>
              <div className="field">
                <label>SKU / código</label>
                <input placeholder="Ej. POM-001" value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                <small>Código interno para buscar el producto rápido. Debe ser único.</small>
              </div>
              <div className="field">
                <label>Categoría</label>
                <input placeholder="Ej. styling, barba, cuidado" value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <small>Agrupa productos para filtrarlos en el catálogo.</small>
              </div>
              <div className="field">
                <label>Precio de venta</label>
                <input type="number" step="0.01" min={0} placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <small>Precio al público que paga el cliente en tienda / ecommerce.</small>
              </div>
              <div className="field">
                <label>Costo</label>
                <input type="number" step="0.01" min={0} placeholder="0.00" value={form.cost ?? "0"} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                <small>Cuánto te cuesta a ti el producto. Sirve para calcular la ganancia (venta − costo).</small>
              </div>
              <div className="field">
                <label>Stock inicial / actual</label>
                <input type="number" min={0} placeholder="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
                <small>Existencias disponibles para la venta. Al vender se descuenta solo del almacén.</small>
              </div>
              <div className="field">
                <label>Stock mínimo</label>
                <input type="number" min={0} placeholder="5" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
                <small>Cuando el stock llegue a este número verás alerta de “stock bajo” en Dashboard y Almacén.</small>
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea placeholder="Detalles del producto..." value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <small>Texto descriptivo que verá el cliente en el catálogo.</small>
              </div>
              <label className="check">
                <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Producto activo (visible para la venta)
              </label>
              <div className="drawer-foot">
                <button type="submit">{editing ? "Guardar cambios" : "Crear producto"}</button>
                <button type="button" className="ghost" onClick={closeDrawer}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
