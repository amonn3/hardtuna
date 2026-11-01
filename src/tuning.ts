export interface GuitarString {
  /** Physical string number: 6 = thickest (low E), 1 = thinnest (high E). */
  id: number;
  note: string;
  octave: number;
  midi: number;
}

/** Standard tuning, low to high: E2 A2 D3 G3 B3 E4. */
export const STANDARD_TUNING: GuitarString[] = [
  { id: 6, note: 'E', octave: 2, midi: 40 },
  { id: 5, note: 'A', octave: 2, midi: 45 },
  { id: 4, note: 'D', octave: 3, midi: 50 },
  { id: 3, note: 'G', octave: 3, midi: 55 },
  { id: 2, note: 'B', octave: 3, midi: 59 },
  { id: 1, note: 'E', octave: 4, midi: 64 },
];

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function midiToFrequency(midi: number, a4: number): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

export function centsBetween(frequency: number, reference: number): number {
  return 1200 * Math.log2(frequency / reference);
}

export function nearestString(frequency: number, a4: number): GuitarString | null {
  let best = STANDARD_TUNING[0];
  let bestDistance = Infinity;
  for (const s of STANDARD_TUNING) {
    const d = Math.abs(centsBetween(frequency, midiToFrequency(s.midi, a4)));
    if (d < bestDistance) {
      bestDistance = d;
      best = s;
    }
  }
  return bestDistance <= 300 ? best : null;
}

export function noteFromFrequency(frequency: number, a4: number): { name: string; octave: number } {
  const midi = Math.round(69 + 12 * Math.log2(frequency / a4));
  return { name: NOTE_NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1 };
}

export const IN_TUNE_CENTS = 3;
export const TUNED_HOLD_MS = 700;

/** Hysteresis and dwell prevent switching strings at every midpoint crossing. */
export class AutoStringSelector {
  private current: GuitarString | null = null;
  private candidate: { id: number; since: number } | null = null;
  reset() { this.current = null; this.candidate = null; }
  update(frequency: number | null, a4: number, now: number): GuitarString | null {
    if (frequency === null) { this.candidate = null; return this.current; }
    const next = nearestString(frequency, a4);
    if (!next) { this.reset(); return null; }
    if (!this.current) return this.current = next;
    if (this.current.id === next.id) { this.candidate = null; return this.current; }
    const distance = (s: GuitarString) => Math.abs(centsBetween(frequency, midiToFrequency(s.midi, a4)));
    if (distance(this.current) - distance(next) < 40) { this.candidate = null; return this.current; }
    if (this.candidate?.id !== next.id) this.candidate = { id: next.id, since: now };
    if (now - this.candidate.since >= 150) { this.current = next; this.candidate = null; }
    return this.current;
  }
}

/** Confirmation advances only on consecutive accepted audio observations. */
export class TuningConfirmation {
  private current: { id: number; since: number; last: number } | null = null;
  reset() { this.current = null; }
  update(id: number | null, cents: number | null, valid: boolean, at: number | null): boolean {
    if (!valid || id === null || cents === null || at === null || Math.abs(cents) > IN_TUNE_CENTS) {
      this.reset(); return false;
    }
    if (!this.current || this.current.id !== id || at - this.current.last > 120) {
      this.current = { id, since: at, last: at };
    }
    this.current.last = at;
    return at - this.current.since >= TUNED_HOLD_MS;
  }
}
