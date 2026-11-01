import { type Messages } from '../i18n';
import { STANDARD_TUNING, midiToFrequency } from '../tuning';

interface StringSelectorProps {
  text: Messages;
  activeId: number | null;
  lockedId: number | null;
  tunedIds: Set<number>;
  a4: number;
  onSelect: (id: number) => void;
}

export function StringSelector({ text, activeId, lockedId, tunedIds, a4, onSelect }: StringSelectorProps) {
  return (
    <div className="strings" role="group" aria-label={text.strings}>
      {STANDARD_TUNING.map((s, i) => {
        const classes = ['string'];
        if (s.id === activeId) classes.push('string--active');
        if (s.id === lockedId) classes.push('string--locked');
        if (tunedIds.has(s.id)) classes.push('string--tuned');
        return (
          <button
            key={s.id}
            type="button"
            className={classes.join(' ')}
            onClick={() => onSelect(s.id)}
            aria-label={`${text.string} ${s.id}, ${s.note}${s.octave}${tunedIds.has(s.id) ? `, ${text.tunedString}` : ""}`}
            aria-pressed={s.id === lockedId}
            title={`${text.string} ${s.id} — ${s.note}${s.octave} (${midiToFrequency(s.midi, a4).toFixed(2)} Hz)`}
          >
            <span className="string__wire" style={{ width: `${3.4 - i * 0.45}px` }} />
            <span className="string__note">
              {s.note}
              <sub>{s.octave}</sub>
            </span>
            <span className="string__num">{s.id}</span>
            <span className="string__check" aria-hidden="true">
              <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
