import { useEffect, useState } from "react";
import { get, post, put, del } from "../api/client";
import { todayLocal } from "../utils/dates";
import { usePaginated } from "../hooks/usePaginated";
import { Clock, Check, X, Trash2, Pencil, CalendarClock, type LucideIcon } from "lucide-react";
import Pagination from "../components/Pagination";
import { parseReservaMessage } from "../utils/reservaMessage";

function todayStr() { return todayLocal(); }

const emptyForm = { customerName: "", customerPhone: "", serviceId: "", barberId: "", startTime: "09:00", notes: "", status: "pending" };

type UiState = "pending" | "done" | "cancelled";

// El backend maneja pending/confirmed/completed/cancelled/no_show;
// en agenda se muestran 3 estados con los colores de la marca:
// Pendiente = dorado, Terminado = verde, Cancelado = rojo.
const uiState = (s: string): UiState => {
  if (s === "completed") return "done";
  if (s === "cancelled" || s === "no_show") return "cancelled";
  return "pending";
};
const UI_TO_BACKEND: Record<UiState, string> = {
  pending: "pending",
  done: "completed",
  cancelled: "cancelled",
};
const STATE_META: Record<UiState, { label: string; icon: LucideIcon; cls: string; badge: string }> = {
  pending: { label: "Pendiente", icon: Clock, cls: "st-pending", badge: "warn" },
  done: { label: "Terminado", icon: Check, cls: "st-done", badge: "ok" },
  cancelled: { label: "Cancelado", icon: X, cls: "st-cancelled", badge: "bad" },
};

export default function Citas() {
  const [date, setDate] = useState(todayStr());
  const [avail, setAvail] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [form, setForm] = useState<any>(emptyForm);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Editar solo el servicio
  const [editSvc, setEditSvc] = useState<any>(null);
  const [svcId, setSvcId] = useState("");

  // Reagendar
  const [resched, setResched] = useState<any>(null);
  const [rDate, setRDate] = useState("");
  const [rAvail, setRAvail] = useState<any>(null);
  const [rTime, setRTime] = useState("");
  const [rFee, setRFee] = useState("");

  // Pegar mensaje de WhatsApp (reservas de la landing)
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteErr, setPasteErr] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteAvail, setPasteAvail] = useState<any>(null);
  const [pf, setPf] = useState<any>({ customerName: "", customerPhone: "", serviceId: "", date: "", startTime: "", notes: "" });

  const agenda = usePaginated<any>((p, signal) => get("/appointments", { ...p, date }, signal), [date], 20);
  const [fee, setFee] = useState(50);
  const [charge, setCharge] = useState<any>(null);

  const loadAvail = async (d: string) => setAvail(await get("/appointments/availability", { date: d }));
  const loadRAvail = async (d: string) => {
    if (!d) return;
    setRAvail(await get("/appointments/availability", { date: d }));
  };

  useEffect(() => {
    get("/services", { limit: 100 }).then((r) => setServices(r.data ?? [])).catch(() => {});
    get("/barbers", { limit: 100 }).then((r) => setBarbers(r.data ?? [])).catch(() => {});
    get("/customers", { limit: 100 }).then((r) => setClients(r.data ?? [])).catch(() => {});
    get("/settings/reschedule_fee")
      .then((r: any) => {
        const n = Number(r.value);
        if (Number.isFinite(n) && n >= 0) setFee(n);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadAvail(date);
    agenda.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  useEffect(() => {
    loadRAvail(rDate);
  }, [rDate]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(emptyForm);
    setSelectedClient("");
  };

  // Elegir cliente registrado: rellena nombre/teléfono y su servicio/barbero más pedidos
  const onSelectClient = async (id: string) => {
    setSelectedClient(id);
    if (!id) {
      setForm((f: any) => ({ ...f, customerId: null, customerName: "", customerPhone: "" }));
      return;
    }
    const c = clients.find((x) => String(x.id) === id);
    if (!c) return;
    setForm((f: any) => ({ ...f, customerId: c.id, customerName: c.name, customerPhone: c.phone ?? "" }));
    try {
      const pref: any = await get(`/customers/${c.id}/preferences`);
      setForm((f: any) => ({
        ...f,
        serviceId: pref.serviceId ? String(pref.serviceId) : f.serviceId,
        barberId: pref.barberId ? String(pref.barberId) : f.barberId,
      }));
    } catch {
      /* sin historial */
    }
  };

  const create = async (e: any) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.customerPhone ?? "")) {
      alert("El teléfono debe tener 10 dígitos (MX).");
      return;
    }
    try {
      await post("/appointments", {
        ...form,
        date,
        serviceId: form.serviceId ? Number(form.serviceId) : null,
        barberId: form.barberId ? Number(form.barberId) : null,
      });
      closeDrawer();
      agenda.reload();
      loadAvail(date);
    } catch (err: any) {
      alert(err.response?.data?.error ?? err.response?.data?.message ?? "No se pudo crear la cita");
    }
  };

  const changeState = async (id: number, ui: UiState) => {
    await put(`/appointments/${id}`, { status: UI_TO_BACKEND[ui] });
    agenda.reload();
    loadAvail(date);
  };

  const confirmCharge = async () => {
    if (!charge) return;
    await changeState(charge.id, "done");
    setCharge(null);
  };

  const remove = async (id: number) => {
    if (!confirm("Eliminar registro?")) return;
    await del(`/appointments/${id}`);
    agenda.reload();
    loadAvail(date);
  };

  const openEditSvc = (c: any) => {
    setEditSvc(c);
    setSvcId(c.serviceId ? String(c.serviceId) : "");
  };

  const saveSvc = async (e: any) => {
    e.preventDefault();
    if (!editSvc) return;
    await put(`/appointments/${editSvc.id}`, { serviceId: svcId ? Number(svcId) : null });
    setEditSvc(null);
    agenda.reload();
  };

  const openResched = (c: any) => {
    setResched(c);
    setRDate(c.date);
    setRTime("");
    setRFee(String(fee));
    loadRAvail(c.date);
  };

  const saveResched = async (e: any) => {
    e.preventDefault();
    if (!resched || !rTime) return;
    const same = rDate === resched.date;
    try {
      const updated: any = await put(`/appointments/${resched.id}`, {
        date: rDate,
        startTime: rTime,
        ...(same ? { extraCost: String(Number(rFee) || 0) } : {}),
      });
      setResched(null);
      agenda.reload();
      loadAvail(date);
      if (Number(updated.extraCost ?? 0) > 0) {
        alert(`Cita reagendada. Costo extra por reagendar el mismo día: $${updated.extraCost}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error ?? err.response?.data?.message ?? "No se pudo reagendar");
    }
  };

  // ---- Pegar mensaje de WhatsApp ----
  const openPaste = () => {
    setPasteText("");
    setPf({ customerName: "", customerPhone: "", serviceId: "", date: "", startTime: "", notes: "" });
    setPasteAvail(null);
    setPasteErr("");
    setPasteOpen(true);
  };

  const loadPasteAvail = async (d: string) => {
    setPasteAvail(null);
    if (!d) return;
    setPasteLoading(true);
    try {
      setPasteAvail(await get("/appointments/availability", { date: d }));
    } catch {
      setPasteAvail(null);
    } finally {
      setPasteLoading(false);
    }
  };

  const onPasteText = async (text: string) => {
    setPasteText(text);
    setPasteErr("");
    const p = parseReservaMessage(text);
    let serviceId = "";
    if (p.service) {
      const q = p.service.trim().toLowerCase();
      const match =
        services.find((s: any) => s.name.trim().toLowerCase() === q) ??
        services.find((s: any) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase()));
      if (match) serviceId = String(match.id);
    }
    setPf({
      customerName: p.name ?? "",
      customerPhone: p.phone ?? "",
      serviceId,
      date: p.date ?? "",
      startTime: p.time ?? "",
      notes: p.notes ?? "",
    });
    await loadPasteAvail(p.date ?? "");
  };

  const onPasteDate = async (d: string) => {
    setPf((f: any) => ({ ...f, date: d, startTime: "" }));
    await loadPasteAvail(d);
  };

  const generateFromPaste = async (e: any) => {
    e.preventDefault();
    setPasteErr("");
    if (!pasteReady) return;
    try {
      await post("/appointments", {
        customerName: pf.customerName.trim(),
        customerPhone: pf.customerPhone,
        serviceId: Number(pf.serviceId),
        barberId: null,
        date: pf.date,
        startTime: pf.startTime,
        notes: pf.notes || null,
        status: "pending",
      });
      setPasteOpen(false);
      if (pf.date === date) {
        agenda.reload();
        loadAvail(date);
      } else {
        setDate(pf.date);
      }
    } catch (err: any) {
      setPasteErr(err.response?.data?.error ?? err.response?.data?.message ?? "No se pudo generar la cita");
    }
  };

  const pasteSlots = (pasteAvail?.slots ?? []) as any[];
  const pasteTimeFree = !!pf.startTime && pasteSlots.some((s: any) => s.start === pf.startTime);
  const pastePhoneOk = /^\d{10}$/.test(pf.customerPhone ?? "");
  const pasteReady = !!pf.customerName.trim() && pastePhoneOk && !!pf.serviceId && !!pf.date && pasteTimeFree;
  const pasteHours: any[] = [...pasteSlots];
  if (pf.startTime && !pasteHours.some((s) => s.start === pf.startTime)) {
    pasteHours.unshift({ start: pf.startTime, end: "", invalid: true });
  }

  const origStart = resched ? String(resched.startTime).slice(0, 5) : "";
  const sameDay = resched && rDate === resched.date;
  const chargePrice = charge ? Number(charge.servicePrice ?? 0) : 0;
  const chargeExtra = charge ? Number(charge.extraCost ?? 0) : 0;
  const freeSlots = ((rAvail?.slots ?? []) as any[]).filter((s) => !sameDay || s.start > origStart);

  return (
    <>
      <div className="page-head">
        <h1>Citas · {date}</h1>
        <div className="page-actions">
          <button className="ghost" onClick={openPaste}>📋 Pegar de WhatsApp</button>
          <button onClick={() => setDrawerOpen(true)} disabled={!avail?.working}>+ Agendar cita</button>
        </div>
      </div>
      <div className="row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="panel">
        <h3>Agenda del día</h3>
        {!avail?.working && <div className="alert">No laborable: {avail?.reason}</div>}
        <table><thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Barbero</th><th>Estado</th><th className="actions-col">Acciones</th></tr></thead>
          <tbody>
            {agenda.loading && <tr><td colSpan={6}>Cargando...</td></tr>}
            {!agenda.loading && agenda.data.map((c) => (
              <tr key={c.id}>
                <td>{String(c.startTime).slice(0,5)}-{String(c.endTime).slice(0,5)}</td>
                <td>{c.customerName}<br /><small className="muted">{c.customerPhone}</small></td>
                <td>{c.serviceName ?? <span className="muted">—</span>}</td>
                <td>{c.barberName ?? <span className="muted">—</span>}</td>
                <td><span className={`badge ${STATE_META[uiState(c.status)].badge}`}>{STATE_META[uiState(c.status)].label}</span></td>
                <td className="actions-col">
                  <div className="state-btns">
                      {(Object.keys(STATE_META) as UiState[]).map((k) => {
                        const M = STATE_META[k];
                        const active = uiState(c.status) === k;
                        const locked = uiState(c.status) === "done" && k === "pending";
                        return (
                          <button
                            key={k}
                            className={`icon-btn state-btn${active ? ` active-${M.cls}` : ""}`}
                            title={locked ? "Una cita terminada no puede volver a pendiente" : M.label}
                            disabled={active || locked}
                            onClick={() => (k === "done" ? setCharge(c) : changeState(c.id, k))}
                          >
                            <M.icon size={15} />
                          </button>
                        );
                      })}
                    <button className="ghost icon-btn" title="Editar servicio" onClick={() => openEditSvc(c)}>
                      <Pencil size={15} />
                    </button>
                    <button className="ghost icon-btn" title="Reagendar" onClick={() => openResched(c)}>
                      <CalendarClock size={15} />
                    </button>
                    <button className="danger icon-btn" title="Eliminar registro" onClick={() => remove(c.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody></table>
        <Pagination page={agenda.page} totalPages={agenda.totalPages} total={agenda.total} limit={agenda.limit} onPage={agenda.setPage} onLimit={agenda.setLimit} />
      </div>

      {charge && (
        <>
          <div className="drawer-overlay" onClick={() => setCharge(null)} />
          <div className="modal">
            <h2>Cobro de cita · {charge.customerName}</h2>
            <p className="muted-sm">
              {charge.date} {String(charge.startTime).slice(0, 5)}-{String(charge.endTime).slice(0, 5)}
              {charge.barberName ? ` · ${charge.barberName}` : ""}
            </p>
            <table>
              <thead><tr><th>Concepto</th><th style={{ textAlign: "right" }}>Monto</th></tr></thead>
              <tbody>
                <tr>
                  <td>{charge.serviceName ?? "Sin servicio"}</td>
                  <td style={{ textAlign: "right" }}>${chargePrice.toFixed(2)}</td>
                </tr>
                {chargeExtra > 0 && (
                  <tr>
                    <td>Costo extra por reagendación</td>
                    <td style={{ textAlign: "right" }}>${chargeExtra.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="charge-total">
                  <td>Total a cobrar</td>
                  <td style={{ textAlign: "right" }}>${(chargePrice + chargeExtra).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div className="drawer-foot">
              <button onClick={confirmCharge}>Confirmar cobro</button>
              <button className="ghost" onClick={() => setCharge(null)}>Cancelar</button>
            </div>
          </div>
        </>
      )}

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Agendar cita · {date}</h2>
              <button className="ghost" onClick={closeDrawer}>✕</button>
            </div>
            <form onSubmit={create} className="drawer-body">
              <div className="field">
                <label>Cliente registrado</label>
                <select value={selectedClient} onChange={(e) => onSelectClient(e.target.value)}>
                  <option value="">Escribir manualmente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.vip ? "★ " : ""}{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
                  ))}
                </select>
                <small>Al elegirlo se rellenan sus datos y su servicio/barbero más pedidos.</small>
              </div>
              <div className="field">
                <label>Cliente</label>
                <input placeholder="Nombre del cliente" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
                <small>Persona que asistirá a la cita.</small>
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input
                  placeholder="10 dígitos (Ej. 5512345678)"
                  value={form.customerPhone}
                  inputMode="numeric"
                  maxLength={10}
                  required
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                />
                <small>Número mexicano a 10 dígitos, sin espacios ni guiones.</small>
              </div>
              <div className="field">
                <label>Servicio</label>
                <select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                  <option value="">Servicio...</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} · 30min · ${s.price}</option>)}
                </select>
                <small>Todas las citas duran 30 minutos.</small>
              </div>
              <div className="field">
                <label>Barbero</label>
                <select value={form.barberId} onChange={(e) => setForm({ ...form, barberId: e.target.value })}>
                  <option value="">Barbero...</option>
                  {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <small>Quién atenderá la cita (opcional).</small>
              </div>
              <div className="field">
                <label>Horario ({avail?.slots?.length ?? 0} libres)</label>
                <select value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}>
                  {(avail?.slots ?? []).map((s: any) => <option key={s.start} value={s.start}>{s.start} - {s.end}</option>)}
                </select>
                <small>Solo horarios en punto o y media, sin solapes.</small>
              </div>
              <div className="field">
                <label>Notas</label>
                <textarea placeholder="Detalles adicionales..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <small>Información extra para el barbero (opcional).</small>
              </div>
              <div className="drawer-foot">
                <button type="submit" disabled={!avail?.working}>Agendar</button>
                <button type="button" className="ghost" onClick={closeDrawer}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}

      {editSvc && (
        <>
          <div className="drawer-overlay" onClick={() => setEditSvc(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Editar servicio · {editSvc.customerName}</h2>
              <button className="ghost" onClick={() => setEditSvc(null)}>✕</button>
            </div>
            <form onSubmit={saveSvc} className="drawer-body">
              <div className="field">
                <label>Servicio</label>
                <select value={svcId} onChange={(e) => setSvcId(e.target.value)}>
                  <option value="">Sin servicio</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} · 30min · ${s.price}</option>)}
                </select>
                <small>Solo se cambia el servicio; la fecha y hora no se modifican.</small>
              </div>
              <div className="drawer-foot">
                <button type="submit">Guardar servicio</button>
                <button type="button" className="ghost" onClick={() => setEditSvc(null)}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}

      {resched && (
        <>
          <div className="drawer-overlay" onClick={() => setResched(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <h2>Reagendar · {resched.customerName}</h2>
              <button className="ghost" onClick={() => setResched(null)}>✕</button>
            </div>
            <form onSubmit={saveResched} className="drawer-body">
              <p className="muted-sm">Actual: {resched.date} {origStart}-{String(resched.endTime).slice(0, 5)}</p>
              <div className="field">
                <label>Nueva fecha</label>
                <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} required />
                <small>Día destino de la cita.</small>
              </div>
              <div className="field">
                <label>Nuevo horario ({freeSlots.length} libres)</label>
                <select value={rTime} onChange={(e) => setRTime(e.target.value)} required>
                  <option value="">Seleccionar...</option>
                  {freeSlots.map((s: any) => <option key={s.start} value={s.start}>{s.start} - {s.end}</option>)}
                </select>
                <small>
                  {sameDay
                    ? `El mismo día solo puedes moverla a un horario posterior a ${origStart}. Aplica costo extra de $${fee}.`
                    : "Las citas duran 30 minutos y empiezan en :00 o :30."}
                </small>
              </div>
              {sameDay && (
                <div className="field">
                  <label>Costo extra por reagendación (MXN)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={rFee}
                    onChange={(e) => setRFee(e.target.value)}
                  />
                  <small>Ajustable para esta cita. Por defecto la tarifa configurada (${fee}).</small>
                </div>
              )}
              {sameDay && <div className="alert">⚠️ Reagendación el mismo día: costo extra de ${Number(rFee) || 0}.</div>}
              <div className="drawer-foot">
                <button type="submit">Reagendar</button>
                <button type="button" className="ghost" onClick={() => setResched(null)}>Cancelar</button>
              </div>
            </form>
          </aside>
        </>
      )}

      {pasteOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setPasteOpen(false)} />
          <div className="modal">
            <h2>Pegar mensaje de WhatsApp</h2>
            <p className="muted-sm">
              Pega el mensaje que te llegó desde la reserva. Detectamos los datos y validamos la
              disponibilidad antes de generar la cita.
            </p>
            <form onSubmit={generateFromPaste}>
              <div className="field">
                <label>Mensaje</label>
                <textarea
                  value={pasteText}
                  onChange={(e) => onPasteText(e.target.value)}
                  placeholder="Pega aquí el mensaje de WhatsApp..."
                  rows={4}
                  autoFocus
                />
              </div>

              {pasteText.trim() !== "" && (
                <>
                  <div className="row">
                    <div className="field">
                      <label>Cliente</label>
                      <input
                        value={pf.customerName}
                        onChange={(e) => setPf({ ...pf, customerName: e.target.value })}
                        placeholder="Nombre"
                      />
                    </div>
                    <div className="field">
                      <label>Teléfono</label>
                      <input
                        value={pf.customerPhone}
                        inputMode="numeric"
                        onChange={(e) => setPf({ ...pf, customerPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        placeholder="10 dígitos"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Servicio</label>
                    <select value={pf.serviceId} onChange={(e) => setPf({ ...pf, serviceId: e.target.value })}>
                      <option value="">Selecciona un servicio...</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {!pf.serviceId && (
                      <small>El servicio del mensaje no coincide con el catálogo; elige uno.</small>
                    )}
                  </div>
                  <div className="row">
                    <div className="field">
                      <label>Fecha</label>
                      <input type="date" value={pf.date} onChange={(e) => onPasteDate(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Hora</label>
                      {pasteLoading ? (
                        <p className="muted-sm">Consultando disponibilidad...</p>
                      ) : !pasteAvail ? (
                        <p className="muted-sm">Sin fecha detectada.</p>
                      ) : !pasteAvail.working ? (
                        <p className="muted-sm">{pasteAvail.reason || "Día no laborable"}</p>
                      ) : (
                        <select value={pf.startTime} onChange={(e) => setPf({ ...pf, startTime: e.target.value })}>
                          <option value="">Selecciona...</option>
                          {pasteHours.map((s: any) => (
                            <option key={s.start} value={s.start}>
                              {s.start}{s.invalid ? " (no disponible)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="field">
                    <label>Notas</label>
                    <textarea
                      value={pf.notes}
                      onChange={(e) => setPf({ ...pf, notes: e.target.value })}
                      placeholder="Sin notas"
                    />
                  </div>
                </>
              )}

              {pasteAvail && !pasteAvail.working && (
                <div className="alert">Ese día no es laborable: {pasteAvail.reason}</div>
              )}
              {pasteAvail?.working && pf.startTime && !pasteTimeFree && (
                <div className="alert">
                  La hora {pf.startTime} no está libre ese día. Elige otro horario disponible.
                </div>
              )}
              {pasteReady && (
                <div className="auth-info" style={{ marginTop: 10 }}>
                  ✓ {pf.date} a las {pf.startTime} está disponible. Puedes generar la cita.
                </div>
              )}
              {pasteErr && <div className="auth-error" style={{ marginTop: 10 }}>{pasteErr}</div>}

              <div className="drawer-foot">
                <button type="submit" disabled={!pasteReady}>Generar cita</button>
                <button type="button" className="ghost" onClick={() => setPasteOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
