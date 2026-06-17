"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "aperture:favorites";

/** Client-side favorites, persisted in localStorage (MVP — no server table yet). */
export function useFavorites() {
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFavs(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setFavs(next);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }, []);

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
