const test = require('node:test');
const assert = require('node:assert/strict');
const env = require('../helpers/env');

const M = env.main('media-analysis');
const L = env.main('line-break');
const LAYOUT = env.main('layout');

// An envelope of 10 ms levels: speech at -20 dBFS with two pauses at -60.
function envelope(spans, n) {
    const db = new Float32Array(n).fill(-20);
    for (const [a, b] of spans) for (let i = a; i < b; i++) db[i] = -60;
    return { hop: 0.01, start: 10, db };
}

test('pausesFromEnvelope: threshold follows the speech level, pauses in file seconds', () => {
    const p = M.pausesFromEnvelope(envelope([[100, 140], [300, 305]], 500));
    assert.equal(p.speechDb, -20);
    assert.equal(p.thresholdDb, -42, '22 dB under the speech level');
    assert.equal(p.pauses.length, 1, 'a 50 ms dip is not a pause (min 150 ms)');
    assert.deepEqual([p.pauses[0].start, p.pauses[0].end], [11, 11.4]);
    assert.equal(p.quiet, false);
});

test('snapCuts: into a pause, onto a near pause, onto a word gap, or left alone', () => {
    const pauses = [{ start: 2, end: 2.4, mid: 2.2 }];
    const words = [{ start: 4, end: 4.5 }, { start: 4.7, end: 5 }];
    const [a, b, c, d] = M.snapCuts([2.1, 2.5, 4.55, 8], pauses, words, 0.35);
    assert.deepEqual(a, { from: 2.1, to: 2.2, by: 'pause' });
    assert.deepEqual(b, { from: 2.5, to: 2.2, by: 'pause' });
    assert.deepEqual(c, { from: 4.55, to: 4.6, by: 'word' });
    assert.deepEqual(d, { from: 8, to: 8, by: null });
});

test('beatGrid finds 120 BPM in a synthetic kick pattern and none in noise', () => {
    const n = 1200, db = new Float32Array(n).fill(-70), low = new Float32Array(n).fill(-70);
    for (let i = 0; i < n; i += 50) for (let k = 0; k < 8; k++) { db[i + k] = -10 - k * 4; low[i + k] = -8 - k * 4; }
    const g = M.beatGrid({ hop: 0.01, start: 0, db, low, high: null });
    assert.equal(g.tempoBpm, 120);
    assert.ok(g.confidence > 0.5);
    assert.ok(g.beats.filter(b => b.supported).length >= 20);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const noise = new Float32Array(n).map(() => -40 + rnd() * 20);
    assert.equal(M.beatGrid({ hop: 0.01, start: 0, db: noise, low: null, high: null }).tempoBpm, null, 'no invented tempo');
});

test('sourceMapper handles a 24 fps source on a 25 fps timeline', () => {
    const m = M.sourceMapper({ tlStart: 100, tlEnd: 200, srcStartFrame: 48, srcEndFrame: 148, srcFps: 24 });
    assert.equal(m.toFile(100), 2);
    assert.equal(m.toFrame(2), 100);
    assert.equal(Math.round(m.toFrame(m.toFile(150)) * 1000) / 1000, 150);
});

test('pickSegments: dialogue = lowest audio track, music = highest audio-only track', () => {
    const seg = (kind, track, audioOnly) => ({ kind, track, audioOnly, tlStart: 0, tlEnd: 100, name: kind + track });
    const media = { from: 0, to: 100, segments: [seg('audio', 1, false), seg('audio', 2, true), seg('audio', 3, true), seg('video', 1, false)] };
    assert.deepEqual(M.pickSegments('pauses', media).map(s => s.track), [1]);
    assert.deepEqual(M.pickSegments('beats', media).map(s => s.track), [3]);
    assert.deepEqual(M.pickSegments('beats', media, { audioTrack: 2 }).map(s => s.track), [2]);
    assert.deepEqual(M.pickSegments('cuts', media).map(s => s.kind), ['video']);
});

test('shotsFromCuts flags light B-roll', () => {
    const shots = M.shotsFromCuts(0, 10, [4], [{ t: 1, y: 120 }, { t: 5, y: 220 }, { t: 6, y: 210 }]);
    assert.equal(shots.length, 2);
    assert.equal(shots[1].bright, true);
    assert.equal(shots[0].bright, false);
});

test('renderFlags: black tail, static clip, static entrance', () => {
    const tail = M.renderFlags({ black: [{ start: 1.92, end: 2.08 }], frozen: [] }, 25, 50);
    assert.equal(tail[0].kind, 'black');
    assert.match(tail[0].note, /end of the clip/);
    assert.equal(M.renderFlags({ black: [], frozen: [{ start: 0, end: null }] }, 25, 50)[0].kind, 'static');
    assert.equal(M.renderFlags({ black: [], frozen: [{ start: 0, end: 0.6 }] }, 25, 50)[0].kind, 'staticStart');
    assert.equal(M.renderFlags({ black: [], frozen: [{ start: 1, end: 1.6 }] }, 25, 50)[0].kind, 'frozen');
});

test('breakLines: phrase-aware, number + unit kept, no hanging article', () => {
    assert.deepEqual(L.breakLines('that they are spending about $13K per month', { maxLines: 2 }).lines, ['that they are spending', 'about $13K per month']);
    assert.deepEqual(L.breakLines('I went to the store with a friend of mine', { maxLines: 2 }).lines, ['I went to the store', 'with a friend of mine']);
    assert.deepEqual(L.breakLines('So yeah, watch this shit man', { maxLines: 2 }).lines, ['So yeah,', 'watch this shit man']);
    assert.equal(L.breakLines('already\nbroken', {}).text, 'already\nbroken');
    for (const l of L.breakLines('the best way to save for a house', { lines: 3 }).lines) assert.ok(!/ (a|the|to|for)$/.test(l), 'ends on ' + l);
});

test('platform layouts keep captions centred', () => {
    for (const name of ['tiktok', 'reels', 'shorts', 'ig', 'youtube-shorts']) {
        const l = LAYOUT.platformLayout(name);
        assert.ok(l, name);
        const [x0, x1] = l.bands[0].spans[0];
        assert.equal(Math.round((x0 + x1) * 500), 500, name + ' spans are symmetric');
        const fit = LAYOUT.fitBox(l, 0.5, 0.9, 0.5, 0.08, {});
        assert.equal(fit.cx, 0.5);
        assert.ok(fit.cy + 0.04 <= l.bands[0].y1, name + ': moved up out of the app\'s bottom UI');
    }
    assert.equal(LAYOUT.platformLayout('vimeo'), null);
});

test('cachedTimelineWords: same cut only, most sound around the span', () => {
    const fs = require('fs'), os = require('os'), path = require('path');
    const MA = env.main('media-analysis');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-tlwords-'));
    const media = path.join(dir, 'a.mp4');
    fs.writeFileSync(media, 'x');
    const seg = (tlStart, tlEnd, src) => ({ file: media, tlStart, tlEnd, srcStartFrame: src, srcEndFrame: src + tlEnd - tlStart, srcFps: 25 });
    const segs = [seg(0, 40, 100), seg(40, 70, 500), seg(70, 120, 900)];
    const st = fs.statSync(media);
    const asPiece = (s) => Object.assign({ size: st.size, mtime: Math.round(st.mtimeMs) }, s);
    const write = (name, from, to, words, ps) => fs.writeFileSync(path.join(dir, name + '.json'),
        JSON.stringify({ timeline: true, from, to, toEnd: false, fps: 25, pieces: (ps || segs).map(asPiece), words }));
    write('tight', 40, 70, [{ w: 'tight', start: 41, end: 50 }]);
    write('wide', 10, 110, [{ w: 'wide', start: 45, end: 52 }, { w: 'outside', start: 20, end: 30 }]);
    assert.deepEqual(MA.cachedTimelineWords(segs, 40, 70, { dir }).map(w => w.w), ['wide']);
    // asking for more context than any run has: none
    assert.equal(MA.cachedTimelineWords(segs, 40, 70, { dir, minMargin: 50 }), null);
    // the cut under the span changed (the middle piece now starts elsewhere in the file): the runs no longer count
    const recut = [segs[0], seg(40, 70, 520), segs[2]];
    assert.equal(MA.cachedTimelineWords(recut, 40, 70, { dir }), null);
    fs.rmSync(dir, { recursive: true, force: true });
});

test('guessLanguage: English subtitles are heard as English, other text is left to the engine', () => {
    const MA = env.main('media-analysis');
    assert.equal(MA.guessLanguage(['Give me 60 seconds and I will show you how to make so much money', 'that you and your family are set for life.']), 'en');
    assert.equal(MA.guessLanguage(['Beri saya 60 saat dan saya akan tunjukkan cara membuat wang yang banyak']), null);
    assert.equal(MA.guessLanguage(['Hi']), null);
});

// ------------------------------------------------------------------ refineWordTimes: word edges on the sound
// A synthetic 10 ms envelope: room tone at -55 dBFS with speech bursts. levels(spans): [[from s, to s, dB], ...]
function envOf(seconds, spans) {
    const db = new Float32Array(Math.round(seconds / 0.01)).fill(-55);
    for (const [a, b, v] of spans) for (let i = Math.round(a / 0.01); i < Math.round(b / 0.01); i++) db[i] = v;
    return { hop: 0.01, db };
}

test('refineWordTimes: a word after a pause starts where its sound does, not where the word before ended', () => {
    // "look," said 0.0-0.4 s; a pause; "I" said 1.0-1.15, "have" 1.15-1.4. Whisper: "I" from 0.4 (the pause added)
    const env = envOf(2, [[0, 0.4, -18], [1.0, 1.15, -16], [1.15, 1.4, -18]]);
    const r = M.refineWordTimes([
        { w: 'look,', start: 0, end: 0.4 }, { w: 'I', start: 0.4, end: 1.12 }, { w: 'have', start: 1.12, end: 1.4 }
    ], env);
    assert.ok(Math.abs(r[1].start - 1.0) <= 0.011, 'I starts on its sound: ' + r[1].start);
    assert.ok(r[1].end > r[1].start && r[2].start >= r[1].end - 1e-9);
    assert.strictEqual(r[0].start, 0);
});

test('refineWordTimes: a hum before the word (another shot\'s room at a cut) is not the word', () => {
    // -30 dB for 0.25 s, then the word at -13 dB
    const env = envOf(1.5, [[0.1, 0.35, -30], [0.35, 0.6, -13], [0.6, 0.9, -40]]);
    const r = M.refineWordTimes([{ w: 'But', start: 0.1, end: 0.6 }], env);
    assert.ok(Math.abs(r[0].start - 0.35) <= 0.021, 'starts on the rise: ' + r[0].start);
});

test('refineWordTimes: a soft first consonant stays part of the word', () => {
    // "f" at -32 dB for 60 ms, the vowel at -15
    const env = envOf(1, [[0.3, 0.36, -32], [0.36, 0.6, -15]]);
    const r = M.refineWordTimes([{ w: 'fully', start: 0.2, end: 0.6 }], env);
    assert.ok(Math.abs(r[0].start - 0.3) <= 0.011, 'starts on the f: ' + r[0].start);
});

test('refineWordTimes: an end stretched into the pause comes back; a cut-short end goes on with the sound', () => {
    const env = envOf(3, [[0, 0.5, -18], [1.5, 2.0, -18]]);
    const r = M.refineWordTimes([{ w: 'sum.', start: 0, end: 1.2 }, { w: 'okay', start: 1.5, end: 1.8 }], env);
    assert.ok(r[0].end >= 0.5 && r[0].end <= 0.55, 'sum ends after its sound: ' + r[0].end);
    assert.ok(r[1].end >= 2.0 && r[1].end <= 2.05, 'okay runs to its sound: ' + r[1].end);
});

test('refineWordTimes: words where there is no sound, or silence only, keep the engine\'s times', () => {
    const env = envOf(2, [[0, 0.5, -18]]);
    const w = [{ w: 'a', start: 0, end: 0.5 }, { w: 'ghost', start: 1.0, end: 1.3 }];
    const r = M.refineWordTimes(w, env);
    assert.deepStrictEqual(r[1], w[1]);
    const quiet = M.refineWordTimes(w, envOf(2, []));
    assert.deepStrictEqual(quiet, w);
    assert.notStrictEqual(quiet[0], w[0], 'copies, the input is not changed');
});

test('refineWordTimes: starts never go before the previous word\'s end and words keep their order', () => {
    const env = envOf(2, [[0, 1.6, -18]]);         // one long sound: connected speech
    const w = [{ w: 'a', start: 0, end: 0.3 }, { w: 'b', start: 0.3, end: 0.31 }, { w: 'c', start: 0.31, end: 0.9 }];
    const r = M.refineWordTimes(w, env);
    for (let i = 1; i < r.length; i++) assert.ok(r[i].start >= r[i - 1].end - 1e-9 && r[i].end > r[i].start, JSON.stringify(r));
});

test('pcmEnvelope: 10 ms RMS levels of 16-bit PCM', () => {
    const pcm = Buffer.alloc(16000 * 2 * 0.05);           // 50 ms
    for (let i = 160 * 2; i < 160 * 3; i++) pcm.writeInt16LE(i % 2 ? 16384 : -16384, i * 2);   // hop 2 at -6 dBFS
    const env = M.pcmEnvelope(pcm, 16000);
    assert.strictEqual(env.db.length, 5);
    assert.ok(Math.abs(env.db[2] - -6.02) < 0.1 && env.db[0] < -90);
});

// spans as envOf, plus the treble band: hfSpans [[from s, to s, dB]] over a -75 dB treble floor
function envHf(seconds, spans, hfSpans) {
    const e = envOf(seconds, spans);
    e.hf = new Float32Array(e.db.length).fill(-75);
    for (const [a, b, v] of hfSpans || []) for (let i = Math.round(a / 0.01); i < Math.round(b / 0.01); i++) e.hf[i] = v;
    return e;
}

test('refineWordTimes: a start on the fading tail of the word before moves past the pause after it', () => {
    // "them" fades from -27 to -36 over 0.5-0.65, a pause, "the" at 0.85. Whisper: "the" from 0.5
    const spans = [[0, 0.5, -18]];
    for (let i = 0; i < 15; i++) spans.push([0.5 + i * 0.01, 0.51 + i * 0.01, -27 - i * 0.6]);
    spans.push([0.85, 1.05, -20]);
    const r = M.refineWordTimes([{ w: 'them', start: 0, end: 0.5 }, { w: 'the', start: 0.5, end: 1.05 }], envOf(2, spans));
    assert.ok(Math.abs(r[1].start - 0.85) <= 0.011, 'the starts after the pause: ' + r[1].start);
});

test('refineWordTimes: a word said right before a hum keeps its start (it rises, it is not a tail)', () => {
    // "and" burst 0.5-0.58 at -20 after a dip, then a hum at -32 to 1.5, then the next word's sound at -14
    const r = M.refineWordTimes([{ w: 'communication', start: 0, end: 0.47 }, { w: 'and', start: 0.47, end: 1.55 }],
        envOf(3, [[0, 0.45, -18], [0.45, 0.5, -30], [0.5, 0.58, -20], [0.58, 1.5, -32], [1.5, 1.7, -14]]));
    assert.ok(r[1].start < 0.52, 'and stays on its burst: ' + r[1].start);
});

test('refineWordTimes: a first "s" (quiet overall, loud in the treble) is part of the word', () => {
    // pause, "s" 0.40-0.55 at -40 dB (treble -45), vowel from 0.55 at -12
    const env = envHf(1.5, [[0, 0.2, -16], [0.4, 0.55, -40], [0.55, 0.8, -12]], [[0.4, 0.55, -45], [0.55, 0.8, -50]]);
    const r = M.refineWordTimes([{ w: 'to', start: 0, end: 0.2 }, { w: 'sell', start: 0.2, end: 0.8 }], env);
    assert.ok(Math.abs(r[1].start - 0.4) <= 0.011, 'sell starts on its s: ' + r[1].start);
});

test('refineWordTimes: under a music bed close to the voice, a start does not jump onto a later part of the word', () => {
    // bed at -32 +/- 3 everywhere, the word at -18 from 0.6 with a louder syllable at 0.9
    const spans = [];
    for (let i = 0; i < 300; i++) spans.push([i * 0.01, (i + 1) * 0.01, -32 + ((i * 7) % 7) - 3]);
    spans.push([0.6, 0.9, -18], [0.9, 1.0, -12]);
    const r = M.refineWordTimes([{ w: 'my', start: 0.6, end: 1.0 }], envOf(3, spans));
    assert.ok(r[0].start <= 0.62, 'stays on the word: ' + r[0].start);
});

test('refineWordTimes: words keep their order and stay inside the window, measured or not', () => {
    const env = envOf(1, [[0.1, 0.3, -18], [0.9, 1.0, -18]]);
    const r = M.refineWordTimes([
        { w: 'a', start: 0.1, end: 0.3 }, { w: 'ghost', start: 0.2, end: 0.25 }, { w: 'tail', start: 0.95, end: 1.3 }, { w: 'past', start: 0.99, end: 1.4 }
    ], env);
    for (let i = 1; i < r.length; i++) assert.ok(r[i].start > r[i - 1].start && r[i].start >= r[i - 1].end - 1e-9, JSON.stringify(r));
    assert.ok(r[2].end <= 1.0 + 1e-9, 'a measured end stays in the window: ' + r[2].end);
});
