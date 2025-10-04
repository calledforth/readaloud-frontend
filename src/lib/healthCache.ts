// Global health check cache to avoid unnecessary API calls
// Persists across page navigations and component remounts

interface HealthCacheEntry {
  result: { ok: true; status: 'ok'; version: string } | null;
  timestamp: number;
  error: string | null;
}

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
let healthCache: HealthCacheEntry = {
  result: null,
  timestamp: 0,
  error: null,
};

export function getCachedHealth(): { ok: true; status: 'ok'; version: string } | null {
  const now = Date.now();
  const isExpired = now - healthCache.timestamp > CACHE_DURATION_MS;
  
  if (isExpired || !healthCache.result) {
    return null;
  }
  
  return healthCache.result;
}

export function setCachedHealth(result: { ok: true; status: 'ok'; version: string } | null, error: string | null = null): void {
  healthCache = {
    result,
    timestamp: Date.now(),
    error,
  };
}

export function getCachedError(): string | null {
  const now = Date.now();
  const isExpired = now - healthCache.timestamp > CACHE_DURATION_MS;
  
  if (isExpired) {
    return null;
  }
  
  return healthCache.error;
}

export function isHealthCacheValid(): boolean {
  const now = Date.now();
  return now - healthCache.timestamp <= CACHE_DURATION_MS && healthCache.result !== null;
}

export function clearHealthCache(): void {
  healthCache = {
    result: null,
    timestamp: 0,
    error: null,
  };
}

