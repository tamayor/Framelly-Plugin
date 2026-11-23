// Talk accent (Before 2028, from Ep. 11, user 2026-11-17: "add animated minimalist overlay to all active speaking shot ...
// either word text emphasis in the portion or something related doodle about being spoken"; then "give it a riso vibe").
// Over a talking-head shot, in the empty space above the speaker's head: ONE key word of the line printed riso-style (ink
// EB Garamond italic on a cream paper strip, a strawberry plate printed out of register behind it, soy-ink mottling and
// paper tooth on every ink) cut in on its spoken frame and settling 110 % -> 100 %, plus an optional pen mark (underline /
// circle) and ONE flat riso doodle that acts the line out (ghost, cycle arrows, speech bubble, hearts, a hanging tarp,
// flood waves, the word fading away), shaded with halftone dots, its second ink misregistered. Use with `hand: true`
// (stop motion on twos + line boil). Positions are in a 1080 x 1920 design frame (`cx`, `cy` = the word's centre / baseline).
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, clamp, ease } from '../lib/common';
import { draw, roughEllipse, roughLine } from '../lib/doodle';

const INK = '#1c2738', CREAM = '#efe4cc', STRAW = '#c7385a', MATCHA = '#3f7f45';
const HEART = 'M0 34 C-42 6 -40 -34 -17 -34 C-6 -34 0 -26 0 -19 C0 -26 6 -34 17 -34 C40 -34 42 6 0 34 Z';
const GHOST = 'M-48 40 L-48 -14 C-48 -48 -24 -70 0 -70 C24 -70 48 -48 48 -14 L48 40 L32 26 L16 40 L0 26 L-16 40 L-32 26 Z';
const MIS = { x: 9, y: 7 };   // the second plate's misregistration

type P = { word?: string; wordAt?: number; size?: number; cx?: number; cy?: number; mark?: string; markAt?: number;
    doodle?: string; doodleAt?: number; color?: string; strip?: boolean; border?: boolean | string; stickers?: string };

export const settle = (t: number) => (t < 0 ? 0 : 1.1 - 0.1 * ease(clamp(Math.floor(t / 2) * 2 / 8)));

// Riso defs: the soy-ink mottle + paper tooth (knocks speckles and soft patches out of every ink) and halftone dots.
// The noise seed changes every 4 frames, like the line boil, so the print "breathes" on twos.
const Defs: React.FC<{ seed: number }> = ({ seed }) => (
    <defs>
        <filter id="ta-riso" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} result="tooth" />
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={seed + 40} result="mottle" />
            <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 3.15" result="t" />
            <feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.22" result="m" />
            <feComposite in="t" in2="m" operator="arithmetic" k1={1} result="mask" />
            <feComposite in="SourceGraphic" in2="mask" operator="in" />
        </filter>
        <pattern id="ta-dots" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx={5} cy={5} r={2.6} fill={INK} />
        </pattern>
    </defs>
);


// ---- context stickers (Ep. 16, user 2026-11-22: "add elements / sticker in talking heads to improve the context") ----
// Die-cut riso stickers at the side edges of the speaking shot, outside the face: a cream disc with an ink outline and a
// strawberry plate out of register, a flat icon of the thing being said. `stickers` = JSON [{kind, side: 'l'|'r', slot: 0|1, at}]
// (`at` = frames from the clip start, on the spoken word). Pop in at 110 % settling on twos, then bob.
const ST = 5;   // inner outline
export const icon = (kind: string): React.ReactNode => {
    const o = { stroke: INK, strokeWidth: ST, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
    switch (kind) {
        case 'gift': return <g {...o}><rect x={-40} y={-14} width={80} height={54} rx={6} fill={MATCHA} /><rect x={-47} y={-32} width={94} height={20} rx={6} fill={MATCHA} /><rect x={-8} y={-32} width={16} height={72} fill={CREAM} /><path d="M0 -32 q-34 -40 -42 -8 q24 14 42 8 q18 6 42 -8 q-8 -32 -42 8" fill={CREAM} /></g>;
        case 'palm': return <g {...o}><path d="M-26 44 L-30 12 L-52 -6 Q-62 -16 -52 -22 Q-44 -24 -38 -16 L-30 -4 L-30 -14 A7.5 7.5 0 0 1 -15 -14 L-15 -6 L-15 -30 A7.5 7.5 0 0 1 0 -30 L0 -6 L0 -38 A7.5 7.5 0 0 1 15 -38 L15 -6 L15 -28 A7.5 7.5 0 0 1 30 -28 L30 14 L26 44 Z" fill={CREAM} /></g>;
        case 'fist': return <g {...o}><rect x={-36} y={-30} width={72} height={62} rx={20} fill={CREAM} /><path d="M-12 -30 v24 M12 -30 v24" /><rect x={-30} y={32} width={60} height={16} fill={STRAW} /></g>;
        case 'family': return <g stroke={INK} strokeWidth={4} strokeLinejoin="round"><circle cx={-30} cy={-34} r={12} fill={INK} /><rect x={-46} y={-20} width={32} height={58} rx={12} fill={INK} /><circle cx={26} cy={-30} r={12} fill={STRAW} /><rect x={10} y={-16} width={32} height={54} rx={12} fill={STRAW} /><circle cx={-2} cy={-2} r={9} fill={MATCHA} /><rect x={-12} y={8} width={20} height={30} rx={8} fill={MATCHA} /></g>;
        case 'hall': return <g {...o}><path d="M-52 -14 L0 -50 L52 -14 Z" fill={STRAW} /><rect x={-46} y={-12} width={92} height={10} fill={CREAM} />{[-34, -12, 10, 32].map((x) => <rect key={x} x={x - 6} y={-2} width={12} height={36} fill={CREAM} />)}<rect x={-54} y={34} width={108} height={12} fill={INK} /></g>;
        case 'ledger': return <g {...o}><rect x={-42} y={-44} width={84} height={90} rx={8} fill={CREAM} /><rect x={-42} y={-44} width={84} height={16} fill={INK} /><path d="M-28 -10 H28 M-28 6 H28 M-28 22 H10" stroke={STRAW} strokeWidth={6} /></g>;
        case 'heart': return <g transform="scale(1.7)" stroke={INK} strokeWidth={ST / 1.7} strokeLinejoin="round"><path d={HEART} fill={MATCHA} /></g>;
        case 'brokenheart': return <g><g transform="scale(1.7)" stroke={INK} strokeWidth={ST / 1.7} strokeLinejoin="round"><path d={HEART} fill={STRAW} /></g><path d="M-4 -36 L10 -10 L-10 6 L6 38" fill="none" stroke={INK} strokeWidth={ST} strokeLinejoin="round" /></g>;
        case 'help': return <g><g transform="translate(0 -40) scale(0.8)" stroke={INK} strokeWidth={ST} strokeLinejoin="round"><path d={HEART} fill={MATCHA} /></g><g transform="translate(0 26) scale(0.75)" {...o}><path d="M-26 44 L-30 12 L-52 -6 Q-62 -16 -52 -22 Q-44 -24 -38 -16 L-30 -4 L-30 -14 A7.5 7.5 0 0 1 -15 -14 L-15 -6 L-15 -30 A7.5 7.5 0 0 1 0 -30 L0 -6 L0 -38 A7.5 7.5 0 0 1 15 -38 L15 -6 L15 -28 A7.5 7.5 0 0 1 30 -28 L30 14 L26 44 Z" fill={CREAM} /></g></g>;
        case 'check': return <g><circle r={48} fill={MATCHA} stroke={INK} strokeWidth={ST} /><path d="M-24 2 l16 18 l32 -38" fill="none" stroke={CREAM} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" /></g>;
        case 'cheque': return <g {...o}><rect x={-58} y={-30} width={116} height={64} rx={6} fill={CREAM} /><path d="M-44 -14 H20 M-44 2 H0" stroke={INK} strokeWidth={3} /><path d="M-4 24 q8 -22 14 -2 q6 -20 14 0 q8 -12 16 -6" fill="none" stroke={STRAW} strokeWidth={5} /><rect x={30} y={-24} width={20} height={14} fill={MATCHA} /></g>;
        case 'coins': return <g {...o}>{[22, 2, -18, -38].map((y, i) => <g key={i}><ellipse cx={0} cy={y + 8} rx={42} ry={14} fill={MATCHA} /><ellipse cx={0} cy={y} rx={42} ry={14} fill={CREAM} /></g>)}</g>;
        case 'handshake': return <g {...o}><rect x={-62} y={-18} width={34} height={36} rx={6} fill={INK} /><rect x={28} y={-18} width={34} height={36} rx={6} fill={STRAW} /><rect x={-30} y={-24} width={60} height={46} rx={14} fill={CREAM} /><path d="M-14 -24 v20 M2 -24 v20 M18 -24 v20" /></g>;
        case 'cross': return <g><circle r={48} fill={STRAW} stroke={INK} strokeWidth={ST} /><path d="M-22 -22 L22 22 M22 -22 L-22 22" stroke={CREAM} strokeWidth={13} strokeLinecap="round" /></g>;
        case 'pawn': return <g {...o}><circle cx={0} cy={-30} r={16} fill={INK} /><path d="M-12 -16 H12 L18 20 H-18 Z" fill={INK} /><rect x={-30} y={20} width={60} height={14} rx={6} fill={INK} /><rect x={-22} y={-14} width={44} height={8} fill={STRAW} /></g>;
        case 'eye': return <g {...o}><path d="M-56 0 Q0 -50 56 0 Q0 50 -56 0 Z" fill={CREAM} /><circle r={20} fill={INK} /><circle cx={-6} cy={-6} r={6} fill={CREAM} stroke="none" /></g>;
        default: return null;
    }
};
const Stickers: React.FC<{ list: { kind: string; side?: string; slot?: number; at?: number; bare?: boolean }[]; f: number }> = ({ list, f }) => (
    <g>{list.map((s, i) => {
        const t = f - (Number(s.at) || 0);
        if (t < 0) return null;
        const x = s.side === 'r' ? 920 : 160, y = (s.slot ? 1060 : 790) + (Math.floor(f / 4) % 2 ? -4 : 0), k = settle(t), rot = (s.side === 'r' ? 5 : -5) + (i % 2 ? 2 : -2);
        return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${k})`} style={{ filter: 'url(#ta-riso)' }}>
                {/* bare element (edit prompt: talking-shot elements have no disc) or the older die-cut disc */}
                {!s.bare && <circle r={80} cx={MIS.x} cy={MIS.y} fill={i % 2 ? MATCHA : STRAW} />}
                {!s.bare && <circle r={80} fill="#fbfaf6" stroke={INK} strokeWidth={6} />}
                <g transform={s.bare ? 'scale(1.35)' : 'scale(0.9)'}>{icon(s.kind)}</g>
            </g>
        );
    })}</g>
);

export const TalkAccent: React.FC<P> = (p) => {
    const f = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const word = String(p.word ?? ''), size = Number(p.size) || 112;
    const cx = Number(p.cx ?? 540), cy = Number(p.cy ?? 330);
    const wAt = Number(p.wordAt) || 0, mAt = p.markAt === undefined ? wAt + 6 : Number(p.markAt), dAt = p.doodleAt === undefined ? wAt : Number(p.doodleAt);
    const doodle = String(p.doodle || 'none'), mark = String(p.mark || 'none');
    const tw = Math.max(size, word.length * size * 0.43);           // EB Garamond italic: ~0.43 em per letter
    const tW = f - wAt, tM = f - mAt, tD = f - dAt;
    const k = settle(tW);
    const borderMode = p.border === true ? 'riso' : (p.border && p.border !== 'none' ? String(p.border) : 'none');
    const boxed = doodle === 'bubble' || doodle === 'tarp';
    const strip = p.strip !== false && !boxed;
    let stickersList: { kind: string; side?: string; slot?: number; at?: number; bare?: boolean }[] = [];
    try { stickersList = p.stickers ? JSON.parse(String(p.stickers)) : []; } catch { stickersList = []; }
    const letters = word.split('');
    const gone = (i: number) => doodle === 'fade' && tD >= 0 && tD >= 10 + i * 3;   // letters vanish one by one
    const midY = cy - size * 0.32;
    const text = (dx: number, dy: number, color: string) => (
        <text x={cx + dx} y={cy + dy} textAnchor="middle" fontFamily={FONT.garamondItalic} fontWeight={600} fontSize={size} fill={color}>
            {letters.map((c, i) => <tspan key={i} opacity={gone(i) ? 0 : 1}>{c}</tspan>)}
        </text>
    );
    // the cream strip the word is printed on: slightly tilted, its strawberry block out of register, halftone on the lower part
    const sx = cx - tw / 2 - 38, sy = cy - size * 0.98, sw = tw + 76, sh = size * 1.28;
    const R = { filter: 'url(#ta-riso)' };
    return (
        <svg width={width} height={height} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
            <Defs seed={1 + (Math.floor(f / 4) % 6)} />
            {borderMode !== 'none' && <RisoBorder mode={borderMode} frame={f} />}
            {/* doodles printed behind the word */}
            {doodle === 'bubble' && tD >= 0 && (
                <g transform={`translate(${cx} ${midY}) scale(${settle(tD)}) translate(${-cx} ${-midY})`}>
                    <path d={bubble(cx, midY, tw / 2 + 50, size * 0.72)} fill={STRAW} transform={`translate(${MIS.x + 3} ${MIS.y + 3})`} {...R} />
                    <path d={bubble(cx, midY, tw / 2 + 50, size * 0.72)} fill={CREAM} {...R} />
                    <rect x={cx - tw / 2 - 50} y={midY + size * 0.2} width={tw + 100} height={size * 0.52} fill="url(#ta-dots)" opacity={0.18} />
                    <path d={bubble(cx, midY, tw / 2 + 50, size * 0.72)} fill="none" stroke={INK} strokeWidth={6} strokeLinejoin="round" {...R} />
                </g>
            )}
            {doodle === 'tarp' && tD >= 0 && (() => {
                const w = tw + 120, h = size * 1.5, x0 = cx - w / 2, y0 = cy - size * 1.0, sway = Math.sin(Math.floor(f / 4) * 1.3) * 1.5;
                return (
                    <g transform={`rotate(${sway} ${cx} ${y0 - 120})`}>
                        <line x1={x0 + 30} y1={y0} x2={x0 + 10} y2={y0 - 120} stroke={CREAM} strokeWidth={6} {...R} />
                        <line x1={x0 + w - 30} y1={y0} x2={x0 + w - 10} y2={y0 - 120} stroke={CREAM} strokeWidth={6} {...R} />
                        <rect x={x0} y={y0} width={w} height={h} fill={STRAW} transform={`translate(${MIS.x + 3} ${MIS.y + 3})`} {...R} />
                        <rect x={x0} y={y0} width={w} height={h} fill={CREAM} {...R} />
                        <rect x={x0 + w * 0.62} y={y0} width={w * 0.38} height={h} fill="url(#ta-dots)" opacity={0.2} />
                        {Array.from({ length: Math.floor(w / 46) }, (_, i) => (
                            <polygon key={i} points={`${x0 + 8 + i * 46},${y0 + 8} ${x0 + 46 + i * 46},${y0 + 8} ${x0 + 27 + i * 46},${y0 + 44}`}
                                fill={[STRAW, MATCHA, INK][i % 3]} opacity={i * 2 <= tD ? 1 : 0} {...R} />
                        ))}
                    </g>
                );
            })()}
            {doodle === 'cycle' && tD >= 0 && (() => {
                const rx = tw / 2 + 105, ry = size * 1.2, rot = Math.floor(tD / 2) * 4;
                const arc = (a0: number) => {
                    const pts = Array.from({ length: 13 }, (_, i) => { const a = (a0 + i * 11) * Math.PI / 180; return [cx + Math.cos(a) * rx, midY + Math.sin(a) * ry]; });
                    const [ex, ey] = pts[12], [px, py] = pts[11], ang = Math.atan2(ey - py, ex - px);
                    const head = [ang + 2.6, ang - 2.6].map((b) => `M${ex} ${ey} L${ex + Math.cos(b) * 36} ${ey + Math.sin(b) * 36}`).join(' ');
                    return 'M' + pts.map((q) => q.join(' ')).join(' L') + ' ' + head;
                };
                const k2 = clamp(tD / 10);
                return [0, 180].map((a0, i) => <g key={i}>
                    <path d={arc(a0 + rot)} stroke={i ? STRAW : MATCHA} strokeWidth={16} transform={`translate(${MIS.x} ${MIS.y})`} {...draw(k2)} {...R} />
                    <path d={arc(a0 + rot)} stroke={i ? MATCHA : STRAW} strokeWidth={16} {...draw(k2)} {...R} />
                </g>);
            })()}
            {/* the word, printed on its strip */}
            {word && tW >= 0 && (
                <g transform={`translate(${cx} ${midY}) scale(${k}) rotate(-2) translate(${-cx} ${-midY})`}>
                    {strip && <>
                        <rect x={sx} y={sy} width={sw} height={sh} fill={STRAW} transform={`translate(${MIS.x + 5} ${MIS.y + 4})`} {...R} />
                        <rect x={sx} y={sy} width={sw} height={sh} fill={CREAM} {...R} />
                        <rect x={sx} y={sy + sh * 0.62} width={sw} height={sh * 0.38} fill="url(#ta-dots)" opacity={0.16} />
                    </>}
                    {/* the strawberry plate under the ink, out of register */}
                    {text(5, 4, STRAW)}
                    <g {...R}>{text(0, 0, p.color || INK)}</g>
                </g>
            )}
            {/* pen marks + doodles printed over the word */}
            {mark === 'underline' && tM >= 0 && (
                <path d={roughLine(cx - tw / 2 - 10, cy + size * 0.42, cx + tw / 2 + 10, cy + size * 0.36, 3, 8)} stroke={STRAW} strokeWidth={13} {...draw(clamp(tM / 8))} {...R} />
            )}
            {mark === 'circle' && tM >= 0 && (
                <path d={roughEllipse(cx, midY, tw / 2 + 62, size * 0.86, 5)} stroke={STRAW} strokeWidth={12} {...draw(clamp(tM / 10))} {...R} />
            )}
            {doodle === 'ghost' && tD >= 0 && (() => {
                const gx = cx + tw / 2 + 125, gy = cy - size * 0.45 - (Math.floor(f / 4) % 2) * 10, fade = Math.floor(tD / 6) % 2 ? 0.6 : 1;
                return (
                    <g transform={`translate(${gx} ${gy}) scale(${settle(tD) * 1.7})`} opacity={fade}>
                        <path d={GHOST} fill={MATCHA} transform="translate(6 5)" {...R} />
                        <path d={GHOST} fill={CREAM} {...R} />
                        <path d="M10 -66 C40 -56 48 -30 48 -14 L48 40 L32 26 L16 40 Z" fill="url(#ta-dots)" opacity={0.35} />
                        <g {...R}><circle cx={-16} cy={-22} r={7} fill={INK} /><circle cx={16} cy={-22} r={7} fill={INK} />
                            <ellipse cx={0} cy={2} rx={9} ry={12} fill={INK} /></g>
                    </g>
                );
            })()}
            {doodle === 'hearts' && [[-tw / 2 - 90, -size * 0.85, 1.6], [tw / 2 + 90, -size * 0.7, 1.3], [tw / 2 + 40, size * 0.6, 1.0]].map(([dx, dy, s], i) => {
                const t = tD - i * 6;
                if (t < 0) return null;
                const beat = Math.floor(t / 2) % 6 === 0 ? 1.18 : 1, bob = (Math.floor(f / 4) + i) % 2 ? -6 : 0;
                return (
                    <g key={i} transform={`translate(${cx + dx} ${cy + dy + bob}) scale(${s * beat * settle(t)})`}>
                        <path d={HEART} fill={MATCHA} transform="translate(6 5)" {...R} />
                        <path d={HEART} fill={STRAW} {...R} />
                        <path d="M2 -30 C14 -36 40 -30 38 2 C30 18 14 26 2 32 Z" fill="url(#ta-dots)" opacity={0.3} />
                    </g>
                );
            })}
            {doodle === 'waves' && tD >= 0 && [0, 1].map((r) => {
                const ph = (Math.floor(tD / 2) * 9 + r * 40) % 80, y = cy + size * 0.5 + r * 30 - clamp(tD / 16) * 18;
                const x0 = cx - tw / 2 - 60 - ph, w = tw + 200;
                return <g key={r}>
                    <path d={waveBand(x0, y, w, 26, 16, 40)} fill={r ? STRAW : MATCHA} transform={`translate(${MIS.x} ${MIS.y})`} opacity={0.9} {...R} />
                    <path d={waveBand(x0, y, w, 26, 16, 40)} fill={r ? MATCHA : CREAM} {...R} />
                    {r === 0 && <path d={waveBand(x0, y + 10, w, 26, 16, 30)} fill="url(#ta-dots)" opacity={0.25} />}
                </g>;
            })}
            {stickersList.length > 0 && <Stickers list={stickersList} f={f} />}
        </svg>
    );
};

// Risograph print border for speaking shots: cream paper margin around the perimeter with halftone rim,
// misregistered Strawberry/Matcha ink plates, Ink inner rule, and corner registration marks. Center stays open.
// Animates independently on its own stepped frame loop (entrance draw-in + live press registration drift on twos).
const RisoBorder: React.FC<{ mode: string; frame: number }> = ({ mode, frame }) => {
    const m = 28, r = 1080 - m, b = 1920 - m, rim = 14;
    const primary = mode === 'matcha' ? MATCHA : STRAW;
    const secondary = mode === 'matcha' ? STRAW : MATCHA;
    const R = { filter: 'url(#ta-riso)' };
    const step = Math.floor(frame / 4);
    const intro = ease(clamp((Math.floor(frame / 2) * 2) / 8));
    // Live press registration drift on twos (cycles across 4 sheets)
    const drift = [[6, 5], [9, 3], [4, 7], [8, 6]][step % 4];
    const ox = drift[0] * intro, oy = drift[1] * intro;
    const regDrift = [[4, 3], [6, 1], [2, 5], [5, 4]][step % 4];
    const regAng = [0, 12, -8, 6][step % 4];
    const lDraw = draw(clamp((Math.floor(frame / 2) * 2) / 10));
    const dotOp = step % 2 === 0 ? 0.24 : 0.17;
    const reg = (x: number, y: number, key: number) => (
        <g key={key}>
            <g transform={`translate(${x + regDrift[0]} ${y + regDrift[1]}) rotate(${regAng})`} opacity={0.8} {...R}>
                <circle cx={0} cy={0} r={9} fill="none" stroke={primary} strokeWidth={2.5} />
                <line x1={-15} y1={0} x2={15} y2={0} stroke={primary} strokeWidth={2.2} />
                <line x1={0} y1={-15} x2={0} y2={15} stroke={primary} strokeWidth={2.2} />
            </g>
            <g transform={`translate(${x} ${y}) rotate(${-regAng * 0.5})`} {...R}>
                <circle cx={0} cy={0} r={9} fill="none" stroke={INK} strokeWidth={2.5} />
                <line x1={-15} y1={0} x2={15} y2={0} stroke={INK} strokeWidth={2.2} />
                <line x1={0} y1={-15} x2={0} y2={15} stroke={INK} strokeWidth={2.2} />
            </g>
        </g>
    );
    return (
        <g>
            {/* Cream paper margin around the frame */}
            <path d={`M0 0 H1080 V1920 H0 Z M${m} ${m} V${b} H${r} V${m} Z`} fill={CREAM} fillRule="evenodd" {...R} />
            {/* Halftone dot rim along the inner paper edge */}
            <path d={`M${rim} ${rim} H${1080 - rim} V${1920 - rim} H${rim} Z M${m} ${m} V${b} H${r} V${m} Z`}
                fill="url(#ta-dots)" fillRule="evenodd" opacity={dotOp} />
            {/* Misregistered accent ink plate (drifts between press passes) */}
            <rect x={m + ox} y={m + oy} width={r - m} height={b - m} fill="none" stroke={primary} strokeWidth={5} opacity={0.9} {...R} />
            {/* Opposite-corner secondary ink L-bars (draw in from corners, 3-ink riso overprint) */}
            {mode === 'riso' && (
                <g fill="none" stroke={secondary} strokeWidth={6} opacity={0.88} {...R}>
                    <path d={`M${m - 4} ${m + 150} V${m - 4} H${m + 150}`} {...lDraw} />
                    <path d={`M${r + 4} ${b - 150} V${b + 4} H${r - 150}`} {...lDraw} />
                </g>
            )}
            {/* Main Ink inner border */}
            <rect x={m} y={m} width={r - m} height={b - m} fill="none" stroke={INK} strokeWidth={4} {...R} />
            {/* Corner printmaker registration marks */}
            {[[54, 54], [1026, 54], [54, 1866], [1026, 1866]].map(([x, y], i) => reg(x, y, i))}
        </g>
    );
};

// a rounded speech bubble around (x, y) with its tail pointing down-left at the speaker's mouth
function bubble(x: number, y: number, rx: number, ry: number) {
    const l = x - rx, r = x + rx, t = y - ry, b = y + ry, q = 40;
    return `M${l + q} ${t} H${r - q} Q${r} ${t} ${r} ${t + q} V${b - q} Q${r} ${b} ${r - q} ${b} H${x - rx * 0.15} L${x - rx * 0.42} ${b + 70} L${x - rx * 0.4} ${b} H${l + q} Q${l} ${b} ${l} ${b - q} V${t + q} Q${l} ${t} ${l + q} ${t} Z`;
}
// a flat band of water: a wavy top edge (`n` half-waves, crests `h` high) and a straight bottom `depth` below
function waveBand(x0: number, y: number, w: number, h: number, n: number, depth: number) {
    const step = w / n;
    let d = `M${x0} ${y}`;
    for (let i = 0; i < n; i++) d += ` Q${x0 + step * (i + 0.5)} ${y + (i % 2 ? h : -h) / 2} ${x0 + step * (i + 1)} ${y}`;
    return d + ` L${x0 + w} ${y + depth} L${x0} ${y + depth} Z`;
}
