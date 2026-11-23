// Regression tests for the media / B-roll audit fixes (broll.js, sfx.js, sfx-level.js, collage.js, previews.js,
// match-cut.js). The B-roll render worker is a stand-in script (no Remotion): broll.js finds it as <code folder>/broll,
// which the test environment points at the temporary data folder.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const env = require('../helpers/env');
const { makeResolve } = require('../helpers/fake-resolve');

const config = env.main('config');

// ------------------------------------------------------------------ stand-in B-roll worker
// Jobs run one after the other, like render.mjs. op 'strip': the first one for an `out` makes the folder and fails (as
// render.mjs does on an error), later ones write two frames. op 'video' with props.hang: never answers. Every job and
// every start is logged to worker.log.
const BROLL = path.join(env.DATA_DIR, 'broll');
const LOG = path.join(BROLL, 'worker.log');
fs.mkdirSync(path.join(BROLL, 'node_modules', 'remotion'), { recursive: true });
fs.writeFileSync(path.join(BROLL, 'effects.json'), JSON.stringify({
    common: [],
    effects: [{ id: 'fx', name: 'Fx', seconds: 1, fields: [{ key: 'word', type: 'text', default: 'a' }] }]
}));
fs.writeFileSync(path.join(BROLL, 'render.mjs'), `
import fs from 'fs';
import path from 'path';
import readline from 'readline';
const log = (s) => fs.appendFileSync(${JSON.stringify(LOG)}, s + '\\n');
log('start');
const say = (tag, msg) => process.stdout.write(tag + (msg ? ' ' + JSON.stringify(msg) : '') + '\\n');
say('READY');
let chain = Promise.resolve();
readline.createInterface({ input: process.stdin }).on('line', (line) => {
    const job = JSON.parse(line);
    if (job.op === 'quit') process.exit(0);
    chain = chain.then(async () => {
        log('job ' + job.op);
        if (job.props && job.props.word === 'hang') return new Promise(() => {});
        if (job.op === 'strip') {
            const first = !fs.existsSync(job.out);
            fs.mkdirSync(job.out, { recursive: true });
            if (first) return say('ERROR', { id: job.id, error: 'render failed' });
            fs.writeFileSync(path.join(job.out, 'f0.png'), 'x'); fs.writeFileSync(path.join(job.out, 'f29.png'), 'x');
        }
        say('RESULT', { id: job.id, out: job.out });
    });
});
`);
process.env.BROLL_NODE = process.execPath;
const BR = env.main('broll');
const logLines = () => { try { return fs.readFileSync(LOG, 'utf8').trim().split('\n'); } catch (e) { return []; } };
test.after(() => BR.brollShutdown());

test('a strip that failed is not served from its empty folder (PM-02)', async () => {
    env.useResolve(null);
    await assert.rejects(BR.brollStrip(null, { effect: 'fx', count: 2 }), /render failed/);
    const r = await BR.brollStrip(null, { effect: 'fx', count: 2 });
    assert.equal(r.frames.length, 2, 'rendered again instead of returning frames: []');
});

test('a render that times out stops the worker, so the next job is not stuck behind it (PM-23)', async (t) => {
    env.useResolve(null);
    BR.brollShutdown();          // a fresh worker: the last one's (real) idle timer is cleared before timers are mocked
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const hung = BR.renderJob({ op: 'video', effect: 'fx', props: { word: 'hang' }, out: path.join(env.DATA_DIR, 'hang.mov') });
    const done = assert.rejects(hung, /took over/);
    // wait (without timers) until the worker has the job
    for (let i = 0; i < 2000 && !logLines().includes('job video'); i++) await new Promise(r => setImmediate(r));
    assert.ok(logLines().includes('job video'), 'the worker got the job');
    t.mock.timers.tick(6 * 60 * 1000 + 1);
    await done;
    t.mock.timers.reset();
    const next = BR.renderJob({ op: 'still', effect: 'fx', props: {}, out: path.join(env.DATA_DIR, 'still.png') });
    const r = await Promise.race([next, new Promise(r => setTimeout(() => r('stuck'), 5000))]);
    assert.notEqual(r, 'stuck', 'the next job ran');
});

test('removing a record keeps one saved while Resolve was asked (PM-05)', async () => {
    env.useResolve(null);
    const file = path.join(config.APP_DATA_DIR, 'broll-placed.json');
    const recA = { id: 'aaa', timeline: 'T', effect: 'fx', file: '/x/a.mov' };
    fs.writeFileSync(file, JSON.stringify([recA]));
    const p = BR.brollRemove(null, { id: 'aaa' });
    // a placement saved while brollRemove waited for Resolve
    fs.writeFileSync(file, JSON.stringify([recA, { id: 'bbb', timeline: 'T', effect: 'fx', file: '/x/b.mov' }]));
    await p;
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).map(r => r.id), ['bbb']);
    assert.deepEqual(fs.readdirSync(config.APP_DATA_DIR).filter(n => n.endsWith('.tmp')), [], 'no temporary file left');
});

// ------------------------------------------------------------------ sounds
const sfx = env.main('sfx');
function wav(file, fill) {
    const n = 4000, h = Buffer.alloc(44), pcm = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin(i / 5) * fill), i * 2);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
    h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(16000, 24);
    h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    fs.writeFileSync(file, Buffer.concat([h, pcm]));
}

test('a dropped sound with an original\'s name and size but other content is kept as a new original (PM-15)', () => {
    config.ensureDirs();
    wav(path.join(config.SFX_ORIG_DIR, 'click.wav'), 1000);
    const dropDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-drop-'));
    wav(path.join(dropDir, 'click.wav'), 9000);
    const name = sfx.copySfx(path.join(dropDir, 'click.wav'));
    assert.notEqual(name, 'click.wav');
    assert.ok(fs.readFileSync(path.join(config.SFX_ORIG_DIR, name)).equals(fs.readFileSync(path.join(dropDir, 'click.wav'))));
    // the same sound again is the existing original
    assert.equal(sfx.copySfx(path.join(dropDir, 'click.wav')), name);
});

test('the originals migration keeps a same-size sound with other content (PM-15)', () => {
    config.ensureDirs();
    wav(path.join(config.SFX_ORIG_DIR, 'tap.wav'), 1000);
    wav(path.join(config.SFX_DIR, 'tap.wav'), 7000);
    wav(path.join(config.SFX_ORIG_DIR, 'same.wav'), 1000);
    wav(path.join(config.SFX_DIR, 'same.wav'), 1000);
    sfx.migrateSfxOriginals();
    assert.ok(fs.existsSync(path.join(config.SFX_DIR, 'tap.wav')), 'a different sound is not deleted');
    assert.ok(!fs.existsSync(path.join(config.SFX_DIR, 'same.wav')), 'an identical copy is');
});

test('readSfx reads sound files only (PM-25)', () => {
    const f = path.join(env.DATA_DIR, 'secret.txt');
    fs.writeFileSync(f, 'secret');
    assert.throws(() => sfx.readSfx(null, f), /sound/i);
    wav(path.join(env.DATA_DIR, 'ok.wav'), 1000);
    assert.ok(sfx.readSfx(null, path.join(env.DATA_DIR, 'ok.wav')).length > 44);
});

const hasFfmpeg = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'].some(p => fs.existsSync(p));
test('a failed peak measurement is not cached for good (PM-07)', { skip: !hasFfmpeg && 'no ffmpeg' }, async () => {
    const level = env.main('sfx-level');
    const f = path.join(env.DATA_DIR, 'peak.wav');
    wav(f, 8000);
    const good = fs.readFileSync(f);
    fs.writeFileSync(f, Buffer.alloc(good.length, 0x55));        // not a sound file: ffmpeg fails
    const when = new Date(Date.now() - 60000);
    fs.utimesSync(f, when, when);
    assert.equal(await level.peakOf(f, 0, 0, 25), null);
    fs.writeFileSync(f, good);                                     // same size and time: the same cache key
    fs.utimesSync(f, when, when);
    const v = await level.peakOf(f, 0, 0, 25);
    assert.ok(Number.isFinite(v), 'measured now (was the cached null)');
});

// ------------------------------------------------------------------ collage: pages opened in the browser
test('collageOpen only opens the allowed sites, not look-alike hosts (PM-12)', async () => {
    const C = env.main('collage');
    for (const u of ['https://pexels.com.example.net/x', 'https://commons.wikimedia.org.evil.tld/', 'https://commons.wikimedia.org@evil.tld/',
        'http://pixabay.com/', 'https://www.google.com/searchx?q=1', 'https://www.google.com.evil.tld/search?q=1']) {
        await assert.rejects(C.collageOpen(null, { url: u }), /Only/, u);
    }
    for (const u of ['https://commons.wikimedia.org/wiki/File:X.jpg', 'https://www.pexels.com/photo/1/', 'https://pexels.com/api/',
        'https://pixabay.com/photos/x/', 'https://www.google.com/search?q=x']) {
        await assert.doesNotReject(C.collageOpen(null, { url: u }), u);
    }
});

// ------------------------------------------------------------------ saved preset previews
test('a failed capture keeps the preset\'s saved preview frames (PM-19)', async () => {
    const FB = env.main('fusion-bridge');
    const real = FB.bridgeCall;
    let answer = null;
    FB.bridgeCall = async () => { if (!answer) throw new Error('Fusion timed out'); return answer; };
    try {
        delete require.cache[require.resolve(path.join(env.MAIN_DIR, 'previews'))];
        const P = env.main('previews');
        const dir = path.join(config.PREV_DIR, 'anim1');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'p00.png'), 'old');
        const meta = { fps: 25, width: 1920, height: 1080 };
        await assert.rejects(P.capturePreview('anim1', 'item1', '', null, null, { meta }), /timed out/);
        assert.equal(fs.readFileSync(path.join(dir, 'p00.png'), 'utf8'), 'old');
        answer = { count: 1, frames: [Buffer.from('new').toString('base64')] };
        await P.capturePreview('anim1', 'item1', '', null, null, { meta });
        assert.equal(fs.readFileSync(path.join(dir, 'p00.png'), 'utf8'), 'new');
        assert.deepEqual(fs.readdirSync(config.PREV_DIR).filter(n => n.startsWith('anim1')), ['anim1'], 'no folder left beside it');
    } finally { FB.bridgeCall = real; }
});

// ------------------------------------------------------------------ match cut: one run at a time
test('two match-cut starts at once: the second is refused while the first prepares (PM-17)', async () => {
    env.useResolve(makeResolve());
    const M = env.main('match-cut');
    const a = M.matchCutStart({ word: 'one' });
    const b = M.matchCutStart({ word: 'two' });
    await assert.rejects(b, /already running/);
    await assert.rejects(a);                 // the fake timeline has no timecode: the first one fails while preparing
    await assert.rejects(M.matchCutStart({ word: 'three' }), (e) => !/already running/.test(e.message), 'the guard is released');
});
