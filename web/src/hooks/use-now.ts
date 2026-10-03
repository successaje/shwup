"use client";

import { useEffect, useState } from "react";

/** Current time, re-rendered on an interval so phase changes (doors opening, closing) show up live. */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
