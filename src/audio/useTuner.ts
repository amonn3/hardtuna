import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from './pitchDetector';

export type TunerStatus = 'idle' | 'starting' | 'listening' | 'error';

const WINDOW_SIZE = 4096; // ~85 ms @ 48 kHz: ≥ 6 periods of low E (82 Hz)
const MIN_FREQUENCY = 60;
const MAX_FREQUENCY = 1100;
const NOISE_GATE_RMS = 0.006;
const MIN_CLARITY = 0.88;
const HISTORY_SIZE = 5;
/** A reading this far from the current median counts as a possible new note. */
const NOTE_CHANGE_CENTS = 60;
/** Consistent outliers needed before we accept that a new note started. */
const NOTE_CHANGE_FRAMES = 3;
/** Keep showing the last pitch this long after the signal fades. */
const HOLD_MS = 1200;
const EMA_ALPHA = 0.35;

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Permissão do microfone negada. Libere o acesso nas configurações do navegador e tente novamente.';
    if (err.name === 'NotFoundError') return 'Nenhum microfone encontrado. Conecte um microfone e tente novamente.';
    if (err.name === 'NotReadableError') return 'O microfone está sendo usado por outro aplicativo.';
  }
  return 'Não foi possível acessar o microfone.';
}

export function useTuner() {
  const [status, setStatus] = useState<TunerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [level, setLevel] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    setFrequency(null);
    setLevel(0);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (ctxRef.current) return;
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador não suporta captura de áudio (é necessário HTTPS ou localhost).');
      setStatus('error');
      return;
    }

    setStatus('starting');
    try {
      // Disable voice-call processing: it distorts pitch and gates sustained notes.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      await ctx.resume();
      streamRef.current = stream;
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 50;
      highpass.Q.value = 0.707;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1400;
      lowpass.Q.value = 0.707;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = WINDOW_SIZE;
      source.connect(highpass).connect(lowpass).connect(analyser);

      const buffer = new Float32Array(WINDOW_SIZE);
      const detector = new PitchDetector(WINDOW_SIZE, ctx.sampleRate);
      let history: number[] = [];
      let candidates: number[] = [];
      let smoothedLog: number | null = null;
      let lastVoiced = 0;
      let displayLevel = 0;
      let lastLevelUpdate = 0;

      const tick = (now: number) => {
        analyser.getFloatTimeDomainData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);
        displayLevel = Math.max(rms, displayLevel * 0.92);

        if (rms > NOISE_GATE_RMS) {
          const estimate = detector.detect(buffer, MIN_FREQUENCY, MAX_FREQUENCY);
          if (estimate && estimate.clarity >= MIN_CLARITY) {
            const f = estimate.frequency;
            const isNewNote = history.length > 0 && Math.abs(cents(f, median(history))) > NOTE_CHANGE_CENTS;

            if (isNewNote) {
              // Only switch notes once several readings agree; isolated octave
              // glitches are dropped here.
              const agrees = candidates.length === 0 || Math.abs(cents(f, median(candidates))) < NOTE_CHANGE_CENTS / 2;
              candidates = agrees ? [...candidates, f] : [f];
              if (candidates.length >= NOTE_CHANGE_FRAMES) {
                history = candidates;
                candidates = [];
                smoothedLog = null;
              }
            } else {
              history.push(f);
              if (history.length > HISTORY_SIZE) history.shift();
              candidates = [];
            }

            if (history.length > 0) {
              lastVoiced = now;
              const logF = Math.log2(median(history));
              smoothedLog = smoothedLog === null ? logF : smoothedLog + EMA_ALPHA * (logF - smoothedLog);
              setFrequency(2 ** smoothedLog);
            }
          }
        }

        if (lastVoiced && now - lastVoiced > HOLD_MS) {
          history = [];
          candidates = [];
          smoothedLog = null;
          lastVoiced = 0;
          setFrequency(null);
        }

        if (now - lastLevelUpdate > 50) {
          lastLevelUpdate = now;
          setLevel(Math.min(1, displayLevel * 6));
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      setStatus('listening');
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      void ctxRef.current?.close();
      ctxRef.current = null;
      setError(describeError(err));
      setStatus('error');
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { status, error, frequency, level, start, stop };
}
