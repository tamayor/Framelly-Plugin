// Before 2028 Ep. 20 ("ghost" flood control, 2026-11-23). Motif = THE FLOOD WALL on the river bank: built on paper,
// hidden under water, washed away, chopped by district. Built from the RisoKit drawing kit (same outline, plate,
// halftone, label strip and motion grammar). Scene coordinates: ground line y = 0, x -410..410, up = negative y.
// Label rows: A at y -600, B at y -510; drawings stay below y -470.
import React from 'react';
import { KitItem, Stage, Ground, Shape, Label, Person, PenLoop, box, act, on, idle, two, cl, ez, rnd,
    INK, PAPER, MATCHA, STRAW, WHITE, ARIAL, SW, DW, PX, PY } from './RisoKit';

const SERIF = 'EB Garamond, Georgia, serif';
const BANK = -260, WX0 = -170, WX1 = -100, WTOP = -455, BED = -40;
const RA = -600, RB = -510;

// a cash bundle: strawberry note, cream band, peso sign
const Bundle: React.FC<{ x: number; y: number; k?: number; r?: number }> = ({ x, y, k = 1, r = 0 }) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
        <rect x={-40} y={-22} width={80} height={44} rx={6} fill={STRAW} stroke={INK} strokeWidth={DW} />
        <rect x={-8} y={-22} width={16} height={44} fill={PAPER} stroke={INK} strokeWidth={3} />
        <text x={-24} y={10} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={26} fill={PAPER}>₱</text>
    </g>
);
// a small house: ink body, cream window, strawberry roof
const House: React.FC<{ x: number; y: number; k?: number; roof?: string }> = ({ x, y, k = 1, roof = STRAW }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M-56 -70 L0 -118 L56 -70 Z" fill={roof} stroke={INK} strokeWidth={DW} />
        <rect x={-46} y={-72} width={92} height={72} fill={INK} />
        <rect x={-30} y={-56} width={24} height={24} fill={PAPER} /><rect x={8} y={-40} width={22} height={40} fill={PAPER} />
    </g>
);
const Rain: React.FC<{ f: number; k?: number; x0?: number; x1?: number }> = ({ f, k = 1, x0 = -400, x1 = 400 }) => {
    const off = (two(f) * 16) % 90, n = Math.round(16 * k);
    return <g>{Array.from({ length: n }, (_, i) => {
        const x = x0 + (x1 - x0) * (i + 0.5) / n, y = -470 + ((off + rnd(i) * 90) % 90) + (i % 3) * 110;
        return <line key={i} x1={x} y1={y} x2={x - 14} y2={y + 46} stroke={INK} strokeWidth={DW} />;
    })}</g>;
};
const Cloud: React.FC<{ x: number; y: number; k?: number; f: number }> = ({ x, y, k = 1, f }) => (
    <g transform={`translate(${x + (idle(f, 6) ? 4 : -4)} ${y}) scale(${k})`}>
        <path d="M-110 30 Q-120 -10 -70 -12 Q-60 -50 -10 -40 Q20 -66 60 -36 Q110 -40 112 4 Q130 30 100 30 Z" fill={INK} transform={`translate(${PX} ${PY})`} opacity={0} />
        <path d="M-110 30 Q-120 -10 -70 -12 Q-60 -50 -10 -40 Q20 -66 60 -36 Q110 -40 112 4 Q130 30 100 30 Z" fill={INK} stroke={INK} strokeWidth={SW} />
        <path d="M-60 30 Q-40 10 -10 22 Q20 4 60 20" fill="none" stroke={PAPER} strokeWidth={DW} />
    </g>
);
// the magnifier the viewer checks with
const Lens: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <line x1={44} y1={44} x2={104} y2={104} stroke={INK} strokeWidth={22} strokeLinecap="round" />
        <circle r={62} fill={WHITE} fillOpacity={0.35} stroke={INK} strokeWidth={SW + 4} />
        <circle r={62} fill="none" stroke={STRAW} strokeWidth={DW} transform={`translate(${PX} ${PY})`} />
    </g>
);
const Q: React.FC<{ x: number; y: number; f: number; at?: number; size?: number }> = ({ x, y, f, at, size = 110 }) =>
    on(f, at) ? <text x={x} y={y + (idle(f, 4) ? -4 : 0)} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={size * (1.15 - 0.15 * act(f, at, 6))} fill={STRAW} stroke={INK} strokeWidth={3}>?</text> : null;
const Hardhat: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M-34 0 Q-34 -40 0 -40 Q34 -40 34 0 Z" fill={STRAW} stroke={INK} strokeWidth={DW} />
        <rect x={-44} y={-4} width={88} height={12} rx={5} fill={STRAW} stroke={INK} strokeWidth={DW} />
        <rect x={-6} y={-40} width={12} height={34} fill={PAPER} />
    </g>
);

// THE BASE: cross-section of the river bank. Town on the left bank, the flood wall at its edge, the river to the right.
type BaseP = { f: number; level?: number; muddy?: number; wall?: 'whole' | 'thin' | 'dashed' | 'none' | 'broken'; crack?: number; bed?: number; houses?: boolean };
const Base: React.FC<BaseP> = ({ f, level = -200, muddy = 0, wall = 'whole', crack = 0, bed = BED, houses = true }) => {
    const w = idle(f, 5) ? 7 : -7, L = level;
    const water = `M${WX1} ${L} Q0 ${L + w} 100 ${L} T300 ${L} T500 ${L} V0 H${WX1} Z`;
    const earth = `M${WX1} ${BANK} Q${WX1 + 30} ${bed - 10} ${WX1 + 110} ${bed} H410 V0 H${WX1} Z`;
    const over = L < WTOP && wall !== 'whole' && wall !== 'thin' || L < BANK && wall === 'none';
    return (
        <g>
            {/* the river: water down to the bed, muddy = halftone over it */}
            <path d={water} fill={MATCHA} stroke={INK} strokeWidth={SW} />
            {muddy > 0 && <path d={water} fill="url(#kitht)" opacity={cl(muddy)} />}
            {[0, 1, 2].map((i) => <path key={i} d={`M${-40 + i * 160} ${L + 34 + i * 4} q30 ${-16 + w} 60 0 q30 ${16 - w} 60 0`} fill="none" stroke={PAPER} strokeWidth={DW + 2} />)}
            <path d={earth} fill={PAPER} stroke={INK} strokeWidth={SW} />
            <path d={`M${WX1 + 60} ${bed + 8} H410 V0 H${WX1 + 40} Z`} fill="url(#kitht)" opacity={0.5} />
            {/* the bank with the town */}
            <Shape d={`M-410 ${BANK} H${WX1} V0 H-410 Z`} fill={PAPER} />
            <rect x={-400} y={BANK + 20} width={240} height={30} fill="url(#kitht)" />
            {houses && <g><House x={-330} y={BANK} k={1.1} /><House x={-215} y={BANK} k={0.9} roof={MATCHA} /></g>}
            {over && <path d={`M-410 ${Math.max(L, BANK - 70)} Q-300 ${Math.max(L, BANK - 70) + w} -200 ${Math.max(L, BANK - 70)} T${WX1} ${Math.max(L, BANK - 70)} V${BANK} H-410 Z`} fill={MATCHA} stroke={INK} strokeWidth={SW} />}
            {/* the flood wall: the hero */}
            {wall === 'whole' && <Shape d={box(WX0, WTOP, WX1 - WX0, BANK - WTOP + 6, 6)} fill={WHITE} plate={STRAW} />}
            {wall === 'whole' && [0, 1, 2].map((i) => <line key={i} x1={WX0 + 8} y1={WTOP + 50 + i * 50} x2={WX1 - 8} y2={WTOP + 50 + i * 50} stroke={INK} strokeWidth={DW} />)}
            {wall === 'thin' && <Shape d={box(WX0 + 18, WTOP, 24, BANK - WTOP + 6, 4)} fill={WHITE} plate={STRAW} />}
            {wall === 'dashed' && <rect x={WX0} y={WTOP} width={WX1 - WX0} height={BANK - WTOP} fill="none" stroke={MATCHA} strokeWidth={SW} strokeDasharray="18 12" />}
            {wall === 'broken' && <g>
                <g transform={`rotate(${28 * crack} ${WX1} ${BANK})`}><Shape d={box(WX0, WTOP + 70, WX1 - WX0, BANK - WTOP - 64, 6)} fill={WHITE} plate={STRAW} /></g>
                <Shape d={`M${WX0} ${BANK + 4} V${BANK - 70} L${WX0 + 20} ${BANK - 52} L${WX0 + 38} ${BANK - 78} L${WX1} ${BANK - 60} V${BANK + 4} Z`} fill={WHITE} />
            </g>}
            {crack > 0 && wall === 'whole' && <polyline points={`${WX0 + 30},${WTOP} ${WX0 + 14},${WTOP + 60} ${WX0 + 40},${WTOP + 110} ${WX0 + 20},${WTOP + 170}`.split(' ').slice(0, 1 + Math.round(crack * 3)).join(' ')} fill="none" stroke={STRAW} strokeWidth={9} />}
        </g>
    );
};

// FLOOD: the river-bank scene in one of its states (it.color = mode). steps = frames from the clip start.
//  budget     [0] the counter rolls to ₱240B+ · [1] label A · [2] cash bundles drop into the river
//  magnet     [0] the magnet drops over the wall + label A · [1] bundles stream into it · [2] label B
//  engineer   the floods keep coming over the wall · [0] label A · [1] the engineer unrolls the plan · [2] "?" + label B
//  underwater [0] money pours into the river + label A · [1] the water rises over the wall · [2] label B
//  check      the wall is under muddy water · [0] the lens sweeps · [1] "?" + label A
//  piles      [0] dredging (bed digs down) · [1] desilting · [2] sheet piles driven · [3] muddy water + label B; label A swaps text 0..2
//  paper      [0] dashed ON PAPER depth + label A · [1] the bill ₱ MILLIONS · [2] the storm, water goes muddy · [3] label B · [4] the 1 METER? pole
//  typhoon    rain from frame 0 · [0] the typhoon: clouds, water rises · [1] the wall breaks and floats off · [2] label A
//  thin       the wall in close-up: [0] the paid-for thickness is dashed, the poured one thin + label A · [1] the missing slice slides to an envelope · [2] label B
//  collapse   rain · [0] the weak dike cracks and falls · [1] the official walks in · [2] label A (blame) · [3] the new-budget form + label B
export const Flood: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), m = it.color || 'budget';
    const t = (i: number) => (st[i] === undefined ? 99999 : st[i]);
    const A = (txt: string | undefined, at: number, fill = STRAW, size = 44) => txt ? <Label x={0} y={RA} text={txt} s={s} size={size} fill={fill} f={f} at={at} /> : null;
    const B = (txt: string | undefined, at: number, fill = INK, size = 44) => txt ? <Label x={0} y={RB} text={txt} s={s} size={size} fill={fill} f={f} at={at} /> : null;
    if (m === 'thin') return <Thin it={it} f={f} />;
    let level = -200, muddy = 0, houses = true, wall: BaseP['wall'] = 'whole', crack = 0, bed = BED, extra: React.ReactNode = null, front: React.ReactNode = null;
    if (m === 'budget') {
        const n = Math.round(240 * ez(two(f - t(0)) / 24));
        extra = <g>
            {on(f, t(0)) && <text x={0} y={-560} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={122} fill={STRAW} stroke={INK} strokeWidth={3}>₱{n}B{n >= 240 ? '+' : ''}</text>}
            {on(f, t(2)) && [0, 1, 2, 3, 4, 5].map((i) => {
                const p = cl(two(f - t(2) - i * 4) / 14); if (f < t(2) + i * 4) return null;
                return <Bundle key={i} x={-20 + i * 70} y={-460 + 270 * p + (p >= 1 && idle(f + i, 4) ? -5 : 0)} k={0.9} r={[-12, 10, -6, 16, -14, 8][i]} />;
            })}
        </g>;
        front = B(lab[0], t(1), INK);
    } else if (m === 'magnet') {
        const d = act(f, t(0), 8), y = -560 + 150 * d, mx = 150;
        extra = <g>
            {on(f, t(1)) && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const p = cl(((two(f - t(1)) + i * 9) % 44) / 44), side = i % 2 ? 1 : -1;
                const x0 = side * 430, y0 = -120 - (i % 4) * 50;
                return <Bundle key={i} x={x0 + (mx - x0) * p} y={y0 + (y + 70 - y0) * p} k={0.75 - 0.25 * p} r={side * 20 * (1 - p)} />;
            })}
            {on(f, t(0)) && <g transform={`translate(${mx} ${y + (idle(f, 4) ? -4 : 0)})`}>
                <path d="M-110 -10 V40 A110 110 0 0 0 110 40 V-10 H50 V40 A50 50 0 0 1 -50 40 V-10 Z" transform={`translate(${PX} ${PY}) scale(1 -1) translate(0 -60)`} fill={INK} />
                <path d="M-110 -10 V40 A110 110 0 0 0 110 40 V-10 H50 V40 A50 50 0 0 1 -50 40 V-10 Z" transform="scale(1 -1) translate(0 -60)" fill={STRAW} stroke={INK} strokeWidth={SW} />
                <rect x={-110} y={70} width={60} height={34} fill={WHITE} stroke={INK} strokeWidth={DW} /><rect x={50} y={70} width={60} height={34} fill={WHITE} stroke={INK} strokeWidth={DW} />
            </g>}
        </g>;
        front = <g>{A(lab[0], t(0))}{B(lab[1], t(2))}</g>;
    } else if (m === 'engineer') {
        const surge = (Math.floor(two(f) / 30) % 2) ? 1 : 0, rise = ez(cl(((two(f) % 30)) / 14));
        level = -200 - (surge ? 250 * rise : 250 * (1 - rise));
        wall = 'whole';
        const u = act(f, t(1), 10);
        houses = false;
        extra = on(f, t(1)) ? <g transform={`translate(-330 ${BANK})`}>
            <Person x={0} h={160} f={f} />
            <Hardhat x={0} y={-172} k={0.8} />
            <g transform="translate(40 -150)"><Shape d={box(0, -10, 220 * u + 10, 130, 6)} fill={WHITE} plate={MATCHA} />
                {u > 0.6 && <g stroke={MATCHA} strokeWidth={DW} fill="none"><path d="M20 90 H200 M40 90 V20 H120 V90 M150 90 V40 H190 V90" /></g>}</g>
            {on(f, t(2)) && <PenLoop cx={150} cy={-95} rx={140} ry={90} f={f} at={t(2)} />}
        </g> : null;
        front = <g>{A(lab[0], t(0))}{B(lab[1], t(2))}{<Q x={240} y={-330} f={f} at={t(2)} />}</g>;
    } else if (m === 'underwater') {
        level = -200 - 260 * act(f, t(1), 14);
        muddy = act(f, t(1), 14) * 0.8;
        extra = on(f, t(0)) ? <g>{[0, 1, 2, 3, 4].map((i) => {
            const p = cl(((two(f - t(0)) + i * 10) % 50) / 50);
            return <Bundle key={i} x={-380 + 560 * p} y={-440 + (Math.min(level, -200) + 460) * p} k={0.8} r={30 * p - 10} />;
        })}</g> : null;
        front = <g>{A(lab[0], t(0))}{B(lab[1], t(2), INK, 40)}</g>;
    } else if (m === 'check') {
        level = -445; muddy = 0.85;
        const sw = act(f, t(0), 30), lx = -300 + 560 * sw;
        extra = <g>
            <rect x={WX0} y={WTOP + 10} width={WX1 - WX0} height={BANK - WTOP - 10} fill="none" stroke={PAPER} strokeWidth={DW} strokeDasharray="10 14" opacity={0.6} />
            {on(f, t(0)) && <Lens x={lx} y={-300 + (idle(f, 4) ? -4 : 0)} k={1.1} />}
        </g>;
        front = <g><Q x={150} y={-330} f={f} at={t(1)} size={130} />{A(lab[0], t(1), STRAW, 40)}</g>;
    } else if (m === 'piles') {
        const dig = act(f, t(0), 12), silt = 1 - act(f, t(1), 10), drive = act(f, t(2), 10), mud = act(f, t(3), 12);
        bed = BED - 10 + 0 * dig; level = -200; muddy = mud * 0.9; houses = false;
        const name = on(f, t(2)) ? 'SHEET PILES' : on(f, t(1)) ? 'DESILTING' : 'RIVER DREDGING';
        extra = <g>
            {/* silt mounds on the bed, scooped by the bucket */}
            {silt > 0 && [60, 200, 330].map((x, i) => <path key={i} d={`M${x - 70} ${BED} Q${x} ${BED - 70 * silt} ${x + 70} ${BED} Z`} fill={PAPER} stroke={INK} strokeWidth={DW} />)}
            {/* the sheet piles below the water, driven down on their word */}
            {on(f, t(2)) && [0, 1, 2, 3, 4, 5].map((i) => { const y = -330 + 100 * drive; return <rect key={i} x={150 + i * 34} y={y} width={28} height={-10 - y} fill={INK} stroke={STRAW} strokeWidth={3} />; })}
            {/* the excavator arm reaching in from the bank top */}
            {!on(f, t(3)) && <g transform={`translate(-260 ${BANK})`}>
                <Shape d={box(-90, -90, 150, 80, 10)} fill={STRAW} plate={INK} />
                <rect x={-80} y={-14} width={150} height={20} rx={10} fill={INK} />
                <path d={`M30 -80 L${200 + 60 * dig} ${-200 + 30 * dig} L${290 + 80 * dig} ${120 + 50 * dig + (idle(f, 6) ? 0 : 10)}`} fill="none" stroke={INK} strokeWidth={18} />
                <path d={`M${270 + 80 * dig} ${120 + 50 * dig} h60 l-14 40 h-36 Z`} fill={INK} />
            </g>}
            {mud > 0 && <path d={`M${WX1} -200 H410 V${BED} H${WX1 + 110} Q${WX1 + 30} ${BED - 10} ${WX1} ${BANK} Z`} fill={MATCHA} opacity={mud * 0.95} />}
            {mud > 0 && <path d={`M${WX1} -200 H410 V${BED} H${WX1 + 110} Q${WX1 + 30} ${BED - 10} ${WX1} ${BANK} Z`} fill="url(#kitht)" opacity={mud} />}
        </g>;
        front = <g>{on(f, t(0)) && <Label x={0} y={RA} text={name} s={s} f={f} at={on(f, t(2)) ? t(2) : on(f, t(1)) ? t(1) : t(0)} />}{B(lab[1], t(3))}</g>;
    } else if (m === 'paper') {
        const storm = act(f, t(2), 14);
        level = -200 - 80 * storm; muddy = storm * 0.85; houses = false;
        const pole = act(f, t(4), 8);
        extra = <g>
            {on(f, t(0)) && <path d={`M${WX1} ${BANK} Q${WX1 + 30} 20 ${WX1 + 110} 10 H400`} fill="none" stroke={WHITE} strokeWidth={SW + 2} strokeDasharray={`20 14`} opacity={1 - storm * 0.7} />}
            {on(f, t(0)) && <g opacity={1 - storm * 0.8}><rect x={130} y={-104} width={230} height={58} fill={MATCHA} stroke={INK} strokeWidth={DW} /><text x={245} y={-61} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} fill={WHITE}>DUG DEEP</text></g>}
            {on(f, t(1)) && <g transform={`translate(-280 ${-370 - 20 * (1 - act(f, t(1), 6))}) rotate(-5)`}>
                <Shape d={box(-125, -60, 250, 120, 8)} fill={WHITE} plate={STRAW} />
                <text x={0} y={-12} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={30} fill={INK}>BILL</text>
                <text x={0} y={34} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={42} fill={STRAW}>₱ MILLIONS</text>
            </g>}
            {on(f, t(2)) && <g><Rain f={f} k={0.8} x0={-80} x1={400} /><Cloud x={170} y={-430} f={f} k={1.1} /></g>}
            {on(f, t(4)) && <g transform={`translate(250 ${BED + 10})`}>
                <rect x={-12} y={-300 * pole} width={24} height={300 * pole} fill={WHITE} stroke={INK} strokeWidth={DW} />
                {[1, 2].map((i) => i * 100 < 300 * pole ? <line key={i} x1={-12} y1={-i * 100} x2={20} y2={-i * 100} stroke={STRAW} strokeWidth={DW} /> : null)}
                {pole > 0.9 && <Label x={-10} y={-345} text="1 METER?" s={s} size={40} fill={STRAW} />}
            </g>}
        </g>;
        front = <g>{A(lab[0], t(0), MATCHA)}{B(lab[1], t(3))}</g>;
    } else if (m === 'typhoon') {
        const ty = act(f, t(0), 10), br = act(f, t(1), 12);
        level = -200 - 120 * ty;
        wall = on(f, t(1)) ? 'none' : 'whole';
        extra = <g>
            <Rain f={f} k={0.6 + 0.6 * ty} />
            {on(f, t(0)) && <g><Cloud x={-230} y={-430} f={f} /><Cloud x={180} y={-440} k={1.2} f={f + 2} /></g>}
            {on(f, t(1)) && [0, 1, 2].map((i) => (
                <g key={i} transform={`translate(${WX0 + 30 + (120 + i * 110) * br} ${WTOP + 40 + i * 50 + (level + 150) * br * 0.0 + 60 * br}) rotate(${(i - 1) * 30 * br + 40 * br})`}>
                    <Shape d={box(-30, -26, 60, 52, 6)} fill={WHITE} plate={STRAW} />
                </g>))}
        </g>;
        front = A(lab[0], t(2));
    } else if (m === 'collapse') {
        const c = act(f, t(0), 12);
        wall = on(f, t(0)) ? 'broken' : 'whole'; crack = on(f, t(0)) ? c : 0; level = -200 - 90 * c; houses = false;
        const off = act(f, t(1), 10);
        extra = <g>
            <Rain f={f} k={0.7} x0={-60} x1={400} />
            <Cloud x={160} y={-430} f={f} />
            {on(f, t(1)) && <g transform={`translate(${-430 + 140 * off} ${BANK})`}>
                <Person x={0} h={180} f={f} sash walk={off < 1} />
                {on(f, t(3)) && <g transform={`translate(60 -170) rotate(${-6 + (idle(f, 6) ? 2 : 0)})`}>
                    <Shape d={box(0, -60, 160, 120, 8)} fill={WHITE} plate={STRAW} />
                    <text x={80} y={-14} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={26} fill={INK}>NEW</text>
                    <text x={80} y={30} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={26} fill={STRAW}>BUDGET ₱</text>
                </g>}
            </g>}
        </g>;
        front = <g>{A(lab[0], t(2), STRAW, 40)}{B(lab[1], t(3))}</g>;
    }
    return (
        <Stage it={it} f={f}>
            <Base f={f} level={level} muddy={muddy} wall={wall} crack={crack} bed={bed} houses={houses} />
            {extra}
            <Ground />
            {front}
        </Stage>
    );
};

// THIN: the wall in close-up next to its contract thickness.
const Thin: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|');
    const t = (i: number) => (st[i] === undefined ? 99999 : st[i]);
    const shrink = act(f, t(0), 10), slide = act(f, t(1), 14), H = 430, W0 = 300, W1 = 300 - 190 * shrink;
    const x0 = -260;
    return (
        <Stage it={it} f={f}>
            {/* the river side water behind the wall */}
            <path d={`M80 ${-250 + (idle(f, 5) ? 6 : -6)} Q240 -270 410 -250 V0 H80 Z`} fill={MATCHA} stroke={INK} strokeWidth={SW} />
            {/* the paid-for wall (dashed) and the poured one */}
            <rect x={x0} y={-H} width={W0} height={H} fill="none" stroke={MATCHA} strokeWidth={SW} strokeDasharray="20 12" />
            {on(f, t(0)) && !on(f, t(1)) && <text transform={`translate(${x0 + (W1 + W0) / 2 + 14} ${-H / 2}) rotate(-90)`} x={0} y={0} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} fill={MATCHA}>PAID FOR</text>}
            <Shape d={box(x0, -H, W1, H, 6)} fill={WHITE} plate={STRAW} />
            {[1, 2, 3, 4].map((i) => <line key={i} x1={x0 + 8} y1={-H + i * 86} x2={x0 + W1 - 8} y2={-H + i * 86} stroke={INK} strokeWidth={DW} />)}
            {/* the missing thickness: a strawberry slice that slides off into the envelope */}
            {on(f, t(0)) && !on(f, t(1)) && <rect x={x0 + W1} y={-H} width={W0 - W1} height={H} fill="url(#kitht)" opacity={0.6} />}
            {on(f, t(1)) && <g transform={`translate(${(x0 + W1) + 180 * slide} ${-H + 227 * slide}) scale(${1 - 0.55 * slide})`}>
                <rect x={0} y={0} width={W0 - 110} height={H} fill={STRAW} stroke={INK} strokeWidth={SW} />
                <text x={(W0 - 110) / 2} y={H / 2 + 30} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={90} fill={WHITE}>20%</text>
            </g>}
            {on(f, t(1)) && <g transform="translate(280 -120)">
                <Shape d={box(-110, -70, 220, 140, 8)} fill={PAPER} plate={STRAW} />
                <path d="M-110 -70 L0 10 L110 -70" fill="none" stroke={INK} strokeWidth={DW} />
                <text x={0} y={52} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} fill={STRAW}>₱</text>
            </g>}
            <Ground />
            {lab[0] && <Label x={0} y={RA} text={lab[0]} s={s} f={f} at={t(0)} />}
            {lab[1] && <Label x={0} y={RB} text={lab[1]} s={s} fill={INK} f={f} at={t(2)} />}
        </Stage>
    );
};

// LOT: the visible kind of project. A politician walks off with the budget; dashed outlines of the school and the court
// that were never built; neighbours walk up and see the empty lot.
// steps: [0] the politician grabs the cash and walks off · [1] dashed school · [2] dashed court · [3] neighbours + label A · [4] label B
export const Lot: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|');
    const t = (i: number) => (st[i] === undefined ? 99999 : st[i]);
    const go = act(f, t(0), 40), nb = act(f, t(3), 10);
    const dash = { fill: 'none', stroke: MATCHA, strokeWidth: SW, strokeDasharray: '18 12' };
    return (
        <Stage it={it} f={f}>
            <g transform="scale(1.3)">
            {/* the lot: bare ground with a fence post either side and the project sign */}
            <rect x={-400} y={-40} width={800} height={40} fill="url(#kitht)" opacity={0.5} />
            <g transform="translate(-228 0)">
                <rect x={-8} y={-250} width={16} height={250} fill={INK} />
                <Shape d={box(-80, -330, 160, 100, 8)} fill={WHITE} plate={MATCHA} />
                <text x={0} y={-290} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={26} fill={INK}>PROJECT</text>
                <text x={0} y={-252} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={26} fill={STRAW}>₱ BUDGET</text>
            </g>
            {on(f, t(1)) && <g opacity={on(f, t(4)) ? 0.35 : 1}><path d="M-210 0 V-230 H60 V0 M-230 -230 L-75 -330 L80 -230" {...dash} />
                {[0, 1, 2].map((i) => <rect key={i} x={-185 + i * 85} y={-190} width={50} height={50} {...dash} strokeWidth={DW} />)}</g>}
            {on(f, t(2)) && <g opacity={on(f, t(4)) ? 0.35 : 1}><path d="M120 0 V-260 M120 -260 h70 v50 h-70" {...dash} /><ellipse cx={155} cy={-200} rx={34} ry={10} {...dash} strokeWidth={DW} />
                </g>}
            {/* the politician with the budget, walking off right */}
            {go < 1 && <g transform={`translate(${-120 + 460 * go} 0)`}><Person x={0} h={200} f={f} sash walk={on(f, t(0))} />
                <Bundle x={44} y={-110} k={1} r={-10} /><Bundle x={52} y={-80} k={1} r={8} /></g>}
            {on(f, t(3)) && <g transform={`translate(${-60 - 80 * (1 - nb)} 0)`}>{[0, 1, 2].map((i) => <Person key={i} x={-120 + i * 110 + 200} h={170 - i * 12} f={f} lean={idle(f + i, 6) ? 3 : -3} />)}</g>}
            </g>
            <Ground />
            {lab[0] && <Label x={0} y={RA} text={lab[0]} s={s} f={f} at={t(3)} />}
            {lab[1] && <Label x={0} y={RB} text={lab[1]} s={s} fill={INK} f={f} at={t(4)} />}
        </Stage>
    );
};

// SEGMENTS: the river seen from above, flood walls along its banks.
// n = 0 (fragmented): [0] wall pieces of different sizes pop in one by one + label A · [1] water spills through the gaps + label B
// n = 1 (chopped):    [0] the one master plan, dashed along both banks + label A · [1] district lines chop it, label A -> text[2]
//                     · [2] a price tag on each piece · [3] a contractor's hardhat on each piece + label B
export const Segments: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), chop = (it.n || 0) === 1;
    const t = (i: number) => (st[i] === undefined ? 99999 : st[i]);
    const w = idle(f, 5) ? 6 : -6, cy = -270;
    const river = `M-410 ${cy - 60} C-250 ${cy - 130 + w} -120 ${cy + 10} 40 ${cy - 60} C180 ${cy - 120} 280 ${cy - 30 + w} 410 ${cy - 80} V${cy + 40} C280 ${cy + 90} 180 ${cy} 40 ${cy + 60} C-120 ${cy + 130} -250 ${cy + w} -410 ${cy + 60} Z`;
    const pieces = [[-400, -300], [-270, -210], [-170, -40], [0, 70], [110, 260], [300, 400]];
    const top = (x: number) => cy - 60 - 70 * Math.sin((x + 410) / 820 * Math.PI * 2) * 0.6, bot = (x: number) => cy + 60 - 70 * Math.sin((x + 410) / 820 * Math.PI * 2) * 0.6;
    const dist = [-220, 90];
    return (
        <Stage it={it} f={f}>
            <rect x={-410} y={-470} width={820} height={440} fill={PAPER} stroke={INK} strokeWidth={SW} />
            <rect x={-400} y={-90} width={800} height={50} fill="url(#kitht)" opacity={0.5} />
            <Shape d={river} fill={MATCHA} />
            {[0, 1, 2].map((i) => <path key={i} d={`M${-300 + i * 260} ${cy + (i - 1) * 10} q30 ${-12 + w} 60 0 q30 ${12 - w} 60 0`} fill="none" stroke={PAPER} strokeWidth={DW + 2} />)}
            {chop && on(f, t(0)) && <g fill="none" stroke={MATCHA} strokeWidth={SW} strokeDasharray="16 12">
                <path d={`M-400 ${top(-400) - 34} ${Array.from({ length: 17 }, (_, i) => `L${-400 + i * 50} ${top(-400 + i * 50) - 34}`).join(' ')}`} />
                <path d={`M-400 ${bot(-400) + 34} ${Array.from({ length: 17 }, (_, i) => `L${-400 + i * 50} ${bot(-400 + i * 50) + 34}`).join(' ')}`} />
            </g>}
            {(chop ? on(f, t(1)) : true) && pieces.map(([a, b], i) => {
                const at = chop ? t(1) + i * 4 : t(0) + i * 5; if (f < at) return null;
                const k = 1.12 - 0.12 * ez(two(f - at) / 6), mid = (a + b) / 2, hgt = [26, 18, 34, 22, 30, 20][i];
                return <g key={i} transform={`translate(${mid} 0) scale(${k}) translate(${-mid} 0)`}>
                    <path d={`M${a} ${top(a) - 28} L${b} ${top(b) - 28}`} stroke={INK} strokeWidth={hgt + 12} />
                    <path d={`M${a} ${top(a) - 28} L${b} ${top(b) - 28}`} stroke={i % 2 ? WHITE : PAPER} strokeWidth={hgt} />
                    <path d={`M${a + 20} ${bot(a + 20) + 28} L${b - 20} ${bot(b - 20) + 28}`} stroke={INK} strokeWidth={hgt + 12} />
                    <path d={`M${a + 20} ${bot(a + 20) + 28} L${b - 20} ${bot(b - 20) + 28}`} stroke={i % 2 ? PAPER : WHITE} strokeWidth={hgt} />
                </g>;
            })}
            {!chop && on(f, t(1)) && [[-235, 1], [-60, -1], [85, 1], [280, -1]].map(([x, d], i) => {
                const p = act(f, t(1) + i * 6, 12), y = d > 0 ? top(x) - 40 : bot(x) + 40;
                return f >= t(1) + i * 6 ? <ellipse key={i} cx={x} cy={y - d * 40 * p} rx={50 * p + 10} ry={26 * p + 6} fill={MATCHA} stroke={INK} strokeWidth={DW} /> : null;
            })}
            {chop && on(f, t(1)) && dist.map((x, i) => <g key={i}><line x1={x} y1={-470} x2={x} y2={-40} stroke={STRAW} strokeWidth={DW + 2} strokeDasharray="22 12" /></g>)}
            {chop && on(f, t(1)) && ['D1', 'D2', 'D3'].map((d, i) => <text key={d} x={[-320, -70, 250][i]} y={-80} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} fill={STRAW}>{d}</text>)}
            {chop && on(f, t(2)) && pieces.map(([a, b], i) => f >= t(2) + i * 4 ? <g key={i} transform={`translate(${(a + b) / 2} ${top((a + b) / 2) - 80})`}>
                <path d="M-36 -20 H24 L40 0 L24 20 H-36 Z" fill={STRAW} stroke={INK} strokeWidth={DW} /><text x={-4} y={10} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={26} fill={WHITE}>₱₱</text></g> : null)}
            {chop && on(f, t(3)) && pieces.map(([a, b], i) => f >= t(3) + i * 4 ? <Hardhat key={i} x={(a + b) / 2} y={bot((a + b) / 2) + 96 + (idle(f + i, 4) ? -3 : 0)} k={0.8} /> : null)}
            <Ground />
            {lab[0] && <Label x={0} y={RA} text={chop && on(f, t(1)) ? (lab[2] || lab[0]) : lab[0]} s={s} f={f} at={chop && on(f, t(1)) ? t(1) : t(0)} fill={chop && !on(f, t(1)) ? MATCHA : STRAW} />}
            {lab[1] && <Label x={0} y={RB} text={lab[1]} s={s} fill={INK} f={f} at={chop ? t(3) : t(1)} />}
        </Stage>
    );
};

// YARDS: ten neighbours, each building a wall in their own backyard; the main street drain in front stays clogged.
// n = 0: [0] the walls go up one by one + label A · [1] the drain gets the pen loop + its X + label B
// n = 1: walls and the clogged drain already there · [0] the water spills over from house to house + label A
export const Yards: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|'), after = (it.n || 0) === 1;
    const t = (i: number) => (after ? -1 : st[i] === undefined ? 99999 : st[i]);
    const xs = [-300, -100, 100, 300], hw = [150, 230, 120, 190], wc = [WHITE, STRAW, PAPER, MATCHA], K = 1.55, SY = -90;
    const sp = after ? (st[0] === undefined ? 99999 : st[0]) : 99999;
    // the walls keep going up course by course (every 12 frames) until the drain line, so the yard is never still
    const gh = (i: number) => after ? 1 : Math.min(1, 0.35 + 0.65 * Math.floor(Math.max(0, f - t(0) - i * 8) / 12) * 12 / Math.max(1, (st[1] === undefined ? 130 : st[1] - t(0)) - 24));
    const w = idle(f, 5) ? 6 : -6;
    return (
        <Stage it={it} f={f}>
            {xs.map((x, i) => <g key={i}>
                {(after || f >= i * 6) && <House x={x - 20} y={SY} k={K * (after ? 1 : 1.1 - 0.1 * ez(two(f - i * 6) / 6))} roof={i % 2 ? MATCHA : STRAW} />}
                {/* each one's own random wall, right of its house */}
                {(after || f >= t(0) + i * 8) && <g transform={`translate(${x + 84} ${SY}) scale(1 ${after ? 1 : 1.12 - 0.12 * ez(two(f - t(0) - i * 8) / 6)})`}>
                    <Shape d={box(-10, -hw[i] * gh(i), 22 + (i % 2) * 8, hw[i] * gh(i), 4)} fill={wc[i]} sw={DW} />
                </g>}
            </g>)}
            {/* the water: from the first yard it spills over each wall into the next house */}
            {on(f, sp) && xs.map((x, i) => {
                const p = act(f, sp + i * 10, 12); if (f < sp + i * 10) return null;
                const x0 = x - 100, x1 = x + 100, top = SY - 30 - 60 * p;
                return <g key={i}>
                    <path d={`M${x0} ${SY} V${top} Q${x0 + 50} ${top - w} ${x} ${top} T${x1} ${top} V${SY} Z`} fill={MATCHA} stroke={INK} strokeWidth={DW} />
                    {i < 3 && p > 0.5 && <path d={`M${x + 84} ${SY - hw[i] * 0.9} q40 -30 ${70} ${hw[i] * 0.6}`} fill="none" stroke={MATCHA} strokeWidth={22} />}
                </g>;
            })}
            {/* the street with the main drain */}
            <rect x={-410} y={SY} width={820} height={-SY} fill={PAPER} stroke={INK} strokeWidth={SW} />
            {[-300, -130, 130, 300].map((x) => <rect key={x} x={x - 34} y={SY / 2 - 5} width={68} height={10} fill={INK} />)}
            <g transform={`translate(0 ${SY / 2})`}>
                <Shape d={box(-110, -30, 220, 60, 8)} fill={INK} plate={STRAW} />
                {[-80, -40, 0, 40, 80].map((x) => <rect key={x} x={x - 7} y={-22} width={14} height={44} fill={PAPER} />)}
                <path d="M-90 -8 q24 -22 48 0 q24 16 52 -4 q20 -12 48 8" fill="none" stroke={MATCHA} strokeWidth={DW + 4} />
            </g>
            {!after && on(f, t(1) + 12) && (() => { const k = Math.min(1, Math.floor((f - t(1) - 12) / 8) * 8 / 60), w2 = 120 + 260 * k;
                return <path d={`M${-w2} ${SY + 6} Q${-w2 / 2} ${SY - 18 - 10 * k + (idle(f, 4) ? 4 : -4)} 0 ${SY - 14 - 10 * k} T${w2} ${SY + 6} Z`} fill={MATCHA} stroke={INK} strokeWidth={DW} />; })()}
            {!after && on(f, t(1)) && <g><PenLoop cx={0} cy={SY / 2} rx={160} ry={56} f={f} at={t(1)} />
</g>}
            <Ground />
            {lab[0] && <Label x={0} y={RA} text={lab[0]} s={s} f={f} at={after ? sp : t(0)} size={after ? 44 : 40} />}
            {lab[1] && <Label x={0} y={RB} text={lab[1]} s={s} fill={INK} f={f} at={t(1)} />}
        </Stage>
    );
};

// COA: the COA report, the exact location pinned on the bank, the wall that exists on paper (dashed), and the check.
// steps: [0] the report lands + label A · [1] the pin drops on the bank · [2] the dashed wall on paper · [3] the lens + "?" + label B
export const Coa: React.FC<{ it: KitItem; f: number }> = ({ it, f }) => {
    const s = it.s || 1, st = it.steps || [], lab = (it.text || '').split('|');
    const t = (i: number) => (st[i] === undefined ? 99999 : st[i]);
    const pin = act(f, t(1), 8);
    return (
        <Stage it={it} f={f}>
            <Base f={f} wall="none" houses={false} />
            {on(f, t(0)) && <g transform={`translate(-290 -290) rotate(-4) scale(${0.85 * (1.1 - 0.1 * act(f, t(0), 6))})`}>
                <Shape d={box(-100, -190, 200, 250, 8)} fill={WHITE} plate={STRAW} />
                <rect x={-100} y={-190} width={200} height={56} fill={INK} />
                <text x={0} y={-150} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} fill={WHITE}>COA</text>
                {[0, 1, 2, 3].map((i) => <line key={i} x1={-74} y1={-100 + i * 36} x2={i === 3 ? 20 : 74} y2={-100 + i * 36} stroke={INK} strokeWidth={DW} />)}
                <rect x={-74} y={-28} width={110} height={18} fill={STRAW} opacity={0.8} />
            </g>}
            {on(f, t(1)) && <g transform={`translate(-130 ${BANK - 30 - 60 * (1 - pin)})`}>
                <path d="M0 0 C-40 -50 -44 -70 -44 -86 A44 44 0 0 1 44 -86 C44 -70 40 -50 0 0 Z" fill={STRAW} stroke={INK} strokeWidth={SW} />
                <circle cx={0} cy={-86} r={16} fill={WHITE} stroke={INK} strokeWidth={DW} />
            </g>}
            {on(f, t(2)) && <g><rect x={WX0} y={WTOP + 40} width={WX1 - WX0 + 10} height={BANK - WTOP - 40} fill="none" stroke={MATCHA} strokeWidth={SW} strokeDasharray="18 12" transform="translate(-6 0)" />
                <text x={WX0 + 30} y={BANK + 60} textAnchor="middle" fontFamily={ARIAL} fontWeight={700} fontSize={40} fill={MATCHA}>ON PAPER</text></g>}
            {on(f, t(3)) && <g><Lens x={130 + (idle(f, 6) ? 6 : -6)} y={-330} k={0.9} /><Q x={310} y={-300} f={f} at={t(3)} size={120} /></g>}
            <Ground />
            {lab[0] && <Label x={0} y={RA} text={lab[0]} s={s} f={f} at={t(0)} />}
            {lab[1] && <Label x={0} y={RB} text={lab[1]} s={s} fill={INK} f={f} at={t(3)} />}
        </Stage>
    );
};

export const floodScene = (it: KitItem, f: number, key: number): React.ReactNode | undefined => {
    switch (it.kind) {
        case 'flood': return <Flood key={key} it={it} f={f} />;
        case 'lot': return <Lot key={key} it={it} f={f} />;
        case 'segments': return <Segments key={key} it={it} f={f} />;
        case 'yards': return <Yards key={key} it={it} f={f} />;
        case 'coa': return <Coa key={key} it={it} f={f} />;
        default: return undefined;
    }
};
