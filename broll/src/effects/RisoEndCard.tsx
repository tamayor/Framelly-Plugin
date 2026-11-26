// Riso end card (Before 2028 "Did You Know" satire shorts, user 2026-11-25: "a universal text layout" for the ending,
// in the series look). Over the last talking shot, in the band above the head, one stack that every episode reuses:
//   1. a small strawberry label           SATIRE LANG 'TO.            (sans caps, white)
//   2. the line that changes per episode   Pero yung tarp / sa kanto niyo, hindi.   (EB Garamond italic on cream
//      paper strips, strawberry plate out of register, balanced into lines with no orphan; `emph` = the last word(s),
//      printed strawberry with a pen underline drawn on twos)
//   3. the series sign-off                 BEFORE 2028   (sans caps + serif year on a matcha block)
//   4. the series question                 Kanino galing ang pera?   (cream serif italic, strawberry pen underline)
// Every piece cuts in on its own frame and settles 110 % -> 100 % on twos; soy-ink mottle on every ink (ta-riso filter).
// A soft top scrim keeps it readable on any shot. Positions are in a 1080 x 1920 design frame.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, clamp } from '../lib/common';
import { draw, roughLine } from '../lib/doodle';
import { settle } from './TalkAccent';

const INK = '#1c2738', CREAM = '#efe4cc', STRAW = '#c7385a', MATCHA = '#3f7f45';
const MIS = { x: 9, y: 7 };

type P = {
    label?: string; line?: string; emph?: string; kicker?: string; year?: string; question?: string;
    top?: number; size?: number; at?: number; gap?: number; scrim?: number;
};

const FUNC = new Set(['sa', 'ng', 'na', 'ang', 'at', 'ay', 'mga', 'may', 'ni', 'si', 'o', 'nang', 'yung', 'the', 'a', 'of', 'to', 'and']);
const SERIF_EM = 0.43, SANS_EM = 0.62;   // average advance per character (EB Garamond italic 600 / Arial Bold caps)

// balanced lines: one line when it fits, else the split whose lines are closest in width with no one-word last line
export const balance = (text: string, size: number, maxW: number): string[] => {
    const w = (s: string) => s.length * size * SERIF_EM;
    if (w(text) <= maxW) return [text];
    const words = text.split(/\s+/);
    let best: string[] = [text], score = Infinity;
    for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        if (words.length - i < 2 && words.length > 2) continue;       // no orphan last line
        const s = Math.abs(w(a) - w(b)) + Math.max(0, Math.max(w(a), w(b)) - maxW) * 4
            + (FUNC.has(words[i - 1].toLowerCase()) ? size * 4 : 0);   // never end a line on a little word ("tarp sa / kanto")
        if (s < score) { score = s; best = [a, b]; }
    }
    return best;
};

const Defs: React.FC<{ seed: number }> = ({ seed }) => (
    <defs>
        <filter id="ec-riso" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} result="tooth" />
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={seed + 40} result="mottle" />
            <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.4 3.15" result="t" />
            <feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.6 1.22" result="m" />
            <feComposite in="t" in2="m" operator="arithmetic" k1={1} result="mask" />
            <feComposite in="SourceGraphic" in2="mask" operator="in" />
        </filter>
        <pattern id="ec-dots" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx={5} cy={5} r={2.6} fill={INK} />
        </pattern>
        <linearGradient id="ec-scrim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity={1} />
            <stop offset="0.7" stopColor="#000" stopOpacity={0.55} />
            <stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
    </defs>
);

export const RisoEndCard: React.FC<P> = (p) => {
    const f = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const label = String(p.label ?? "SATIRE LANG 'TO.");
    const line = String(p.line ?? 'Pero yung tarp sa kanto niyo, hindi.');
    const kicker = String(p.kicker ?? 'BEFORE'), year = String(p.year ?? '2028');
    const question = String(p.question ?? 'Kanino galing ang pera?');
    const size = Number(p.size) || 66, top = Number(p.top ?? 150), at = Number(p.at) || 0, gap = Number(p.gap) || 6;
    const scrim = p.scrim === undefined ? 0.55 : Number(p.scrim);
    // the emphasised tail of the line: given, else the last word
    const emph = String(p.emph ?? line.split(/\s+/).slice(-1)[0]);
    const lines = balance(line, size, 860);
    const R = { filter: 'url(#ec-riso)' };
    const cx = 540;

    // timing (frames from the clip start): label, each strip, the underline, the sign-off, the question, its underline
    const tLabel = at, tLine = (i: number) => at + gap * (i + 1), tEmph = at + gap * (lines.length + 1) + 4;
    const tSign = tEmph + gap * 2, tQ = tSign + gap, tQline = tQ + gap + 2;
    const pop = (t: number, cy: number, node: React.ReactNode) => {
        const d = f - t;
        if (d < 0) return null;
        const k = settle(d);
        return <g transform={`translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`}>{node}</g>;
    };

    // rows (y = baseline / centre in design px)
    const labelH = 60, labelSize = 36, labelW = label.length * labelSize * SANS_EM + 56;
    const yLabel = top + labelH / 2;
    const stripH = size * 1.28, y0 = top + labelH + 34 + size * 0.98;      // first strip baseline
    const yStrip = (i: number) => y0 + i * (stripH + 10);
    const yLastStrip = yStrip(lines.length - 1);
    const signSize = 34, yearSize = 64;
    const ySign = yLastStrip + size * 0.3 + 34 + yearSize * 0.72;
    const qSize = 54, yQ = ySign + 26 + qSize * 1.02;
    const blockBottom = question ? yQ + 24 : ySign + 24;   // no question line: the scrim stops under the sign-off

    const strip = (text: string, i: number) => {
        const y = yStrip(i);
        const tw = Math.max(size, text.length * size * SERIF_EM);
        const sx = cx - tw / 2 - 34, sy = y - size * 0.98, sw = tw + 68;
        const tilt = i % 2 ? 0.6 : -0.8;
        // split the emphasised tail off this line when it ends with it
        const hasEmph = emph && text.endsWith(emph);
        const head = hasEmph ? text.slice(0, text.length - emph.length) : text;
        return (
            <g transform={`rotate(${tilt} ${cx} ${y})`}>
                <rect x={sx + MIS.x} y={sy + MIS.y} width={sw} height={stripH} fill={STRAW} {...R} />
                <rect x={sx} y={sy} width={sw} height={stripH} fill={CREAM} {...R} />
                <rect x={sx} y={sy + stripH * 0.62} width={sw} height={stripH * 0.38} fill="url(#ec-dots)" opacity={0.14} />
                <text x={cx} y={y} textAnchor="middle" fontFamily={FONT.garamondItalic} fontWeight={600} fontSize={size} {...R}>
                    <tspan fill={INK}>{head}</tspan>
                    {hasEmph && <tspan fill={STRAW}>{emph}</tspan>}
                </text>
            </g>
        );
    };
    // pen underline under the emphasised tail of the last strip, drawn on twos
    const emphLine = (() => {
        const last = lines[lines.length - 1];
        if (!emph || !last.endsWith(emph)) return null;
        const tw = last.length * size * SERIF_EM, ew = emph.length * size * SERIF_EM;
        const x1 = cx + tw / 2 - ew - 6, x2 = cx + tw / 2 + 8, y = yLastStrip + size * 0.2;
        const prog = clamp((Math.floor((f - tEmph) / 2) * 2) / 8);
        if (f < tEmph) return null;
        return <path d={roughLine(x1, y, x2, y + 3, 7, 3)} stroke={STRAW} strokeWidth={8} strokeLinecap="round" {...draw(prog)} {...R} />;
    })();
    const qLine = (() => {
        if (!question || f < tQline) return null;
        const qw = question.length * qSize * SERIF_EM;
        const prog = clamp((Math.floor((f - tQline) / 2) * 2) / 10);
        const y = yQ + qSize * 0.2;
        return <path d={roughLine(cx - qw / 2, y, cx + qw / 2, y - 4, 9, 3)} stroke={STRAW} strokeWidth={6} strokeLinecap="round" {...draw(prog)} {...R} />;
    })();
    // sign-off row: BEFORE (sans caps, cream) + 2028 on a matcha block
    const kW = kicker.length * signSize * SANS_EM * 1.25, yW = year.length * yearSize * 0.56 + 40, rowW = kW + 18 + yW;
    const rx = cx - rowW / 2;

    return (
        <svg width={width} height={height} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
            <Defs seed={1 + (Math.floor(f / 4) % 6)} />
            {scrim > 0 && f >= at && <rect x={0} y={0} width={1080} height={blockBottom + 160} fill="url(#ec-scrim)" opacity={scrim} />}
            {pop(tLabel, yLabel, (
                <g>
                    <rect x={cx - labelW / 2} y={yLabel - labelH / 2} width={labelW} height={labelH} fill={STRAW} {...R} />
                    <text x={cx} y={yLabel + labelSize * 0.36} textAnchor="middle" fontFamily={FONT.arial} fontWeight={700}
                        fontSize={labelSize} letterSpacing={3} fill="#ffffff" {...R}>{label}</text>
                </g>
            ))}
            {lines.map((l, i) => <React.Fragment key={i}>{pop(tLine(i), yStrip(i) - size * 0.3, strip(l, i))}</React.Fragment>)}
            {emphLine}
            {pop(tSign, ySign - yearSize * 0.3, (
                <g>
                    <text x={rx} y={ySign} fontFamily={FONT.arial} fontWeight={700} fontSize={signSize} letterSpacing={6}
                        fill={CREAM} {...R}>{kicker}</text>
                    <rect x={rx + kW + 18 + MIS.x} y={ySign - yearSize * 0.86 + MIS.y} width={yW} height={yearSize * 1.06} fill={INK} {...R} />
                    <rect x={rx + kW + 18} y={ySign - yearSize * 0.86} width={yW} height={yearSize * 1.06} fill={MATCHA} {...R} />
                    <text x={rx + kW + 18 + yW / 2} y={ySign} textAnchor="middle" fontFamily={FONT.garamond} fontWeight={700}
                        fontSize={yearSize} fill={CREAM} {...R}>{year}</text>
                </g>
            ))}
            {pop(tQ, yQ - qSize * 0.3, (
                <text x={cx} y={yQ} textAnchor="middle" fontFamily={FONT.garamondItalic} fontWeight={600} fontSize={qSize}
                    fill={CREAM} {...R}>{question}</text>
            ))}
            {qLine}
        </svg>
    );
};
