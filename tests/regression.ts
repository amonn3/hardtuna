import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PitchDetector } from '../src/audio/pitchDetector';
import { STANDARD_TUNING, midiToFrequency, centsBetween } from '../src/tuning';
function signal(f: number, rate: number, harmonics = [1], decay = 0) {
  return Float32Array.from({ length: 4096 }, (_, i) => harmonics.reduce((sum, amplitude, h) =>
    sum + amplitude * Math.sin(2 * Math.PI * f * (h + 1) * i / rate), 0) * Math.exp(-decay * i / rate));
}
for (const rate of [44100, 48000, 96000]) {
  test(`six strings, detuning, decay and boundaries at ${rate} Hz`, () => {
    const detector = new PitchDetector(4096, rate);
    for (const frequency of [60, 1100, ...STANDARD_TUNING.flatMap(s => [-20, 0, 20].map(c => midiToFrequency(s.midi, 440) * 2 ** (c / 1200)))]) {
      const estimate = detector.detect(signal(frequency, rate, [0.5], 2), 60, 1100);
      assert.ok(estimate, `missing ${frequency}`);
      assert.ok(Math.abs(centsBetween(estimate.frequency, frequency)) < 1, `${frequency}: ${estimate.frequency}`);
    }
    assert.equal(detector.detect(new Float32Array(4096), 60, 1100), null);
  });
  test(`dominant second harmonic at ${rate} Hz`, () => {
    for (const harmonics of [[0.15, 1, 0.05], [0.3, 1, 0.1], [1, 0.5, 0.2]]) {
      const estimate = new PitchDetector(4096, rate).detect(signal(82.41, rate, harmonics), 60, 1100);
      assert.ok(estimate);
      assert.ok(Math.abs(centsBetween(estimate.frequency, 82.41)) < 1);
    }
    const octave = new PitchDetector(4096, rate).detect(signal(164.82, rate), 60, 1100);
    assert.ok(octave && Math.abs(centsBetween(octave.frequency, 164.82)) < 1);
  });
}

import { PitchStabilizer } from '../src/audio/stabilizer';
import { CaptureSession } from '../src/audio/capture';
test('rejected notes and silence never refresh validity or last accepted timestamp', () => {
  const stable = new PitchStabilizer();
  assert.equal(stable.update(110, 1, 0).valid, true);
  const rejected = stable.update(220, 1, 50);
  assert.equal(rejected.valid, false);
  assert.equal(rejected.acceptedAt, 0);
  assert.ok(Math.abs(stable.update(null, 0, 100).frequency! - 110) < 1e-9);
  assert.equal(stable.update(null, 0, 1250).frequency, null);
});
test('note changes require elapsed time and genuine octave changes are accepted', () => {
  for (const cadence of [25, 50]) {
    const stable = new PitchStabilizer();
    stable.update(110, 1, 0);
    for (let t = cadence; t <= 200; t += cadence) stable.update(220, 1, t);
    assert.ok(Math.abs(stable.update(220, 1, 250).frequency! - 220) < 0.001);
  }
});
test('cancelled permission requests release their late stream and block concurrent starts', async () => {
  let resolve!: (stream: MediaStream) => void;
  let stopped = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: {
    getUserMedia: () => new Promise<MediaStream>(r => { resolve = r; }),
  } } });
  const session = new CaptureSession();
  const pending = session.start(() => {});
  assert.equal(await session.start(() => {}), null);
  session.stop();
  resolve({ getTracks: () => [{ stop: () => stopped++ }] } as unknown as MediaStream);
  assert.equal(await pending, null);
  assert.equal(stopped, 1);
});
test('context creation failure releases the microphone', async () => {
  let stopped = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: {
    getUserMedia: async () => ({ getTracks: () => [{ stop: () => stopped++ }] }),
  } } });
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: class { constructor() { throw new Error('failed'); } } });
  await assert.rejects(new CaptureSession().start(() => {}));
  assert.equal(stopped, 1);
});
