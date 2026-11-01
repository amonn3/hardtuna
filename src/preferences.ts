export function readPreference(key: string, fallback: number, min: number, max: number): number {
  try {
    const stored = localStorage.getItem(`hardtuna:${key}`);
    const value = stored === null ? NaN : Number(stored);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  } catch { return fallback; }
}
export function savePreference(key: string, value: number) {
  try { localStorage.setItem(`hardtuna:${key}`, String(value)); } catch { /* Storage is optional. */ }
}
