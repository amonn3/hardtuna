import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from './pitchDetector';
import { CaptureSession } from './capture';
import { PitchStabilizer, type Reading } from './stabilizer';

export type TunerStatus = 'idle' | 'starting' | 'listening' | 'error';
export type SignalQuality = 'calibrating' | 'weak' | 'unclear' | 'clipping' | 'good';
const EMPTY: Reading = { frequency: null, confidence: 0, acceptedAt: null, valid: false };
const WINDOW_SIZE = 4096;

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Permissão do microfone negada. Libere o acesso nas configurações do navegador e tente novamente.';
    if (err.name === 'NotFoundError') return 'Nenhum microfone encontrado. Conecte um microfone e tente novamente.';
    if (err.name === 'NotReadableError') return 'O microfone está sendo usado por outro aplicativo.';
  }
  return 'Não foi possível acessar o microfone.';
}

export function useTuner(sensitivity = 50) {
  const [status, setStatus] = useState<TunerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading>(EMPTY);
  const [level, setLevel] = useState(0);
  const [quality, setQuality] = useState<SignalQuality>('weak');
  const session = useRef(new CaptureSession());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;
  const calibration = useRef({ since: 0, samples: [] as number[], noise: 0.002 });

  const stop = useCallback(() => {
    active.current = false;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    session.current.stop();
    setReading(EMPTY);
    setLevel(0);
    setStatus('idle');
  }, []);

  const calibrate = useCallback(() => {
    calibration.current = { since: performance.now(), samples: [], noise: calibration.current.noise };
    setQuality('calibrating');
    setReading(EMPTY);
  }, []);

  const start = useCallback(async () => {
    if (active.current) return;
    active.current = true;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      active.current = false;
      setError('Este navegador não suporta captura de áudio (é necessário HTTPS ou localhost).');
      setStatus('error');
      return;
    }
    setStatus('starting');
    try {
      const resources = await session.current.start(() => {
        stop();
        setError('Captura interrompida. Ative o microfone novamente para reconectar.');
        setStatus('error');
      });
      if (!resources) return;
      const { stream, context: ctx } = resources;
      const source = ctx.createMediaStreamSource(stream);
      const raw = ctx.createAnalyser();
      raw.fftSize = WINDOW_SIZE;
      source.connect(raw);
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
      const rawBuffer = new Float32Array(WINDOW_SIZE);
      const detector = new PitchDetector(WINDOW_SIZE, ctx.sampleRate);
      let stabilizer = new PitchStabilizer();
      let calibrationSince = -1;
      calibrate();
      const tick = () => {
        if (!active.current) return;
        const now = performance.now();
        analyser.getFloatTimeDomainData(buffer);
        raw.getFloatTimeDomainData(rawBuffer);
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
          peak = Math.max(peak, Math.abs(rawBuffer[i]));
        }
        const rms = Math.sqrt(sum / buffer.length);
        setLevel(Math.min(1, rms * 6));
        const cal = calibration.current;
        if (cal.since !== calibrationSince) {
          calibrationSince = cal.since;
          stabilizer = new PitchStabilizer();
        }
        let nextQuality: SignalQuality;
        let frequency: number | null = null;
        let confidence = 0;
        if (now - cal.since < 1000) {
          cal.samples.push(rms);
          nextQuality = 'calibrating';
        } else {
          if (cal.samples.length) {
            cal.samples.sort((a, b) => a - b);
            cal.noise = cal.samples[Math.floor(cal.samples.length / 2)];
            cal.samples = [];
          }
          const gate = Math.max(0.001, cal.noise * 2.5, 0.006) * 2 ** ((50 - sensitivityRef.current) / 25);
          nextQuality = peak >= 0.98 ? 'clipping' : rms < gate ? 'weak' : 'unclear';
          if (nextQuality === 'unclear') {
            const estimate = detector.detect(buffer, 60, 1100);
            if (estimate && estimate.clarity >= 0.88) {
              frequency = estimate.frequency;
              confidence = estimate.clarity;
              nextQuality = 'good';
            }
          }
        }
        setQuality(nextQuality);
        setReading(stabilizer.update(frequency, confidence, now));
        // Analysis and React updates capped at 20 Hz, regardless of screen refresh.
        timer.current = setTimeout(tick, 50);
      };
      tick();
      setStatus('listening');
    } catch (err) {
      stop();
      setError(describeError(err));
      setStatus('error');
    }
  }, [stop, calibrate]);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        stop();
        setError('Captura pausada com a aba oculta. Ative o microfone para continuar.');
      }
    };
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); stop(); };
  }, [stop]);

  return { status, error, ...reading, level, quality, start, stop, calibrate };
}
