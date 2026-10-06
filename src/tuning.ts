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

export function nearestString(frequency: number, a4: number): GuitarString {
  let best = STANDARD_TUNING[0];
  let bestDistance = Infinity;
  for (const s of STANDARD_TUNING) {
    const d = Math.abs(centsBetween(frequency, midiToFrequency(s.midi, a4)));
    if (d < bestDistance) {
      bestDistance = d;
      best = s;
    }
  }
  return best;
}

export function noteFromFrequency(frequency: number, a4: number): { name: string; octave: number } {
  const midi = Math.round(69 + 12 * Math.log2(frequency / a4));
  return { name: NOTE_NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1 };
}
