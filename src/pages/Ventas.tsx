import { useEffect, useState } from "react";
import { get, post } from "../api/client";
import { usePaginated } from "../hooks/usePaginated";
import { useDebouncedValue } from "../hooks/useDebounce";
import Pagination from "../components/Pagination";
import SearchInput from "../components/SearchInput";

const emptyPick = { kind: "product", id: "", qty: 1 };

export default function Ventas() {
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [cart, setCart] = useState<any[]>([]);
  const [pick, setPick] = useState<any>(emptyPick);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 400);
  const query = q === "" ? "" : debouncedQ;
  const history = usePaginated<any>(
    (p, signal) => get("/sales", { ...p, q: query }, signal),
    [query]
  );

  const onType = (v: string) => {
    setQ(v);
    history.setPage(1);
  };

  const loadPickers = async () => {
    const [pr, sv] = await Promise.all([
      get("/products", { limit: 100 }),
      get("/services", { limit: 100 }),
    ]);
    setProducts(pr.data ?? []);
    setServices(sv.data ?? []);
  };
  useEffect(() => { loadPickers(); }, []);

  const openCreate = () => {
    setCustomerName("");
    setPaymentMethod("efectivo");
    setCart([]);
    setPick(emptyPick);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setCart([]);
    setPick(emptyPick);
  };

  const addToCart = () => {
    if (!pick.id) return;
    if (pick.kind === "product") {
      const p = products.find((x) => x.id === Number(pick.id));
      if (!p) return;
      const qty = Number(pick.qty);
      if (qty < 1) return;
      if (qty > available) {
        alert(`Stock insuficiente. Disponibles: ${available} (stock ${p.stock} menos ${inCartQty} en ticket).`);
        return;
      }
      setCart([...cart, { itemType: "product", productId: p.id, name: p.name, quantity: qty, unitPrice: String(p.price) }]);
      return;
    }
    const s = services.find((x) => x.id === Number(pick.id));
    if (!s) return;
    const qty = Math.max(1, Number(pick.qty));
    setCart([...cart, { itemType: "service", serviceId: s.id, name: s.name, quantity: qty, unitPrice: String(s.price) }]);
  };

  const total = cart.reduce((a, c) => a + Number(c.unitPrice) * c.quantity, 0);

  // Stock disponible del producto seleccionado (menos lo ya agregado al ticket)
  const selProduct = pick.kind === "product" ? products.find((x) => x.id === Number(pick.id)) : null;
  const inCartQty = selProduct
    ? cart.filter((c) => c.itemType === "product" && c.productId === selProduct.id).reduce((a, c) => a + c.quantity, 0)
    : 0;
  const available = selProduct ? Math.max(0, selProduct.stock - inCartQty) : 0;

  const checkout = async () => {
    if (cart.length === 0) return alert("Carrito vacío");
    await post("/sales", { customerName, paymentMethod, items: cart });
    closeDrawer();
    history.reload();
    loadPickers();
  };

  return (
    <>
      <div className="page-head">
        <h1>Ventas · ecommerce / mostrador</h1>
        <button onClick={openCreate}>+ Nueva venta</button>
      </div>

      <div className="panel">
        <h3>Historial</h3>
        <SearchInput value={q} onChange={onType} placeholder="Buscar venta por cliente..." busy={q !== query || history.loading} />
        <table style={{ marginTop: 12 }}><thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Fecha</th></tr></thead>
          <tbody>
            {history.loading && <tr><td colSpan={5}>Cargando...</td></tr>}
            {!history.loading && history.data.map((s) => (
              <tr key={s.id}><td>{s.id}</td><td>{s.customerName ?? "-"}</td><td>${s.total}</td><td>{s.paymentMethod}</td><td>{new Date(s.createdAt).toLocaleString()}</td></tr>
            ))}
          </tbody></table>
        <Pagination page={history.page} totalPages={history.totalPages} total={history.total} limit={history.limit} onPage={history.setPage} onLimit={history.setLimit} />
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Nueva venta</h2>
              <button className="ghost" onClick={closeDrawer}>✕</button>
            </div>
            <div className="drawer-body">
              <div className="field">
                <label>Cliente</label>
                <input placeholder="Cliente (opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <small>Nombre para identificar el ticket (opcional).</small>
              </div>
              <div className="field">
                <label>Método de pago</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
                <small>Forma en que paga el cliente.</small>
              </div>
              <div className="field">
                <label>Tipo de item</label>
                <select value={pick.kind} onChange={(e) => setPick({ ...pick, kind: e.target.value, id: "" })}>
                  <option value="product">Producto</option>
                  <option value="service">Servicio</option>
                </select>
                <small>Los productos descuentan stock; los servicios no.</small>
              </div>
              <div className="field">
                <label>{pick.kind === "product" ? "Producto" : "Servicio"}</label>
                <select value={pick.id} onChange={(e) => setPick({ ...pick, id: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {(pick.kind === "product" ? products : services).map((x: any) => (
                    <option key={x.id} value={x.id}>{x.name} · ${x.price}{x.stock !== undefined ? ` (stock ${x.stock})` : ""}</option>
                  ))}
                </select>
                <small>Item del catálogo a agregar al ticket.</small>
              </div>
              <div className="field">
                <label>Cantidad{selProduct ? ` (disponibles: ${available})` : ""}</label>
                <input
                  type="number"
                  min={1}
                  max={selProduct ? available : undefined}
                  value={pick.qty}
                  onChange={(e) => {
                    let n = Number(e.target.value);
                    if (selProduct) n = Math.max(1, Math.min(Math.max(available, 1), n || 1));
                    setPick({ ...pick, qty: n });
                  }}
                />
                <small>
                  {selProduct
                    ? available > 0
                      ? `No puedes agregar más de ${available} (stock ${selProduct.stock} menos ${inCartQty} en ticket).`
                      : "Sin stock disponible para este producto."
                    : "Unidades de este item."}
                </small>
              </div>
              <button className="ghost" onClick={addToCart} disabled={!!selProduct && available <= 0}>+ Agregar al ticket</button>
              <table style={{ marginTop: 12 }}><thead><tr><th>Item</th><th>Cant</th><th>P.U.</th><th></th></tr></thead>
                <tbody>{cart.map((c, i) => (
                  <tr key={i}><td>{c.name} <span className="badge">{c.itemType}</span></td><td>{c.quantity}</td><td>${c.unitPrice}</td>
                    <td><button className="danger" onClick={() => setCart(cart.filter((_, j) => j !== i))}>X</button></td></tr>
                ))}</tbody></table>
              <h3>Total: ${total.toFixed(2)}</h3>
              <div className="drawer-foot">
                <button onClick={checkout}>Cobrar venta</button>
                <button className="ghost" onClick={closeDrawer}>Cancelar</button>
              </div>
              <p className="muted-sm">Al vender productos se descuenta stock y se registra en almacén automáticamente.</p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
