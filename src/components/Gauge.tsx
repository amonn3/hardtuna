import { useEffect, useMemo, useRef, type ReactNode } from 'react';

export type GaugeTone = 'idle' | 'tuned' | 'close' | 'far';

interface GaugeProps {
  cents: number | null;
  tone: GaugeTone;
  children?: ReactNode;
}

const CX = 200;
const CY = 200;
const R = 172;
/** Half of the dial sweep, in degrees from 12 o'clock. */
const SWEEP = 125;
const RANGE = 50;
const IN_TUNE_CENTS = 3;

const centsToAngle = (c: number) => (Math.max(-RANGE, Math.min(RANGE, c)) / RANGE) * SWEEP;

function polar(angleDeg: number, r: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function arcPath(r: number, from: number, to: number): string {
  if (Math.abs(to - from) < 0.01) return '';
  const [x0, y0] = polar(from, r);
  const [x1, y1] = polar(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function Gauge({ cents, tone, children }: GaugeProps) {
  const needleRef = useRef<SVGGElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const targetRef = useRef(0);
  targetRef.current = cents === null ? 0 : centsToAngle(cents);

  // Damped spring so the needle moves like a real analog gauge.
  useEffect(() => {
    let raf = 0;
    let pos = 0;
    let vel = 0;
    let last = performance.now();
    const stiffness = 150;
    const damping = 18;

    const step = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      vel += (stiffness * (targetRef.current - pos) - damping * vel) * dt;
      pos += vel * dt;
      needleRef.current?.setAttribute('transform', `rotate(${pos.toFixed(3)} ${CX} ${CY})`);
      trailRef.current?.setAttribute('d', arcPath(R - 14, Math.min(0, pos), Math.max(0, pos)));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ticks = useMemo(() => {
    const items: { d: string; kind: 'major' | 'mid' | 'minor'; c: number }[] = [];
    for (let c = -RANGE; c <= RANGE; c++) {
      const kind = c % 10 === 0 ? 'major' : c % 5 === 0 ? 'mid' : 'minor';
      const len = kind === 'major' ? 18 : kind === 'mid' ? 12 : 7;
      const a = centsToAngle(c);
      const [x0, y0] = polar(a, R);
      const [x1, y1] = polar(a, R - len);
      items.push({ d: `M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)}`, kind, c });
    }
    return items;
  }, []);

  const labels = useMemo(
    () =>
      [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((c) => {
        const [x, y] = polar(centsToAngle(c), R - 36);
        return { c, x, y };
      }),
    [],
  );

  const [flatX, flatY] = polar(-SWEEP - 9, R - 4);
  const [sharpX, sharpY] = polar(SWEEP + 9, R - 4);
  const [markX, markY] = polar(0, R + 10);

  return (
    <div className={`gauge gauge--${tone}`}>
      <svg viewBox="0 0 400 400" className="gauge__svg" aria-hidden="true">
        <defs>
          <linearGradient id="zoneGradient" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="380" y2="0">
            <stop offset="0" stopColor="#ff4d6d" />
            <stop offset="0.3" stopColor="#ffb547" />
            <stop offset="0.47" stopColor="#34f5a5" />
            <stop offset="0.53" stopColor="#34f5a5" />
            <stop offset="0.7" stopColor="#ffb547" />
            <stop offset="1" stopColor="#ff4d6d" />
          </linearGradient>
          <radialGradient id="faceGradient" cx="50%" cy="60%" r="60%">
            <stop offset="0" stopColor="#141b2e" />
            <stop offset="1" stopColor="#090c16" />
          </radialGradient>
          <linearGradient id="needleGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.2 }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={CX} cy={CY} r={R + 22} fill="url(#faceGradient)" className="gauge__face" />
        <circle cx={CX} cy={CY} r={R + 22} className="gauge__bezel" />

        <path d={arcPath(R + 6, -SWEEP, SWEEP)} className="gauge__zone" stroke="url(#zoneGradient)" />
        <path
          d={arcPath(R + 6, centsToAngle(-IN_TUNE_CENTS), centsToAngle(IN_TUNE_CENTS))}
          className="gauge__sweet-spot"
        />

        {ticks.map((t) => (
          <path
            key={t.c}
            d={t.d}
            className={`gauge__tick gauge__tick--${t.kind}${t.c === 0 ? ' gauge__tick--zero' : ''}`}
          />
        ))}

        {labels.map((l) => (
          <text key={l.c} x={l.x} y={l.y} className={`gauge__label${l.c === 0 ? ' gauge__label--zero' : ''}`}>
            {l.c > 0 ? `+${l.c}` : l.c}
          </text>
        ))}

        <text x={flatX} y={flatY} className="gauge__symbol">♭</text>
        <text x={sharpX} y={sharpY} className="gauge__symbol">♯</text>
        <path d={`M ${markX} ${markY} l -6 -9 h 12 z`} className="gauge__marker" />

        <path ref={trailRef} className="gauge__trail" filter="url(#glow)" />

        <g ref={needleRef} className="gauge__needle" filter="url(#glow)">
          <path d={`M ${CX - 5} ${CY + 22} L ${CX - 1.6} ${CY - R + 10} L ${CX + 1.6} ${CY - R + 10} L ${CX + 5} ${CY + 22} Z`} fill="url(#needleGradient)" />
          <path d={`M ${CX} ${CY - R + 10} L ${CX} ${CY - 40}`} className="gauge__needle-core" />
        </g>

        <circle cx={CX} cy={CY} r={15} className="gauge__hub" />
        <circle cx={CX} cy={CY} r={5} className="gauge__hub-dot" />
      </svg>
      <div className="gauge__readout">{children}</div>
    </div>
  );
}
