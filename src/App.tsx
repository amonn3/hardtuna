import { useEffect, useMemo, useRef, useState } from 'react';
import { useTuner } from './audio/useTuner';
import { Gauge, type GaugeTone } from './components/Gauge';
import { StringSelector } from './components/StringSelector';
import {
  STANDARD_TUNING,
  centsBetween,
  midiToFrequency,
  nearestString,
  noteFromFrequency,
  type GuitarString,
} from './tuning';

const IN_TUNE_CENTS = 3;
const CLOSE_CENTS = 15;
const TUNED_HOLD_MS = 700;
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
  const tuner = useTuner();
  const [a4, setA4] = useState(440);
  const [lockedId, setLockedId] = useState<number | null>(null);
  const [tunedIds, setTunedIds] = useState<Set<number>>(() => new Set());
  const lastTargetRef = useRef<GuitarString | null>(null);
  const inTuneSinceRef = useRef<{ id: number; since: number } | null>(null);

  const { frequency, status } = tuner;
  const listening = status === 'listening';
  const hasSignal = frequency !== null;

  const target = useMemo(() => {
    if (lockedId !== null) return STANDARD_TUNING.find((s) => s.id === lockedId)!;
    if (frequency !== null) return nearestString(frequency, a4);
    return null;
  }, [frequency, lockedId, a4]);
  if (target) lastTargetRef.current = target;
  const shownTarget = target ?? lastTargetRef.current;

  const targetFrequency = shownTarget ? midiToFrequency(shownTarget.midi, a4) : null;
  const cents = frequency !== null && targetFrequency !== null ? centsBetween(frequency, targetFrequency) : null;
  const absCents = cents === null ? null : Math.abs(cents);

  const tone: GaugeTone =
    absCents === null ? 'idle' : absCents <= IN_TUNE_CENTS ? 'tuned' : absCents <= CLOSE_CENTS ? 'close' : 'far';

  // A string counts as tuned after holding the sweet spot for a moment.
  useEffect(() => {
    if (cents === null || !target || Math.abs(cents) > IN_TUNE_CENTS) {
      inTuneSinceRef.current = null;
      return;
    }
    const now = performance.now();
    const current = inTuneSinceRef.current;
    if (!current || current.id !== target.id) {
      inTuneSinceRef.current = { id: target.id, since: now };
    } else if (now - current.since >= TUNED_HOLD_MS && !tunedIds.has(target.id)) {
      setTunedIds((prev) => new Set(prev).add(target.id));
    }
  }, [cents, target, tunedIds]);

  const changeA4 = (value: number) => {
    setA4(Math.max(A4_MIN, Math.min(A4_MAX, value)));
    setTunedIds(new Set());
  };

  const detectedNote = frequency !== null ? noteFromFrequency(frequency, a4) : null;

  let hint: { title: string; detail: string; dir: 'up' | 'down' | 'ok' | 'none' };
  if (!listening) {
    hint = { title: 'Pronto para afinar', detail: 'Ative o microfone para começar', dir: 'none' };
  } else if (cents === null) {
    hint = {
      title: 'Toque uma corda',
      detail: lockedId !== null ? `Modo manual: ${lockedId}ª corda` : 'A corda é detectada automaticamente',
      dir: 'none',
    };
  } else if (Math.abs(cents) <= IN_TUNE_CENTS) {
    hint = { title: 'Afinado!', detail: 'Perfeito, pode passar para a próxima corda', dir: 'ok' };
  } else if (cents < 0) {
    hint = {
      title: 'Aperte a corda',
      detail: cents < -50 ? 'Muito baixo — aperte bastante a tarraxa' : 'Está baixo (♭) — suba a afinação',
      dir: 'up',
    };
  } else {
    hint = {
      title: 'Afrouxe a corda',
      detail: cents > 50 ? 'Muito alto — afrouxe bastante a tarraxa' : 'Está alto (♯) — desça a afinação',
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
            <p>Afinador de violão</p>
          </div>
        </div>
        <div className="tuning-badge" title="Afinação padrão">
          <span>Padrão</span>
          <strong>E A D G B E</strong>
        </div>
      </header>

      <main className="card">
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
                  ouvindo {detectedNote.name}
                  <sub>{detectedNote.octave}</sub>
                </div>
              )}
            </>
          ) : (
            <div className="readout__placeholder">
              <span className="readout__note readout__note--dim">—</span>
              <div className="readout__freq">aguardando som</div>
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
          activeId={hasSignal ? target?.id ?? null : null}
          lockedId={lockedId}
          tunedIds={tunedIds}
          a4={a4}
          onSelect={(id) => setLockedId((prev) => (prev === id ? null : id))}
        />

        <div className="controls">
          <div className="segmented" role="group" aria-label="Modo">
            <button type="button" className={lockedId === null ? 'is-on' : ''} onClick={() => setLockedId(null)}>
              Auto
            </button>
            <button
              type="button"
              className={lockedId !== null ? 'is-on' : ''}
              onClick={() => setLockedId((prev) => prev ?? shownTarget?.id ?? 6)}
            >
              Manual
            </button>
          </div>

          <div className="a4" aria-label="Frequência de referência">
            <button type="button" onClick={() => changeA4(a4 - 1)} disabled={a4 <= A4_MIN} aria-label="Diminuir A4">−</button>
            <span>A4 <strong>{a4}</strong> Hz</span>
            <button type="button" onClick={() => changeA4(a4 + 1)} disabled={a4 >= A4_MAX} aria-label="Aumentar A4">+</button>
          </div>

          <div className="mic">
            <div className="meter" aria-label="Nível do microfone">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className={tuner.level * 12 > i ? 'on' : ''} />
              ))}
            </div>
            {listening && (
              <button type="button" className="icon-btn" onClick={tuner.stop} title="Desligar microfone" aria-label="Desligar microfone">
                <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18" /></svg>
              </button>
            )}
          </div>
        </div>

        {!listening && (
          <div className="overlay">
            <div className="overlay__content">
              <div className="overlay__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              </div>
              <h2>Vamos afinar seu violão</h2>
              <p>O HardTuna precisa ouvir seu instrumento. O áudio é processado localmente no seu navegador e nunca sai do seu computador.</p>
              <button type="button" className="primary" onClick={tuner.start} disabled={status === 'starting'}>
                {status === 'starting' ? 'Aguardando permissão…' : 'Ativar microfone'}
              </button>
              {tuner.error && <p className="overlay__error">{tuner.error}</p>}
            </div>
          </div>
        )}
      </main>

      <footer className="footnote">
        Dica: toque uma corda de cada vez, deixando-a soar livre. Tolerância: ±{IN_TUNE_CENTS} cents.
      </footer>
    </div>
  );
}
