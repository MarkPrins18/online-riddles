import { useEffect, useState } from "react";

/** Re-renders every `intervalMs`, returning the current timestamp — the single shared clock behind the round timer and the hint countdown. */
export function useNowTick(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}
