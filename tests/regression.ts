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

import { AutoStringSelector, TuningConfirmation, nearestString } from '../src/tuning';
test('automatic selection rejects distant frequencies and waits before switching strings', () => {
  assert.equal(nearestString(1000, 440), null);
  const selector = new AutoStringSelector();
  assert.equal(selector.update(110, 440, 0)?.id, 5);
  assert.equal(selector.update(146.83, 440, 50)?.id, 5);
  assert.equal(selector.update(146.83, 440, 200)?.id, 4);
  assert.equal(selector.update(1000, 440, 250), null);
});
test('confirmation requires 700 ms of valid readings, including an exactly stable pitch', () => {
  const confirmation = new TuningConfirmation();
  for (let t = 0; t < 700; t += 50) assert.equal(confirmation.update(6, 0, true, t), false);
  assert.equal(confirmation.update(6, 0, true, 700), true);
  confirmation.update(6, 0, false, 700);
  assert.equal(confirmation.update(6, 0, true, 750), false);
  confirmation.reset();
  assert.equal(confirmation.update(6, 0, true, 1500), false);
});

test('manual octave context requires signal evidence and preserves real detuning', () => {
  const detector = new PitchDetector(4096, 48000);
  for (const frequency of [82.41 * 2 ** (-40 / 1200), 82.41, 82.41 * 2 ** (40 / 1200)]) {
    const result = detector.detect(signal(frequency, 48000, [0.05, 1, 0.01]), 60, 1100, 82.41);
    assert.ok(result && Math.abs(centsBetween(result.frequency, frequency)) < 1);
  }
  const octave = detector.detect(signal(164.82, 48000), 60, 1100, 82.41);
  assert.ok(octave && Math.abs(centsBetween(octave.frequency, 164.82)) < 1);
});
test('broadband noise has insufficient periodicity', () => {
  let seed = 42;
  const noise = Float32Array.from({ length: 4096 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 2 ** 32 - 0.5) * 0.1;
  });
  const result = new PitchDetector(4096, 48000).detect(noise, 60, 1100);
  assert.ok(result === null || result.clarity < 0.88);
});

function mockCapture(options: { resumeFails?: boolean; closeFails?: boolean; deferred?: boolean } = {}) {
  const track = Object.assign(new EventTarget(), { readyState: 'live', stops: 0, stop() { this.stops++; this.readyState = 'ended'; } });
  let resume!: () => void;
  const context = Object.assign(new EventTarget(), {
    state: 'running', closes: 0,
    resume: () => options.resumeFails ? Promise.reject(new Error('resume')) : options.deferred ? new Promise<void>(r => { resume = r; }) : Promise.resolve(),
    close() { this.closes++; this.state = 'closed'; return options.closeFails ? Promise.reject(new Error('close')) : Promise.resolve(); },
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: {
    getUserMedia: async () => ({ getTracks: () => [track] }),
  } } });
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: function () { return context; } });
  return { track, context, finishResume: () => resume() };
}

test('resume failures release both resources even when closing rejects', async () => {
  const { track, context } = mockCapture({ resumeFails: true, closeFails: true });
  await assert.rejects(new CaptureSession().start(() => {}));
  assert.equal(track.stops, 1);
  assert.equal(context.closes, 1);
});
test('stopping during resume cancels the session and detaches interruption listeners', async () => {
  const mock = mockCapture({ deferred: true });
  const session = new CaptureSession();
  let interruptions = 0;
  const pending = session.start(() => interruptions++);
  await Promise.resolve();
  session.stop();
  mock.finishResume();
  assert.equal(await pending, null);
  mock.track.dispatchEvent(new Event('ended'));
  assert.equal(interruptions, 0);
  assert.equal(mock.track.stops, 1);
  assert.equal(mock.context.closes, 1);
});
test('track termination and context suspension are observable, with repeatable cleanup', async () => {
  for (const event of ['ended', 'statechange']) {
    for (let cycle = 0; cycle < 3; cycle++) {
      const mock = mockCapture();
      const session = new CaptureSession();
      let interruptions = 0;
      await session.start(() => { interruptions++; session.stop(); });
      if (event === 'ended') mock.track.dispatchEvent(new Event('ended'));
      else { mock.context.state = 'suspended'; mock.context.dispatchEvent(new Event('statechange')); }
      session.stop();
      assert.equal(interruptions, 1);
      assert.equal(mock.track.stops, 1);
      assert.equal(mock.context.closes, 1);
    }
  }
});

import { readPreference, savePreference } from '../src/preferences';
test('preferences tolerate blocked storage and clamp saved values', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  assert.equal(readPreference('a4', 440, 430, 450), 440);
  assert.doesNotThrow(() => savePreference('a4', 441));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '900' } });
  assert.equal(readPreference('a4', 440, 430, 450), 450);
});

test('a peak still rising at the low-frequency boundary is not a 60 Hz observation', () => {
  const detector = new PitchDetector(4096, 48000);
  assert.equal(detector.detect(signal(59, 48000), 60, 1100), null);
});

import { readLanguage, saveLanguage } from '../src/i18n';
test('language defaults to English and restores only supported preferences', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => { assert.equal(key, 'hardtuna:language'); return stored; },
    setItem: (key: string, value: string) => { assert.equal(key, 'hardtuna:language'); stored = value; },
  } });
  try {
    assert.equal(readLanguage(), 'en');
    saveLanguage('pt-BR');
    assert.equal(readLanguage(), 'pt-BR');
    saveLanguage('en');
    assert.equal(readLanguage(), 'en');
    stored = 'fr';
    assert.equal(readLanguage(), 'en');
    stored = '';
    assert.equal(readLanguage(), 'en');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
test('language remains usable when browser storage is blocked', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  try {
    assert.equal(readLanguage(), 'en');
    assert.doesNotThrow(() => saveLanguage('pt-BR'));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
