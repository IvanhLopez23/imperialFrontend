import { useEffect, useState } from "react";
import { get, post } from "../api/client";
import { usePaginated } from "../hooks/usePaginated";
import Pagination from "../components/Pagination";

const emptyForm = { productId: "", type: "in", quantity: 1, reason: "" };

export default function Almacen() {
  const [options, setOptions] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const stock = usePaginated<any>((p) => get("/inventory/stock", p), []);
  const moves = usePaginated<any>((p) => get("/inventory/movements", p), [], 15);

  const loadOptions = async () => {
    const r = await get("/inventory/stock", { limit: 100 });
    setOptions(r.data ?? []);
  };
  useEffect(() => { loadOptions(); }, []);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(emptyForm);
  };

  const submit = async (e: any) => {
    e.preventDefault();
    await post("/inventory/movements", { ...form, productId: Number(form.productId), quantity: Number(form.quantity) });
    closeDrawer();
    stock.reload();
    moves.reload();
    loadOptions();
  };

  return (
    <>
      <div className="page-head">
        <h1>Almacén · stock de barbería</h1>
        <button onClick={() => setDrawerOpen(true)}>+ Registrar movimiento</button>
      </div>
      <div className="panel">
        <h3>Existencias</h3>
        <table><thead><tr><th>Producto</th><th>Stock</th><th>Mín</th><th>Estado</th></tr></thead>
          <tbody>
            {stock.loading && <tr><td colSpan={4}>Cargando...</td></tr>}
            {!stock.loading && stock.data.map((p: any) => (
              <tr key={p.id}><td>{p.name}</td><td>{p.stock}</td><td>{p.minStock}</td>
                <td>{p.stock <= 0 ? <span className="badge bad">agotado</span> : p.stock <= p.minStock ? <span className="badge warn">bajo</span> : <span className="badge ok">ok</span>}</td></tr>
            ))}
          </tbody></table>
        <Pagination page={stock.page} totalPages={stock.totalPages} total={stock.total} limit={stock.limit} onPage={stock.setPage} onLimit={stock.setLimit} />
      </div>
      <div className="panel">
        <h3>Últimos movimientos</h3>
        <table><thead><tr><th>Fecha</th><th>Prod.</th><th>Tipo</th><th>Cant.</th><th>Motivo</th></tr></thead>
          <tbody>
            {moves.loading && <tr><td colSpan={5}>Cargando...</td></tr>}
            {!moves.loading && moves.data.map((m: any) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
                <td>{m.productName ?? m.productId}</td>
                <td>{m.type === "in" ? "Entrada" : m.type === "out" ? "Salida" : "Ajuste"}</td>
                <td>{m.quantity}</td>
                <td>{m.reason}</td>
              </tr>
            ))}
          </tbody></table>
        <Pagination page={moves.page} totalPages={moves.totalPages} total={moves.total} limit={moves.limit} onPage={moves.setPage} onLimit={moves.setLimit} />
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Registrar movimiento</h2>
              <button className="ghost" onClick={closeDrawer}>✕</button>
            </div>
            <form onSubmit={submit} className="drawer-body">
              <div className="field">
                <label>Producto</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                  <option value="">Seleccionar producto...</option>
                  {options.map((p: any) => <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>)}
                </select>
                <small>Producto al que aplica la entrada, salida o ajuste.</small>
              </div>
              <div className="field">
                <label>Tipo de movimiento</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="in">Entrada</option>
                  <option value="out">Salida</option>
                  <option value="adjust">Ajuste (fijar stock)</option>
                </select>
                <small>Entrada suma unidades, Salida las resta, Ajuste fija el stock al valor indicado.</small>
              </div>
              <div className="field">
                <label>Cantidad</label>
                <input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                <small>Unidades que entran o salen. En Ajuste, es el stock final que quedará.</small>
              </div>
              <div className="field">
                <label>Motivo</label>
                <input placeholder="Ej. compra a proveedor, merma..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                <small>Referencia del movimiento para el kardex (ej. factura, conteo físico).</small>
              </div>
              <div className="drawer-foot">
                <button type="submit">Registrar</button>
                <button type="button" className="ghost" onClick={closeDrawer}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
