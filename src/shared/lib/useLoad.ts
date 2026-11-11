import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './errors';

/** Loads data when `deps` change; an answer to an outdated request is dropped. */
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    try {
      const value = await load();
      if (id === latest.current) {
        setData(value);
        setError(null);
      }
    } catch (err) {
      if (id === latest.current) setError(errorMessage(err));
    } finally {
      if (id === latest.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
