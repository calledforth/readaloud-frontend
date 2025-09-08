// Centralized performance markers. Toggle here to disable globally.
export const PERF_ENABLED = true;

export function perfMark(name: string): void {
  if (!PERF_ENABLED || typeof performance === 'undefined') return;
  try {
    performance.mark(name);
  } catch {}
}

export function perfMeasure(name: string, startMark: string, endMark: string, log: boolean = true): number | undefined {
  if (!PERF_ENABLED || typeof performance === 'undefined') return undefined;
  try {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name);
    const last = entries[entries.length - 1];
    const ms = last?.duration ?? undefined;
    if (log && typeof ms === 'number') {
      // eslint-disable-next-line no-console
      console.log(`perf ${name}: ${Math.round(ms)}ms`);
    }
    return ms;
  } catch {
    return undefined;
  }
}

export function initPerfObserver(): () => void {
  if (!PERF_ENABLED || typeof PerformanceObserver === 'undefined') return () => {};
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure') {
        // eslint-disable-next-line no-console
        console.log(`perf ${entry.name}: ${Math.round(entry.duration)}ms`);
      }
    }
  });
  try {
    obs.observe({ entryTypes: ['measure'] });
  } catch {}
  return () => {
    try { obs.disconnect(); } catch {}
  };
}


