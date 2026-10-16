import { useEffect, useState } from "react";
import { get } from "../api/client";
import { todayLocal } from "../utils/dates";
import { useTheme } from "../hooks/useTheme";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type FType = "day" | "month" | "year" | "range";

function todayStr() {
  return todayLocal();
}

const CHART_TITLES: Record<FType, string> = {
  day: "Ingresos por hora",
  month: "Ingresos por día",
  year: "Ingresos por mes",
  range: "Ingresos por día",
};

export default function Dashboard() {
  const { theme } = useTheme();
  const [fType, setFType] = useState<FType>("day");
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [year, setYear] = useState(todayStr().slice(0, 4));
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const params =
      fType === "day"
        ? { type: "day", date }
        : fType === "month"
          ? { type: "month", date: `${month}-01` }
          : fType === "year"
            ? { type: "year", date: `${year}-01-01` }
            : { type: "range", from, to };
    get("/dashboard", params).then(setData).catch(console.error);
  }, [fType, date, month, year, from, to]);

  const tick = theme === "light" ? "#6b675a" : "#9ba199";
  const gold = theme === "light" ? "#b39a6a" : "#cbb380";

  return (
    <>
      <h1>Dashboard</h1>
      <div className="panel">
        <div className="seg">
          {([["day", "📅 Día"], ["month", "🗓️ Mes"], ["year", "📆 Año"], ["range", "↔ Rango"]] as [FType, string][]).map(([t, label]) => (
            <button key={t} className={fType === t ? "" : "ghost"} onClick={() => setFType(t)}>
              {label}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          {fType === "day" && (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
          {fType === "month" && (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          )}
          {fType === "year" && (
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          )}
          {fType === "range" && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="Desde" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="Hasta" />
            </>
          )}
        </div>
        {data && (
          <p className="muted-sm" style={{ marginBottom: 0 }}>
            Período: {data.filter.from} → {data.filter.to}
          </p>
        )}
      </div>

      {!data ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div className="cards" style={{ marginTop: 16 }}>
            <div className="card"><div className="l">Ventas período</div><div className="v">${data.sales?.total ?? 0}</div><div className="l">{data.sales?.count ?? 0} tickets</div></div>
            <div className="card"><div className="l">Ticket promedio</div><div className="v">${data.sales?.avg ?? 0}</div><div className="l">por venta</div></div>
            <div className="card"><div className="l">Citas período</div><div className="v">{data.citasCount}</div><div className="l">en agenda</div></div>
            <div className="card"><div className="l">Stock bajo</div><div className="v">{data.lowStockCount}</div><div className="l">productos por reponer</div></div>
          </div>
          <div className="grid2">
            <div className="panel">
              <h3>{CHART_TITLES[fType]}</h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={data.revenue ?? []}>
                    <XAxis dataKey="label" tick={{ fill: tick, fontSize: 11 }} />
                    <YAxis tick={{ fill: tick }} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                    />
                    <Bar dataKey="total" fill={gold} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="panel">
              <h3>Citas del período ({data.citasCount})</h3>
              {(data.citas ?? []).length === 0 && <p className="muted">Sin citas en este período.</p>}
              <table><tbody>
                {(data.citas ?? []).slice(0, 8).map((c: any) => (
                  <tr key={c.id}><td>{c.date} {String(c.startTime).slice(0,5)}</td><td>{c.customerName}</td><td><span className="badge">{c.status}</span></td></tr>
                ))}
              </tbody></table>
              <h3>Stock bajo</h3>
              {(data.lowStock ?? []).map((p: any) => (
                <div key={p.id} className="alert">⚠️ {p.name} — quedan {p.stock} (mín {p.minStock})</div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h3>Ventas del período</h3>
            <table><thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>{(data.lastSales ?? []).map((s: any) => (
              <tr key={s.id}><td>{s.id}</td><td>{s.customerName ?? "-"}</td><td>${s.total}</td><td>{s.status}</td><td>{new Date(s.createdAt).toLocaleString()}</td></tr>
            ))}</tbody></table>
          </div>
        </>
      )}
    </>
  );
}
