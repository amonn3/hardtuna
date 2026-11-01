import { centsBetween } from '../tuning';

export interface Reading {
  frequency: number | null;
  confidence: number;
  acceptedAt: number | null;
  valid: boolean;
}
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** All windows and transitions use milliseconds, independently of display refresh rate. */
export class PitchStabilizer {
  private history: { frequency: number; at: number }[] = [];
  private candidate: { frequency: number; since: number } | null = null;
  private log: number | null = null;
  private reading: Reading = { frequency: null, confidence: 0, acceptedAt: null, valid: false };

  update(frequency: number | null, confidence: number, now: number): Reading {
    if (this.reading.acceptedAt !== null && now - this.reading.acceptedAt > 1200) {
      this.history = [];
      this.candidate = null;
      this.log = null;
      this.reading = { frequency: null, confidence: 0, acceptedAt: null, valid: false };
    }
    if (frequency === null) {
      this.candidate = null;
      return this.reading = { ...this.reading, valid: false };
    }
    if (this.history.length && Math.abs(centsBetween(frequency, median(this.history.map(h => h.frequency)))) > 60) {
      if (!this.candidate || Math.abs(centsBetween(frequency, this.candidate.frequency)) > 30) {
        this.candidate = { frequency, since: now };
      }
      if (now - this.candidate.since < 100) return this.reading = { ...this.reading, valid: false };
      this.history = [];
      this.log = null;
    }
    this.candidate = null;
    this.history = this.history.filter(h => now - h.at <= 160);
    this.history.push({ frequency, at: now });
    const log = Math.log2(median(this.history.map(h => h.frequency)));
    const dt = this.reading.acceptedAt === null ? 50 : now - this.reading.acceptedAt;
    this.log = this.log === null ? log : this.log + (1 - Math.exp(-dt / 100)) * (log - this.log);
    return this.reading = { frequency: 2 ** this.log, confidence, acceptedAt: now, valid: true };
  }
}
