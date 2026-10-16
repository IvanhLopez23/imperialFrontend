import { useEffect, useState } from "react";
import type { Paginated, PageParams } from "../types";

export function usePaginated<T>(
  loader: (p: PageParams, signal?: AbortSignal) => Promise<Paginated<T>>,
  deps: unknown[] = [],
  initialLimit = 10
) {
  const [page, setPageState] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const setPage = (p: number) => setPageState(Math.max(1, p));
  const setLimit = (l: number) => {
    setLimitState(l);
    setPageState(1);
  };
  const reload = () => setNonce((n) => n + 1);

  useEffect(() => {
    let alive = true;
    // Cancela la petición anterior si se teclea de nuevo (evita race conditions)
    const ctrl = new AbortController();
    setLoading(true);
    loader({ page, limit }, ctrl.signal)
      .then((r) => {
        if (!alive) return;
        setData(r.data ?? []);
        setTotal(r.total ?? 0);
        setTotalPages(r.totalPages ?? 1);
      })
      .catch((err) => {
        if ((err as any)?.code !== "ERR_CANCELED") console.error(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, nonce, ...deps]);

  return { data, total, totalPages, page, limit, loading, setPage, setLimit, reload };
}
