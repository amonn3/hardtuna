import { FFT } from './fft';

export interface PitchEstimate {
  /** Fundamental frequency in Hz. */
  frequency: number;
  /** Periodicity confidence in [0, 1] (NSDF peak height). */
  clarity: number;
}

/**
 * McLeod Pitch Method (MPM).
 *
 * Computes the Normalized Square Difference Function (NSDF) using an
 * FFT-based autocorrelation, picks the first "key maximum" above a fraction
 * of the highest peak, then refines the lag with parabolic interpolation for
 * sub-sample (sub-cent) precision. Robust against the octave errors that
 * plain autocorrelation makes on guitar strings with strong harmonics.
 */
export class PitchDetector {
  readonly windowSize: number;
  readonly sampleRate: number;

  private readonly fft: FFT;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  private readonly x: Float64Array;
  private readonly nsdf: Float64Array;

  /** Fraction of the highest NSDF peak the chosen peak must reach. */
  private readonly peakThreshold = 0.9;

  constructor(windowSize: number, sampleRate: number) {
    this.windowSize = windowSize;
    this.sampleRate = sampleRate;

    // Zero-pad to >= 2W so the circular correlation equals the linear one.
    let n = 1;
    while (n < windowSize * 2) n <<= 1;
    this.fft = new FFT(n);
    this.re = new Float64Array(n);
    this.im = new Float64Array(n);
    this.x = new Float64Array(windowSize);
    this.nsdf = new Float64Array(windowSize);
  }

  detect(input: Float32Array, minFrequency: number, maxFrequency: number): PitchEstimate | null {
    const W = this.windowSize;
    const N = this.fft.size;
    const { re, im, x, nsdf, sampleRate } = this;

    let mean = 0;
    for (let i = 0; i < W; i++) mean += input[i];
    mean /= W;

    re.fill(0);
    im.fill(0);
    for (let i = 0; i < W; i++) {
      const v = input[i] - mean;
      x[i] = v;
      re[i] = v;
    }

    // Autocorrelation r(τ) = IFFT(|FFT(x)|²). The power spectrum is real and
    // even, so a second forward transform equals N · IFFT.
    this.fft.transform(re, im);
    for (let k = 0; k < N; k++) {
      re[k] = re[k] * re[k] + im[k] * im[k];
      im[k] = 0;
    }
    this.fft.transform(re, im);

    const maxLag = Math.min(W - 2, Math.ceil(sampleRate / minFrequency));
    const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency));

    // m(τ) = Σ (x_j² + x_{j+τ}²), updated incrementally.
    let m = 0;
    for (let i = 0; i < W; i++) m += 2 * x[i] * x[i];
    if (m < 1e-10) return null;

    nsdf[0] = 1;
    for (let tau = 1; tau <= maxLag + 1; tau++) {
      m -= x[tau - 1] * x[tau - 1] + x[W - tau] * x[W - tau];
      nsdf[tau] = m > 1e-10 ? (2 * (re[tau] / N)) / m : 0;
    }

    // Collect one key maximum per positive lobe, skipping the lobe at τ = 0.
    const peaks: number[] = [];
    let tau = 1;
    while (tau <= maxLag && nsdf[tau] > 0) tau++;

    let inLobe = false;
    let best = -1;
    for (; tau <= maxLag; tau++) {
      const v = nsdf[tau];
      if (!inLobe && v > 0 && nsdf[tau - 1] <= 0) {
        inLobe = true;
        best = tau;
      } else if (inLobe && v <= 0) {
        inLobe = false;
        if (best >= minLag) peaks.push(best);
      }
      if (inLobe && v > nsdf[best]) best = tau;
    }
    if (inLobe && best >= minLag && best < maxLag) peaks.push(best);
    if (peaks.length === 0) return null;

    let highest = 0;
    for (const p of peaks) highest = Math.max(highest, nsdf[p]);
    if (highest <= 0) return null;

    const threshold = this.peakThreshold * highest;
    const chosen = peaks.find((p) => nsdf[p] >= threshold)!;

    // Parabolic interpolation around the chosen peak.
    const a = nsdf[chosen - 1];
    const b = nsdf[chosen];
    const c = nsdf[chosen + 1];
    const denom = a - 2 * b + c;
    let shift = 0;
    let peakValue = b;
    if (denom !== 0) {
      shift = (a - c) / (2 * denom);
      if (Math.abs(shift) > 1) shift = 0;
      peakValue = b - ((a - c) * shift) / 4;
    }

    const period = chosen + shift;
    return {
      frequency: sampleRate / period,
      clarity: Math.min(1, peakValue),
    };
  }
}
