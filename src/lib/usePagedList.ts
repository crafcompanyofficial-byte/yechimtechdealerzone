import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/errors';

/**
 * A list read page by page. fetchPage gets the last item shown, or null for the first page.
 * A page shorter than pageSize is the last one. An answer to an older request is dropped, so
 * a slow search cannot overwrite a newer one.
 */
export function usePagedList<T>(fetchPage: (last: T | null) => Promise<T[]>, deps: unknown[], pageSize = 50) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const request = useRef(0);
  const latest = useRef(fetchPage);
  latest.current = fetchPage;

  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const page = await latest.current(null);
      if (id !== request.current) return;
      setItems(page);
      setHasMore(page.length === pageSize);
    } catch (err) {
      if (id === request.current) setError(errorMessage(err));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(async () => {
    const id = request.current;
    setLoadingMore(true);
    try {
      const last = items[items.length - 1] ?? null;
      const page = await latest.current(last);
      if (id !== request.current) return;
      setItems((current) => [...current, ...page]);
      setHasMore(page.length === pageSize);
    } catch (err) {
      if (id === request.current) setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [items, pageSize]);

  return { items, error, loading, loadingMore, hasMore, reload, loadMore };
}
