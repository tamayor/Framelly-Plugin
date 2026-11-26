// Before 2028 special "voluntary-national-debt-trap" (2026-11-24). Motif = THE ALKANSYA (piggy bank): the public's
// savings. Korea's 1998 gold had a clear road to the creditors; ours has a buwaya on the lid, no slot, a hole in the
// bottom. Built from the RisoKit drawing kit (outline, plate, halftone, label strip, motion grammar).
// Scene coordinates: ground line y = 0, x -410..410, up = negative y. Label rows: A at y -600, B at y -510;
// drawings stay below y -470.
import React from 'react';
import { KitItem, Stage, Ground, Shape, Label, Person, PenLoop, box, act, on, idle, two, cl, ez, rnd,
    INK, PAPER, MATCHA, STRAW, WHITE, ARIAL, SW, DW, PX, PY } from './RisoKit';

const SERIF = 'EB Garamond, Georgia, serif';
const RA = -600, RB = -510;
const BODY = 'M-220 -205 A220 150 0 1 0 220 -205 A220 150 0 1 0 -220 -205 Z';

// a peso coin
const Coin: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <circle r={28} fill={STRAW} stroke={INK} strokeWidth={DW} />
        <text y={11} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={32} fill={WHITE}>₱</text>
    </g>
);
// a gold bar (cream metal, halftone on the shadow face)
const Bar: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M-58 0 L-42 -40 H42 L58 0 Z" fill={PAPER} stroke={INK} strokeWidth={DW} />
        <path d="M42 -40 L58 0 H30 L20 -40 Z" fill="url(#kitht)" />
    </g>
);
// a ring (the jewellery people turned in): cream band, strawberry stone
const Ring: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <circle r={20} fill="none" stroke={INK} strokeWidth={14} /><circle r={20} fill="none" stroke={PAPER} strokeWidth={7} />
        <path d="M-10 -22 L0 -36 L10 -22 Z" fill={STRAW} stroke={INK} strokeWidth={3} />
    </g>
);
// a dollar bill
const Bill: React.FC<{ x: number; y: number; k?: number; r?: number }> = ({ x, y, k = 1, r = 0 }) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
        <rect x={-46} y={-24} width={92} height={48} rx={6} fill={MATCHA} stroke={INK} strokeWidth={DW} />
        <circle r={15} fill={PAPER} stroke={INK} strokeWidth={3} />
        <text y={9} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={24} fill={INK}>$</text>
    </g>
);
// THE ALKANSYA. Standing on the ground line, facing right. clear = see-through (coins inside), hole 0..1 = the open bottom,
// slot false = no slot (a dashed outline where it should be), text = on the belly.
type PigP = { x?: number; k?: number; f: number; clear?: boolean; hole?: number; slot?: boolean; text?: string; coins?: number; tilt?: number };
const Pig: React.FC<PigP> = ({ x = 0, k = 1, f, clear = false, hole = 0, slot = true, text, coins = 0, tilt = 0 }) => {
    const b = idle(f, 5) ? -3 : 0;
    return (
        <g transform={`translate(${x} 0) scale(${k}) rotate(${tilt} 0 0)`}>
            {[-130, -60, 60, 130].map((lx) => <Shape key={lx} d={box(lx - 22, -96, 44, 96, 8)} fill={clear ? WHITE : MATCHA} sw={DW + 2} />)}
            <g transform={`translate(0 ${b})`}>
                <path d="M-214 -230 q-50 -10 -42 -48 q10 -30 34 -6" fill="none" stroke={INK} strokeWidth={SW} />
                <Shape d={BODY} fill={clear ? WHITE : MATCHA} plate={STRAW} />
                {!clear && <path d="M-170 -110 A220 150 0 0 0 170 -110 A210 110 0 0 1 -170 -110 Z" fill="url(#kitht)" />}
                {clear && <g>
                    {Array.from({ length: coins }, (_, i) => <Coin key={i} x={-120 + (i % 6) * 48 + (Math.floor(i / 6) % 2) * 24} y={-90 - Math.floor(i / 6) * 40} k={0.8} />)}
                    <path d="M-150 -300 Q-110 -330 -60 -338" fill="none" stroke={INK} strokeWidth={DW} />
                    <path d="M-170 -270 Q-150 -290 -128 -300" fill="none" stroke={INK} strokeWidth={DW} />
                </g>}
                <Shape d="M110 -330 L150 -398 L176 -312 Z" fill={clear ? WHITE : MATCHA} sw={SW} />
                <ellipse cx={222} cy={-214} rx={40} ry={52} fill={clear ? WHITE : PAPER} stroke={INK} strokeWidth={SW} />
                <ellipse cx={214} cy={-226} rx={7} ry={12} fill={INK} /><ellipse cx={234} cy={-200} rx={7} ry={12} fill={INK} />
                <circle cx={140} cy={-262} r={11} fill={INK} />{idle(f, 37) === 0 && f % 37 < 3 && <rect x={128} y={-264} width={24} height={5} fill={INK} />}
                {slot ? <rect x={-56} y={-362} width={112} height={16} rx={6} fill={INK} />
                    : <rect x={-56} y={-362} width={112} height={16} rx={6} fill="none" stroke={INK} strokeWidth={DW} strokeDasharray="10 8" />}
                {text && <text x={-10} y={-190} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={42} fill={clear ? INK : WHITE} letterSpacing={2}>{text}</text>}
                {hole > 0 && <path d={`M${-80 * hole} -58 L${-50 * hole} -44 L${-20 * hole} -60 L${10 * hole} -42 L${44 * hole} -58 L${80 * hole} -50 L${60 * hole} -30 L${-60 * hole} -30 Z`} fill={INK} />}
            </g>
        </g>
    );
};
// the buwaya: an ink crocodile lying on the lid, jaws snapping (open 0..1)
const Croc: React.FC<{ x: number; y: number; k?: number; open?: number }> = ({ x, y, k = 1, open = 0 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M120 -10 Q220 -20 260 30 Q200 10 120 18 Z" fill={INK} />
        <Shape d="M-150 -40 Q-60 -86 70 -70 Q150 -60 150 0 Q90 26 -40 20 Q-120 16 -150 -10 Z" fill={INK} plate={STRAW} />
        {[-80, -30, 20, 70].map((sx) => <path key={sx} d={`M${sx - 16} -66 L${sx} -92 L${sx + 16} -66 Z`} fill={INK} />)}
        <g transform={`rotate(${-24 * open} -140 -30)`}>
            <path d="M-140 -44 L-290 -36 Q-300 -20 -286 -14 L-140 -14 Z" fill={INK} />
            {[-270, -240, -210, -180].map((tx) => <path key={tx} d={`M${tx} -14 L${tx + 10} 0 L${tx + 20} -14 Z`} fill={PAPER} stroke={INK} strokeWidth={2} />)}
        </g>
        <path d="M-140 -10 L-286 -6 Q-292 8 -278 14 L-140 16 Z" fill={INK} />
        {open > 0.2 && <path d="M-150 -14 L-280 -12 L-150 -4 Z" fill={STRAW} />}
        <circle cx={-120} cy={-64} r={16} fill={WHITE} stroke={INK} strokeWidth={DW} /><circle cx={-116} cy={-62} r={6} fill={INK} />
    </g>
);
// a columned building (the creditors' bank / the government hall); flag = a pole with a strawberry flag
const Hall: React.FC<{ x: number; k?: number; flag?: boolean; f: number }> = ({ x, k = 1, flag, f }) => (
    <g transform={`translate(${x} 0) scale(${k})`}>
        {flag && <g><line x1={0} y1={-330} x2={0} y2={-430} stroke={INK} strokeWidth={DW + 2} />
            <path d={`M0 -430 L70 ${-412 + (idle(f, 4) ? 4 : -4)} L0 -394 Z`} fill={STRAW} stroke={INK} strokeWidth={DW} /></g>}
        <Shape d="M-150 -250 L0 -330 L150 -250 Z" fill={WHITE} plate={STRAW} />
        <Shape d={box(-140, -250, 280, 30, 4)} fill={PAPER} sw={DW + 2} />
        {[-110, -55, 0, 55, 110].map((cx) => <Shape key={cx} d={box(cx - 15, -220, 30, 190, 4)} fill={WHITE} sw={DW + 2} />)}
        <Shape d={box(-160, -30, 320, 30, 4)} fill={PAPER} sw={DW + 2} />
    </g>
);
const House: React.FC<{ x: number; k?: number }> = ({ x, k = 1 }) => (
    <g transform={`translate(${x} 0) scale(${k})`}>
        <Shape d="M-140 -170 L0 -290 L140 -170 Z" fill={STRAW} plate={MATCHA} />
        <Shape d={box(-120, -172, 240, 172, 6)} fill={PAPER} sw={SW} />
        <rect x={-88} y={-140} width={60} height={56} fill={INK} /><rect x={24} y={-120} width={64} height={120} fill={MATCHA} stroke={INK} strokeWidth={DW} />
    </g>
);
const Lens: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <line x1={50} y1={50} x2={118} y2={118} stroke={INK} strokeWidth={24} strokeLinecap="round" />
        <circle r={70} fill="none" stroke={STRAW} strokeWidth={DW} transform={`translate(${PX} ${PY})`} />
        <circle r={70} fill="none" stroke={INK} strokeWidth={SW + 4} />
    </g>
);
const Q: React.FC<{ x: number; y: number; f: number; at?: number; size?: number }> = ({ x, y, f, at, size = 120 }) =>
    on(f, at) ? <text x={x} y={y + (idle(f, 4) ? -4 : 0)} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={size * (1.15 - 0.15 * act(f, at, 6))} fill={STRAW} stroke={INK} strokeWidth={3}>?</text> : null;
const Arrow: React.FC<{ x0: number; x1: number; y: number; p: number }> = ({ x0, x1, y, p }) => {
    if (p <= 0) return null; const xe = x0 + (x1 - x0) * p;
    return <g><line x1={x0} y1={y} x2={xe} y2={y} stroke={INK} strokeWidth={SW + 2} strokeDasharray="22 14" />
        {p > 0.9 && <path d={`M${xe - 26} ${y - 22} L${xe + 6} ${y} L${xe - 26} ${y + 22} Z`} fill={INK} />}</g>;
};
// a coin that falls from y0 to y1 starting on frame `at` (12 frames, on twos)
const fall = (f: number, at: number, y0: number, y1: number, dur = 12) => y0 + (y1 - y0) * Math.min(1, Math.pow(cl(two(f - at) / dur), 2));

// THE SCENE (it.color = mode, steps = frames from the clip start)
//  buwaya     a hand drops coins in from frame 0 · [0] "?" + label A · [1] the buwaya lands on the lid, snaps the coin · [2] label B
//  campaign   a queue drops rings into the collection box from frame 0 · [0] label A (1998) · [1] the count rolls to 3.5 MILLION
//  tons       gold bars stack up from frame 0 · [0] the count rolls to 227 TONS · [1] label B
//  creditors  the gold stack · [0] it slides off to the right + label A · [1] dollars come back · [2] the creditors' bank takes them + label B
//  noslot     the alkansya UTANG NG PH has no slot · [0] label A + "?" · [1] the coin bounces off the lid + label B
//  questions  the alkansya + a clipboard · [0] label A · [1..3] each question lands with its pen loop
//  conditions [0] the coin hovers (sariling pera) · [1] the alkansya turns clear (TRANSPARENCY) · [2] the lens (AUDIT) · [3] the tag (GARANTIYA)
//             · [4] label B · [5] the coin drops in; label A swaps 1..3
//  hole       a person drops coins from frame 0 · [0] the bottom opens, coins fall through + label A · [1] the stack shrinks · [2] "?" + label B
//  choice     the ₱170,598 bundle · [0] the government hall + label A, bundle leans left · [1] the house + label B, bundle leans right
export const Alkansya: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), m = it.color || 'buwaya';
    const t = (i: number) => (st[i] === undefined ? 99999 : st[i]);
    const A = (txt: string | undefined, at: number, fill = STRAW, size = 44) => txt ? <Label x={0} y={RA} text={txt} s={s} size={size} fill={fill} f={f} at={at} /> : null;
    const B = (txt: string | undefined, at: number, fill = INK, size = 44) => txt ? <Label x={0} y={RB} text={txt} s={s} size={size} fill={fill} f={f} at={at} /> : null;
    let body: React.ReactNode = null;
    if (m === 'buwaya') {
        const croc = act(f, t(1), 8), snap = on(f, t(1)) ? (idle(f, 6) ? 1 : 0.15) : 0;
        const coinAt = (i: number) => 4 + i * 26;
        body = <g>
            <Pig x={-40} f={f} />
            {[0, 1, 2, 3].map((i) => {
                const a = coinAt(i); if (f < a || (on(f, t(1)) && a > t(1) - 26)) return null;
                const y = fall(f, a, -560, -350); return y < -352 ? <Coin key={i} x={-40} y={y} /> : null;
            })}
            {on(f, t(1)) && <g transform={`translate(0 ${-140 * (1 - croc)})`}><Croc x={-10} y={-345} k={1.1} open={snap} />
                {f < t(1) + 10 && <Coin x={-340} y={-372} k={0.9} />}</g>}
            <Q x={300} y={-380} f={f} at={t(0)} />
            {A(lab[0], t(0))}{B(lab[1], t(2))}
        </g>;
    } else if (m === 'campaign') {
        const n = 3.5 * ez(two(f - t(1)) / 24), q = two(f) / 2;
        body = <g>
            <Shape d={box(170, -260, 220, 260, 10)} fill={WHITE} plate={STRAW} />
            <rect x={170} y={-260} width={220} height={60} fill={INK} />
            <text x={280} y={-218} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} fill={WHITE}>GOLD</text>
            <rect x={230} y={-270} width={100} height={14} rx={5} fill={INK} />
            {Array.from({ length: 5 }, (_, i) => {
                const x = 90 - i * 110 - ((q * 3) % 110); const lift = i === 0 && (q % 37) > 22;
                return <g key={i}><Person x={x} h={250} f={f} walk />
                    {i === 0 ? (lift ? <Ring x={x + 62 + 80 * cl(((q % 37) - 22) / 12)} y={-210 - 70 * cl(((q % 37) - 22) / 12)} k={1.2} /> : <Ring x={x + 62} y={-200} k={1.1} />) : <Ring x={x + 62} y={-200} k={1.1} />}</g>;
            })}
            <rect x={-410} y={-300} width={10} height={300} fill="none" />
            {on(f, t(1)) && <text x={0} y={-430} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={96 * (1.1 - 0.1 * act(f, t(1), 6))} fill={STRAW} stroke={INK} strokeWidth={3}>{n.toFixed(1)} MILLION</text>}
            {A(lab[0], t(0))}
        </g>;
    } else if (m === 'tons') {
        const n = Math.round(227 * ez(two(f - t(0)) / 26));
        const rows = [5, 4, 3, 2, 1]; let k = 0; const bars: React.ReactNode[] = [];
        rows.forEach((cnt, r) => { for (let i = 0; i < cnt; i++) {
            const at = k * 5; k++;
            if (f < at) continue;
            const x = (i - (cnt - 1) / 2) * 124, y = -44 - r * 44;
            bars.push(<Bar key={k} x={x} y={fall(f, at, y - 70, y, 6)} k={1.08} />);
        } });
        body = <g>
            <Shape d={box(-360, -44, 720, 44, 6)} fill={INK} />
            <g transform="translate(0 -44)">{bars}</g>
            {on(f, t(0)) && <text x={0} y={-330} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={120 * (1.1 - 0.1 * act(f, t(0), 6))} fill={STRAW} stroke={INK} strokeWidth={3}>{n} TONS</text>}
            {B(lab[1], t(1))}
        </g>;
    } else if (m === 'creditors') {
        const go = act(f, t(0), 14), back = act(f, t(1), 10), take = act(f, t(2), 12);
        body = <g>
            <g transform={`translate(${-250 + 230 * go} 0)`}>
                {[[-62, -44], [62, -44], [0, -88]].map(([x, y], i) => <Bar key={i} x={x} y={y} k={1.0} />)}
                <Shape d={box(-130, -44, 260, 44, 6)} fill={INK} />
            </g>
            {on(f, t(1)) && [0, 1, 2, 3].map((i) => <Bill key={i} x={-20 + i * 34 - 140 * take + (on(f, t(2)) ? 240 * take : 0)} y={-210 - i * 34 - 40 * (1 - back) + (idle(f + i * 2, 6) ? -12 : 0)} r={[-10, 8, -4, 12][i]} k={1.15} />)}
            {on(f, t(2)) && <g><Hall x={260} k={0.95 * (1.08 - 0.08 * act(f, t(2), 8))} f={f} /></g>}
            <Arrow x0={-180} x1={120} y={-300} p={act(f, t(0), 12) * (on(f, t(2)) ? 0 : 1)} />
            {on(f, t(1)) && !on(f, t(2)) && <Arrow x0={60} x1={380} y={-150} p={cl((two(f - t(1)) % 30) / 18)} />}
            {A(lab[0], t(0))}{B(lab[1], t(2))}
        </g>;
    } else if (m === 'noslot') {
        const bounce = on(f, t(1)) ? cl(two(f - t(1)) / 16) : 0;
        const cy = on(f, t(1)) ? (bounce < 0.5 ? -560 + 200 * (bounce / 0.5) : -360 - 120 * Math.sin((bounce - 0.5) / 0.5 * Math.PI)) : -560;
        const cx = 40 + (on(f, t(1)) ? 200 * Math.max(0, bounce - 0.5) * 2 : 0);
        body = <g>
            <Pig x={40} f={f} slot={false} text="UTANG NG PH" />
            <Person x={-320} h={260} f={f} />
            <line x1={-300} y1={-210} x2={-200 + (on(f, t(1)) ? 0 : (idle(f, 6) ? 6 : -6))} y2={-300} stroke={INK} strokeWidth={22} strokeLinecap="round" />
            {!on(f, t(1)) ? <Coin x={-190} y={-320} /> : <Coin x={cx} y={cy} />}
            <Q x={310} y={-400} f={f} at={t(0)} />
            {A(lab[0], t(0))}{B(lab[1], t(1))}
        </g>;
    } else if (m === 'questions') {
        const qs = (it.h ? [] : []) as string[]; void qs;
        const rows = ['SAAN MAPUPUNTA?', 'SINO HAHAWAK?', 'PAANO IMO-MONITOR?'];
        body = <g>
            <Pig x={-280} k={0.5} f={f} />
            <g transform="translate(135 0)">
                <Shape d={box(-260, -440, 520, 440, 12)} fill={INK} plate={STRAW} />
                <rect x={-240} y={-414} width={480} height={396} fill={WHITE} />
                <Shape d={box(-60, -460, 120, 40, 8)} fill={PAPER} sw={DW + 2} />
                {rows.map((r, i) => {
                    const at = t(i + 1), y = -340 + i * 120;
                    return <g key={i}>
                        <rect x={-222} y={y - 32} width={40} height={40} fill="none" stroke={INK} strokeWidth={DW} />
                        {on(f, at) && <g transform={`translate(-166 ${y}) scale(${1.1 - 0.1 * act(f, at, 6)})`}>
                            <text x={0} y={0} fontFamily={ARIAL} fontWeight={700} fontSize={Math.min(40, 380 / (r.length * 0.7))} fill={INK}>{r}</text></g>}
                        {on(f, at) && <text x={-202} y={y + 2} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={50} fill={STRAW}>?</text>}
                    </g>;
                })}
                {[1, 2, 3].map((i) => on(f, t(i)) && f < t(i) + 40 ? <PenLoop key={i} cx={10} cy={-352 + (i - 1) * 120} rx={250} ry={42} f={f} at={t(i)} /> : null)}
            </g>
            {A(lab[0], t(0))}
        </g>;
    } else if (m === 'conditions') {
        const clear = on(f, t(1)), lens = act(f, t(2), 10), tag = act(f, t(3), 8);
        const sw = on(f, t(3)) ? 3 : on(f, t(2)) ? 2 : 1;
        const dropY = on(f, t(5)) ? fall(f, t(5), -470, -150, 14) : -470 + (idle(f, 5) ? -4 : 4);
        body = <g>
            <Pig x={-40} f={f} clear={clear} coins={clear ? 10 + Math.min(6, Math.floor(Math.max(0, f - t(5)) / 4)) : 0} text={clear ? '' : undefined} />
            {on(f, t(0)) && (dropY < -352 || !on(f, t(5))) && <Coin x={-40} y={dropY} k={1.1} />}
            {on(f, t(2)) && <g transform={`translate(${-320 + 120 * lens + (idle(f, 6) ? 6 : -6)} ${-260})`}><Lens x={0} y={0} k={0.9} /></g>}
            {on(f, t(3)) && <g transform={`translate(260 ${-150 - 40 * (1 - tag)}) rotate(${8 - 8 * tag})`}>
                <line x1={-40} y1={-90} x2={0} y2={-50} stroke={INK} strokeWidth={DW} />
                <Shape d={box(-10, -50, 150, 90, 10)} fill={MATCHA} plate={STRAW} />
                <circle cx={10} cy={-30} r={9} fill={WHITE} stroke={INK} strokeWidth={3} />
                <path d="M40 -10 l24 24 l44 -50" fill="none" stroke={WHITE} strokeWidth={12} />
            </g>}
            {on(f, t(1)) && A(['', 'TRANSPARENCY', 'INDEPENDENT AUDIT', 'GARANTIYA'][sw], sw === 1 ? t(1) : sw === 2 ? t(2) : t(3), MATCHA)}
            {!on(f, t(1)) && A(lab[0], t(0))}
            {B(lab[1], t(4))}
        </g>;
    } else if (m === 'hole') {
        const open = act(f, t(0), 8), cyc = 22;
        const left = on(f, t(1)) ? Math.max(1, 6 - Math.floor((f - t(1)) / 12)) : 6;
        body = <g>
            <Pig x={60} f={f} hole={open} />
            <Person x={-300} h={270} f={f} />
            <line x1={-280} y1={-220} x2={-90} y2={-400 + (idle(f, 6) ? 6 : -6)} stroke={INK} strokeWidth={22} strokeLinecap="round" />
            {Array.from({ length: left }, (_, i) => <Coin key={i} x={-300} y={-16 - i * 22} k={0.85} />)}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
                const a = 4 + i * cyc; if (f < a) return null;
                const y = fall(f, a, -440, -350, 8);
                if (f < a + 8) return <Coin key={i} x={60} y={y} />;
                if (!on(f, t(0)) || a + 8 < t(0)) return null;
                const p = cl(two(f - a - 8) / 14); if (p >= 1) return null;
                return <Coin key={i} x={60 + (rnd(i) - 0.5) * 60} y={-40 + 120 * p * p} k={1 - 0.4 * p} />;
            })}
            <Q x={300} y={-420} f={f} at={t(2)} />
            {A(lab[0], t(0))}{B(lab[1], t(2))}
        </g>;
    } else if (m === 'choice') {
        const l = act(f, t(0), 8), r = act(f, t(1), 8), lean = on(f, t(1)) ? 10 * r : -10 * l;
        body = <g>
            {on(f, t(0)) && <Hall x={-295} k={0.68 * (1.08 - 0.08 * l)} flag f={f} />}
            {on(f, t(1)) && <g transform={`translate(300 0) scale(${0.68 * (1.08 - 0.08 * r)})`}><House x={0} />
                <Person x={-200} h={200} f={f} /><Person x={200} h={150} f={f} /></g>}
            <g transform={`translate(0 ${-230 + (idle(f, 5) ? -4 : 0)}) rotate(${lean})`}>
                <Shape d={box(-150, -56, 300, 112, 10)} fill={STRAW} plate={MATCHA} />
                <rect x={-24} y={-56} width={48} height={112} fill={PAPER} stroke={INK} strokeWidth={DW} />
                <text x={0} y={-74} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={70} fill={INK}>₱170,598</text>
            </g>
            {A(lab[0], t(0))}{B(lab[1], t(1), INK)}
        </g>;
    }
    return <Stage it={it} f={f}>{body}<Ground /></Stage>;
};


// THE KOREAN FLAG (Taegukgi), user 2026-11-24: "add korean flag when i mention korea". item {kind:'kflag', x, y (centre), s, at}.
// 3:2 white field; the taeguk (red over blue, red head on the upper-left side) on the upper-left/lower-right diagonal;
// official colours red #cd2e3a / blue #0047a0 (checked against Commons Flag_of_South_Korea.svg); trigrams geon (top-left, 3 solid), gam (top-right), ri (bottom-left), gon (bottom-right, 3 broken), bars across the diagonal.
const KFlag: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const t0 = f - (it.at || 0); if (t0 < 0) return null;
    const k = (it.s || 1) * (1.1 - 0.1 * ez(two(t0) / 8)), W = 240, H = 160, R = H / 4, a = Math.atan2(H, W) * 180 / Math.PI;
    const bar = H / 24, gap = H / 48, len = H / 4;
    const tri = (cx: number, cy: number, ang: number, pat: number[]) => (
        <g transform={`translate(${cx} ${cy}) rotate(${ang})`}>
            {pat.map((solid, i) => {
                const x = (i - 1) * (bar + gap) - bar / 2;
                return solid ? <rect key={i} x={x} y={-len / 2} width={bar} height={len} fill={INK} />
                    : <g key={i}><rect x={x} y={-len / 2} width={bar} height={len * 0.46} fill={INK} /><rect x={x} y={len * 0.04} width={bar} height={len * 0.46} fill={INK} /></g>;
            })}
        </g>);
    const d = R * 1.5 + len * 0.55, ux = Math.cos(a * Math.PI / 180), uy = Math.sin(a * Math.PI / 180);
    const wob = idle(f, 6) ? 1.5 : -1.5;
    return (
        <g transform={`translate(${it.x} ${it.y}) rotate(${wob}) scale(${k})`} strokeLinejoin="round">
            <rect x={-W / 2 + PX} y={-H / 2 + PY} width={W} height={H} rx={6} fill={STRAW} />
            <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={6} fill={WHITE} stroke={INK} strokeWidth={SW} />
            <g transform={`rotate(${a})`}>
                <path d={`M${-R} 0 A${R} ${R} 0 0 1 ${R} 0 Z`} fill="#cd2e3a" />
                <path d={`M${-R} 0 A${R} ${R} 0 0 0 ${R} 0 Z`} fill="#0047a0" />
                <circle cx={-R / 2} cy={0} r={R / 2} fill="#cd2e3a" />
                <circle cx={R / 2} cy={0} r={R / 2} fill="#0047a0" />
            </g>
            {tri(-ux * d, -uy * d, a, [1, 1, 1])}
            {tri(ux * d, uy * d, a, [0, 0, 0])}
            {tri(ux * d, -uy * d, -a, [0, 1, 0])}
            {tri(-ux * d, uy * d, -a, [1, 0, 1])}
        </g>
    );
};

export const alkansyaScene = (it: KitItem, f: number, key: number): React.ReactNode | undefined =>
    it.kind === 'alkansya' ? <Alkansya key={key} it={it} f={f} /> : it.kind === 'kflag' ? <KFlag key={key} it={it} f={f} /> : undefined;
