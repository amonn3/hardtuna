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
