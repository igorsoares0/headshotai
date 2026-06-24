"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Client-side favorites, persisted in localStorage (MVP — no server table yet).
 * The key is namespaced per user so favorites don't leak between accounts that
 * share a browser.
 */
export function useFavorites(userId: string) {
  const key = useMemo(() => `aperture:favorites:${userId}`, [userId]);
  const [favs, setFavs] = useState<Set<string>>(new Set());

  // Hydrate from localStorage after mount (and whenever the user/key changes).
  // This must run in an effect, not render: the server can't read localStorage,
  // so reading it during render would cause a hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external store (localStorage) read; intentional post-mount sync
      setFavs(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
    } catch {
      /* ignore */
    }
  }, [key]);

  const persist = useCallback(
    (next: Set<string>) => {
      setFavs(next);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(favs);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
    },
    [favs, persist],
  );

  return { favs, toggle };
}
