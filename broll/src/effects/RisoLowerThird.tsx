// Riso lower third (Before 2028 "Did You Know" satire shorts, user spec 2026-11-25). A fake "official TV news" chyron in
// the series' print look, at chest level of a 9:16 talking shot: above the subtitle band (y 1290-1470) and above the
// bottom 25-30 % the apps cover. Three modes, one clip each, placed back to back:
//   chyron   HON. LMR on an ink bar with its title (LINGKOD-BAYAN) smaller under it (sans caps, cream) + the episode's subtext on a cream paper strip
//            (EB Garamond italic) + an optional pill (`badge`, empty = none). Wipes in left to right on twos.
//   receipt  a torn cream receipt slip: a printed document icon, RESIBO: (strawberry sans caps) + the law / circular /
//            figure (serif), optional small note line. Flips in (card turning over on twos).
//   reality  a strawberry bar: a printed warning sign, SATIRE · + "Pero yung resibo, totoo." (cream serif italic). Flips in.
// Soy-ink mottle on every ink (lt-riso filter), second plate out of register, stop motion on twos. Laid out with HTML so
// any text length fits; `left` / `top` place the block in the 1080 x 1920 design frame.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, clamp, ease } from '../lib/common';

const INK = '#1c2738', CREAM = '#efe4cc', STRAW = '#c7385a', MATCHA = '#3f7f45', PAPER = '#fbfaf6';
const MIS = { x: 8, y: 6 };

type P = {
    mode?: string; line1?: string; line2?: string; badge?: string; badgeColor?: string;
    label?: string; value?: string; note?: string; text?: string; lead?: string;
    left?: number; top?: number; at?: number; scale?: number; size1?: number; size2?: number; align?: string; title?: string; sizeT?: number;
};

const two = (f: number) => Math.floor(f / 2) * 2;

const Defs: React.FC<{ seed: number }> = ({ seed }) => (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
            <filter id="lt-riso" x="-5%" y="-10%" width="110%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} result="tooth" />
                <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={seed + 40} result="mottle" />
                <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 3.15" result="t" />
                <feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.22" result="m" />
                <feComposite in="t" in2="m" operator="arithmetic" k1={1} result="mask" />
                <feComposite in="SourceGraphic" in2="mask" operator="in" />
            </filter>
        </defs>
    </svg>
);
const riso: React.CSSProperties = { filter: 'url(#lt-riso)' };
const dots = (op: number): React.CSSProperties => ({
    position: 'absolute', inset: 0, opacity: op, pointerEvents: 'none',
    backgroundImage: `radial-gradient(${INK} 2.4px, transparent 2.7px)`, backgroundSize: '10px 10px'
});

// a block printed twice: the colour plate out of register behind, the paper / ink on top
const Plate: React.FC<{ color: string; plate: string; style?: React.CSSProperties; children: React.ReactNode; half?: number }> = ({ color, plate, style, children, half }) => (
    <div style={{ position: 'relative', ...style }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translate(${MIS.x}px, ${MIS.y}px)`, background: plate, ...riso }} />
        <div style={{ position: 'absolute', inset: 0, background: color, ...riso }} />
        {half ? <div style={{ ...dots(half), top: '60%' }} /> : null}
        <div style={{ position: 'relative' }}>{children}</div>
    </div>
);

const DocIcon = () => (
    <svg width={44} height={54} viewBox="0 0 44 54" style={{ ...riso, flex: 'none' }}>
        <path d="M4 3 H28 L40 15 V51 H4 Z" fill={PAPER} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M28 3 V15 H40" fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M11 25 H33 M11 33 H33 M11 41 H24" stroke={STRAW} strokeWidth={4} strokeLinecap="round" />
    </svg>
);
const WarnIcon = () => (
    <svg width={50} height={46} viewBox="0 0 50 46" style={{ ...riso, flex: 'none' }}>
        <path d="M25 4 L47 42 H3 Z" fill={CREAM} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <path d="M25 17 V29" stroke={INK} strokeWidth={5} strokeLinecap="round" /><circle cx={25} cy={35.5} r={3} fill={INK} />
    </svg>
);

export const RisoLowerThird: React.FC<P> = (p) => {
    const f = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const mode = String(p.mode || 'chyron');
    const at = Number(p.at) || 0, t = two(f - at);
    const size1 = Number(p.size1) || 54, size2 = Number(p.size2) || 40;
    const badge = String(p.badge ?? '');
    const title = String(p.title ?? 'LINGKOD-BAYAN'), sizeT = Number(p.sizeT) || 28;
    const left = Number(p.left ?? 64), top = Number(p.top ?? 1100), sc = Number(p.scale) || 1;
    if (t < 0) return null;
    const k = width / 1080;
    // entrances, all on twos: the chyron wipes in from the left, the others turn over like a card
    const wipe = ease(clamp(t / 8));
    const flip = t < 8 ? Math.max(0.04, ease(clamp(t / 8))) : 1;
    const settleK = 1.06 - 0.06 * ease(clamp(t / 8));
    const seed = 1 + (Math.floor(f / 4) % 6);

    let body: React.ReactNode = null;
    if (mode === 'chyron') {
        const l2 = clamp((t - 6) / 6);
        body = (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                clipPath: `inset(-20px ${100 - wipe * 100}% -20px -20px)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Plate color={INK} plate={STRAW} style={{ padding: '14px 26px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style={{ fontFamily: FONT.arial, fontWeight: 700, fontSize: size1, letterSpacing: 2, color: CREAM, whiteSpace: 'nowrap', lineHeight: 1.05, ...riso }}>
                                {String(p.line1 ?? 'HON. LMR')}
                            </span>
                            {/* the title under the name, smaller and tracked (TV chyron name / title) */}
                            {title && (
                                <span style={{ fontFamily: FONT.arial, fontWeight: 700, fontSize: sizeT, letterSpacing: sizeT * 0.22, color: CREAM, opacity: 0.85, whiteSpace: 'nowrap', marginTop: 4, ...riso }}>
                                    {title}
                                </span>
                            )}
                        </div>
                    </Plate>
                    {badge && t >= 10 && (
                        <div style={{ transform: `scale(${1.1 - 0.1 * ease(clamp((t - 10) / 6))})`, transformOrigin: 'left center' }}>
                            <div style={{ background: String(p.badgeColor || '#5a2d91'), borderRadius: 999, padding: '7px 18px 6px', ...riso }}>
                                <span style={{ fontFamily: FONT.arial, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: '#fff' }}>{badge}</span>
                            </div>
                        </div>
                    )}
                </div>
                {t >= 6 && (
                    <div style={{ opacity: l2 > 0 ? 1 : 0, marginLeft: 18 }}>
                        <Plate color={CREAM} plate={MATCHA} half={0.12} style={{ padding: '4px 24px 10px' }}>
                            <span style={{ fontFamily: FONT.garamondItalic, fontWeight: 600, fontSize: size2, color: INK, whiteSpace: 'nowrap', ...riso }}>
                                {String(p.line2 ?? 'Mapagbigay Gamit ang Buwis Mo')}
                            </span>
                        </Plate>
                    </div>
                )}
            </div>
        );
    } else if (mode === 'receipt') {
        const note = String(p.note ?? '');
        // torn receipt slip: zigzag bottom edge
        const teeth = 'polygon(0 0, 100% 0, 100% calc(100% - 10px), ' +
            Array.from({ length: 41 }, (_, i) => `${100 - i * 2.5}% ${i % 2 ? '100%' : 'calc(100% - 10px)'}`).join(', ') + ')';
        body = (
            <div style={{ transform: `scaleY(${flip})`, transformOrigin: 'center center' }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, transform: `translate(${MIS.x}px, ${MIS.y}px)`, background: STRAW, clipPath: teeth, ...riso }} />
                    <div style={{ position: 'relative', background: PAPER, clipPath: teeth, padding: '16px 28px 26px', ...riso }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <DocIcon />
                            <span style={{ fontFamily: FONT.arial, fontWeight: 700, fontSize: 34, letterSpacing: 3, color: STRAW, whiteSpace: 'nowrap' }}>{String(p.label ?? 'RESIBO:')}</span>
                            <span style={{ fontFamily: FONT.garamond, fontWeight: 700, fontSize: 50, color: INK, whiteSpace: 'nowrap' }}>{String(p.value ?? 'COA Circular 2013-004')}</span>
                        </div>
                        {note && (
                            <div style={{ marginTop: 6, marginLeft: 60, fontFamily: FONT.garamondItalic, fontWeight: 500, fontSize: 34, color: INK, whiteSpace: 'nowrap',
                                borderTop: `3px dashed ${INK}55`, paddingTop: 6 }}>{note}</div>
                        )}
                    </div>
                </div>
            </div>
        );
    } else {
        body = (
            <div style={{ transform: `scaleY(${flip})`, transformOrigin: 'center center' }}>
                <Plate color={STRAW} plate={INK} style={{ padding: '14px 28px 14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <WarnIcon />
                        <span style={{ fontFamily: FONT.arial, fontWeight: 700, fontSize: 34, letterSpacing: 3, color: '#fff', whiteSpace: 'nowrap' }}>{String(p.lead ?? 'SATIRE ·')}</span>
                        <span style={{ fontFamily: FONT.garamondItalic, fontWeight: 600, fontSize: 50, color: CREAM, whiteSpace: 'nowrap' }}>{String(p.text ?? 'Pero yung resibo, totoo.')}</span>
                    </div>
                </Plate>
            </div>
        );
    }
    return (
        <div style={{ position: 'absolute', inset: 0, width, height, overflow: 'hidden' }}>
            <Defs seed={seed} />
            {/* align 'center': the block's centre sits on x 540 whatever the text length */}
            <div style={String(p.align) === 'center'
                ? { position: 'absolute', left: 540 * k, top: top * k, transform: `translateX(-50%) scale(${k * sc * settleK})`, transformOrigin: 'center top' }
                : { position: 'absolute', left: left * k, top: top * k, transform: `scale(${k * sc * settleK})`, transformOrigin: 'left top' }}>
                {body}
            </div>
        </div>
    );
};
