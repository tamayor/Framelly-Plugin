// Before 2028 — SAMPLE scene (2026-11-26), not part of an episode. "₱500 for three years": vote buying acted out in
// three beats with the series kit (RisoKit helpers, on twos, 6/4 px ink, (9, 8) plates, #kitht halftone, seeded sheet).
//   beat 1  f   0-95   queue at the barangay table, envelopes handed out on 30 / 54 / 78, live peso counter
//   beat 2  f  96-185  hero envelope: flap opens, the ₱500 bill slides out and MORPHS into the ballot, pen shades oval 2
//   beat 3  f 186-299  36 months of office (matcha) swept by a strawberry scan wave, ₱500 ÷ 1,095 days counter, SOLD stamp
// Bands: title y 150-440, stage 520-1275 (ground 1240), nothing on the subtitle band 1290-1470.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/EBGaramond';
import {
    MATCHA, STRAW, ARIAL, SW, DW, PX, PY,
    act, on, idle, two, ez, cl, box, Stage, KitItem
} from '../effects/RisoKit';
import { Grain } from '../lib/paper';

// PALETTE (user, 2026-11-26): no navy any more. Matcha, strawberry, royal purple, black, white; cream only as the paper.
//   black = outlines + text · purple = people, structures, the out-of-register plates · white = paper objects
// purple = EMPHASIS only (the leader, the bought vote's loop, the scan line); everyone and everything else is black
const BLACK = '#151515', PURPLE = '#6b3fa0', WHITE = '#ffffff', CREAM = '#efe4cc';
const KitDefs: React.FC = () => (
    <pattern id="kitht" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx={4.5} cy={4.5} r={2.3} fill={BLACK} /></pattern>
);
const Ground: React.FC = () => (
    <g>
        <rect x={-380} y={4} width={800} height={26} fill="url(#kitht)" />
        <line x1={-410} y1={0} x2={410} y2={0} stroke={BLACK} strokeWidth={SW} />
    </g>
);
const Shape: React.FC<{ d: string; fill: string; plate?: string | false }> = ({ d, fill, plate = false }) => (
    <g>
        {plate && <path d={d} fill={plate} transform={`translate(${PX} ${PY})`} />}
        <path d={d} fill={fill} stroke={BLACK} strokeWidth={SW} />
    </g>
);
const Label: React.FC<{ x: number; y: number; text: string; fill?: string; f: number; at: number }> = ({ x, y, text, fill = STRAW, f, at }) => {
    if (f < at) return null;
    const fs = 44, w = text.length * fs * 0.77 + fs * 1.4, h = fs * 1.6, k = 1.12 - 0.12 * ez(two(f - at) / 6);
    return (
        <g transform={`translate(${Math.max(-400 + w / 2, Math.min(400 - w / 2, x))} ${y}) scale(${k})`}>
            <rect x={-w / 2 + PX} y={-h / 2 + PY} width={w} height={h} fill={BLACK} />
            <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={fill} />
            <text x={0} y={fs * 0.35} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={fs} letterSpacing={fs * 0.05} fill={WHITE}>{text}</text>
        </g>
    );
};
const Person: React.FC<{ x: number; h?: number; f?: number; sash?: boolean; walk?: boolean; lean?: number; color?: string }> = ({ x, h = 200, f = 0, sash, walk, lean = 0, color = BLACK }) => {
    const k = h / 200, st = walk ? idle(f, 4) : 0;
    return (
        <g transform={`translate(${x} 0) scale(${k}) rotate(${lean})`}>
            <rect x={-20} y={-78} width={16} height={78} fill={color} transform={`rotate(${walk ? (st ? 9 : -9) : 0} -12 -78)`} />
            <rect x={4} y={-78} width={16} height={78} fill={color} transform={`rotate(${walk ? (st ? -9 : 9) : 0} 12 -78)`} />
            <rect x={-30} y={-164} width={60} height={96} rx={18} fill={color} />
            {sash && <path d="M-26 -158 L26 -84" stroke={STRAW} strokeWidth={12} />}
            <circle cx={0} cy={-184} r={22} fill={color} />
        </g>
    );
};
const PenLoop: React.FC<{ cx: number; cy: number; rx: number; ry: number; f: number; at: number }> = ({ cx, cy, rx, ry, f, at }) => {
    if (!on(f, at)) return null;
    const p = act(f, at, 8), len = 2 * Math.PI * Math.max(rx, ry) * 1.15, j = idle(f, 4) ? 2 : -2;
    return <ellipse cx={cx + j} cy={cy} rx={rx} ry={ry} fill="none" stroke={PURPLE} strokeWidth={8} strokeDasharray={`${len * p} ${len}`} transform={`rotate(-4 ${cx} ${cy})`} />;
};

const SERIF = loadFont('normal', { weights: ['600', '700', '800'], subsets: ['latin', 'latin-ext'] }).fontFamily;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: string, b: string, t: number) => {
    const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`;
};
const peso = (n: number) => '₱' + n.toLocaleString('en-US');

// ------------------------------------------------------------------ beat 1: the queue at the table
const HAND = [30, 54, 78];
const Envelope: React.FC<{ x: number; y: number; k?: number; r?: number }> = ({ x, y, k = 1, r = 0 }) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
        <rect x={-46 + PX * 0.6} y={-30 + PY * 0.6} width={92} height={60} fill={STRAW} />
        <rect x={-46} y={-30} width={92} height={60} rx={6} fill={WHITE} stroke={BLACK} strokeWidth={DW} />
        <path d="M-46 -30 L0 6 L46 -30" fill="none" stroke={BLACK} strokeWidth={DW} />
        <circle cx={0} cy={6} r={10} fill={STRAW} stroke={BLACK} strokeWidth={3} />
    </g>
);
const Queue: React.FC<{ f: number }> = ({ f }) => {
    const it: KitItem = { kind: 'queue', x: 540, y: 1240, s: 1, at: 0 };
    const done = HAND.filter((h) => f >= h + 10).length;            // handoffs finished: those voters cut out
    const shift = HAND.reduce((a, h) => a + act(f, h + 10, 8), 0);  // the line shuffles one slot on twos
    const flying = HAND.find((h) => f >= h && f < h + 10);
    const total = Math.round(500 * HAND.filter((h) => f >= h + 6).length);
    return (
        <Stage it={it} f={f}>
            <Ground />
            {/* official behind the table */}
            <Person x={250} h={270} sash color={PURPLE} f={f} lean={idle(f, 6) ? 1.5 : -1.5} />
            {/* table */}
            <Shape d={box(20, -150, 380, 34, 8)} fill={MATCHA} plate={STRAW} />
            <rect x={48} y={-116} width={16} height={116} fill={BLACK} />
            <rect x={356} y={-116} width={16} height={116} fill={BLACK} />
            {/* envelope stack, one fewer per handoff */}
            {Array.from({ length: 6 - HAND.filter((h) => f >= h).length }, (_, i) => (
                <Envelope key={i} x={130 + (i % 2) * 6} y={-182 - i * 16} k={0.9} r={(i % 3) - 1} />
            ))}
            {/* the line: slot 0 = the front, at the table */}
            {Array.from({ length: 4 }, (_, slot) => {
                const x = -20 - (slot + (done - shift)) * 110;
                if (x < -380) return null;
                return <Person key={`${slot}-${done}`} x={x} h={220} f={f + slot * 2} walk={shift % 1 > 0} />;
            })}
            {/* the envelope in flight: stack -> front voter's hand */}
            {flying !== undefined && (() => {
                const t = ez(two(f - flying) / 8);
                return <Envelope x={lerp(130, -20, t)} y={lerp(-260, -150, t) - Math.sin(t * Math.PI) * 70} k={1.1} r={lerp(0, -14, t)} />;
            })()}
            {/* live counter */}
            {total > 0 && (
                <g transform={`translate(0 -400) scale(${1.1 - 0.1 * ez(two(f - (HAND.filter((h) => f >= h + 6).slice(-1)[0] + 6)) / 6)})`}>
                    <text x={0} y={0} textAnchor="middle" fontFamily={SERIF} fontWeight={800} fontSize={150} fill={STRAW}>{peso(total)}</text>
                </g>
            )}
            <Label x={0} y={-590} text="₱500 PER VOTE" f={f} at={HAND[0] + 6} />
        </Stage>
    );
};

// ------------------------------------------------------------------ beat 2: envelope -> bill -> ballot
const B2 = 96, FLAP = 112, SLIDE = 120, MORPH = 136, PEN = 150, LOOP = 176;
const OVALS = [-470, -360, -250];
const scribble = (() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 14; i++) pts.push([-232 + (i % 2 ? 1 : -1) * 22 + i * 0.6, OVALS[1] - 16 + i * 2.3]);
    return pts;
})();
const Ballot: React.FC<{ f: number }> = ({ f }) => {
    const t0 = f - B2;
    const it: KitItem = { kind: 'ballot', x: 540, y: 1240, s: 1, at: B2 };
    const bob = idle(f, 4) ? -3 : 3;
    const flap = act(f, FLAP, 8);                     // 0 closed -> 1 open
    const slide = act(f, SLIDE, 10);                  // bill rises out
    const m = act(f, MORPH, 10);                      // bill -> ballot
    // bill rect, then the ballot rect it grows into
    const bill = { x: -170, y: lerp(-430, -640, slide), w: 340, h: 170 };
    const bal = { x: -300, y: -580, w: 600, h: 460 };
    const r = { x: lerp(bill.x, bal.x, m), y: lerp(bill.y, bal.y, m), w: lerp(bill.w, bal.w, m), h: lerp(bill.h, bal.h, m) };
    const showEnv = f < MORPH + 4;
    const penP = cl(two(f - PEN) / 22);
    const nPts = Math.max(0, Math.round(penP * (scribble.length - 1)));
    const tip = scribble[nPts];
    if (t0 < 0) return null;
    return (
        <Stage it={it} f={f}>
            <Ground />
            <g transform={`translate(0 ${f < MORPH ? bob : 0})`}>
                {/* envelope body (back) */}
                {showEnv && <Shape d={box(-290, -470, 580, 340, 12)} fill={WHITE} plate={STRAW} />}
                {/* the bill / ballot morph */}
                {f >= SLIDE && (
                    <g>
                        <rect x={r.x + PX} y={r.y + PY} width={r.w} height={r.h} fill={m > 0.5 ? MATCHA : BLACK} />
                        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={10} fill={mix(STRAW, WHITE, m)} stroke={BLACK} strokeWidth={SW} />
                        {m < 1 && (
                            <g>
                                <rect x={r.x + 16} y={r.y + 16} width={r.w - 32} height={r.h - 32} rx={6} fill="none" stroke={WHITE} strokeWidth={DW} />
                                <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 32} textAnchor="middle" fontFamily={SERIF} fontWeight={800} fontSize={96} fill={WHITE}>₱500</text>
                            </g>
                        )}
                        {m >= 1 && (
                            <g>
                                <rect x={-300} y={-580} width={600} height={78} rx={10} fill={BLACK} />
                                <text x={0} y={-527} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} letterSpacing={4} fill={WHITE}>OFFICIAL BALLOT</text>
                                {OVALS.map((y, i) => (
                                    <g key={i}>
                                        <ellipse cx={-232} cy={y} rx={34} ry={22} fill={WHITE} stroke={BLACK} strokeWidth={DW} />
                                        <rect x={-170} y={y - 14} width={i === 1 ? 300 : 360 - i * 40} height={28} rx={8} fill={i === 1 ? STRAW : BLACK} />
                                    </g>
                                ))}
                            </g>
                        )}
                    </g>
                )}
                {/* envelope front pocket + flap (drawn over the bill so it slides OUT of it) */}
                {showEnv && (
                    <g>
                        <path d="M-290 -380 L0 -240 L290 -380 L290 -140 Q290 -130 280 -130 L-280 -130 Q-290 -130 -290 -140 Z" fill={WHITE} stroke={BLACK} strokeWidth={SW} />
                        <path d={`M-290 -470 L0 ${lerp(-290, -650, flap)} L290 -470 Z`} fill={flap > 0.5 ? STRAW : WHITE} stroke={BLACK} strokeWidth={SW} />
                        <circle cx={0} cy={lerp(-300, -640, flap)} r={22} fill={STRAW} stroke={BLACK} strokeWidth={DW} opacity={flap < 0.5 ? 1 : 0} />
                    </g>
                )}
                {/* live pen trace: the oval gets shaded stroke by stroke */}
                {f >= PEN && nPts > 0 && (
                    <polyline points={scribble.slice(0, nPts + 1).map((p) => p.join(' ')).join(' ')} fill="none" stroke={BLACK} strokeWidth={9} />
                )}
                {f >= PEN - 6 && f < LOOP + 2 && (() => {
                    const enter = ez(two(f - (PEN - 6)) / 6);
                    const px = lerp(260, tip ? tip[0] : -232, enter), py = lerp(-200, tip ? tip[1] : OVALS[1], enter);
                    return (
                        <g transform={`translate(${px} ${py}) rotate(-38)`}>
                            <rect x={-12 + PX} y={-210 + PY} width={24} height={190} fill={STRAW} />
                            <rect x={-12} y={-210} width={24} height={190} rx={8} fill={BLACK} stroke={BLACK} strokeWidth={DW} />
                            <rect x={-12} y={-210} width={24} height={50} rx={8} fill={STRAW} stroke={BLACK} strokeWidth={DW} />
                            <path d="M-12 -20 L0 0 L12 -20 Z" fill={WHITE} stroke={BLACK} strokeWidth={DW} />
                        </g>
                    );
                })()}
                <PenLoop cx={-232} cy={OVALS[1]} rx={62} ry={44} f={f} at={LOOP} />
            </g>
            <Label x={0} y={-60} text="YOUR VOTE, PAID FOR" f={f} at={LOOP + 2} />
        </Stage>
    );
};

// ------------------------------------------------------------------ beat 3: 36 months swept, the price per day
const B3 = 186, SCAN = 204, SCAN_END = 258, SOLD = 270;
const Months: React.FC<{ f: number }> = ({ f }) => {
    const it: KitItem = { kind: 'months', x: 540, y: 1240, s: 1, at: B3 };
    const scan = cl(two(f - SCAN) / (SCAN_END - SCAN));
    const waveX = lerp(-430, 430, scan);
    const days = Math.round(1095 * scan);
    const per = f >= SCAN_END + 4;
    const sold = act(f, SOLD, 6);
    const shake = f >= SOLD && f < SOLD + 8 ? (idle(f, 2) ? 5 : -5) : 0;
    const cells: React.ReactNode[] = [];
    for (let row = 0; row < 3; row++) for (let c = 0; c < 12; c++) {
        const cx = -384 + c * 64 + 28, y = -470 + row * 100;
        const flipT = cl((waveX - cx) / 60);       // flips as the wave passes it
        const k = Math.abs(1 - 2 * flipT);         // squash to 0 at the middle of the flip
        const red = flipT > 0.5;
        cells.push(
            <g key={`${row}-${c}`} transform={`translate(${cx} ${y}) scale(${Math.max(0.08, k)} 1)`}>
                <rect x={-28 + 5} y={5} width={56} height={78} fill={red ? BLACK : STRAW} opacity={0.9} />
                <rect x={-28} y={0} width={56} height={78} rx={8} fill={red ? STRAW : MATCHA} stroke={BLACK} strokeWidth={DW} />
                <rect x={-28} y={0} width={56} height={20} rx={6} fill={BLACK} />
                <circle cx={-12} cy={2} r={5} fill={WHITE} /><circle cx={12} cy={2} r={5} fill={WHITE} />
                {red ? <text x={0} y={64} textAnchor="middle" fontFamily={SERIF} fontWeight={800} fontSize={38} fill={WHITE}>₱</text>
                    : <path d="M-12 48 L-3 58 L14 36" fill="none" stroke={WHITE} strokeWidth={DW} />}
            </g>
        );
    }
    return (
        <Stage it={it} f={f}>
            <g transform={`translate(${shake} 0)`}>
                <Ground />
                {/* counter */}
                <g transform={`translate(0 -560) scale(${per ? 1.1 - 0.1 * ez(two(f - SCAN_END - 4) / 8) : 1})`}>
                    {per ? (
                        <g>
                            <text x={0} y={0} textAnchor="middle" fontFamily={SERIF} fontWeight={800} fontSize={120} fill={STRAW}>₱0.46 a day</text>
                        </g>
                    ) : (
                        <text x={0} y={0} textAnchor="middle" fontFamily={SERIF} fontWeight={800} fontSize={96} fill={BLACK}>
                            {f < SCAN ? '3 YEARS' : `₱500 ÷ ${days.toLocaleString('en-US')} days`}
                        </text>
                    )}
                </g>
                {cells}
                {/* the scan wave */}
                {f >= SCAN && scan < 1 && (
                    <g>
                        <rect x={waveX - 9 + PX} y={-500 + PY} width={18} height={330} fill={BLACK} />
                        <rect x={waveX - 9} y={-500} width={18} height={330} fill={PURPLE} stroke={BLACK} strokeWidth={DW} />
                    </g>
                )}
                {/* SOLD stamp */}
                {f >= SOLD && (
                    <g transform={`translate(0 -330) rotate(-9) scale(${1.45 - 0.45 * sold})`}>
                        <rect x={-230 + PX} y={-80 + PY} width={460} height={160} rx={14} fill={BLACK} />
                        <rect x={-230} y={-80} width={460} height={160} rx={14} fill={WHITE} stroke={STRAW} strokeWidth={14} />
                        <text x={0} y={44} textAnchor="middle" fontFamily={ARIAL} fontWeight={900} fontSize={124} letterSpacing={10} fill={STRAW}>SOLD</text>
                    </g>
                )}
                <Label x={0} y={-80} text={f >= SOLD ? 'FOR ONE ENVELOPE' : '36 MONTHS IN OFFICE'} fill={f >= SOLD ? STRAW : MATCHA} f={f} at={f >= SOLD ? SOLD : B3} />
            </g>
        </Stage>
    );
};

// ------------------------------------------------------------------ title band + the whole sheet
const TITLES: [number, string][] = [[0, 'One vote, ₱500'], [B2, 'The envelope is the ballot'], [B3, 'Three years, sold cheap']];
export const EnvelopeSample: React.FC = () => {
    const f = useCurrentFrame();
    const [at, title] = [...TITLES].reverse().find(([a]) => f >= a)!;
    const k = 1.08 - 0.08 * ez(two(f - at) / 8);
    const boil = Math.floor(f / 4) % 3;   // the hand-made line boil: noise changes every 4 frames
    return (
        <AbsoluteFill style={{ background: CREAM }}>
            <Img src={staticFile('riso-bg-sample-envelope-v3.png')} style={{ width: 1080, height: 1920 }} />
            <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
                <defs>
                    <KitDefs />
                    <filter id={`boil${boil}`}>
                        <feTurbulence type="fractalNoise" baseFrequency={0.02} numOctaves={2} seed={boil * 7 + 3} />
                        <feDisplacementMap in="SourceGraphic" scale={3.5} xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
                <g filter={`url(#boil${boil})`}>
                    <g transform={`translate(540 300) scale(${k})`}>
                        <text x={0} y={0} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={80} fill={STRAW}>{title}</text>
                    </g>
                    {f < B2 && <Queue f={f} />}
                    {f >= B2 && f < B3 && <Ballot f={f} />}
                    {f >= B3 && <Months f={f} />}
                </g>
            </svg>
            <Grain id="sample-grain" opacity={0.12} />
        </AbsoluteFill>
    );
};
