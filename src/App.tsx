import { useEffect, useRef, useState } from 'react';
import { LanguageSelector } from './components/LanguageSelector';
import { messages, readLanguage, saveLanguage, type Language } from './i18n';
import { useTuner } from './audio/useTuner';
import { Gauge, type GaugeTone } from './components/Gauge';
import { StringSelector } from './components/StringSelector';
import { readPreference, savePreference } from './preferences';
import {
  STANDARD_TUNING,
  centsBetween,
  midiToFrequency,
  AutoStringSelector,
  TuningConfirmation,
  IN_TUNE_CENTS,
  noteFromFrequency,
  type GuitarString,
} from './tuning';

const CLOSE_CENTS = 15;
const A4_MIN = 430;
const A4_MAX = 450;

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="brand__logo" aria-hidden="true">
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5ef2c0" />
          <stop offset="1" stopColor="#4f7cff" />
        </linearGradient>
      </defs>
      <path d="M3 16c3.8-6.5 12-8.6 18.5-4.3L27 7.5v17l-5.5-4.2C15 24.6 6.8 22.5 3 16z" fill="url(#logoGradient)" />
      <circle cx="9" cy="15" r="1.5" fill="#070a12" />
      <path d="M14 12.5c1.2 2.2 1.2 4.8 0 7" stroke="#070a12" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function App() {
  const [language, setLanguage] = useState<Language>(readLanguage);
  const text = messages[language];
  useEffect(() => {
    saveLanguage(language);
    document.documentElement.lang = language;
    document.title = text.appTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', text.description);
  }, [language, text]);
  const [a4, setA4] = useState(() => readPreference('a4', 440, 430, 450));
  const [sensitivity, setSensitivity] = useState(() => readPreference('sensitivity', 50, 0, 100));
  const [lockedId, setLockedId] = useState<number | null>(null);
  const manualString = STANDARD_TUNING.find(s => s.id === lockedId);
  const tuner = useTuner(sensitivity, manualString ? midiToFrequency(manualString.midi, a4) : undefined);
  const [tunedIds, setTunedIds] = useState<Set<number>>(() => new Set());
  const lastTargetRef = useRef<GuitarString | null>(null);
  const selector = useRef(new AutoStringSelector());
  const confirmation = useRef(new TuningConfirmation());
  const [autoTarget, setAutoTarget] = useState<GuitarString | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);

  const { frequency, status, valid, acceptedAt } = tuner;
  const listening = status === 'listening';
  const hasSignal = valid && frequency !== null;

  useEffect(() => {
    if (!listening) selector.current.reset();
    setAutoTarget(selector.current.update(hasSignal ? frequency : null, a4, acceptedAt ?? 0));
  }, [frequency, hasSignal, acceptedAt, a4, listening]);
  const target = lockedId !== null ? STANDARD_TUNING.find(s => s.id === lockedId)! : autoTarget;
  if (target) lastTargetRef.current = target;
  const shownTarget = target ?? lastTargetRef.current;

  useEffect(() => {
    confirmation.current.reset();
    selector.current.reset();
    setTunedIds(new Set());
  }, [a4, listening]);
  useEffect(() => { confirmation.current.reset(); }, [lockedId]);
  useEffect(() => { savePreference('a4', a4); }, [a4]);
  useEffect(() => { savePreference('sensitivity', sensitivity); }, [sensitivity]);
  useEffect(() => {
    if (contentRef.current) contentRef.current.inert = !listening;
    if (listening) micButtonRef.current?.focus();
    else overlayRef.current?.focus();
  }, [listening]);

  const targetFrequency = shownTarget ? midiToFrequency(shownTarget.midi, a4) : null;
  const cents = hasSignal && target !== null && frequency !== null && targetFrequency !== null ? centsBetween(frequency, targetFrequency) : null;
  const absCents = cents === null ? null : Math.abs(cents);

  const tone: GaugeTone =
    absCents === null ? 'idle' : absCents <= IN_TUNE_CENTS ? 'tuned' : absCents <= CLOSE_CENTS ? 'close' : 'far';

  useEffect(() => {
    if (confirmation.current.update(target?.id ?? null, cents, valid, acceptedAt) && target) {
      setTunedIds(prev => prev.has(target.id) ? prev : new Set(prev).add(target.id));
    }
  }, [cents, target, valid, acceptedAt]);

  const resetTuning = () => {
    confirmation.current.reset();
    setTunedIds(new Set());
  };

  const changeA4 = (value: number) => {
    setA4(Math.max(A4_MIN, Math.min(A4_MAX, value)));
    setTunedIds(new Set());
  };

  const detectedNote = frequency !== null ? noteFromFrequency(frequency, a4) : null;

  let hint: { title: string; detail: string; dir: 'up' | 'down' | 'ok' | 'none' };
  if (!listening) {
    hint = { title: text.ready, detail: text.activateHint, dir: 'none' };
  } else if (tuner.quality === 'calibrating') {
    hint = { title: text.calibrating, detail: text.silence, dir: 'none' };
  } else if (tuner.quality === 'clipping') {
    hint = { title: text.clipping, detail: text.moveAway, dir: 'none' };
  } else if (tuner.quality === 'unclear') {
    hint = { title: text.unclear, detail: text.reduceNoise, dir: 'none' };
  } else if (hasSignal && target === null) {
    hint = { title: text.distant, detail: text.selectManual, dir: 'none' };
  } else if (cents === null) {
    hint = {
      title: frequency !== null ? text.previous : text.play,
      detail: lockedId !== null ? `${text.manualMode}: ${text.string} ${lockedId}` : text.automatic,
      dir: 'none',
    };
  } else if (Math.abs(cents) <= IN_TUNE_CENTS) {
    hint = { title: text.tuned, detail: text.next, dir: 'ok' };
  } else if (cents < 0) {
    hint = {
      title: text.tighten,
      detail: cents < -50 ? text.checkString : text.flat,
      dir: 'up',
    };
  } else {
    hint = {
      title: text.loosen,
      detail: cents > 50 ? text.checkString : text.sharp,
      dir: 'down',
    };
  }

  return (
    <div className={`app app--${tone}`}>
      <div className="backdrop" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <h1>HardTuna</h1>
            <p>{text.subtitle}</p>
          </div>
        </div>
        <div className="topbar__actions">
          {listening && <LanguageSelector language={language} onChange={setLanguage} text={text} />}
          <div className="tuning-badge" title={text.standardTuning}>
            <span>{text.standard}</span>
            <strong>E A D G B E</strong>
          </div>
        </div>
      </header>

      <main className="card">
        <div ref={contentRef} className="tuner-content">
        <Gauge cents={cents} tone={tone}>
          {shownTarget ? (
            <>
              <div className={`readout__note${hasSignal ? '' : ' readout__note--dim'}`}>
                {shownTarget.note}
                <sub>{shownTarget.octave}</sub>
              </div>
              <div className="readout__cents">
                {cents === null ? '—' : `${cents > 0 ? '+' : cents < 0 ? '−' : ''}${Math.abs(cents).toFixed(1)}¢`}
              </div>
              <div className="readout__freq">
                {frequency !== null ? `${frequency.toFixed(2)} Hz` : '— Hz'}
                <span> / {targetFrequency!.toFixed(2)} Hz</span>
              </div>
              {detectedNote && lockedId !== null && (
                <div className="readout__detected">
                  {text.hearing} {detectedNote.name}
                  <sub>{detectedNote.octave}</sub>
                </div>
              )}
            </>
          ) : (
            <div className="readout__placeholder">
              <span className="readout__note readout__note--dim">—</span>
              <div className="readout__freq">{text.waiting}</div>
            </div>
          )}
        </Gauge>

        <div className={`hint hint--${hint.dir}`} aria-live="polite">
          <div className="hint__icon" aria-hidden="true">
            {hint.dir === 'up' && <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg>}
            {hint.dir === 'down' && <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7" /></svg>}
            {hint.dir === 'ok' && <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            {hint.dir === 'none' && <svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>}
          </div>
          <div>
            <div className="hint__title">{hint.title}</div>
            <div className="hint__detail">{hint.detail}</div>
          </div>
        </div>

        <StringSelector
          text={text}
          activeId={hasSignal ? target?.id ?? null : null}
          lockedId={lockedId}
          tunedIds={tunedIds}
          a4={a4}
          onSelect={(id) => setLockedId((prev) => (prev === id ? null : id))}
        />

        <div className="controls">
          <div className="segmented" role="group" aria-label={text.mode}>
            <button type="button" aria-pressed={lockedId === null} className={lockedId === null ? 'is-on' : ''} onClick={() => setLockedId(null)}>
              {text.auto}
            </button>
            <button
              type="button"
              aria-pressed={lockedId !== null}
              className={lockedId !== null ? 'is-on' : ''}
              onClick={() => setLockedId((prev) => prev ?? shownTarget?.id ?? 6)}
            >
              {text.manual}
            </button>
          </div>

          <div className="a4" aria-label={text.reference}>
            <button type="button" onClick={() => changeA4(a4 - 1)} disabled={a4 <= A4_MIN} aria-label={text.decreaseA4}>−</button>
            <span>A4 <strong>{a4}</strong> Hz</span>
            <button type="button" onClick={() => changeA4(a4 + 1)} disabled={a4 >= A4_MAX} aria-label={text.increaseA4}>+</button>
          </div>

          <div className="mic">
            <div className="meter" aria-label={text.micLevel}>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className={tuner.level * 12 > i ? 'on' : ''} />
              ))}
            </div>
            {listening && (
              <button ref={micButtonRef} type="button" className="icon-btn" onClick={tuner.stop} title={text.stopMic} aria-label={text.stopMic}>
                <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="preferences">
          <label htmlFor="sensitivity">{text.sensitivity}: {sensitivity}%</label>
          <input id="sensitivity" type="range" min="0" max="100" value={sensitivity}
            onChange={e => { setSensitivity(Number(e.target.value)); confirmation.current.reset(); }} />
          <button type="button" onClick={() => { confirmation.current.reset(); tuner.calibrate(); }}>{text.calibrate}</button>
          <button type="button" onClick={resetTuning}>{text.reset}</button>
        </div>
        </div>

        {!listening && (
          <div className="overlay" ref={overlayRef} role="dialog" aria-modal="true" aria-labelledby="start-title" tabIndex={-1}
            onKeyDown={event => {
              if (event.key === 'Escape' && status === 'starting') tuner.stop();
              if (event.key !== 'Tab') return;
              const controls = overlayRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)');
              if (!controls?.length) { event.preventDefault(); return; }
              const first = controls[0];
              const last = controls[controls.length - 1];
              if (event.shiftKey && (document.activeElement === first || document.activeElement === overlayRef.current)) {
                event.preventDefault(); last.focus();
              } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === overlayRef.current)) {
                event.preventDefault(); first.focus();
              }
            }}>
            <div className="overlay__content">
              <LanguageSelector language={language} onChange={setLanguage} text={text} />
              <div className="overlay__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              </div>
              <h2 id="start-title">{text.startTitle}</h2>
              <p>{text.privacy}</p>
              <button type="button" className="primary" onClick={tuner.start} disabled={status === 'starting'}>
                {status === 'starting' ? text.permission : text.activate}
              </button>
              {status === 'starting' && <button type="button" onClick={tuner.stop}>{text.cancel}</button>}
              {tuner.error && <p className="overlay__error">{text[tuner.error]}</p>}
            </div>
          </div>
        )}
      </main>

      <footer className="footnote">
        <p>{text.tip} ±{IN_TUNE_CENTS} cents.</p>
        <p className="footnote__signature">
          HardTuna™ · {text.by} <a href="https://github.com/amonn3">amonn3</a>
        </p>
      </footer>
    </div>
  );
}
