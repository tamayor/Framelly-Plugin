// Versus split: two side-by-side cards (or a replacement comparison) with an animated VS / arrow badge.
// With rows ("Label | left | right", one per line) the two cards become column heads of a scoreboard: each row comes
// in on its spoken words (props._times, one per row, from Land on word / Sync to words) and the last row's right side
// wins (accent fill and an "ahead" tag). Without _times the rows are spread over the build.
import React from 'react';
import { interpolate, spring } from 'remotion';
import { Common, Place, ease, prog, useInOut, wordTimes } from '../lib/common';
import { useVibe } from '../lib/vibe';

type P = Common & { left: string; right: string; strikeLeft: boolean; leftColor: string; dark: boolean; rows?: string[]; winLabel?: string };

const parseRows = (rows: unknown) => (Array.isArray(rows) ? rows : []).map(String).filter(r => r.trim()).slice(0, 5)
    .map(r => { const c = r.split('|').map(s => s.trim()); return { label: c[0] || '', a: c[1] || '', b: c[2] || '' }; });

const Board: React.FC<P & { rowsP: ReturnType<typeof parseRows> }> = (p) => {
    const rows = p.rowsP, n = rows.length;
    const L = useVibe(p);
    const { frame: f0, real, fps, durationInFrames: D, inn } = useInOut(p, (D0) => Math.max(14, Math.round(D0 * 0.7)));
    const times = wordTimes(p, n);
    const frame = times ? real : f0;
    const gap = Math.max(6, Math.floor((D * 0.6) / Math.max(1, n)));
    const at = (i: number) => (times ? times[i] : 8 + i * gap);
    const last = n - 1;
    const winAt = at(last) + 10;
    const win = prog(frame, winAt, winAt + 8);
    const winPop = frame >= winAt ? spring({ frame: frame - winAt, fps, config: { ...L.spring, damping: Math.min(10, L.spring.damping) } }) : 0;
    const strike = p.strikeLeft ? prog(frame, winAt + 2, winAt + 9) : 0;
    const colW = 250, labW = 190;
    const cell = (txt: string, side: 'a' | 'b', i: number) => {
        const isWin = side === 'b' && i === last;
        const lit = isWin ? win : 0;
        return (
            <div style={{ width: colW, textAlign: 'center', position: 'relative', padding: '10px 0',
                ...L.text.num(side === 'b' ? 46 : 40, { color: isWin && lit > 0.5 ? L.onAccent : side === 'b' ? L.accent : L.ink }),
                transform: isWin ? `scale(${1 + winPop * 0.08 - (winPop > 1 ? (winPop - 1) * 0.08 : 0)})` : undefined }}>
                {lit > 0 && <div style={{ position: 'absolute', inset: 0, borderRadius: L.r(14), background: L.accent, opacity: lit }} />}
                <span style={{ position: 'relative', display: 'inline-block' }}>
                    {txt}
                    {side === 'a' && i === last && p.strikeLeft && (
                        <span style={{ position: 'absolute', left: -6, right: -6, top: '50%', height: 5, borderRadius: 4,
                            background: p.leftColor || L.danger, transform: `scaleX(${strike})`, transformOrigin: 'left center' }} />
                    )}
                </span>
            </div>
        );
    };
    const head = (txt: string, side: 'a' | 'b') => (
        <div style={{ width: colW, ...L.card(18, side === 'b' ? { borderColor: L.accent, borderWidth: Math.max(3, L.v.borderWidth) } : {}),
            padding: '14px 10px', textAlign: 'center', ...L.text.display(32, { lineHeight: 1.1, color: side === 'a' ? L.dim : L.ink }),
            ...L.enter(side === 'a' ? inn : spring({ frame: Math.max(0, frame - 4), fps, config: L.spring }), side === 'a' ? 'left' : 'right') }}>
            {txt}
        </div>
    );
    return (
        <Place p={p}>
            <div style={{ ...L.card(30), padding: '26px 28px 22px', display: 'flex', flexDirection: 'column', gap: 6, ...L.enter(inn) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <div style={{ width: labW }} />
                    {head(p.left || 'Person A', 'a')}
                    {head(p.right || 'Person B', 'b')}
                </div>
                {rows.map((r, i) => {
                    const k = frame >= at(i) - 2 ? spring({ frame: frame - at(i) + 2, fps, config: L.spring }) : 0;
                    const line = interpolate(frame, [at(i), at(i) + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, ...L.enter(k, 'up') }}>
                            <div style={{ width: labW, ...L.text.label(24, { color: L.dim }), position: 'relative' }}>
                                {r.label}
                                <span style={{ position: 'absolute', left: 0, bottom: -6, height: 3, width: `${line * 70}%`, background: L.accent, borderRadius: 2 }} />
                            </div>
                            {cell(r.a, 'a', i)}
                            {cell(r.b, 'b', i)}
                        </div>
                    );
                })}
                <div style={{ display: 'flex', justifyContent: 'flex-end', height: 44, marginTop: 6 }}>
                    <div style={{ width: colW, display: 'flex', justifyContent: 'center' }}>
                        {winPop > 0 && (
                            <div style={{ padding: '8px 18px', borderRadius: L.r(999), background: L.accent, ...L.text.label(22, { color: L.onAccent }),
                                transform: `translateY(${(1 - Math.min(1, winPop)) * 14}px) scale(${0.7 + Math.min(1.1, winPop) * 0.3})`, opacity: Math.min(1, winPop * 1.5) }}>
                                {'▲ ' + (p.winLabel || 'ahead')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Place>
    );
};

export const VersusSplit: React.FC<P> = (p) => {
    const rowsP = parseRows(p.rows);
    if (rowsP.length) return <Board {...p} rowsP={rowsP} />;
    return <Pair {...p} />;
};

const Pair: React.FC<P> = (p) => {
    const { frame, fps, durationInFrames: D, inn } = useInOut(p, (D0) => Math.max(12, Math.round(D0 * 0.55)));
    const buildEnd = Math.max(12, Math.round(D * 0.55));
    const L0 = useVibe(p).spring;
    const rightIn = spring({ frame: Math.max(0, frame - 6), fps, durationInFrames: 14, config: L0 });
    const strike = interpolate(frame, [Math.round(buildEnd * 0.45), buildEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

    const L = useVibe(p);

    return (
        <Place p={p}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, ...L.enter(inn) }}>
                {/* Left card */}
                <div style={{ ...L.card(20), position: 'relative', minWidth: 250, maxWidth: 360, padding: '24px 28px',
                    ...L.text.display(38, { lineHeight: 1.15, color: p.strikeLeft ? L.dim : L.ink }), textAlign: 'center',
                    opacity: p.strikeLeft ? 1 - strike * 0.25 : 1 }}>
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                        {p.left || 'Old way'}
                        {p.strikeLeft && (
                            <span style={{ position: 'absolute', left: -6, right: -6, top: '52%', height: 6, borderRadius: 4,
                                background: p.leftColor || L.danger, transform: `scaleX(${strike})`, transformOrigin: 'left center' }} />
                        )}
                    </span>
                </div>

                {/* Center badge */}
                <div style={{ width: 64, height: 64, borderRadius: L.r(999), background: L.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    ...L.text.num(p.strikeLeft ? 30 : 24, { color: L.onAccent }), transform: `scale(${0.6 + rightIn * 0.4})` }}>
                    {p.strikeLeft ? '→' : 'VS'}
                </div>

                {/* Right card */}
                <div style={{ ...L.card(20, { borderColor: L.accent, borderWidth: Math.max(3, L.v.borderWidth) }), minWidth: 250, maxWidth: 360, padding: '24px 28px',
                    ...L.text.display(40, { lineHeight: 1.15 }), textAlign: 'center', ...L.enter(rightIn, 'right') }}>
                    {p.right || 'New way'}
                </div>
            </div>
        </Place>
    );
};
