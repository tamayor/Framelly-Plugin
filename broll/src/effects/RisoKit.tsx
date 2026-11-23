// Before 2028 ILLUSTRATION STANDARD (from Ep. 13, 2026-11-17; before-2028-edit-prompt.md): one drawing kit, one stage,
// one motion grammar. Every scene here is built from the same helpers:
//   outline  ink 6 px on silhouettes (SW), 4 px on inner detail (DW), round joins
//   plate    the hero silhouette printed once more, offset (9, 8), in the second ink
//   shading  one halftone pattern (#kitht) for the ground shadow and shadow sides
//   colours  matcha = the public good / what people are owed · strawberry = money, the problem, the emphasis ·
//            ink = people and structures · cream = paper
//   text     Arial Bold caps on the label strip, never under 40 px on screen (the strip un-scales itself),
//            0.7 em of strip either side of the words, and the strip is clamped inside the 820 px stage
//   motion   enter: cut in at 108 % settling over 8 frames · act: a state change on its word, 8 frames ·
//            idle: one small loop · exit: hard cut. All on twos.
// A scene is drawn in its own coordinates: ground line at y = 0, x from -410 to 410 (the 820 px stage), up = negative y.
// Items: { kind, x, y (the ground line), s, at, steps: [frames from the clip start of each state change], text, n, out }.
import React from 'react';
import { icon as stickerIcon, settle as stickerSettle } from './TalkAccent';

export const INK = '#1c2738', PAPER = '#efe4cc', MATCHA = '#3f7f45', STRAW = '#c7385a', WHITE = '#fbfaf6';
export const ARIAL = 'Arial, Helvetica, sans-serif';
export const SW = 6, DW = 4, PX = 9, PY = 8;
export const cl = (x: number) => Math.max(0, Math.min(1, x));
export const ez = (x: number) => 1 - Math.pow(1 - cl(x), 3);
export const two = (f: number) => Math.floor(f / 2) * 2;
export const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export type KitItem = { kind: string; x: number; y: number; s?: number; at?: number; steps?: number[]; text?: string; n?: number; out?: number; w?: number; h?: number; flip?: boolean; color?: string };

// progress 0..1 of the state change that starts on frame `at` (on twos, 8 frames)
export const act = (f: number, at: number | undefined, dur = 8) => (at === undefined ? 0 : ez(two(f - at) / dur));
export const on = (f: number, at: number | undefined) => at !== undefined && f >= at;
// the one idle loop: a value that steps every `every` frames
export const idle = (f: number, every = 4, n = 2) => Math.floor(f / every) % n;

// the stage: places the scene on its ground line and gives it the shared entrance (cut in at 108 %, settle on twos)
export const Stage: React.FC<{ it: KitItem; f: number; children: React.ReactNode }> = ({ it, f, children }) => {
    const t0 = f - (it.at || 0);
    if (t0 < 0) return null;
    const k = 1.08 - 0.08 * ez(two(t0) / 8);
    return <g transform={`translate(${it.x} ${it.y}) scale(${(it.s || 1) * k})`} strokeLinejoin="round" strokeLinecap="round">{children}</g>;
};
// ground line + the halftone ground shadow, the same under every scene
export const Ground: React.FC<{ w?: number; x?: number }> = ({ w = 820, x = 0 }) => (
    <g>
        <rect x={x - w / 2 + 30} y={4} width={w - 20} height={26} fill="url(#kitht)" />
        <line x1={x - w / 2} y1={0} x2={x + w / 2} y2={0} stroke={INK} strokeWidth={SW} />
    </g>
);
// a silhouette with the ink outline; `plate` prints the misregistered second ink behind it
export const Shape: React.FC<{ d: string; fill: string; plate?: string | false; sw?: number; opacity?: number }> = ({ d, fill, plate = false, sw = SW }) => (
    <g>
        {plate && <path d={d} fill={plate} transform={`translate(${PX} ${PY})`} />}
        <path d={d} fill={fill} stroke={INK} strokeWidth={sw} />
    </g>
);
export const box = (x: number, y: number, w: number, h: number, r = 10) =>
    `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
// the label strip (same look as the reason-scene tags): strawberry strip, ink block out of register, white Arial Bold caps.
// `s` = the scene's scale, so the text is never under 40 px on screen.
export const Label: React.FC<{ x: number; y: number; text: string; s?: number; size?: number; fill?: string; ink?: string; f?: number; at?: number }> = ({ x, y, text, s = 1, size = 44, fill = STRAW, ink = '#fff', f, at }) => {
    if (f !== undefined && at !== undefined && f < at) return null;
    const fs = Math.max(size, 40 / s), w = text.length * fs * 0.77 + fs * 1.4, h = fs * 1.6;
    const k = f !== undefined && at !== undefined ? 1.12 - 0.12 * ez(two(f - at) / 6) : 1;
    return (
        <g transform={`translate(${Math.max(-400 + w / 2, Math.min(400 - w / 2, x))} ${y}) scale(${k})`}>
            <rect x={-w / 2 + PX} y={-h / 2 + PY} width={w} height={h} fill={INK} />
            <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={fill} />
            <text x={0} y={fs * 0.35} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={fs} letterSpacing={fs * 0.05} fill={ink}>{text}</text>
        </g>
    );
};
// the one person of the series: an ink silhouette (head, body, legs), optional strawberry sash for an official
export const Person: React.FC<{ x: number; y?: number; h?: number; f?: number; sash?: boolean; walk?: boolean; lean?: number }> = ({ x, y = 0, h = 200, f = 0, sash, walk, lean = 0 }) => {
    const k = h / 200, st = walk ? idle(f, 4) : 0;
    return (
        <g transform={`translate(${x} ${y}) scale(${k}) rotate(${lean})`}>
            <rect x={-20} y={-78} width={16} height={78} fill={INK} transform={`rotate(${walk ? (st ? 9 : -9) : 0} -12 -78)`} />
            <rect x={4} y={-78} width={16} height={78} fill={INK} transform={`rotate(${walk ? (st ? -9 : 9) : 0} 12 -78)`} />
            <rect x={-30} y={-164} width={60} height={96} rx={18} fill={INK} />
            {sash && <path d="M-26 -158 L26 -84" stroke={STRAW} strokeWidth={12} />}
            <circle cx={0} cy={-184} r={22} fill={INK} />
        </g>
    );
};
// a sketched strawberry pen loop round something (the series' pen box), drawing on over 8 frames
export const PenLoop: React.FC<{ cx: number; cy: number; rx: number; ry: number; f: number; at?: number }> = ({ cx, cy, rx, ry, f, at }) => {
    if (!on(f, at)) return null;
    const p = act(f, at, 8), len = 2 * Math.PI * Math.max(rx, ry) * 1.15, j = idle(f, 4) ? 2 : -2;
    return <ellipse cx={cx + j} cy={cy} rx={rx} ry={ry} fill="none" stroke={STRAW} strokeWidth={8} strokeDasharray={`${len * p} ${len}`} transform={`rotate(-4 ${cx} ${cy})`} />;
};
export const KitDefs: React.FC = () => (
    <pattern id="kitht" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx={4.5} cy={4.5} r={2.3} fill={INK} /></pattern>
);

// ---------------------------------------------------------------------------------------------------------------------
// EP. 13 (rigged bidding, substandard roads). Motif = THE ROAD.
// ---------------------------------------------------------------------------------------------------------------------

// road: a new concrete road running to the horizon, a ribbon-cutting sign beside it, a car on it.
// steps[0] = it cracks · steps[1] = it sinks (a pothole opens, the car drops in) · steps[2] = a repair cone + 2nd label.
// text = "LABEL A|LABEL B": A lands with the crack, B with step 2 (or with the sink when there is no step 2).
export const Road: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|');
    const crack = act(f, st[0], 10), sink = act(f, st[1], 10), fix = on(f, st[2]);
    const H = 430, top = 96, bot = 330;                      // half widths of the road at the horizon / at the ground
    const xr = (t: number) => top + (bot - top) * t;          // half width at depth t (0 = horizon, 1 = ground)
    const yr = (t: number) => -H + H * t;
    const road = `M${-top} ${-H} L${top} ${-H} L${bot} 0 L${-bot} 0 Z`;
    // the car drives toward the viewer on a loop until the road sinks, then sits in the hole, tilted
    const loop = ((two(f) * 0.012) % 1), ct = on(f, st[1]) ? 0.62 : 0.12 + loop * 0.62, cs = 0.35 + ct * 0.75;
    const cx = xr(ct) * 0.42, cy = yr(ct) + (on(f, st[1]) ? 26 * sink : 0);
    const crackPts = [[-0.78, 0.5], [-0.5, 0.56], [-0.28, 0.47], [-0.05, 0.6], [0.16, 0.52], [0.4, 0.63], [0.62, 0.55], [0.8, 0.62]];
    const nSeg = Math.round(crack * (crackPts.length - 1));
    const P = (p: number[]) => `${xr(p[1]) * p[0]},${yr(p[1])}`;
    return (
        <Stage it={it} f={f}>
            {/* verges: the public land either side */}
            <path d={`M-410 0 L-410 ${-H} L${-top} ${-H} L${-bot} 0 Z`} fill={MATCHA} stroke={INK} strokeWidth={SW} />
            <path d={`M410 0 L410 ${-H} L${top} ${-H} L${bot} 0 Z`} fill={MATCHA} stroke={INK} strokeWidth={SW} />
            <line x1={-410} y1={-H} x2={410} y2={-H} stroke={INK} strokeWidth={SW} />
            {/* the road: cream concrete, ink edge, a strawberry plate out of register */}
            <Shape d={road} fill={PAPER} plate={STRAW} />
            <path d={`M${top * 0.55} ${-H} L${bot * 0.82} 0 L${bot} 0 L${top} ${-H} Z`} fill="url(#kitht)" />
            {[0.08, 0.3, 0.52, 0.76].map((t, i) => {
                const t2 = t + 0.13 + i * 0.012;
                return <path key={i} d={`M${-xr(t) * 0.035} ${yr(t)} L${xr(t) * 0.035} ${yr(t)} L${xr(t2) * 0.035} ${yr(t2)} L${-xr(t2) * 0.035} ${yr(t2)} Z`} fill={INK} />;
            })}
            {/* the crack runs across on its word */}
            {nSeg > 0 && <polyline points={crackPts.slice(0, nSeg + 1).map(P).join(' ')} fill="none" stroke={INK} strokeWidth={20} />}
            {nSeg > 0 && <polyline points={crackPts.slice(0, nSeg + 1).map(P).join(' ')} fill="none" stroke={STRAW} strokeWidth={9} />}
            {nSeg > 2 && [[-0.28, 0.47, -0.2, 0.36], [0.16, 0.52, 0.26, 0.42], [0.4, 0.63, 0.3, 0.74]].map((b, i) =>
                <line key={i} x1={xr(b[1]) * b[0]} y1={yr(b[1])} x2={xr(b[3]) * b[2]} y2={yr(b[3])} stroke={INK} strokeWidth={8} />)}
            {/* the sink: a pothole opens under the car */}
            {on(f, st[1]) && <g transform={`translate(${xr(0.62) * 0.42} ${yr(0.62) + 12})`}>
                <ellipse rx={150 * sink} ry={46 * sink} fill={INK} />
                <ellipse rx={150 * sink} ry={46 * sink} fill="none" stroke={STRAW} strokeWidth={DW} transform={`translate(${PX} ${PY})`} />
            </g>}
            {/* the car */}
            <g transform={`translate(${cx} ${cy}) scale(${cs}) rotate(${on(f, st[1]) ? 13 * sink : 0})`}>
                <Shape d={`${box(-70, -66, 140, 66, 14)} M-48 -66 L-34 -104 H34 L48 -66 Z`} fill={STRAW} sw={SW / cs * 0.8} />
                <rect x={-36} y={-98} width={72} height={28} rx={6} fill={PAPER} stroke={INK} strokeWidth={DW / cs * 0.8} />
                <rect x={-62} y={-10} width={30} height={22} rx={6} fill={INK} /><rect x={32} y={-10} width={30} height={22} rx={6} fill={INK} />
                <circle cx={-48} cy={-40} r={9} fill={PAPER} /><circle cx={48} cy={-40} r={9} fill={PAPER} />
            </g>
            {/* the ribbon-cutting sign: the supporting element */}
            <g transform="translate(-300 -150)">
                <rect x={-8} y={0} width={16} height={150} fill={INK} />
                <Shape d={box(-104, -120, 208, 128, 10)} fill={WHITE} plate={MATCHA} />
                <rect x={-104} y={-120} width={208} height={38} fill={MATCHA} stroke={INK} strokeWidth={DW} />
                {[0, 1, 2].map((i) => <line key={i} x1={-80} y1={-58 + i * 22} x2={i === 2 ? 20 : 80} y2={-58 + i * 22} stroke={INK} strokeWidth={DW} />)}
                <path d={`M-104 ${-30 + idle(f, 6) * 3} Q0 ${6 + idle(f, 6) * 3} 104 ${-30 + idle(f, 6) * 3}`} fill="none" stroke={STRAW} strokeWidth={12} />
            </g>
            {fix && <g transform={`translate(${xr(0.86) * -0.3} ${yr(0.86)})`}>
                <Shape d="M-34 0 L-12 -92 H12 L34 0 Z" fill={STRAW} /><rect x={-22} y={-52} width={44} height={16} fill={WHITE} /><rect x={-48} y={-8} width={96} height={14} rx={4} fill={INK} />
            </g>}
            <Ground />
            {lab[0] && <Label x={0} y={-H - 58 - (lab[1] ? Math.max(44, 40 / s) * 1.9 : 0)} text={lab[0]} s={s} f={f} at={st[0]} />}
            {lab[1] && <Label x={0} y={-H - 58} text={lab[1]} s={s} fill={INK} f={f} at={st[2] !== undefined ? st[2] : st[1]} />}
        </Stage>
    );
};

// bids: three sealed bids standing on the bidding table, each with its price.
// n = 0 (default): steps[0] = the lowest gets the pen loop + label text[3] ("LOWEST WINS").
// n = 1 (fixed contest): the WIN / LOSE stamps land on steps[0..2] before anyone opens them; label text[3] on steps[3].
// text = "price|price|price|LABEL" (the middle one is the lowest / the pre-picked winner).
export const Bids: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], tx = (it.text || '₱120M|₱98M|₱135M|LOWEST WINS').split('|'), fixed = it.n === 1;
    const fs = Math.max(48, 40 / s);
    return (
        <Stage it={it} f={f}>
            {/* the table */}
            <Shape d="M-400 -70 H400 L370 -10 H-370 Z" fill={MATCHA} plate={STRAW} />
            <rect x={-330} y={-10} width={24} height={10} fill={INK} /><rect x={306} y={-10} width={24} height={10} fill={INK} />
            {[-250, 0, 250].map((x, i) => {
                const mid = i === 1, bob = mid && !fixed && on(f, st[0]) ? -14 * act(f, st[0]) : 0;
                const stampAt = fixed ? st[[1, 0, 2][i]] : undefined, sp = act(f, stampAt, 6);
                return (
                    <g key={i} transform={`translate(${x} ${-70 + bob}) rotate(${[-3, 0, 3][i]})`}>
                        <Shape d={box(-104, -330, 208, 330, 10)} fill={WHITE} plate={mid ? STRAW : false} />
                        <rect x={-104} y={-330} width={208} height={62} fill={INK} />
                        <text x={0} y={-286} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(40, 40 / s)} letterSpacing={4} fill="#fff">BID</text>
                        <text x={0} y={-170} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={fs} fill={mid ? STRAW : INK}>{tx[i]}</text>
                        {[0, 1, 2].map((q) => <line key={q} x1={-70} y1={-110 + q * 26} x2={q === 2 ? 10 : 70} y2={-110 + q * 26} stroke={INK} strokeWidth={DW} />)}
                        <circle cx={62} cy={-36} r={20} fill={mid ? STRAW : MATCHA} stroke={INK} strokeWidth={DW} />
                        {fixed && on(f, stampAt) && <g transform={`translate(0 -170) rotate(-12) scale(${1.5 - 0.5 * sp})`}>
                            <rect x={-96} y={-40} width={192} height={80} fill={mid ? MATCHA : STRAW} stroke={INK} strokeWidth={SW} />
                            <text x={0} y={18} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(50, 40 / s)} letterSpacing={4} fill="#fff">{mid ? 'WIN' : 'LOSE'}</text>
                        </g>}
                    </g>
                );
            })}
            {!fixed && <PenLoop cx={0} cy={-256} rx={150} ry={66} f={f} at={st[0]} />}
            <Ground />
            {tx[3] && <Label x={0} y={-480} text={tx[3]} s={s} f={f} at={fixed ? st[3] : st[0]} />}
        </Stage>
    );
};

// roof: the carpenter analogy. A house, a carpenter up the ladder, his quote on paper.
// steps[0] = the quote (text[0], "LOWEST QUOTE") gets its tick · steps[1] = the roof boards go thin (gaps) ·
// steps[2] = the nails are skipped (strawberry rings where nails should be) · steps[3] = the roof leaks.
// A step frame below 0 = already in that state when the clip starts.
export const Roof: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], tx = (it.text || 'LOWEST QUOTE|THIN WOOD, NO NAILS').split('|');
    const thin = act(f, st[1]), nails = on(f, st[2]), leak = on(f, st[3]);
    const boards = [0, 1, 2, 3, 4];
    const ham = idle(f, 4) ? -28 : 6;
    return (
        <Stage it={it} f={f}>
            {/* the house */}
            <Shape d={box(-250, -250, 500, 250, 6)} fill={PAPER} plate={STRAW} />
            <rect x={-60} y={-150} width={120} height={150} fill={INK} /><circle cx={34} cy={-74} r={8} fill={PAPER} />
            <rect x={-210} y={-190} width={100} height={90} fill={WHITE} stroke={INK} strokeWidth={DW} /><line x1={-160} y1={-190} x2={-160} y2={-100} stroke={INK} strokeWidth={DW} /><line x1={-210} y1={-145} x2={-110} y2={-145} stroke={INK} strokeWidth={DW} />
            {/* the roof: boards that go thin on the word */}
            <path d="M-300 -250 L0 -470 L300 -250 Z" fill={INK} />
            {boards.map((i) => {
                const y0 = -262 - i * 40, half = 286 - i * 55, hgt = 30 - 16 * thin;
                return <g key={i}>
                    <rect x={-half} y={y0 - hgt} width={half * 2} height={hgt} fill={MATCHA} stroke={INK} strokeWidth={DW} />
                    {[-0.7, -0.25, 0.25, 0.7].map((q, j) => (i + j) % 2 === 0 || !nails
                        ? <circle key={j} cx={half * q} cy={y0 - hgt / 2} r={5} fill={INK} opacity={nails && (i + j) % 2 ? 0 : 1} />
                        : <circle key={j} cx={half * q} cy={y0 - hgt / 2} r={13} fill="none" stroke={STRAW} strokeWidth={DW + 1} />)}
                </g>;
            })}
            {/* the leak */}
            {leak && [0, 1, 2].map((i) => {
                const t = ((two(f - (st[3] || 0)) + i * 10) % 30) / 30;
                return <path key={i} d="M0 -16 Q12 4 0 12 Q-12 4 0 -16 Z" fill={STRAW} stroke={INK} strokeWidth={3} transform={`translate(${-150 + i * 150} ${-236 + t * 200})`} />;
            })}
            {leak && <ellipse cx={0} cy={-6} rx={210} ry={12} fill={STRAW} />}
            {/* ladder + carpenter hammering (the idle loop) */}
            <g transform="translate(330 0)">
                <line x1={-30} y1={0} x2={-90} y2={-330} stroke={INK} strokeWidth={10} /><line x1={30} y1={0} x2={-30} y2={-330} stroke={INK} strokeWidth={10} />
                {[1, 2, 3, 4, 5].map((i) => <line key={i} x1={-30 - i * 10 + 4} y1={-i * 55} x2={30 - i * 10 - 4} y2={-i * 55} stroke={INK} strokeWidth={8} />)}
            </g>
            <Person x={262} y={-196} h={190} lean={-8} />
            <g transform={`translate(236 -330) rotate(${ham})`}><rect x={-6} y={-70} width={12} height={74} fill={INK} /><rect x={-30} y={-92} width={60} height={28} rx={5} fill={STRAW} stroke={INK} strokeWidth={DW} /></g>
            {/* the quote on paper */}
            {on(f, st[0] === undefined ? 0 : Math.min(st[0], 0)) && <g transform={`translate(-330 -330) rotate(-5) scale(${st[0] !== undefined && st[0] > 0 ? 1 : 1})`}>
                <Shape d={box(-76, -100, 152, 200, 8)} fill={WHITE} plate={MATCHA} />
                <text x={0} y={-50} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(46, 40 / s)} fill={STRAW}>₱</text>
                {[0, 1].map((q) => <line key={q} x1={-48} y1={-14 + q * 24} x2={48} y2={-14 + q * 24} stroke={INK} strokeWidth={DW} />)}
                {on(f, st[0]) && <path d="M-34 56 L-10 80 L42 26" fill="none" stroke={MATCHA} strokeWidth={14} strokeDasharray={`${150 * act(f, st[0])} 150`} />}
            </g>}
            <Ground />
            {tx[0] && !on(f, st[1]) && <Label x={0} y={-540} text={tx[0]} s={s} f={f} at={st[0]} fill={MATCHA} />}
            {tx[1] && <Label x={0} y={-540} text={tx[1]} s={s} f={f} at={st[1]} />}
        </Stage>
    );
};

// stacks: peso coin stacks side by side, each under its label. text = "LABEL|LABEL" (1-3 stacks), steps[i] = stack i lands.
// n = coins per stack (default 7). The last stack is strawberry (the cost you did not expect).
export const Stacks: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [0], tx = (it.text || 'BUILD|FIX').split('|'), n = it.n || 7, m = tx.length;
    const gap = m === 1 ? 0 : Math.min(360, 640 / (m - 1));
    // labels never overlap each other or leave the stage (user 2026-11-17, "130 BAD PROJECTS" under "₱3.458 BILLION"): each strip is
    // clamped inside the stage, and when neighbours would touch they go on alternate rows
    const fsL = Math.max(44, 40 / s), lw = (t: string) => t.length * fsL * 0.77 + fsL * 1.4, rowH = fsL * 2.25;
    const lx = tx.map((t, i) => { const x = (i - (m - 1) / 2) * gap, hw = lw(t) / 2; return Math.max(-400 + hw, Math.min(400 - hw, x)); });
    const stagger = tx.some((t, i) => i > 0 && lx[i] - lx[i - 1] < (lw(t) + lw(tx[i - 1])) / 2 + 24);
    return (
        <Stage it={it} f={f}>
            {tx.map((t, i) => {
                const at = st[i] === undefined ? 0 : st[i], x = (i - (m - 1) / 2) * gap, last = m > 1 && i === m - 1;
                if (!on(f, at)) return null;
                const up = Math.min(n, Math.floor((two(f - at)) / 2) + 1), shine = idle(f, 6);
                return (
                    <g key={i} transform={`translate(${x} 0)`}>
                        {Array.from({ length: up }, (_, j) => {
                            const y = -18 - j * 30, dx = (rnd(i * 9 + j) - 0.5) * 14;
                            return <g key={j} transform={`translate(${dx} ${y})`}>
                                {j === 0 && <ellipse cx={PX} cy={PY} rx={112} ry={30} fill={last ? MATCHA : STRAW} />}
                                <path d="M-110 0 V-22 A110 28 0 0 1 110 -22 V0 A110 28 0 0 1 -110 0 Z" fill={last ? STRAW : MATCHA} stroke={INK} strokeWidth={SW} />
                                <ellipse cx={0} cy={-22} rx={110} ry={28} fill={j === up - 1 ? PAPER : (last ? STRAW : MATCHA)} stroke={INK} strokeWidth={SW} />
                                {j === up - 1 && <text x={0} y={-8} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(40, 40 / s)} fill={INK} transform={`translate(0 ${shine})`}>₱</text>}
                            </g>;
                        })}
                        {t && <Label x={lx[i] - x} y={-18 - n * 30 - 86 - (stagger && i % 2 === 0 ? rowH : 0)} text={t} s={s} f={f} at={at + 4} fill={last ? STRAW : INK} />}
                    </g>
                );
            })}
            <Ground />
        </Stage>
    );
};

// kickback: the project budget as one long bar. steps[0] = a slice (text[1], "20%") turns strawberry and is cut off ·
// steps[1] = the slice drops into an envelope that an official pockets · steps[2] = what is left for the road shrinks
// (label text[2], "CHEAPER MATERIALS"). text = "PROJECT BUDGET|20%|CHEAPER MATERIALS".
export const Kickback: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], tx = (it.text || 'PROJECT BUDGET|20%|CHEAPER MATERIALS').split('|');
    const cut = act(f, st[0]), drop = act(f, st[1], 10), weak = act(f, st[2]);
    const W = 760, L = -W / 2, sl = W * 0.24, fs = Math.max(44, 40 / s);
    const sx = L + W - sl + 40 * cut + (210 - (L + W - sl + 40)) * drop * 0, sy = -420 + drop * 250;
    return (
        <Stage it={it} f={f}>
            {/* the budget bar */}
            <Shape d={box(L, -420, W - sl - 6, 110, 10)} fill={MATCHA} plate={STRAW} />
            {weak > 0 && <rect x={L + (W - sl) * (1 - 0.3 * weak)} y={-417} width={(W - sl) * 0.3 * weak - 9} height={104} fill="url(#kitht)" />}
            <text x={L + 26} y={-350} fontFamily={ARIAL} fontWeight={700} fontSize={fs} letterSpacing={2} fill="#fff">{tx[0]}</text>
            {/* the slice */}
            <g transform={`translate(${sx + 30 * cut} ${sy}) rotate(${8 * cut + 10 * drop})`} opacity={drop >= 1 ? 0 : 1}>
                <Shape d={box(0, 0, sl, 110, 10)} fill={on(f, st[0]) ? STRAW : MATCHA} plate={on(f, st[0]) ? INK : false} />
                {on(f, st[0]) && <text x={sl / 2} y={72} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={fs * 1.1} fill="#fff">{tx[1]}</text>}
            </g>
            {/* the official with the envelope */}
            <Person x={345} h={250} sash />
            <g transform={`translate(262 -120) rotate(-6) scale(${1 + 0.1 * (drop >= 1 ? idle(f, 6) : 0)})`}>
                <Shape d={box(-92, -60, 184, 120, 8)} fill={WHITE} plate={STRAW} />
                <path d="M-92 -60 L0 12 L92 -60" fill="none" stroke={INK} strokeWidth={SW} />
                {drop >= 1 && <text x={0} y={46} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(44, 40 / s)} fill={STRAW}>{tx[1]}</text>}
            </g>
            {/* what is left: a thin road slab under the bar */}
            <g transform="translate(-150 0)">
                <Shape d={`M-240 ${-70 + 34 * weak} H240 V0 H-240 Z`} fill={PAPER} />
                {[-150, -30, 90].map((x, i) => <rect key={i} x={x} y={-44 + 34 * weak * 0.5 - 6} width={70} height={10} fill={INK} />)}
                {weak > 0.9 && <polyline points="-40,-36 -10,-18 -30,-6 0,0" fill="none" stroke={STRAW} strokeWidth={8} />}
            </g>
            <Ground />
            {tx[2] && <Label x={-175} y={-200} text={tx[2]} s={s} size={36} f={f} at={st[2]} />}
        </Stage>
    );
};

// balance: quality against cheap price (RA 12009, Ep. 13 T22). A scale; the peso price tag sits on the right pan and wins
// at first (the old lowest-bid rule). steps[0] = a solid road slab lands on the left pan · steps[1] = the beam tips to
// the slab and its label (text[0], "QUALITY") lands · steps[2] = the price label (text[1], "CHEAP PRICE") lands.
export const Balance: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], tx = (it.text || 'QUALITY|CHEAP PRICE').split('|');
    const slab = on(f, st[0]), land = act(f, st[0], 6), tip = act(f, st[1], 10);
    const sway = (on(f, st[1]) && tip >= 1 ? [0, 1.5, 0, -1.5][idle(f, 5, 4)] : [0, 1, 0, -1][idle(f, 6, 4)]);
    const ang = 13 - 26 * tip + sway, r = (ang * Math.PI) / 180, L = 290, PY0 = -430;
    const ex = (d: number) => d * L * Math.cos(r), ey = (d: number) => PY0 + d * L * Math.sin(r);
    const pan = (d: number, child: React.ReactNode) => (
        <g transform={`translate(${ex(d)} ${ey(d)})`}>
            <line x1={0} y1={0} x2={-110} y2={150} stroke={INK} strokeWidth={DW} /><line x1={0} y1={0} x2={110} y2={150} stroke={INK} strokeWidth={DW} />
            <g transform="translate(0 150)">{child}<Shape d="M-140 0 H140 L112 34 H-112 Z" fill={PAPER} plate={d < 0 ? MATCHA : STRAW} /></g>
        </g>
    );
    const fsL = Math.max(44, 40 / s);
    return (
        <Stage it={it} f={f}>
            {/* post + base */}
            <Shape d="M-150 0 H150 L110 -46 H-110 Z" fill={INK} />
            <rect x={-14} y={PY0} width={28} height={-PY0 - 40} fill={INK} />
            {/* beam */}
            <g transform={`translate(0 ${PY0}) rotate(${ang})`}>
                <rect x={-L - 16} y={-11 + PY} width={2 * L + 32} height={22} rx={8} fill={STRAW} transform={`translate(${PX} 0)`} />
                <rect x={-L - 16} y={-11} width={2 * L + 32} height={22} rx={8} fill={PAPER} stroke={INK} strokeWidth={SW} />
            </g>
            <circle cx={0} cy={PY0} r={26} fill={MATCHA} stroke={INK} strokeWidth={SW} />
            {/* left pan: the solid road slab (quality) */}
            {pan(-1, slab && <g transform={`translate(0 ${-70 * (1 - land)})`}>
                <Shape d={box(-112, -84, 224, 84, 8)} fill={MATCHA} />
                <rect x={-112} y={-84} width={224} height={26} fill={PAPER} stroke={INK} strokeWidth={DW} />
                {[-70, 0, 70].map((x) => <rect key={x} x={x - 22} y={-75} width={44} height={8} fill={INK} />)}
                {[0, 1, 2].map((q) => <line key={q} x1={-90} y1={-44 + q * 14} x2={90} y2={-44 + q * 14} stroke={INK} strokeWidth={3} strokeDasharray="14 10" />)}
            </g>)}
            {/* right pan: the peso price tag (cheap price) */}
            {pan(1, <g transform="translate(0 -4) rotate(-8)">
                <Shape d="M-70 -96 H40 L84 -52 L40 -8 H-70 Z" fill={STRAW} />
                <circle cx={44} cy={-52} r={9} fill={PAPER} stroke={INK} strokeWidth={DW} />
                <text x={-22} y={-32} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(58, 40 / s)} fill="#fff">₱</text>
            </g>)}
            {/* the tick on the winning side */}
            {tip >= 1 && <path d="M-330 -520 L-300 -490 L-240 -560" fill="none" stroke={MATCHA} strokeWidth={16} />}
            <Ground />
            {tx[0] && <Label x={-250} y={-640} text={tx[0]} s={s} f={f} at={st[1]} fill={MATCHA} />}
            {tx[1] && <Label x={190} y={-640} text={tx[1]} s={s} f={f} at={st[2]} />}
        </Stage>
    );
};

// ---------------------------------------------------------------------------------------------------------------------
// EP. 14 (fast food removed its playgrounds). Motif = THE CORNER of the restaurant where the playground stood.
// ---------------------------------------------------------------------------------------------------------------------

const Kid: React.FC<{ x: number; y?: number; h?: number; f: number; i?: number }> = ({ x, y = 0, h = 110, f, i = 0 }) =>
    <Person x={x} y={y - (idle(f + i * 3, 4) ? 10 : 0)} h={h} />;
// a small restaurant table with two stools
const Table: React.FC<{ x: number; s?: number }> = ({ x, s = 1 }) => (
    <g transform={`translate(${x} 0) scale(${s})`}>
        <rect x={-8} y={-84} width={16} height={84} fill={INK} /><Shape d={box(-70, -100, 140, 22, 6)} fill={PAPER} />
        <rect x={-104} y={-52} width={30} height={52} fill={INK} /><rect x={74} y={-52} width={30} height={52} fill={INK} />
    </g>
);
// corner: the playground corner. A slide and a ball pit with kids, against the restaurant wall.
// steps[0] = the slide is struck out · steps[1] = the ball pit is struck out · steps[2] = the whole playground is ripped
// out (the wall goes grey) · steps[3] = tables come in (n of them, default 6). h = frame a CLOSED tape goes across it.
// w = frame germs pop onto the playground (Ep. 14 T20, user: "add germs element here to emphasize that germs").
// text = "LABEL A|LABEL B": A lands with the rip-out (or with h when there is no rip-out), B with the tables.
// Use 9999 for a step that never happens and -1 for one that already has.
export const Corner: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), n = it.n || 6;
    const out = act(f, st[2], 10), gone = on(f, st[2]) && out >= 1, tab = on(f, st[3]);
    const lift = -640 * out, tape = it.h !== undefined && on(f, it.h);
    const X: React.FC<{ x: number; y: number; at?: number }> = ({ x, y, at }) => on(f, at) && !gone ? (
        <g transform={`translate(${x} ${y}) scale(${1.4 - 0.4 * act(f, at, 6)})`}>
            <line x1={-70} y1={-70} x2={70} y2={70} stroke={STRAW} strokeWidth={22} /><line x1={70} y1={-70} x2={-70} y2={70} stroke={STRAW} strokeWidth={22} />
        </g>) : null;
    return (
        <Stage it={it} f={f}>
            {/* the wall + floor of the corner: warm paper while the playground stands, a flat grey once it is gone */}
            <Shape d={box(-400, -560, 800, 560, 10)} fill={on(f, st[2]) ? '#b9b7ae' : PAPER} plate={on(f, st[2]) ? INK : MATCHA} />
            {!on(f, st[2]) && [0, 1, 2, 3, 4].map((i) => <rect key={i} x={-400 + i * 160 + 3} y={-557} width={80} height={554} fill={MATCHA} opacity={0.16} />)}
            {on(f, st[2]) && <rect x={-397} y={-557} width={794} height={554} fill="url(#kitht)" opacity={0.35} />}
            {/* the playground */}
            {!gone && <g transform={`translate(0 ${lift}) rotate(${-6 * out})`}>
                {/* slide: tower + chute */}
                <rect x={-330} y={-360} width={26} height={360} fill={INK} /><rect x={-190} y={-360} width={26} height={360} fill={INK} />
                <Shape d={box(-350, -400, 206, 50, 8)} fill={STRAW} plate={INK} />
                <path d="M-350 -400 L-247 -500 L-144 -400 Z" fill={MATCHA} stroke={INK} strokeWidth={SW} />
                <Shape d="M-150 -372 C-60 -372 -40 -40 110 -40 L110 0 C-60 0 -90 -322 -150 -322 Z" fill={STRAW} plate={MATCHA} />
                {[1, 2, 3, 4].map((i) => <line key={i} x1={-330} y1={-i * 70} x2={-164} y2={-i * 70} stroke={INK} strokeWidth={8} />)}
                <Kid x={-247} y={-400} h={96} f={f} />
                {/* ball pit */}
                <Shape d="M130 -150 H390 V0 H130 Z" fill={PAPER} plate={STRAW} />
                {Array.from({ length: 22 }, (_, i) => {
                    const bx = 152 + (i % 8) * 31 + (Math.floor(i / 8) % 2) * 14, by = -30 - Math.floor(i / 8) * 34 - (idle(f + i * 5, 5) ? 5 : 0);
                    return <circle key={i} cx={bx} cy={by} r={17} fill={[MATCHA, STRAW, PAPER][i % 3]} stroke={INK} strokeWidth={DW} />;
                })}
                <Kid x={215} y={-70} h={104} f={f} i={1} /><Kid x={320} y={-64} h={96} f={f} i={2} />
            </g>}
            <X x={-200} y={-250} at={st[0]} /><X x={260} y={-110} at={st[1]} />
            {/* germs (w = the frame they show up): spiky strawberry blobs popping onto the playground one by one, wobbling */}
            {it.w !== undefined && it.w > 1 && on(f, it.w) && !gone && [[-250, -470, 1.1], [-60, -330, 0.85], [150, -420, 1.25], [300, -250, 0.95], [-340, -180, 0.8], [40, -120, 1.0], [330, -470, 0.75]].map(([gx, gy, gk], i) => {
                const a0 = (it.w as number) + i * 4;
                if (!on(f, a0)) return null;
                const pop = 1.5 - 0.5 * act(f, a0, 6), wob = [0, 9, 0, -9][idle(f + i * 2, 4, 4)];
                return (
                    <g key={i} transform={`translate(${gx} ${gy + lift}) scale(${gk * pop}) rotate(${wob + i * 25})`}>
                        {Array.from({ length: 10 }, (_, q) => <g key={q} transform={`rotate(${q * 36})`}><line x1={0} y1={-44} x2={0} y2={-74} stroke={INK} strokeWidth={9} /><circle cx={0} cy={-78} r={11} fill={STRAW} stroke={INK} strokeWidth={DW} /></g>)}
                        <circle cx={PX * 0.6} cy={PY * 0.6} r={50} fill={INK} /><circle r={50} fill={STRAW} stroke={INK} strokeWidth={SW} />
                        <circle cx={-16} cy={-12} r={11} fill={PAPER} /><circle cx={18} cy={8} r={8} fill={MATCHA} /><circle cx={-6} cy={22} r={6} fill={PAPER} />
                    </g>
                );
            })}
            {/* the tape */}
            {tape && !gone && <g transform={`translate(0 ${lift}) rotate(-7)`}>
                <rect x={-420 * act(f, it.h, 8)} y={-250} width={840 * act(f, it.h, 8)} height={62} fill={STRAW} stroke={INK} strokeWidth={SW} />
                {act(f, it.h, 8) >= 1 && <text x={0} y={-204} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(46, 40 / s)} letterSpacing={10} fill="#fff">CLOSED  ·  CLOSED</text>}
            </g>}
            {/* the tables that replace it */}
            {tab && Array.from({ length: n }, (_, i) => {
                const a = (st[3] || 0) + i * 4;
                if (!on(f, a)) return null;
                const cols = Math.ceil(n / 2), row = Math.floor(i / cols), col = i % cols, k = 1.25 - 0.25 * act(f, a, 6);
                return <g key={i} transform={`translate(${-300 + col * (600 / Math.max(1, cols - 1))} ${row ? -8 : -250}) scale(${k})`}><Table x={0} s={row ? 1 : 0.82} /></g>;
            })}
            <Ground />
            {lab[0] && <Label x={0} y={-640} text={lab[0]} s={s} f={f} at={st[2] !== undefined && st[2] < 9000 ? st[2] : it.h} />}
            {lab[1] && <Label x={0} y={-640} text={lab[1]} s={s} fill={INK} f={f} at={st[3]} />}
        </Stage>
    );
};

// hook: the hook-and-drop. A fishing line with a toy on the hook; a family walks toward it.
// steps[0] = the family is hooked (pulled in under the line) · steps[1] = the toy is dropped (falls away, the family stays)
// text = "LABEL A|LABEL B": A lands with steps[0], B with steps[1].
export const Hook: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|');
    const bite = act(f, st[0], 10), drop = act(f, st[1], 10), sway = [0, 4, 0, -4][idle(f, 5, 4)] * (on(f, st[1]) ? 0 : 1);
    const fx = 330 - 250 * bite;
    return (
        <Stage it={it} f={f}>
            {/* the rod, from the counter of the chain */}
            <Shape d={box(-400, -210, 190, 210, 8)} fill={STRAW} plate={INK} />
            <rect x={-400} y={-250} width={210} height={44} fill={INK} />
            <path d="M-300 -230 Q-120 -640 60 -560" fill="none" stroke={INK} strokeWidth={12} />
            <line x1={60} y1={-560} x2={60 + sway} y2={-360} stroke={INK} strokeWidth={DW} />
            <path d={`M${60 + sway} -360 v60 a34 34 0 0 1 -68 0`} fill="none" stroke={INK} strokeWidth={10} />
            {/* the toy on the hook: a ball with a star, the fun */}
            <g transform={`translate(${26 + sway} ${-250 + 420 * drop}) rotate(${40 * drop})`} opacity={drop >= 1 ? 0 : 1}>
                <circle cx={PX} cy={PY} r={56} fill={STRAW} /><circle r={56} fill={MATCHA} stroke={INK} strokeWidth={SW} />
                <path d="M0 -30 L9 -9 L31 -9 L13 5 L20 27 L0 14 L-20 27 L-13 5 L-31 -9 L-9 -9 Z" fill={PAPER} stroke={INK} strokeWidth={DW} />
            </g>
            {/* the family */}
            <Person x={fx + 60} h={230} f={f} walk={!on(f, st[0]) || bite < 1} />
            <Person x={fx - 30} h={210} f={f} walk={!on(f, st[0]) || bite < 1} />
            <Kid x={fx - 110} h={120} f={f} />
            {on(f, st[0]) && bite >= 1 && !on(f, st[1]) && <path d={`M${fx - 110} -170 q20 -40 0 -60 q-20 20 0 60 Z`} fill={STRAW} stroke={INK} strokeWidth={DW} transform={`translate(0 ${idle(f, 4) ? -6 : 0})`} />}
            <Ground />
            {lab[0] && !on(f, st[1]) && <Label x={150} y={-690} text={lab[0]} s={s} f={f} at={st[0]} fill={MATCHA} />}
            {lab[1] && <Label x={150} y={-690} text={lab[1]} s={s} f={f} at={st[1]} />}
        </Stage>
    );
};

// target: "you were the target". A bullseye with a child at its centre and a gift beside them.
// steps[0] = the gift's tag flips to text[0] ("NOT FREE") · steps[1] = a heart pops over the child (falls for the brand) ·
// steps[2] = the child has grown into a paying adult, label text[1] ("CUSTOMER FOR LIFE").
export const Target: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|');
    const grow = act(f, st[2], 10), pulse = idle(f, 5) ? 1.03 : 1;
    return (
        <Stage it={it} f={f}>
            <g transform={`translate(-60 -330) scale(${pulse})`}>
                <circle cx={PX} cy={PY} r={300} fill={STRAW} />
                {[300, 215, 130].map((r, i) => <circle key={i} r={r} fill={[PAPER, STRAW, PAPER][i]} stroke={INK} strokeWidth={SW} />)}
            </g>
            <Person x={-60} y={-120} h={150 + 150 * grow} f={f} />
            {on(f, st[1]) && !on(f, st[2]) && <path d="M0 26 C-70 -30 -44 -84 0 -48 C44 -84 70 -30 0 26 Z" fill={STRAW} stroke={INK} strokeWidth={SW} transform={`translate(-60 ${-330 - (idle(f, 4) ? 8 : 0)}) scale(${1.5 - 0.5 * act(f, st[1], 6)})`} />}
            {on(f, st[2]) && <g transform={`translate(70 -260) scale(${1.4 - 0.4 * grow})`}><circle r={46} fill={PAPER} stroke={INK} strokeWidth={SW} /><text y={20} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(56, 40 / s)} fill={STRAW}>₱</text></g>}
            {/* the gift */}
            <g transform="translate(290 0)">
                <Shape d={box(-80, -130, 160, 130, 8)} fill={MATCHA} plate={STRAW} />
                <rect x={-14} y={-130} width={28} height={130} fill={PAPER} stroke={INK} strokeWidth={DW} /><rect x={-92} y={-160} width={184} height={40} rx={6} fill={PAPER} stroke={INK} strokeWidth={SW} />
                <path d="M0 -160 q-50 -60 -70 -20 q10 30 70 20 q50 -60 70 -20 q-10 30 -70 20" fill={STRAW} stroke={INK} strokeWidth={DW} />
            </g>
            <Ground />
            {lab[0] && <Label x={250} y={-260} text={lab[0]} s={s} f={f} at={st[0]} />}
            {lab[1] && <Label x={0} y={-700} text={lab[1]} s={s} fill={INK} f={f} at={st[2]} />}
        </Stage>
    );
};

// cafe: the Wi-Fi goes off and the comfortable chair becomes a hard stool.
// steps[0] = Wi-Fi struck off (label text[0]) · steps[1] = the armchair swaps to a stool (label text[1]).
export const Cafe: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || 'NO WI-FI|HARD CHAIRS').split('|');
    const off = on(f, st[0]), hard = on(f, st[1]), k = 1.2 - 0.2 * act(f, st[1], 6);
    return (
        <Stage it={it} f={f}>
            {/* the Wi-Fi sign */}
            <g transform="translate(-210 -330)">
                <Shape d={box(-150, -150, 300, 300, 24)} fill={PAPER} plate={off ? INK : MATCHA} />
                {[0, 1, 2].map((i) => <path key={i} d={`M${-100 + i * 30} ${-10 - i * 34} A${140 - i * 40} ${140 - i * 40} 0 0 1 ${100 - i * 30} ${-10 - i * 34}`} fill="none"
                    stroke={off ? '#9a988f' : MATCHA} strokeWidth={24} opacity={!off && idle(f, 6, 3) < i ? 0.25 : 1} />)}
                <circle cx={0} cy={80} r={22} fill={off ? '#9a988f' : MATCHA} />
                {off && <line x1={-120} y1={120} x2={120} y2={-120} stroke={STRAW} strokeWidth={26} strokeDasharray={`${340 * act(f, st[0], 6)} 340`} />}
            </g>
            {/* the seat */}
            <g transform={`translate(220 0) scale(${hard ? k : 1})`}>
                {!hard ? <g>
                    <Shape d={`${box(-130, -210, 260, 150, 30)} ${box(-150, -120, 60, 120, 20)} ${box(90, -120, 60, 120, 20)}`} fill={MATCHA} plate={STRAW} />
                    <Shape d={box(-96, -330, 192, 150, 40)} fill={MATCHA} />
                    <rect x={-100} y={-60} width={20} height={60} fill={INK} /><rect x={80} y={-60} width={20} height={60} fill={INK} />
                </g> : <g>
                    <Shape d={box(-90, -200, 180, 26, 6)} fill={PAPER} plate={STRAW} />
                    <line x1={-70} y1={-174} x2={-96} y2={0} stroke={INK} strokeWidth={14} /><line x1={70} y1={-174} x2={96} y2={0} stroke={INK} strokeWidth={14} />
                    <line x1={-84} y1={-70} x2={84} y2={-70} stroke={INK} strokeWidth={10} />
                </g>}
            </g>
            <Ground />
            {lab[0] && <Label x={-210} y={-560} text={lab[0]} s={s} f={f} at={st[0]} />}
            {lab[1] && <Label x={180} y={-420} text={lab[1]} s={s} fill={INK} f={f} at={st[1]} />}
        </Stage>
    );
};

// timer: a family at a table under a big stopwatch. The hand races (idle).
// steps[0] = the receipt lands, stamped text[0] ("PAID") · steps[1] = the family is moved out (slides off to the right) ·
// steps[2] = label text[1] ("15 MINUTES").
export const Timer: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || 'PAID|15 MINUTES').split('|');
    const go = act(f, st[1], 12), hand = two(f) * 7;
    return (
        <Stage it={it} f={f}>
            {/* the stopwatch */}
            <g transform="translate(-200 -400)">
                <rect x={-22} y={-236} width={44} height={50} rx={8} fill={INK} />
                <circle cx={PX} cy={PY} r={190} fill={STRAW} /><circle r={190} fill={PAPER} stroke={INK} strokeWidth={SW + 6} />
                {Array.from({ length: 12 }, (_, i) => <line key={i} x1={0} y1={-170} x2={0} y2={-146} stroke={INK} strokeWidth={8} transform={`rotate(${i * 30})`} />)}
                <path d="M0 0 L0 -170 A170 170 0 0 1 170 0 Z" fill={STRAW} opacity={0.9} />
                <line x1={0} y1={18} x2={0} y2={-150} stroke={INK} strokeWidth={12} transform={`rotate(${hand})`} /><circle r={16} fill={INK} />
            </g>
            {/* the family at its table */}
            <g transform={`translate(${200 + 520 * go} 0)`} opacity={go >= 1 ? 0 : 1}>
                <Table x={0} s={1.5} />
                <Person x={-150} h={240} f={f} /><Person x={150} h={220} f={f} /><Kid x={40} y={-150} h={90} f={f} />
            </g>
            {on(f, st[0]) && <g transform={`translate(200 ${-330 - 60 * (1 - act(f, st[0], 6))}) rotate(6)`}>
                <Shape d="M-70 -110 H70 V90 l-20 -16 l-20 16 l-20 -16 l-20 16 l-20 -16 l-20 16 l-20 -16 Z" fill={WHITE} plate={MATCHA} />
                {[0, 1, 2].map((q) => <line key={q} x1={-44} y1={-76 + q * 26} x2={44} y2={-76 + q * 26} stroke={INK} strokeWidth={DW} />)}
                <text x={0} y={52} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(40, 40 / s)} fill={STRAW}>{lab[0]}</text>
            </g>}
            <Ground />
            {lab[1] && <Label x={-200} y={-690} text={lab[1]} s={s} f={f} at={st[2]} />}
        </Stage>
    );
};

// shrink: the price goes up while the food gets smaller. A burger on a tray and its price tag.
// steps[0] = the price tag climbs (text[0] -> text[1]) · steps[1] = the burger shrinks · label text[2] with steps[1].
export const Shrink: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], tx = (it.text || '₱75|₱120|LESS FOOD').split('|');
    const up = act(f, st[0], 10), sm = 1 - 0.45 * act(f, st[1], 10), fs = Math.max(64, 40 / s);
    return (
        <Stage it={it} f={f}>
            <Shape d="M-390 -40 H110 L80 0 H-360 Z" fill={INK} />
            <g transform={`translate(-140 -40) scale(${sm})`}>
                <Shape d="M-170 -150 A170 130 0 0 1 170 -150 Z" fill={STRAW} plate={INK} />
                {[-90, -20, 60, 110].map((x, i) => <ellipse key={i} cx={x} cy={-220 - (i % 2) * 24} rx={10} ry={5} fill={PAPER} />)}
                <path d="M-180 -150 q30 30 60 0 q30 30 60 0 q30 30 60 0 q30 30 60 0 q30 30 60 0 q30 30 60 0 V-120 H-180 Z" fill={MATCHA} stroke={INK} strokeWidth={DW} />
                <Shape d={box(-170, -120, 340, 50, 18)} fill={INK} />
                <Shape d={box(-170, -70, 340, 70, 24)} fill={STRAW} />
            </g>
            {/* the price tag on its pole climbs */}
            <g transform={`translate(270 ${-140 - 330 * up})`}>
                <line x1={0} y1={0} x2={0} y2={140 + 330 * up} stroke={INK} strokeWidth={12} />
                <Shape d={box(-130, -110, 260, 120, 12)} fill={PAPER} plate={STRAW} />
                <text x={0} y={-28} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={fs} fill={STRAW}>{up > 0.5 ? tx[1] : tx[0]}</text>
                {on(f, st[0]) && <path d="M150 -20 v-80 m-26 30 l26 -32 l26 32" fill="none" stroke={STRAW} strokeWidth={14} transform={`translate(0 ${idle(f, 4) ? -8 : 0})`} />}
            </g>
            <Ground />
            {tx[2] && <Label x={-140} y={-420} text={tx[2]} s={s} fill={INK} f={f} at={st[1]} />}
        </Stage>
    );
};

// delivery: the order comes from a phone and leaves on a motorbike; nobody walks in.
// steps[0] = the order pings on the phone (text[0], "ORDER") · steps[1] = the rider leaves with the bag ·
// steps[2] = the family at the door is struck out, label text[1].
export const Delivery: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || 'ORDER|NO NEED TO WALK IN').split('|');
    const ride = act(f, st[1], 14), ping = on(f, st[0]);
    return (
        <Stage it={it} f={f}>
            {/* the phone */}
            <g transform="translate(-250 0)">
                <Shape d={box(-120, -470, 240, 470, 30)} fill={INK} plate={STRAW} />
                <rect x={-96} y={-430} width={192} height={380} rx={10} fill={PAPER} />
                {[0, 1, 2].map((i) => <rect key={i} x={-76} y={-400 + i * 70} width={152} height={50} rx={8} fill={i === 0 && ping ? MATCHA : '#d9cfb4'} stroke={INK} strokeWidth={DW} />)}
                {ping && <g transform={`translate(96 -430) scale(${1.5 - 0.5 * act(f, st[0], 6)})`}><circle r={44} fill={STRAW} stroke={INK} strokeWidth={SW} /><text y={18} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={52} fill="#fff">1</text></g>}
                <rect x={-76} y={-150} width={152} height={70} rx={10} fill={STRAW} stroke={INK} strokeWidth={DW} />
                <text x={0} y={-100} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(40, 40 / s)} fill="#fff">{lab[0]}</text>
            </g>
            {/* the rider */}
            <g transform={`translate(${130 + 520 * ride} ${idle(f, 3) ? -3 : 0})`} opacity={ride >= 1 ? 0 : 1}>
                <circle cx={-90} cy={-50} r={50} fill={PAPER} stroke={INK} strokeWidth={SW + 4} /><circle cx={110} cy={-50} r={50} fill={PAPER} stroke={INK} strokeWidth={SW + 4} />
                <Shape d="M-100 -60 L-30 -150 H70 L120 -60 H40 L10 -100 H-40 Z" fill={STRAW} plate={INK} />
                <Person x={0} y={-130} h={200} lean={8} />
                <Shape d={box(-150, -300, 120, 120, 10)} fill={MATCHA} plate={STRAW} />
            </g>
            {/* the family that no longer needs to come in */}
            <g transform="translate(330 0)" opacity={on(f, st[1]) && ride < 1 ? 0 : 1}>
                <Person x={-50} h={200} /><Person x={30} h={185} /><Kid x={-110} h={105} f={f} />
                {on(f, st[2]) && <g transform={`translate(-30 -110) scale(${1.4 - 0.4 * act(f, st[2], 6)})`}><line x1={-110} y1={-110} x2={110} y2={110} stroke={STRAW} strokeWidth={24} /><line x1={110} y1={-110} x2={-110} y2={110} stroke={STRAW} strokeWidth={24} /></g>}
            </g>
            <Ground />
            {lab[1] && <Label x={60} y={-600} text={lab[1]} s={s} f={f} at={st[2]} />}
        </Stage>
    );
};

// ---------------------------------------------------------------------------------------------------------------------
// EP. 15 (the everyday plastic habit). Motif = THE LABO BAG (a thin plastic bag with knotted handles).
// ---------------------------------------------------------------------------------------------------------------------

// a labo bag: translucent paper-white body, strawberry out of register, two knotted ears; `c` = something inside
const Labo: React.FC<{ x: number; y: number; k?: number; r?: number; fill?: string; children?: React.ReactNode }> = ({ x, y, k = 1, r = 0, fill = WHITE, children }) => (
    <g transform={`translate(${x} ${y}) scale(${k}) rotate(${r})`}>
        <path d="M-70 -150 C-110 -60 -100 0 -60 0 H60 C100 0 110 -60 70 -150 Z" fill={STRAW} transform={`translate(${PX} ${PY})`} />
        {children}
        <path d="M-70 -150 C-110 -60 -100 0 -60 0 H60 C100 0 110 -60 70 -150 Z" fill={fill} fillOpacity={0.72} stroke={INK} strokeWidth={SW} />
        <path d="M-70 -150 q-30 -50 4 -70 q20 30 20 70 M70 -150 q30 -50 -4 -70 q-20 30 -20 70" fill={fill} stroke={INK} strokeWidth={SW} />
        <path d="M-46 -150 H46" stroke={INK} strokeWidth={DW} />
    </g>
);
const Egg: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}><path d="M0 -92 C52 -92 70 -30 70 -8 A70 60 0 0 1 -70 -8 C-70 -30 -52 -92 0 -92 Z" fill={PAPER} stroke={INK} strokeWidth={SW} />
        <path d="M-40 -30 q10 -30 34 -40" fill="none" stroke={WHITE} strokeWidth={8} /></g>
);
// sari: the sari-sari store counter. The seller inside the grille, the buyer outside, one egg on the counter.
// steps[0] = the egg is set on the counter · steps[1] = the seller bags it (a labo bag closes round it) ·
// steps[2] = the buyer takes the bag. n = people queueing behind the buyer (they shuffle: the idle loop).
// w = 1: the buyer already carries a tote bag. text = "LABEL A|LABEL B": A with steps[1], B with steps[2].
export const Sari: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), q = it.n || 0;
    const bagged = act(f, st[1], 8), take = act(f, st[2], 10);
    const ex = 60 + 150 * take, ey = -268 + 60 * take;
    return (
        <Stage it={it} f={f}>
            {/* the store: roof, sign board, grille window, counter */}
            <path d="M-420 -520 L-360 -600 H130 L190 -520 Z" fill={STRAW} stroke={INK} strokeWidth={SW} />
            <Shape d={box(-390, -520, 550, 520, 6)} fill={PAPER} plate={MATCHA} />
            <rect x={-340} y={-470} width={450} height={210} fill={INK} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={-340 + i * 64} y1={-470} x2={-340 + i * 64} y2={-260} stroke={PAPER} strokeWidth={DW} />)}
            {[0, 1].map((i) => <line key={i} x1={-340} y1={-400 + i * 70} x2={110} y2={-400 + i * 70} stroke={PAPER} strokeWidth={DW} />)}
            {/* hanging sachet strips (tingi) */}
            {[0, 1, 2, 3, 4].map((i) => <g key={i} transform={`translate(${-300 + i * 90} -470) rotate(${[2, -2][idle(f + i * 3, 6)]})`}>
                {[0, 1, 2].map((j) => <rect key={j} x={-18} y={j * 44} width={36} height={40} fill={[STRAW, MATCHA, WHITE][(i + j) % 3]} stroke={INK} strokeWidth={3} />)}</g>)}
            <Person x={-120} y={-250} h={190} />
            <Shape d={box(-400, -260, 620, 40, 6)} fill={MATCHA} />
            {/* the egg, then the bag round it */}
            {on(f, st[0]) && <g transform={`translate(${ex} ${ey})`}>
                <Egg x={0} y={0} k={0.62 * (1.3 - 0.3 * act(f, st[0], 6))} />
                {on(f, st[1]) && <Labo x={0} y={14} k={0.62 * (1.5 - 0.5 * bagged)} />}
            </g>}
            {/* the buyer + the queue */}
            <Person x={300} h={300} lean={-3} />
            {it.w === 1 && <g transform="translate(372 -150)"><Shape d={box(-44, 0, 88, 100, 8)} fill={MATCHA} plate={STRAW} /><path d="M-26 0 q26 -70 52 0" fill="none" stroke={INK} strokeWidth={SW} /></g>}
            {Array.from({ length: q }, (_, i) => <Person key={i} x={385 + i * 62 - (idle(f, 6) ? 6 : 0)} h={270 - i * 14} />)}
            <Ground />
            {lab[0] && !on(f, st[2]) && <Label x={0} y={-680} text={lab[0]} s={s} f={f} at={st[1]} />}
            {lab[1] && <Label x={0} y={-680} text={lab[1]} s={s} fill={INK} f={f} at={st[2]} />}
        </Stage>
    );
};

// oneitem: one small item, big. n = 0: an egg, then a labo bag closes over it (steps[0]) and the label text[0] lands;
// n = 1: an open hand holds the egg (steps[0] = the bag beside it is struck out, label text[0]);
// n = 2: your own tote bag: the egg drops into it (steps[0]), label text[0].
export const OneItem: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), m = it.n || 0;
    const a = act(f, st[0], 8), bob = idle(f, 5) ? -6 : 0;
    return (
        <Stage it={it} f={f}>
            {m === 0 && <g>
                <Egg x={0} y={-150 + bob} k={2.3} />
                {on(f, st[0]) && <Labo x={0} y={0} k={2.5 * (1.3 - 0.3 * a)} />}
            </g>}
            {m === 1 && <g>
                <Shape d="M-230 -40 C-230 -150 -130 -190 -10 -190 H130 C210 -190 250 -150 250 -110 C250 -60 200 -30 120 -30 H-60 C-120 -30 -150 0 -230 0 Z" fill={STRAW} plate={INK} />
                {[0, 1, 2, 3].map((i) => <path key={i} d={`M${-60 + i * 70} -190 v-70 a26 26 0 0 1 52 0 v70`} fill={STRAW} stroke={INK} strokeWidth={SW} />)}
                <Egg x={40} y={-250 + bob} k={1.7} />
                <g transform="translate(-290 -330)"><Labo x={0} y={0} k={1.1} r={-8} />
                    {on(f, st[0]) && <g transform={`translate(0 -90) scale(${1.4 - 0.4 * a})`}><line x1={-90} y1={-90} x2={90} y2={90} stroke={STRAW} strokeWidth={24} /><line x1={90} y1={-90} x2={-90} y2={90} stroke={STRAW} strokeWidth={24} /></g>}</g>
            </g>}
            {m === 2 && <g>
                <path d="M-110 -360 q110 -260 220 0" fill="none" stroke={INK} strokeWidth={22} />
                <Shape d="M-230 -380 H230 L200 0 H-200 Z" fill={MATCHA} plate={STRAW} />
                <path d="M-150 -300 H150" stroke={PAPER} strokeWidth={10} strokeDasharray="26 18" />
                <Egg x={0} y={on(f, st[0]) ? -420 + 150 * a + bob : -640 + bob} k={1.1} />
                <Shape d={box(250, -150, 150, 150, 26)} fill={STRAW} plate={INK} /><path d="M270 -110 H380" stroke={PAPER} strokeWidth={8} strokeDasharray="14 10" />
            </g>}
            <Ground />
            {lab[0] && <Label x={0} y={m === 2 ? -730 : -640} text={lab[0]} s={s} f={f} at={st[0]} fill={m === 0 ? STRAW : MATCHA} />}
        </Stage>
    );
};

// bags: the count. A sheet that fills with rows of small labo bags.
// steps[0] = the first block lands (label text[0]) · steps[1] = the second block (label text[1]) · steps[2] = the total (text[2]).
// n = 1: totes instead of labo bags (the small choices), one block only.
export const Bags: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), tote = it.n === 1;
    const cols = 10, rows = 6;
    const cell = (i: number, fill: string) => {
        const c = i % cols, r = Math.floor(i / cols), x = -360 + c * 80, y = -430 + r * 78 + (idle(f + c * 3, 6) ? -4 : 0);
        return tote
            ? <g key={i} transform={`translate(${x} ${y})`}><path d="M-12 -30 q12 -30 24 0" fill="none" stroke={INK} strokeWidth={5} /><rect x={-24} y={-30} width={48} height={44} rx={5} fill={fill} stroke={INK} strokeWidth={DW} /></g>
            : <g key={i} transform={`translate(${x} ${y}) scale(0.32)`}><path d="M-70 -150 C-110 -60 -100 0 -60 0 H60 C100 0 110 -60 70 -150 Z M-70 -150 q-30 -50 4 -70 q20 30 20 70 M70 -150 q30 -50 -4 -70 q-20 30 -20 70" fill={fill} stroke={INK} strokeWidth={DW / 0.32} /></g>;
    };
    const n1 = on(f, st[0]) ? Math.min(30, Math.floor(two(f - st[0]) / 1) + 2) : 0, n2 = on(f, st[1]) ? Math.min(30, Math.floor(two(f - st[1]) / 1) + 2) : 0;
    return (
        <Stage it={it} f={f}>
            <Shape d={box(-410, -500, 820, 500, 10)} fill={PAPER} plate={STRAW} />
            {Array.from({ length: n1 }, (_, i) => cell(i, tote ? MATCHA : WHITE))}
            {Array.from({ length: n2 }, (_, i) => cell(30 + i, STRAW))}
            <Ground />
            {lab[0] && !on(f, st[2]) && <Label x={-180} y={-590} text={lab[0]} s={s} fill={INK} f={f} at={st[0]} />}
            {lab[1] && !on(f, st[2]) && <Label x={200} y={-590 - Math.max(44, 40 / s) * 2.25} text={lab[1]} s={s} f={f} at={st[1]} />}
            {lab[2] && <Label x={0} y={-590} text={lab[2]} s={s} f={f} at={st[2]} />}
        </Stage>
    );
};

// river: a thin bag is refused by the recycling bin and ends in the water.
// steps[0] = the bin spits the bag back out (X, label text[0]) · steps[1] = bags drift down the river ·
// steps[2] = they reach the sea (label text[1]).
export const River: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|');
    const rej = act(f, st[0], 8), flow = on(f, st[1]) ? two(f - (st[1] || 0)) : -1, wave = idle(f, 5) ? 8 : 0;
    return (
        <Stage it={it} f={f}>
            {/* the water: river from the left into the sea on the right */}
            <path d={`M-410 -150 C-250 ${-190 + wave} -120 ${-110 - wave} 40 -150 C120 -170 180 -230 410 -230 V0 H-410 Z`} fill={MATCHA} stroke={INK} strokeWidth={SW} />
            {[0, 1, 2].map((i) => <path key={i} d={`M${-360 + i * 250} ${-90 + i * 8} q40 ${-24 + wave} 80 0 q40 ${24 - wave} 80 0`} fill="none" stroke={PAPER} strokeWidth={DW + 2} />)}
            {/* the recycling bin on the bank */}
            <g transform="translate(-270 -168)">
                <Shape d="M-90 -230 H90 L70 0 H-70 Z" fill={PAPER} plate={STRAW} />
                <rect x={-104} y={-262} width={208} height={36} rx={8} fill={INK} />
                <path d="M0 -170 l34 56 h-68 Z M-46 -70 l34 -56 M46 -70 l-34 -56" fill="none" stroke={MATCHA} strokeWidth={12} />
                {on(f, st[0]) && <g transform={`translate(0 -120) scale(${1.4 - 0.4 * rej})`}><line x1={-80} y1={-80} x2={80} y2={80} stroke={STRAW} strokeWidth={22} /><line x1={80} y1={-80} x2={-80} y2={80} stroke={STRAW} strokeWidth={22} /></g>}
            </g>
            {/* the bag: over the bin, then thrown back, then many drifting */}
            {!on(f, st[1]) && <Labo x={-270 + 150 * rej} y={-470 + 250 * rej + (idle(f, 4) ? -8 : 0)} k={0.8} r={-10 + 40 * rej} />}
            {flow >= 0 && [0, 1, 2, 3, 4].map((i) => {
                const p = cl((flow - i * 10) / 70), x = -330 + 700 * p, y = -120 - 70 * p + (idle(f + i * 2, 4) ? -8 : 0);
                return flow >= i * 10 ? <Labo key={i} x={x} y={y} k={0.5} r={[-20, 14, -8, 24, 6][i]} /> : null;
            })}
            <Ground />
            {lab[0] && !on(f, st[2]) && <Label x={-150} y={-600} text={lab[0]} s={s} f={f} at={st[0]} />}
            {lab[1] && <Label x={100} y={-600} text={lab[1]} s={s} fill={INK} f={f} at={st[2]} />}
        </Stage>
    );
};

// eprlaw: who the law covers. A big company building and a small sari-sari store, the law's page between them.
// steps[0] = the target (text[0], "80% BY 2028") is stamped on the company · steps[1] = the small store gets its tag
// (text[1], "NO TARGET") · steps[2] = label text[2] ("NO NATIONWIDE BAN").
export const EprLaw: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], tx = (it.text || '80% BY 2028|NO TARGET|NO NATIONWIDE BAN').split('|');
    const fs = Math.max(42, 40 / s), smoke = idle(f, 5);
    return (
        <Stage it={it} f={f}>
            {/* the big company */}
            <g transform="translate(-220 0)">
                <Shape d={box(-170, -430, 340, 430, 6)} fill={INK} plate={STRAW} />
                {Array.from({ length: 12 }, (_, i) => <rect key={i} x={-130 + (i % 3) * 96} y={-390 + Math.floor(i / 3) * 86} width={64} height={52} fill={PAPER} />)}
                <rect x={70} y={-540} width={56} height={110} fill={INK} /><circle cx={98 + smoke * 10} cy={-580 - smoke * 14} r={30} fill="url(#kitht)" />
                <rect x={-40} y={-80} width={80} height={80} fill={STRAW} />
                {on(f, st[0]) && <g transform={`translate(0 -130) rotate(-8) scale(${1.5 - 0.5 * act(f, st[0], 6)})`}>
                    <rect x={-(tx[0].length * fs * 0.4 + 30)} y={-fs * 0.85} width={tx[0].length * fs * 0.8 + 60} height={fs * 1.7} fill={MATCHA} stroke={INK} strokeWidth={SW} />
                    <text x={0} y={fs * 0.36} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={fs} letterSpacing={2} fill="#fff">{tx[0]}</text></g>}
            </g>
            {/* the small store */}
            <g transform="translate(250 0)">
                <path d="M-150 -210 L-110 -270 H110 L150 -210 Z" fill={STRAW} stroke={INK} strokeWidth={SW} />
                <Shape d={box(-130, -210, 260, 210, 6)} fill={PAPER} plate={MATCHA} />
                <rect x={-100} y={-180} width={200} height={90} fill={INK} />{[0, 1, 2, 3].map((i) => <line key={i} x1={-100 + i * 66} y1={-180} x2={-100 + i * 66} y2={-90} stroke={PAPER} strokeWidth={DW} />)}
                <Labo x={0} y={-10} k={0.42} />
                {on(f, st[1]) && <g transform={`translate(0 -330) rotate(6) scale(${1.5 - 0.5 * act(f, st[1], 6)})`}>
                    <rect x={-(tx[1].length * fs * 0.4 + 30)} y={-fs * 0.85} width={tx[1].length * fs * 0.8 + 60} height={fs * 1.7} fill={STRAW} stroke={INK} strokeWidth={SW} />
                    <text x={0} y={fs * 0.36} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={fs} letterSpacing={2} fill="#fff">{tx[1]}</text></g>}
            </g>
            <Ground />
            {tx[2] && <Label x={0} y={-680} text={tx[2]} s={s} fill={INK} f={f} at={st[2]} />}
        </Stage>
    );
};

// mall: only the big mall's parking lot gets cleaned; the street corner is left out; both drain to the same place.
// steps[0] = the mall lot is swept clean (its litter goes) · steps[1] = the street corner keeps its litter, label text[0] ·

// ---------------------------------------------------------------------------------------------------------------------
// EP. 17 (road reblocking before the election ban). Classroom = the "student who did nothing all semester" comparison.
// ---------------------------------------------------------------------------------------------------------------------

// classroom: a bare class wall, a child at the foreground, a door on the right.
// steps[0] = posters get taped up one by one, one every 2 frames, up to n (default 20) in a 5 x 4 grid
// steps[1] = the teacher walks in through the door · steps[2] = the stamp (text[0], "BUSY") lands on the wall.
export const Classroom: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), n = it.n === undefined ? 20 : it.n;
    const up = st[0] === undefined || f < st[0] ? 0 : Math.min(n, Math.floor(two(f - st[0]) / 2) + 1);
    const walk = on(f, st[1]) ? act(f, st[1], 14) : 0;
    return (
        <Stage it={it} f={f}>
            {/* the wall and the door */}
            <Shape d={box(-380, -480, 760, 390, 10)} fill={PAPER} plate={MATCHA} />
            <Shape d={box(330, -300, 90, 210, 6)} fill={MATCHA} />
            {/* posters: 5 columns x 4 rows, taped on one after another */}
            {Array.from({ length: up }, (_, i) => {
                const col = i % 5, row = Math.floor(i / 5), x = -327 + col * 134, y = -460 + row * 80, land = Math.max(0, 1 - ez(two(f - (st[0] || 0) - i * 2) / 6));
                return <g key={i} transform={`translate(${x} ${y - land * 14})`}>
                    <rect x={0} y={0} width={118} height={66} fill={i % 3 === 0 ? STRAW : i % 3 === 1 ? MATCHA : WHITE} stroke={INK} strokeWidth={DW} />
                    <rect x={43} y={-8} width={32} height={14} fill={INK} opacity={0.85} />
                </g>;
            })}
            {/* the child, the only thing in the room before the rush */}
            <Person x={-300} h={150} f={f} />
            {/* the teacher walks in from the door */}
            {on(f, st[1]) && <Person x={430 - walk * 120} h={190} f={f} walk={walk < 1} sash />}
            {on(f, st[2]) && lab[0] && <Label x={0} y={-290} text={lab[0]} s={s} size={84} f={f} at={st[2]} />}
            <Ground />
        </Stage>
    );
};

// steps[2] = the corner's litter slides into the drain between them, label text[1].
export const Mall: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || 'LEFT OUT OF THE RULE|THE SAME DRAIN').split('|');
    const clean = act(f, st[0], 10), drain = act(f, st[2], 14), sweep = idle(f, 4) ? 10 : -10;
    const litter = (x0: number, n: number, gone: number, to?: number) => Array.from({ length: n }, (_, i) => {
        const x = x0 + i * 46 + (rnd(i + x0) - 0.5) * 20, tx2 = to === undefined ? x : x + (to - x) * drain, y = to === undefined ? -14 : -14 + 40 * drain;
        return <g key={i} opacity={gone >= 1 || (to !== undefined && drain >= 1) ? 0 : 1} transform={`translate(${tx2 + (to === undefined ? -80 * gone : 0)} ${y}) rotate(${rnd(i) * 60 - 30})`}><Labo x={0} y={0} k={0.22} /></g>;
    });
    return (
        <Stage it={it} f={f}>
            {/* the mall */}
            <g transform="translate(-235 0)">
                <Shape d={box(-170, -400, 340, 300, 8)} fill={PAPER} plate={MATCHA} />
                <rect x={-170} y={-400} width={340} height={70} fill={MATCHA} stroke={INK} strokeWidth={SW} />
                <text x={0} y={-350} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={Math.max(44, 40 / s)} letterSpacing={6} fill="#fff">MALL</text>
                {[0, 1, 2].map((i) => <rect key={i} x={-130 + i * 96} y={-290} width={68} height={130} fill={INK} />)}
                <rect x={-170} y={-100} width={340} height={100} fill="#d9cfb4" stroke={INK} strokeWidth={SW} />
                {[0, 1, 2, 3].map((i) => <line key={i} x1={-120 + i * 80} y1={-100} x2={-120 + i * 80} y2={-20} stroke={INK} strokeWidth={DW} />)}
                {litter(-130, 6, clean)}
                {on(f, st[0]) && clean < 1 && <g transform={`translate(${-150 + 300 * clean} -20) rotate(${sweep})`}><line x1={0} y1={-150} x2={0} y2={0} stroke={INK} strokeWidth={10} /><path d="M-36 0 H36 L50 34 H-50 Z" fill={STRAW} stroke={INK} strokeWidth={DW} /></g>}
            </g>
            {/* the drain */}
            <g transform="translate(15 0)"><rect x={-44} y={-10} width={88} height={34} rx={6} fill={INK} />{[0, 1, 2].map((i) => <line key={i} x1={-26 + i * 26} y1={-4} x2={-26 + i * 26} y2={18} stroke={PAPER} strokeWidth={5} />)}</g>
            {/* the street corner */}
            <g transform="translate(250 0)">
                <Shape d={box(-110, -250, 220, 250, 6)} fill={PAPER} plate={STRAW} />
                <path d="M-130 -250 L-95 -300 H95 L130 -250 Z" fill={STRAW} stroke={INK} strokeWidth={SW} />
                <rect x={-80} y={-210} width={160} height={90} fill={INK} />
                <rect x={130} y={-330} width={12} height={330} fill={INK} /><Shape d={box(96, -390, 80, 70, 8)} fill={MATCHA} />
            </g>
            {litter(120, 6, 0, 15)}
            <Ground />
            {lab[0] && !on(f, st[2]) && <Label x={250} y={-500} text={lab[0]} s={s} f={f} at={st[1]} />}
            {lab[1] && <Label x={0} y={-560} text={lab[1]} s={s} fill={INK} f={f} at={st[2]} />}
        </Stage>
    );
};

// ---------------------------------------------------------------------------------------------------------------------
// EP. 16 (utang na loob). Motif = THE FAVOR: a gift box that changes state, and the LISTA that keeps the count.
// ---------------------------------------------------------------------------------------------------------------------
const Gift: React.FC<{ x: number; y: number; k?: number; fill?: string; ribbon?: string; r?: number }> = ({ x, y, k = 1, fill = MATCHA, ribbon = PAPER, r = 0 }) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
        <Shape d={box(-62, -92, 124, 92, 8)} fill={fill} plate={STRAW} />
        <rect x={-68} y={-112} width={136} height={26} rx={8} fill={fill} stroke={INK} strokeWidth={DW} />
        <rect x={-11} y={-112} width={22} height={112} fill={ribbon} stroke={INK} strokeWidth={DW} />
        <path d="M0 -112 q-46 -58 -58 -12 q34 22 58 12 q24 10 58 -12 q-12 -46 -58 12" fill={ribbon} stroke={INK} strokeWidth={DW} />
    </g>
);
const Arm: React.FC<{ x1: number; y1: number; x2: number; y2: number; open?: boolean }> = ({ x1, y1, x2, y2, open }) => (
    <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={16} /><circle cx={x2} cy={y2} r={open ? 20 : 15} fill={INK} /></g>
);

const Heart: React.FC<{ x: number; y: number; k?: number; fill?: string; broken?: boolean }> = ({ x, y, k = 1, fill = MATCHA, broken }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M0 40 C-70 -10 -50 -60 -22 -60 C-8 -60 0 -48 0 -40 C0 -48 8 -60 22 -60 C50 -60 70 -10 0 40 Z" fill={fill} stroke={INK} strokeWidth={DW / k} />
        {broken && <path d="M-4 -52 L10 -22 L-10 0 L6 40" fill="none" stroke={INK} strokeWidth={DW / k} />}
    </g>
);
// sweat drops running off a head (on twos), `at` = the frame they start
const Sweat: React.FC<{ x: number; y: number; f: number; at?: number; k?: number }> = ({ x, y, f, at, k = 1 }) => {
    if (!on(f, at)) return null;
    const t = two(f - (at as number));
    return <g transform={`translate(${x} ${y}) scale(${k})`}>{[-1, 1, 0].map((d, i) => {
        const p = ((t + i * 7) % 20) / 20;
        return <path key={i} d="M0 -16 C12 2 12 14 0 14 C-12 14 -12 2 0 -16 Z" fill={PAPER} stroke={INK} strokeWidth={DW} transform={`translate(${d * (34 + 10 * p)} ${-6 + 52 * p})`} opacity={1 - 0.5 * p} />;
    })}</g>;
};
// stress lines round a head
const Stress: React.FC<{ x: number; y: number; f: number; at?: number; k?: number }> = ({ x, y, f, at, k = 1 }) => {
    if (!on(f, at)) return null;
    const j = idle(f, 4) ? 4 : 0;
    return <g transform={`translate(${x} ${y}) scale(${k})`} stroke={STRAW} strokeWidth={8} fill="none">
        <path d={`M-52 ${-18 - j} l-22 -14 M-56 ${6 + j} l-28 2 M52 ${-18 - j} l22 -14 M56 ${6 + j} l28 2`} /></g>;
};

// favor: n = 0 a gift is handed over, then its ribbon turns into a string the giver holds (gratitude -> leverage);
// n = 1 the gift grows heavy on one person and the string coils round them (the trap); n = 2 a real gift: it leaves the open
// hand and the hand stays empty, no string; n = 3 a scoreboard over the hand-over is struck out (no scoreboard);
// n = 4 a sari-sari window hands out a free snack, then a string tightens (the lista is next).
// steps[0] = the gift moves / lands · steps[1] = the string appears. text = "LABEL A|LABEL B": A with steps[0], B with steps[1].
export const Favor: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), m = it.n || 0;
    const give = act(f, st[0], 10), tie = act(f, st[1], 8), bob = idle(f, 5) ? -5 : 0, hop = Math.sin(Math.PI * give);
    const GX = -300, RX = 250;
    const gx = GX + 90 + (RX - GX - 150) * give, gy = -190 - 70 * hop;
    const strawLab = on(f, st[1]);
    return (
        <Stage it={it} f={f}>
            {m === 0 && <g>
                <Person x={GX} h={340} sash />
                <Person x={RX} h={310} lean={-5 * tie} />
                <Arm x1={GX + 24} y1={-250} x2={GX + 96} y2={-200} open={give < 1} />
                {on(f, st[1]) && <path d={`M${GX + 96} -200 Q${(GX + gx) / 2} ${-90 + 60 * tie} ${gx} ${gy + 40}`} fill="none" stroke={STRAW} strokeWidth={10} />}
                <Gift x={gx} y={gy + bob * (give >= 1 ? 1 : 0)} k={1.35} fill={strawLab ? STRAW : MATCHA} />
                <Ground />
                {give >= 1 && !strawLab && <Heart x={RX} y={-420 + bob} k={1.05} />}
                {strawLab && <g><Heart x={RX} y={-420} k={1.05} fill={STRAW} broken /><Sweat x={RX + 6} y={-300} f={f} at={st[1]} /><Stress x={RX} y={-300} f={f} at={st[1]} /></g>}
                {lab[0] && !strawLab && <Label x={0} y={-560} text={lab[0]} s={s} fill={MATCHA} f={f} at={st[0]} />}
                {lab[1] && <Label x={0} y={-560} text={lab[1]} s={s} f={f} at={st[1]} />}
            </g>}
            {m === 1 && <g>
                <Person x={-30 + (on(f, st[1]) && idle(f, 4) ? 4 : 0)} h={330} lean={-4 * give - 3 * tie} />
                <Gift x={-30} y={-368 + 8 * (1 - give) + bob} k={1.1 + 1.1 * give} fill={strawLab ? STRAW : MATCHA} />
                {on(f, st[1]) && [0, 1, 2].map((i) => <ellipse key={i} cx={-30} cy={-200 + i * 40} rx={50 - 6 * tie} ry={14} fill="none" stroke={STRAW} strokeWidth={10} transform={`rotate(${[-6, 5, -4][i]} -30 ${-200 + i * 40})`} />)}
                <Ground />
                <Sweat x={-30} y={-262} f={f} at={st[0]} k={1.1} />
                <Stress x={-30} y={-262} f={f} at={st[1]} />
                {lab[0] && !strawLab && <Label x={0} y={-700} text={lab[0]} s={s} fill={MATCHA} f={f} at={st[0]} />}
                {lab[1] && <Label x={0} y={-700} text={lab[1]} s={s} f={f} at={st[1]} />}
            </g>}
            {m === 2 && <g>
                <Person x={GX} h={340} />
                <Person x={RX} h={310} />
                <Arm x1={GX + 24} y1={-250} x2={give < 1 ? GX + 96 : GX + 150} y2={give < 1 ? -200 : -250} open />
                <Gift x={gx} y={gy} k={1.35} />
                {give >= 1 && <g transform="translate(150 -430)"><path d="M-40 0 l26 28 l56 -64" fill="none" stroke={MATCHA} strokeWidth={22} /></g>}
                <Ground />
                {give >= 1 && <g><Heart x={RX} y={-420 + bob} k={1.05} /><Heart x={GX} y={-440 + bob * -1} k={0.6} /></g>}
                {lab[0] && <Label x={0} y={-600} text={lab[0]} s={s} fill={MATCHA} f={f} at={st[0]} />}
            </g>}
            {m === 3 && <g>
                <Shape d={box(-300, -620, 600, 300, 12)} fill={INK} plate={STRAW} />
                {[-150, 150].map((x, i) => <text key={i} x={x} y={-430} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={180} fill={PAPER}>{i ? '0' : '0'}</text>)}
                <rect x={-14} y={-500} width={28} height={28} fill={PAPER} />
                {on(f, st[0]) && <g><line x1={-300} y1={-640 + 40 * act(f, st[0], 6)} x2={300} y2={-300 - 40 * act(f, st[0], 6)} stroke={STRAW} strokeWidth={26} /><line x1={300} y1={-640} x2={-300} y2={-300} stroke={STRAW} strokeWidth={26} opacity={act(f, st[0], 8)} /></g>}
                <Person x={GX + 60} h={250} />
                <Person x={RX + 60} h={230} />
                <Gift x={-20} y={-6 + bob} k={1} />
                <Ground />
                {on(f, st[0]) && <g><Heart x={GX + 60} y={-330 + bob} k={0.55} /><Heart x={RX + 60} y={-310 - bob} k={0.55} /></g>}
                {lab[0] && <Label x={0} y={-710} text={lab[0]} s={s} f={f} at={st[0]} />}
            </g>}
            {m === 4 && <g>
                <path d="M-420 -520 L-360 -600 H130 L190 -520 Z" fill={STRAW} stroke={INK} strokeWidth={SW} />
                <Shape d={box(-390, -520, 550, 520, 6)} fill={PAPER} plate={MATCHA} />
                <rect x={-340} y={-470} width={450} height={210} fill={INK} />
                <Person x={-120} y={-250} h={190} />
                <Shape d={box(-400, -260, 620, 40, 6)} fill={MATCHA} />
                <g transform={`translate(${60 + 190 * give} ${-300 + 20 * give})`}><Shape d={box(-44, -64, 88, 100, 8)} fill={WHITE} plate={STRAW} /><rect x={-44} y={-34} width={88} height={22} fill={MATCHA} /></g>
                <Person x={300} h={300} lean={-3 * (1 - tie)} />
                {on(f, st[1]) && <path d={`M${60 + 190 * give} -290 Q150 ${-150 + 40 * tie} -120 -250`} fill="none" stroke={STRAW} strokeWidth={10} />}
                <Ground />
                {give >= 1 && !strawLab && <Heart x={300} y={-390 + bob} k={0.9} />}
                {strawLab && <g><Heart x={300} y={-390} k={0.9} fill={STRAW} broken /><Sweat x={304} y={-290} f={f} at={st[1]} /></g>}
                {lab[0] && !strawLab && <Label x={0} y={-680} text={lab[0]} s={s} fill={MATCHA} f={f} at={st[0]} />}
                {lab[1] && <Label x={0} y={-680} text={lab[1]} s={s} f={f} at={st[1]} />}
            </g>}
        </Stage>
    );
};

// lista: a sari-sari lista notebook. text = the rows, "ROW A|ROW B|..." (a row starting with ! is strawberry). Row i is written
// on steps[i] (typed on twos). n = 1: the last row is circled with the pen (steps[rows]); n = 2: the first row is struck out
// (steps[rows]).
export const Lista: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], rows = (it.text || '').split('|').filter(Boolean), m = it.n || 0;
    const fs = Math.max(56, 40 / s), gap = 104, pageH = Math.max(360, Math.min(560, 150 + rows.length * gap)), top = -pageH + 48 + 56;
    const strike = m === 2 ? act(f, st[rows.length], 8) : 0;
    let pen: React.ReactNode = null;
    const lines = rows.map((raw, i) => {
        const hot = raw.startsWith('!'), tx = hot ? raw.slice(1) : raw, a = st[i];
        if (!on(f, a)) return null;
        const n = Math.min(tx.length, Math.floor(two(f - (a as number)) * 1.1) + 1), y = top + 40 + i * gap;
        if (n < tx.length) pen = <g transform={`translate(${-330 + n * fs * 0.62} ${y - 6 + (idle(f, 4) ? -4 : 0)}) rotate(40)`}><rect x={0} y={-8} width={70} height={16} fill={STRAW} stroke={INK} strokeWidth={DW} /></g>;
        return (
            <g key={i}>
                <text x={-330} y={y} fontFamily={ARIAL} fontWeight={700} fontSize={fs} letterSpacing={fs * 0.03} fill={hot ? STRAW : INK}>{tx.slice(0, n)}</text>
                <line x1={-340} y1={y + 16} x2={340} y2={y + 16} stroke={INK} strokeWidth={3} opacity={0.5} />
                {m === 2 && i === 0 && strike > 0 && <line x1={-340} y1={y - fs * 0.3} x2={-340 + 680 * strike} y2={y - fs * 0.3} stroke={STRAW} strokeWidth={12} />}
            </g>
        );
    });
    const last = rows.length - 1, ly = top + 40 + last * gap;
    return (
        <Stage it={it} f={f}>
            <Shape d={box(-370, -pageH, 740, pageH, 10)} fill={PAPER} plate={STRAW} />
            <rect x={-370} y={-pageH} width={740} height={48} fill={INK} />
            {[-300, -200, -100, 0, 100, 200, 300].map((x) => <circle key={x} cx={x} cy={-pageH + 24} r={9} fill={PAPER} />)}
            {lines}
            {pen}
            {on(f, st[rows.length - 1]) && rows.length >= 3 && m === 0 && <g transform={`translate(${352 + (idle(f, 4) ? 3 : -3)} ${-pageH - 6}) rotate(${idle(f, 4) ? 8 : -8})`}><circle r={44} fill={STRAW} stroke={INK} strokeWidth={SW} /><text x={0} y={22} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={68} fill="#fff">!</text></g>}
            {m === 1 && <PenLoop cx={0} cy={ly - fs * 0.3} rx={355} ry={fs * 0.85} f={f} at={st[rows.length]} />}
            <Ground />
        </Stage>
    );
};

// ---------------------------------------------------------------------------------------------------------------------
// EP. 18 CONTEXT-ADAPTIVE CHOREOGRAPHY (Party-List Loophole — before-2028-edit-prompt.md):
//   ballotscan  Party-List Ballot Sheet: pen shades ovals next to sector names -> laser scan bar morphs rows to Contractor/Clan
//   rulegate    Congress Gate & Rule Plaque: "MARGINALIZED ONLY" struck out by pen -> rewritten to "ADVOCATES" -> clan walks in
//   votemath    District 50%+1 Campaign Machinery tower (left) vs Party-List 100% bar where a tiny 2% sliver unlocks a Seat
//   seatsaudit  64-Seat House Hemicycle: radial scan + Garamond counter ticks 1..32/64 flipping 32 seats to Clans + 21 Hardhats
// ---------------------------------------------------------------------------------------------------------------------

const Hardhat: React.FC<{ x: number; y: number; k?: number; fill?: string }> = ({ x, y, k = 1, fill = STRAW }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M-32 0 A32 30 0 0 1 32 0 Z" fill={fill} stroke={INK} strokeWidth={DW / k} />
        <rect x={-8} y={-34} width={16} height={34} rx={4} fill={fill} stroke={INK} strokeWidth={DW / k} />
        <rect x={-40} y={-4} width={80} height={10} rx={4} fill={PAPER} stroke={INK} strokeWidth={DW / k} />
    </g>
);

const JeepIcon: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <rect x={-34} y={-22} width={52} height={24} rx={4} fill={MATCHA} stroke={INK} strokeWidth={DW / k} />
        <path d="M18 -16 H34 L40 2 H18 Z" fill={PAPER} stroke={INK} strokeWidth={DW / k} />
        <circle cx={-18} cy={4} r={8} fill={INK} />
        <circle cx={24} cy={4} r={8} fill={INK} />
    </g>
);

const SproutIcon: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <line x1={0} y1={14} x2={0} y2={-18} stroke={INK} strokeWidth={DW / k} />
        <path d="M0 -4 C-24 -6 -28 -26 -4 -22 C-2 -18 0 -10 0 -4 Z" fill={MATCHA} stroke={INK} strokeWidth={DW / k} />
        <path d="M0 -10 C24 -12 28 -32 4 -28 C2 -24 0 -16 0 -10 Z" fill={MATCHA} stroke={INK} strokeWidth={DW / k} />
    </g>
);

const StallIcon: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <rect x={-28} y={-4} width={56} height={20} fill={PAPER} stroke={INK} strokeWidth={DW / k} />
        <path d="M-34 -14 L-24 -28 H24 L34 -14 Z" fill={MATCHA} stroke={INK} strokeWidth={DW / k} />
        <line x1={-22} y1={-14} x2={-22} y2={-4} stroke={INK} strokeWidth={DW / k} />
        <line x1={22} y1={-14} x2={22} y2={-4} stroke={INK} strokeWidth={DW / k} />
    </g>
);

export const BallotScan: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [];
    const tx = (it.text || 'FARMERS & DRIVERS ON PAPER|DYNASTIES IN THE SEAT').split('|');
    const scanAt = st[3] !== undefined ? st[3] : 60;
    const scanP = act(f, scanAt, 16);
    const scanned = on(f, scanAt);

    const rows = [
        { num: '14', sector: 'TSUPER PARTY-LIST', real: 'BILLIONAIRE CONTRACTOR', at: st[0] ?? 4, icon: 'jeep' },
        { num: '27', sector: 'MAGSASAKA PARTY-LIST', real: 'GOVERNOR’S SIBLING', at: st[1] ?? 18, icon: 'sprout' },
        { num: '41', sector: 'TINDERA PARTY-LIST', real: 'POLITICAL DYNASTY CLAN', at: st[2] ?? 32, icon: 'stall' },
    ];

    const W = 740, H = 470, TOP = -490;
    const scanY = TOP + 70 + (H - 80) * scanP;

    return (
        <Stage it={it} f={f}>
            <Shape d={box(-W / 2, TOP, W, H, 10)} fill={WHITE} plate={scanned && scanP > 0.3 ? STRAW : MATCHA} />
            <rect x={-W / 2} y={TOP} width={W} height={68} fill={INK} />
            <text x={0} y={TOP + 45} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={32} letterSpacing={3} fill={PAPER}>
                {scanned && scanP > 0.5 ? '20TH CONGRESS · SEAT HOLDER' : 'OFFICIAL BALLOT · PARTY-LIST'}
            </text>

            {rows.map((r, i) => {
                const ry = TOP + 145 + i * 122;
                const rowFilled = on(f, r.at);
                const fillP = act(f, r.at, 6);
                const rowScanned = scanned && scanY >= ry - 20;

                return (
                    <g key={i}>
                        {rowScanned && (
                            <rect x={-W / 2 + 16} y={ry - 48} width={W - 32} height={92} rx={8} fill={STRAW} opacity={0.14} />
                        )}
                        <ellipse cx={-305} cy={ry - 4} rx={26} ry={16} fill={WHITE} stroke={INK} strokeWidth={DW} />
                        {rowFilled && (
                            <ellipse
                                cx={-305}
                                cy={ry - 4}
                                rx={20 * fillP}
                                ry={11 * fillP}
                                fill={rowScanned ? STRAW : MATCHA}
                            />
                        )}

                        <text
                            x={-258}
                            y={ry + 10}
                            fontFamily={ARIAL}
                            fontWeight={700}
                            fontSize={31}
                            fill={rowScanned ? STRAW : INK}
                        >
                            {r.num} · {rowScanned ? r.real : r.sector}
                        </text>

                        {rowFilled && !rowScanned && (
                            <g>
                                {r.icon === 'jeep' && <JeepIcon x={295} y={ry - 4} k={1.05} />}
                                {r.icon === 'sprout' && <SproutIcon x={295} y={ry - 4} k={1.15} />}
                                {r.icon === 'stall' && <StallIcon x={295} y={ry - 4} k={1.05} />}
                            </g>
                        )}
                        {rowScanned && (
                            <g>
                                {i === 0 && <Hardhat x={295} y={ry + 8} k={0.95} />}
                                {i === 1 && (
                                    <g transform={`translate(295 ${ry - 6})`}>
                                        <rect x={-46} y={-20} width={92} height={40} rx={6} fill={STRAW} stroke={INK} strokeWidth={DW} />
                                        <text x={0} y={8} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={24} fill="#fff">CLAN</text>
                                    </g>
                                )}
                                {i === 2 && (
                                    <g transform={`translate(295 ${ry - 6})`}>
                                        <rect x={-46} y={-20} width={92} height={40} rx={6} fill={INK} stroke={INK} strokeWidth={DW} />
                                        <text x={0} y={8} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={24} fill={PAPER}>₱₱₱</text>
                                    </g>
                                )}
                            </g>
                        )}

                        {rowFilled && fillP < 1 && (
                            <g transform={`translate(-305 ${ry - 8}) rotate(34)`}>
                                <polygon points="0,0 -9,-26 9,-26" fill={PAPER} stroke={INK} strokeWidth={DW} />
                                <rect x={-9} y={-95} width={18} height={70} fill={MATCHA} stroke={INK} strokeWidth={DW} />
                            </g>
                        )}

                        {i < 2 && <line x1={-W / 2 + 24} y1={ry + 54} x2={W / 2 - 24} y2={ry + 54} stroke={INK} strokeWidth={3} opacity={0.22} />}
                    </g>
                );
            })}

            {scanned && scanP < 1 && (
                <g>
                    <rect x={-W / 2 - 18} y={scanY - 16} width={W + 36} height={32} fill={STRAW} opacity={0.25} />
                    <line x1={-W / 2 - 22} y1={scanY} x2={W / 2 + 22} y2={scanY} stroke={STRAW} strokeWidth={12} />
                </g>
            )}

            <Ground />
            {tx[0] && !scanned && <Label x={0} y={-565} text={tx[0]} s={s} fill={MATCHA} f={f} at={0} />}
            {tx[1] && scanned && <Label x={0} y={-565} text={tx[1]} s={s} fill={STRAW} f={f} at={scanAt} />}
        </Stage>
    );
};

export const RuleGate: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [];
    const tx = (it.text || 'BEFORE 2013: MARGINALIZED ONLY|2013 RULING: ANYONE CAN ENTER').split('|');
    const strikeP = act(f, st[0], 10);
    const openP = act(f, st[1], 14);
    const rewritten = on(f, st[0]);
    const opened = on(f, st[1]);

    return (
        <Stage it={it} f={f}>
            <Shape d={box(-210, -455, 52, 455, 6)} fill={PAPER} plate={INK} />
            <Shape d={box(158, -455, 52, 455, 6)} fill={PAPER} plate={INK} />

            <g opacity={1 - openP * 0.65}>
                <g transform={`translate(${-115 * openP} 0)`}>
                    <rect x={-158} y={-320} width={158} height={320} fill="none" stroke={INK} strokeWidth={SW} />
                    {[-120, -80, -40].map((gx) => (
                        <line key={gx} x1={gx} y1={-320} x2={gx} y2={0} stroke={INK} strokeWidth={SW} />
                    ))}
                </g>
                <g transform={`translate(${115 * openP} 0)`}>
                    <rect x={0} y={-320} width={158} height={320} fill="none" stroke={INK} strokeWidth={SW} />
                    {[40, 80, 120].map((gx) => (
                        <line key={gx} x1={gx} y1={-320} x2={gx} y2={0} stroke={INK} strokeWidth={SW} />
                    ))}
                </g>
            </g>

            <Shape d={box(-310, -495, 620, 165, 10)} fill={WHITE} plate={rewritten ? STRAW : MATCHA} />
            <rect x={-310} y={-495} width={620} height={48} fill={rewritten ? STRAW : MATCHA} stroke={INK} strokeWidth={DW} />
            <text x={0} y={-460} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={28} letterSpacing={4} fill="#fff">
                {rewritten ? '2013 ATONG PAGLAUM RULING' : 'RA 7941 · PARTY-LIST RULE'}
            </text>

            <text
                x={0}
                y={-392}
                textAnchor="middle"
                fontFamily={ARIAL}
                fontWeight={700}
                fontSize={42}
                fill={INK}
                opacity={rewritten ? 0.45 : 1}
            >
                MARGINALIZED ONLY
            </text>
            {rewritten && (
                <line
                    x1={-255}
                    y1={-405}
                    x2={-255 + 510 * strikeP}
                    y2={-405}
                    stroke={STRAW}
                    strokeWidth={14}
                />
            )}
            {rewritten && strikeP > 0.4 && (
                <text
                    x={0}
                    y={-346}
                    textAnchor="middle"
                    fontFamily={ARIAL}
                    fontWeight={700}
                    fontSize={38}
                    fill={STRAW}
                >
                    ANYONE WHO “ADVOCATES”
                </text>
            )}

            <g transform={`translate(${-305 - 35 * openP} 0)`}>
                <Person x={0} h={245} f={f} />
                <path d="M-44 -235 L0 -268 L44 -235 Z" fill={MATCHA} stroke={INK} strokeWidth={DW} />
            </g>

            <g transform={`translate(${290 - 255 * openP} 0)`}>
                <Person x={-35} h={275} f={f} sash walk={opened && openP < 1} />
                <g transform="translate(55 0)">
                    <Person x={0} h={265} f={f} walk={opened && openP < 1} />
                    <Hardhat x={0} y={-262} k={0.85} />
                </g>
            </g>

            <Ground />
            {tx[0] && !rewritten && <Label x={0} y={-575} text={tx[0]} s={s} fill={MATCHA} f={f} at={0} />}
            {tx[1] && rewritten && <Label x={0} y={-575} text={tx[1]} s={s} fill={STRAW} f={f} at={st[0]} />}
        </Stage>
    );
};

export const VoteMath: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [];
    const tx = (it.text || 'DISTRICT: EXPENSIVE 50%+1|2% VOTE = GUARANTEED SEAT').split('|');
    const twoPctP = act(f, st[0], 10);
    const showTwo = on(f, st[0]);
    const showOverflow = on(f, st[1]);

    return (
        <Stage it={it} f={f}>
            <g transform="translate(-205 0)">
                <Shape d={box(-175, -475, 350, 475, 10)} fill={PAPER} plate={INK} />
                <rect x={-175} y={-475} width={350} height={58} fill={INK} />
                <text x={0} y={-435} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={32} letterSpacing={3} fill={PAPER}>
                    1 DISTRICT SEAT
                </text>

                <rect x={-125} y={-375} width={110} height={310} fill={WHITE} stroke={INK} strokeWidth={DW} />
                <rect x={-125} y={-225} width={110} height={160} fill="url(#kitht)" />
                <rect x={-125} y={-225} width={110} height={160} fill={INK} opacity={0.75} />
                <line x1={-138} y1={-225} x2={-2} y2={-225} stroke={STRAW} strokeWidth={8} />
                <text x={-70} y={-242} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={36} fill={INK}>
                    50%+1
                </text>

                {[0, 1, 2, 3, 4].map((c) => (
                    <rect key={c} x={15} y={-105 - c * 42} width={115} height={34} rx={6} fill={STRAW} stroke={INK} strokeWidth={DW} />
                ))}
                <text x={72} y={-328} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={34} fill={STRAW}>
                    MASSIVE
                </text>
                <text x={72} y={-292} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={30} fill={INK}>
                    MACHINERY
                </text>
                <text x={0} y={-24} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={30} fill={INK}>
                    PROVINCE / CITY
                </text>
            </g>

            <g transform="translate(205 0)">
                <Shape d={box(-175, -475, 350, 475, 10)} fill={WHITE} plate={showTwo ? STRAW : MATCHA} />
                <rect x={-175} y={-475} width={350} height={58} fill={showTwo ? STRAW : MATCHA} stroke={INK} strokeWidth={DW} />
                <text x={0} y={-435} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={32} letterSpacing={3} fill="#fff">
                    PARTY-LIST SEAT
                </text>

                <text x={0} y={-368} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={30} fill={INK}>
                    NATIONAL VOTE BAR
                </text>
                <rect x={-140} y={-345} width={280} height={54} rx={6} fill={PAPER} stroke={INK} strokeWidth={DW} />
                <rect
                    x={-140}
                    y={-345}
                    width={Math.max(18, 26 * twoPctP)}
                    height={54}
                    fill={STRAW}
                    stroke={INK}
                    strokeWidth={DW}
                />
                {showTwo && (
                    <g>
                        <circle cx={-126} cy={-318} r={38} fill="none" stroke={STRAW} strokeWidth={8} strokeDasharray="10 6" />
                        <text x={25} y={-305} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={44} fill={STRAW}>
                            JUST 2%
                        </text>
                    </g>
                )}

                {showTwo && (
                    <g transform={`translate(${showOverflow ? -55 : 0} -95) scale(${0.85 + 0.15 * twoPctP})`}>
                        <Shape d={box(-52, -135, 104, 95, 10)} fill={MATCHA} plate={STRAW} />
                        <rect x={-62} y={-50} width={124} height={28} rx={6} fill={INK} />
                        <rect x={-45} y={-22} width={18} height={42} fill={INK} />
                        <rect x={27} y={-22} width={18} height={42} fill={INK} />
                        <text x={0} y={-78} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={30} fill="#fff">
                            1 SEAT
                        </text>
                    </g>
                )}

                {showOverflow && (
                    <g transform="translate(75 -95) scale(0.82)">
                        <Shape d={box(-52, -135, 104, 95, 10)} fill={STRAW} />
                        <rect x={-62} y={-50} width={124} height={28} rx={6} fill={INK} />
                        <text x={0} y={-78} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={28} fill="#fff">
                            &lt;2%
                        </text>
                    </g>
                )}

                <text x={0} y={-24} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={30} fill={STRAW}>
                    {showOverflow ? 'OVERFLOW WINS TOO' : 'CHEAPER SHORTCUT'}
                </text>
            </g>

            <Ground />
            {tx[0] && !showTwo && <Label x={0} y={-565} text={tx[0]} s={s} fill={INK} f={f} at={0} />}
            {tx[1] && showTwo && <Label x={0} y={-565} text={tx[1]} s={s} fill={STRAW} f={f} at={st[0]} />}
        </Stage>
    );
};

export const SeatsAudit: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [];
    const tx = (it.text || '64 PARTY-LIST SEATS|PCIJ: 32 OF 64 = CLANS|1/3 TIED TO CONTRACTORS').split('|');
    const scanP = act(f, st[0], 22);
    const showClans = on(f, st[0]);
    const showContractors = on(f, st[1]);

    const rowCounts = [13, 15, 17, 19];
    const seats: { x: number; y: number; idx: number }[] = [];
    let idx = 0;
    rowCounts.forEach((cnt, rIdx) => {
        const rad = 175 + rIdx * 48;
        for (let i = 0; i < cnt; i++) {
            const u = cnt === 1 ? 0.5 : i / (cnt - 1);
            const ang = (-158 + u * 136) * (Math.PI / 180);
            seats.push({
                x: rad * Math.cos(ang),
                y: -125 + rad * Math.sin(ang),
                idx: idx++,
            });
        }
    });

    const sortedByX = [...seats].sort((a, b) => a.x - b.x);
    const clanOrder = new Map<number, number>();
    sortedByX.forEach((stItem, rank) => clanOrder.set(stItem.idx, rank));

    const activeClans = showClans ? Math.round(32 * scanP) : 0;

    return (
        <Stage it={it} f={f}>
            <Shape d={box(-385, -495, 770, 495, 12)} fill={WHITE} plate={showClans ? STRAW : MATCHA} />

            <text
                x={0}
                y={-125}
                textAnchor="middle"
                fontFamily="EB Garamond, Georgia, serif"
                fontWeight={700}
                fontSize={86}
                fill={showClans ? STRAW : MATCHA}
            >
                {showClans ? `${activeClans} / 64` : '64 SEATS'}
            </text>
            <text
                x={0}
                y={-75}
                textAnchor="middle"
                fontFamily={ARIAL}
                fontWeight={700}
                fontSize={28}
                letterSpacing={3}
                fill={INK}
            >
                {showContractors
                    ? '21 SEATS (1/3) = CONTRACTORS'
                    : showClans
                        ? 'POLITICAL DYNASTY CLANS'
                        : 'RESERVED FOR MARGINALIZED'}
            </text>

            {seats.map((seat) => {
                const rank = clanOrder.get(seat.idx) ?? 0;
                const isClan = showClans && rank < activeClans;
                const isContractor = showContractors && rank < 21;

                return (
                    <g key={seat.idx} transform={`translate(${seat.x.toFixed(1)} ${seat.y.toFixed(1)})`}>
                        <circle
                            cx={0}
                            cy={0}
                            r={19}
                            fill={isClan ? STRAW : MATCHA}
                            stroke={INK}
                            strokeWidth={DW}
                        />
                        {isContractor && <Hardhat x={0} y={-10} k={0.42} fill={PAPER} />}
                    </g>
                );
            })}

            <rect x={-95} y={-48} width={190} height={48} rx={6} fill={INK} />
            <text x={0} y={-16} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={24} letterSpacing={4} fill={PAPER}>
                CONGRESS
            </text>

            <Ground />
            {tx[0] && !showClans && <Label x={0} y={-575} text={tx[0]} s={s} fill={MATCHA} f={f} at={0} />}
            {tx[1] && showClans && !showContractors && <Label x={0} y={-575} text={tx[1]} s={s} fill={STRAW} f={f} at={st[0]} />}
            {tx[2] && showContractors && <Label x={0} y={-575} text={tx[2]} s={s} fill={STRAW} f={f} at={st[1]} />}
        </Stage>
    );
};


// ---------------------------------------------------------------------------------------------------------------------
// EP. 18 (the party-list loophole). Motif = THE BALLOT'S PARTY-LIST ROW: names that sound like the poor, then the clan in the seat.
// ---------------------------------------------------------------------------------------------------------------------
const Hat: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M-22 0 Q-22 -26 0 -26 Q22 -26 22 0 Z" fill="#e8b84a" stroke={INK} strokeWidth={DW} />
        <rect x={-30} y={-2} width={60} height={9} rx={4} fill="#e8b84a" stroke={INK} strokeWidth={DW} />
    </g>
);
const HouseG: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M-24 0 V-22 L0 -42 L24 -22 V0 Z" fill={STRAW} stroke={INK} strokeWidth={DW} /><rect x={-7} y={-16} width={14} height={16} fill={PAPER} stroke={INK} strokeWidth={3} />
    </g>
);
// ballot: a party-list ballot whose rows sound like the poor; row i flips to the clan / contractor on steps[i].
// text = "NAME A|NAME B|NAME C|NAME D|FLIP A|FLIP B|FLIP C|FLIP D|STAMP"; steps[0..3] = the flips, steps[4] = the stamp
export const Ballot: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const lab = (it.text || '').split('|'), st = it.steps || [], n = Math.min(4, Math.max(1, it.n || 4));
    return (
        <Stage it={it} f={f}>
            <Shape d={box(-310, -470, 620, 450, 12)} fill={PAPER} plate={MATCHA} />
            <rect x={-310} y={-470} width={620} height={62} fill={INK} />
            <text x={0} y={-427} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} letterSpacing={3} fill={PAPER}>PARTY-LIST</text>
            {Array.from({ length: n }, (_, i) => {
                const y = -392 + i * 92, enter = Math.max(0, 1 - ez(two(f - (it.at || 0) - i * 4) / 6)), flip = on(f, st[i]), fp = act(f, st[i], 8);
                if (f - (it.at || 0) - i * 4 < 0) return null;
                const name = flip ? (lab[4 + i] || 'CLAN') : (lab[i] || '');
                return (
                    <g key={i} transform={`translate(0 ${y - enter * 16})`}>
                        <rect x={-282} y={0} width={564} height={74} rx={8} fill={flip ? STRAW : WHITE} stroke={INK} strokeWidth={DW} />
                        <circle cx={-244} cy={37} r={20} fill={flip ? PAPER : WHITE} stroke={INK} strokeWidth={DW} />
                        {flip && <path d="M-254 37 L-246 46 L-232 28" fill="none" stroke={INK} strokeWidth={7} />}
                        <text x={-206} y={50} fontFamily={ARIAL} fontWeight={700} fontSize={40} letterSpacing={1} fill={flip ? '#fff' : INK}>{name}</text>
                        {flip && fp > 0.2 && (i % 2 === 0 ? <Hat x={246} y={50} k={1.0} /> : <HouseG x={246} y={52} k={1.0} />)}
                    </g>
                );
            })}
            {on(f, st[4]) && lab[8] && <g transform={`translate(0 -130) rotate(-8) scale(${1.15 - 0.15 * ez(two(f - (st[4] as number)) / 6)})`}>
                <rect x={-210} y={-52} width={420} height={104} fill="none" stroke={STRAW} strokeWidth={10} /><text x={0} y={22} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={70} letterSpacing={4} fill={STRAW}>{lab[8]}</text></g>}
            <Ground />
        </Stage>
    );
};
// seats: a block of House seats. text = "LABEL BEFORE|LABEL AFTER"; w x h seats; from steps[0] n seats fill with a sashed person (n, two frames apart);
// it.color === 'mix' alternates a hard hat (contractor) with a sash (dynasty). steps[1] swaps the label.
export const Seats: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), c = it.w || 8, r = it.h || 3, n = it.n === undefined ? c * r : it.n;
    const cell = Math.min(86, 760 / c), rowH = cell * 1.12, W = c * cell, filled = on(f, st[0]) ? Math.min(n, Math.floor(two(f - (st[0] as number)) / 2) + 1) : 0;
    const label = on(f, st[1]) ? lab[1] : lab[0], fillLab = on(f, st[1]);
    return (
        <Stage it={it} f={f}>
            {Array.from({ length: c * r }, (_, i) => {
                const col = i % c, row = Math.floor(i / c), x = -W / 2 + col * cell + cell / 2, y = -(r - row) * rowH + rowH * 0.1, took = i < filled;
                const land = took ? Math.max(0, 1 - ez(two(f - (st[0] as number) - i * 2) / 6)) : 0;
                const bob = idle(f, 6) && i % 3 === 0 ? -2 : 0;
                return (
                    <g key={i} transform={`translate(${x} ${y + bob})`}>
                        <rect x={-cell * 0.4} y={-cell * 0.62} width={cell * 0.8} height={cell * 0.72} rx={cell * 0.14} fill={took ? STRAW : MATCHA} stroke={INK} strokeWidth={DW} />
                        <rect x={-cell * 0.46} y={-cell * 0.1} width={cell * 0.92} height={cell * 0.2} rx={cell * 0.08} fill={took ? STRAW : MATCHA} stroke={INK} strokeWidth={DW} />
                        {took && <g transform={`translate(0 ${-land * 16})`}>
                            <circle cx={0} cy={-cell * 0.52} r={cell * 0.2} fill={INK} />
                            {(it.color === 'mix' && i % 2 === 1) || it.color === 'hat' ? <Hat x={0} y={-cell * 0.66} k={cell / 80} /> : <rect x={-cell * 0.3} y={-cell * 0.36} width={cell * 0.6} height={cell * 0.11} fill={WHITE} stroke={INK} strokeWidth={2} />}
                        </g>}
                    </g>
                );
            })}
            {label && <Label x={0} y={-r * rowH - 70} text={label} s={s} size={46} fill={fillLab ? STRAW : MATCHA} f={f} at={fillLab ? st[1] : 0} />}
            <Ground />
        </Stage>
    );
};
// rulebook: a rule page. text = "OLD RULE / LINE 2|NEW RULE / LINE 2" ('/' = line break); steps[0] strikes the old rule, steps[1] types the rewrite
export const Rulebook: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const st = it.steps || [], lab = (it.text || '').split('|'), oldL = (lab[0] || '').split('/').map((x) => x.trim()), newL = (lab[1] || '').split('/').map((x) => x.trim());
    const strike = act(f, st[0], 10), typed = on(f, st[1]) ? Math.floor(two(f - (st[1] as number)) * 0.9) : 0;
    const total = newL.join('').length;
    let left = typed;
    return (
        <Stage it={it} f={f}>
            <Shape d={box(-340, -420, 680, 410, 10)} fill={PAPER} plate={STRAW} />
            <rect x={-340} y={-420} width={680} height={50} fill={INK} />
            <text x={-310} y={-384} fontFamily={ARIAL} fontWeight={700} fontSize={34} letterSpacing={3} fill={PAPER}>THE RULE</text>
            {oldL.map((t, i) => <g key={i}>
                <text x={-300} y={-300 + i * 58} fontFamily={ARIAL} fontWeight={700} fontSize={46} fill={INK}>{t}</text>
                {strike > 0 && <line x1={-306} y1={-314 + i * 58} x2={-306 + (t.length * 33 + 12) * strike} y2={-314 + i * 58} stroke={STRAW} strokeWidth={12} />}
            </g>)}
            {newL.map((t, i) => {
                const k = Math.max(0, Math.min(t.length, left)); left -= t.length; if (!on(f, st[1]) || k <= 0) return null;
                return <text key={i} x={-300} y={-150 + i * 62} fontFamily={ARIAL} fontWeight={700} fontSize={50} fill={MATCHA}>{t.slice(0, k)}</text>;
            })}
            {on(f, st[1]) && typed < total && <g transform={`translate(${250 + (idle(f, 4) ? 4 : -4)} -90) rotate(40)`}><rect x={0} y={-8} width={90} height={16} fill={STRAW} stroke={INK} strokeWidth={DW} /></g>}
            <Ground />
        </Stage>
    );
};
// gate: people queue to pass a gate whose sign sets a condition. text = "SIGN TEXT"; steps[0] = the sign falls and sashed people stream through;
// steps[1] = a pen loop on the sign
export const Gate: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const st = it.steps || [], fall = act(f, st[0], 10), down = on(f, st[0]);
    const per = (i: number, sash: boolean) => {
        const x = -470 + ((two(f) * 3.2 + i * 190) % 960), vis = sash ? down : true;
        return vis ? <Person key={(sash ? 's' : 'p') + i} x={x} h={sash ? 170 : 150} f={f} walk sash={sash} /> : null;
    };
    return (
        <Stage it={it} f={f}>
            <Shape d={box(-250, -420, 36, 420, 6)} fill={INK} /><Shape d={box(214, -420, 36, 420, 6)} fill={INK} />
            <path d="M-250 -420 Q0 -520 250 -420" fill="none" stroke={INK} strokeWidth={SW + 6} />
            {Array.from({ length: 5 }, (_, i) => per(i, false))}
            {Array.from({ length: 5 }, (_, i) => per(i, true))}
            <g transform={`translate(0 ${-330 + fall * 300}) rotate(${fall * 14})`}>
                <rect x={-4} y={-90} width={8} height={90} fill={INK} />                <rect x={-290} y={-6} width={580} height={104} rx={8} fill={MATCHA} stroke={INK} strokeWidth={SW} />
                <text x={0} y={59} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={42} letterSpacing={1} fill="#fff">{it.text || ''}</text>
            </g>
            {!down && <PenLoop cx={0} cy={-280} rx={320} ry={74} f={f} at={st[1]} />}
            <Ground />
        </Stage>
    );
};
// votebar: two bars. text = "LEFT LABEL|RIGHT LABEL|MARKER"; mode n: 0 = votes (right bar climbs to the marker at steps[0], seats pop), 1 = cost (left tall, right short grows)
export const VoteBar: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), mode = it.n || 0;
    const grow = on(f, st[0]) ? ez(two(f - (st[0] as number)) / (it.w || 20)) : 0, seat = on(f, st[1]) ? act(f, st[1], 8) : 0;
    const bob = idle(f, 6) ? -3 : 0;
    const Hl = 360, Hr = mode === 1 ? 90 + 40 * grow : 40 + 60 * grow;
    return (
        <Stage it={it} f={f}>
            <Shape d={box(-300, -Hl, 220, Hl, 8)} fill={INK} plate={STRAW} />
            <rect x={-300} y={-Hl} width={220} height={Hl} fill="url(#kitht)" opacity={0.35} />
            <Shape d={box(90, -Hr + bob, 220, Hr - bob, 8)} fill={MATCHA} plate={STRAW} />
            {mode === 0 && <g><line x1={50} y1={-100} x2={350} y2={-100} stroke={STRAW} strokeWidth={DW + 2} strokeDasharray="14 10" />
                <text x={338} y={-114} textAnchor="end" fontFamily={ARIAL} fontWeight={700} fontSize={44} fill={STRAW}>{lab[2] || '2%'}</text></g>}
            {lab[0] && <text x={-190} y={66} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={42} fill={INK}>{lab[0]}</text>}
            {lab[1] && <text x={200} y={66} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={42} fill={INK}>{lab[1]}</text>}
            {seat > 0 && <g transform={`translate(200 ${-Hr - 70 - (1 - seat) * 30}) scale(${0.9 + 0.1 * seat})`}>
                <rect x={-34} y={-44} width={68} height={52} rx={10} fill={STRAW} stroke={INK} strokeWidth={DW} /><rect x={-40} y={0} width={80} height={16} rx={6} fill={STRAW} stroke={INK} strokeWidth={DW} />
                <circle cx={0} cy={-62} r={14} fill={INK} /></g>}
            {mode === 1 && grow > 0.1 && <g transform={`translate(200 ${-Hr - 36})`}><text textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={60} fill={MATCHA}>₱</text></g>}
            {mode === 1 && <g transform={`translate(-190 ${-Hl - 36})`}><text textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={60} fill={STRAW} letterSpacing={6}>₱₱₱</text></g>}
            <Ground />
        </Stage>
    );
};
// lane: a signed lane with students walking along it. text = "SIGN A|SIGN B"; steps[0] = the sign is rewritten and sashed adults crowd in
export const Lane: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const st = it.steps || [], lab = (it.text || '').split('|'), swap = on(f, st[0]), sp = act(f, st[0], 8);
    const stu = (i: number) => { const x = -420 + ((two(f) * 2.6 + i * 230) % 900); return <g key={'u' + i}><Person x={x} h={120} f={f} walk /><rect x={x - 22} y={-120} width={12} height={46} fill={MATCHA} stroke={INK} strokeWidth={3} /></g>; };
    const adult = (i: number) => { const x = -420 + ((two(f) * 3.4 + i * 150) % 900); return <Person key={'a' + i} x={x} h={175} f={f} walk sash />; };
    return (
        <Stage it={it} f={f}>
            <path d="M-410 0 L410 0 L330 -150 L-330 -150 Z" fill={PAPER} stroke={INK} strokeWidth={SW} />
            {[-260, -90, 80, 250].map((x) => <rect key={x} x={x} y={-80} width={90} height={9} fill={INK} />)}
            {Array.from({ length: 3 }, (_, i) => stu(i))}
            {swap && Array.from({ length: 4 }, (_, i) => adult(i))}
            <g transform={`translate(0 ${swap ? (idle(f, 4) ? -3 : 0) : 0})`}>
                <rect x={-5} y={-330} width={10} height={180} fill={INK} />
                <rect x={-330} y={-500} width={660} height={170} rx={8} fill={swap ? STRAW : MATCHA} stroke={INK} strokeWidth={SW} />
                <text x={0} y={-441} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={42} fill={PAPER} letterSpacing={1}>SCHOLARSHIP LANE</text>
                <text x={0} y={-376} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={42} fill="#fff" letterSpacing={1}>{(swap ? lab[1] : lab[0]) || ''}</text>
            </g>
            {swap && sp < 1 && <PenLoop cx={0} cy={-376} rx={300} ry={40} f={f} at={st[0]} />}
            <Ground />
        </Stage>
    );
};
// machine: a campaign truck with a loudspeaker and posters going up. text = "LABEL"; steps[0] = posters start going up (n of them, 3 frames apart)
export const Machine: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), n = it.n === undefined ? 8 : it.n;
    const up = on(f, st[0]) ? Math.min(n, Math.floor(two(f - (st[0] as number)) / 3) + 1) : 0, wob = idle(f, 4) ? -3 : 0;
    const wave = Math.floor(f / 4) % 3;
    return (
        <Stage it={it} f={f}>
            {/* posters pasted on a wall */}
            <Shape d={box(-400, -380, 330, 380, 8)} fill={PAPER} plate={MATCHA} />
            {Array.from({ length: up }, (_, i) => {
                const col = i % 3, row = Math.floor(i / 3), land = Math.max(0, 1 - ez(two(f - (st[0] as number) - i * 3) / 6));
                return <g key={i} transform={`translate(${-382 + col * 104} ${-362 + row * 112 - land * 12})`}><rect width={92} height={98} fill={i % 3 === 0 ? STRAW : i % 3 === 1 ? WHITE : MATCHA} stroke={INK} strokeWidth={DW} /><circle cx={46} cy={36} r={17} fill={INK} /><rect x={22} y={60} width={48} height={20} fill={INK} /></g>;
            })}
            {/* the truck */}
            <g transform={`translate(70 ${wob})`}>
                <Shape d={`${box(0, -190, 230, 150, 12)} M230 -140 H330 L350 -80 V-40 H230 Z`} fill={STRAW} plate={MATCHA} />
                <rect x={252} y={-130} width={64} height={44} fill={PAPER} stroke={INK} strokeWidth={DW} />
                <circle cx={80} cy={-34} r={36} fill={INK} /><circle cx={290} cy={-34} r={36} fill={INK} /><circle cx={80} cy={-34} r={14} fill={PAPER} /><circle cx={290} cy={-34} r={14} fill={PAPER} />
                {/* loudspeaker on the roof */}
                <g transform="translate(150 -250)"><rect x={-18} y={-12} width={36} height={26} fill={INK} /><path d="M18 -34 L90 -66 V70 L18 38 Z" fill={WHITE} stroke={INK} strokeWidth={SW} />
                    {Array.from({ length: wave + 1 }, (_, k) => <path key={k} d={`M${106 + k * 26} ${-22 - k * 12} Q${126 + k * 26} 2 ${106 + k * 26} ${26 + k * 12}`} fill="none" stroke={STRAW} strokeWidth={8} />)}</g>
                <Person x={30} y={-190} h={90} f={f} sash walk={false} />
            </g>
            {on(f, st[1]) && lab[0] && <Label x={0} y={-440} text={lab[0]} s={s} size={46} f={f} at={st[1]} />}
            <Ground />
        </Stage>
    );
};

export const kitScene = (it: KitItem, f: number, key: number): React.ReactNode | undefined => {
    switch (it.kind) {
        case 'ballotscan': return <BallotScan key={key} it={it} f={f} />;
        case 'rulegate': return <RuleGate key={key} it={it} f={f} />;
        case 'votemath': return <VoteMath key={key} it={it} f={f} />;
        case 'seatsaudit': return <SeatsAudit key={key} it={it} f={f} />;
        case 'favor': return <Favor key={key} it={it} f={f} />;
        case 'sticker': {   // a bare riso element (no disc) in the empty space of a thought: text = the icon kind, pops on `at`
            const t = f - (it.at || 0);
            if (t < 0) return null;
            return <g key={key} transform={`translate(${it.x} ${it.y + (Math.floor(f / 4) % 2 ? -4 : 0)}) rotate(${it.n || 0}) scale(${(it.s || 1) * stickerSettle(t)})`}>{stickerIcon(it.text || '')}</g>;
        }
        case 'lista': return <Lista key={key} it={it} f={f} />;
        case 'road': return <Road key={key} it={it} f={f} />;
        case 'bids': return <Bids key={key} it={it} f={f} />;
        case 'roof': return <Roof key={key} it={it} f={f} />;
        case 'stacks': return <Stacks key={key} it={it} f={f} />;
        case 'kickback': return <Kickback key={key} it={it} f={f} />;
        case 'balance': return <Balance key={key} it={it} f={f} />;
        case 'corner': return <Corner key={key} it={it} f={f} />;
        case 'hook': return <Hook key={key} it={it} f={f} />;
        case 'target': return <Target key={key} it={it} f={f} />;
        case 'cafe': return <Cafe key={key} it={it} f={f} />;
        case 'timer': return <Timer key={key} it={it} f={f} />;
        case 'shrink': return <Shrink key={key} it={it} f={f} />;
        case 'delivery': return <Delivery key={key} it={it} f={f} />;
        case 'sari': return <Sari key={key} it={it} f={f} />;
        case 'oneitem': return <OneItem key={key} it={it} f={f} />;
        case 'bags': return <Bags key={key} it={it} f={f} />;
        case 'river': return <River key={key} it={it} f={f} />;
        case 'eprlaw': return <EprLaw key={key} it={it} f={f} />;
        case 'mall': return <Mall key={key} it={it} f={f} />;
        case 'classroom': return <Classroom key={key} it={it} f={f} />;
        case 'ballot': return <Ballot key={key} it={it} f={f} />;
        case 'seats': return <Seats key={key} it={it} f={f} />;
        case 'rulebook': return <Rulebook key={key} it={it} f={f} />;
        case 'gate': return <Gate key={key} it={it} f={f} />;
        case 'votebar': return <VoteBar key={key} it={it} f={f} />;
        case 'lane': return <Lane key={key} it={it} f={f} />;
        case 'machine': return <Machine key={key} it={it} f={f} />;
        default: return undefined;
    }
};
