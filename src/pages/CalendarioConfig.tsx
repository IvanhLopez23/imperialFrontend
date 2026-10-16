import { useEffect, useState } from "react";
import { get, post, put, del } from "../api/client";
import { WEEKDAYS } from "../types";

const emptyForm = { date: "", reason: "", recurringYearly: false };

export default function CalendarioConfig() {
  const [weekly, setWeekly] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fee, setFee] = useState("50");
  const [feeSaved, setFeeSaved] = useState(false);

  const load = async () => {
    const d: any = await get("/schedule");
    setWeekly(d.weekly); setHolidays(d.holidays);
    try {
      const f: any = await get("/settings/reschedule_fee");
      setFee(String(f.value ?? "50"));
    } catch {
      /* sin ajuste guardado */
    }
  };
  useEffect(() => { load(); }, []);

  const saveDay = async (day: any) => {
    await put(`/schedule/weekly/${day.weekday}`, {
      isWorking: day.isWorking,
      openTime: String(day.openTime).slice(0, 5),
      closeTime: String(day.closeTime).slice(0, 5),
      slotDurationMinutes: 30, // fijo: todas las citas duran 30 minutos
    });
    load();
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(emptyForm);
  };

  const saveFee = async () => {
    await put("/settings/reschedule_fee", { value: String(Number(fee) || 0) });
    setFeeSaved(true);
    setTimeout(() => setFeeSaved(false), 2000);
  };

  const addHoliday = async (e: any) => {
    e.preventDefault();
    await post("/schedule/holidays", form);
    closeDrawer();
    load();
  };

  const editDay = (wd: number, patch: any) => setWeekly((w) => w.map((d) => (d.weekday === wd ? { ...d, ...patch } : d)));

  return (
    <>
      <div className="page-head">
        <h1>Calendario · horario y festivos</h1>
        <button onClick={() => setDrawerOpen(true)}>+ Agregar festivo</button>
      </div>
      <div className="panel">
        <h3>Días y horas por cita</h3>
        <p className="muted">Configura qué días se trabaja y el horario de apertura/cierre. Todas las citas duran 30 minutos.</p>
        <table><thead><tr><th>Día</th><th>Labora</th><th>Apertura</th><th>Cierre</th><th></th></tr></thead>
          <tbody>{weekly.map((d) => (
            <tr key={d.weekday}>
              <td>{WEEKDAYS[d.weekday]}</td>
              <td><input type="checkbox" style={{ width: 20 }} checked={d.isWorking} onChange={(e) => editDay(d.weekday, { isWorking: e.target.checked })} /></td>
              <td><input type="time" value={String(d.openTime).slice(0,5)} onChange={(e) => editDay(d.weekday, { openTime: e.target.value })} /></td>
              <td><input type="time" value={String(d.closeTime).slice(0,5)} onChange={(e) => editDay(d.weekday, { closeTime: e.target.value })} /></td>
              <td><button onClick={() => saveDay(d)}>Guardar</button></td>
            </tr>
          ))}</tbody></table>
      </div>
      <div className="grid2">
      <div className="panel">
        <h3>Costo extra por reagendación</h3>
        <div className="row">
          <input
            type="number"
            min={0}
            step="0.01"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            title="Monto en MXN"
          />
          <button onClick={saveFee}>{feeSaved ? "✓ Guardado" : "Guardar tarifa"}</button>
        </div>
        <p className="muted-sm">Se cobra al cliente cuando reagenda su cita el mismo día a un horario posterior.</p>
      </div>
      <div className="panel">
        <h3>Días bloqueados ({holidays.length})</h3>
        <table><thead><tr><th>Fecha</th><th>Motivo</th><th></th></tr></thead>
          <tbody>{holidays.map((h) => (
            <tr key={h.id}><td>{h.date}{h.recurringYearly ? " ↻" : ""}</td><td>{h.reason}</td>
              <td><button className="danger" onClick={async () => { await del(`/schedule/holidays/${h.id}`); load(); }}>Quitar</button></td></tr>
          ))}          </tbody></table>
      </div>
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Agregar festivo / no laborable</h2>
              <button className="ghost" onClick={closeDrawer}>✕</button>
            </div>
            <form onSubmit={addHoliday} className="drawer-body">
              <div className="field">
                <label>Fecha bloqueada</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                <small>Día en que no se podrán agendar citas.</small>
              </div>
              <div className="field">
                <label>Motivo</label>
                <input placeholder="Ej. Navidad, inventario..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
                <small>Se muestra al intentar agendar ese día.</small>
              </div>
              <label className="check">
                <input type="checkbox" checked={form.recurringYearly} onChange={(e) => setForm({ ...form, recurringYearly: e.target.checked })} />
                Se repite cada año
              </label>
              <div className="drawer-foot">
                <button type="submit">Agregar</button>
                <button type="button" className="ghost" onClick={closeDrawer}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
