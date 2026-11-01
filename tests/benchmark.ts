import { performance } from 'node:perf_hooks';
import { PitchDetector } from '../src/audio/pitchDetector';
for (const rate of [44100, 48000, 96000]) {
  const detector = new PitchDetector(4096, rate);
  const input = Float32Array.from({ length: 4096 }, (_, i) => Math.sin(2 * Math.PI * 82.41 * i / rate));
  for (let i = 0; i < 100; i++) detector.detect(input, 60, 1100);
  const started = performance.now();
  for (let i = 0; i < 1000; i++) detector.detect(input, 60, 1100);
  console.log(`${rate} Hz: ${((performance.now() - started) / 1000).toFixed(3)} ms/detection; capture window ${(4096 / rate * 1000).toFixed(1)} ms`);
}
