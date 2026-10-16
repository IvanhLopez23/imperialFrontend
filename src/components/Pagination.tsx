interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onPage, onLimit }: Props) {
  if (total === 0) return <div className="pager"><span className="pager-info">Sin resultados</span></div>;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const nums: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i <= Math.min(totalPages, start + 4); i++) nums.push(i);

  return (
    <div className="pager">
      <span className="pager-info">Mostrando {from}–{to} de {total}</span>
      <div className="pager-btns">
        <button className="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Anterior</button>
        {nums.map((n) => (
          <button key={n} className={n === page ? "" : "ghost"} onClick={() => onPage(n)}>{n}</button>
        ))}
        <button className="ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Siguiente ›</button>
      </div>
      <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="pager-limit">
        {[5, 10, 20, 50].map((l) => (
          <option key={l} value={l}>{l} / pág</option>
        ))}
      </select>
    </div>
  );
}
