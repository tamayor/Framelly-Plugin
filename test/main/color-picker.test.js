'use strict';
// color-picker.js: a pick waiting on the warm JXA helper always gets an answer, so the 'one panel at a time' flag
// (colorPanelOpen) cannot stay stuck: when the helper is stopped (cancel restart, quit) and when it goes silent.
// The helper (osascript) is replaced by a fake child process; macOS only, like the code under test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const env = require('../helpers/env');
const cp = require('child_process');

const children = [];
function fakeChild() {
    const ch = new EventEmitter();
    ch.stdout = new EventEmitter();
    ch.stdin = new EventEmitter();
    ch.stdin.write = (t) => { ch.sent.push(t); };
    ch.sent = []; ch.kills = []; ch.exitCode = null; ch.signalCode = null;
    ch.kill = (sig) => { ch.kills.push(sig); return true; };
    ch.say = (line) => ch.stdout.emit('data', Buffer.from(line + '\n'));
    children.push(ch);
    return ch;
}
const realSpawn = cp.spawn;
cp.spawn = () => fakeChild();
process.on('exit', () => { cp.spawn = realSpawn; });

const C = env.main('color-picker');
const skip = process.platform !== 'darwin' && 'the helper is macOS only';
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

async function openPick() {
    const n = children.length;
    const p = C.pickNativeColor(null, '#ff0000');
    const ch = children[n];
    ch.say('READY');
    await tick(80);                                   // go() polls jxaReady every 50 ms
    assert.match(ch.sent[0] || '', /^SHOW 65535 0 0/);
    ch.say('SHOWN');
    return { p, ch };
}

test('stopping the helper during a pick answers it (cancelled) and frees the panel', { skip }, async () => {
    const { p, ch } = await openPick();
    assert.equal(C.isColorPanelOpen(), true);
    C.stopJxaHelper();
    assert.deepEqual(ch.kills, ['SIGTERM']);
    const r = await Promise.race([p, tick(1000).then(() => 'unanswered')]);
    assert.deepEqual(r, { ok: true, cancelled: true });
    assert.equal(C.isColorPanelOpen(), false);
    ch.emit('exit');                                  // the old child's exit later must not touch the next pick
    const next = await openPick();
    next.ch.say('COLOR 0,65535,0');
    assert.deepEqual(await next.p, { ok: true, hex: '#00ff00' });
    assert.equal(C.isColorPanelOpen(), false);
    C.stopJxaHelper();                                // the next test starts its own helper
});

test('a helper that never exits on SIGTERM is killed outright', { skip }, async () => {
    const { p, ch } = await openPick();
    C.stopJxaHelper();
    await p;
    await tick(600);
    assert.deepEqual(ch.kills, ['SIGTERM', 'SIGKILL']);
});

test('the colour picked so far streams live and the pick ends with it', { skip }, async () => {
    const { p, ch } = await openPick();
    ch.say('LIVE 0,0,65535');
    ch.say('BEAT');
    ch.say('END asked by the app after 10 ms, seen=true');
    ch.say('COLOR 0,0,65535');
    assert.deepEqual(await p, { ok: true, hex: '#0000ff' });
    assert.equal(C.isColorPanelOpen(), false);
    C.stopJxaHelper();
});

test('a pick stopped before the panel shows, while quitting, ends without a new helper', { skip }, async () => {
    const state = env.main('state');
    const n = children.length;
    const p = C.pickNativeColor(null, '#ff0000');
    const ch = children[n];
    ch.say('READY');
    await tick(80);                                   // SHOW sent, no SHOWN yet
    state.isQuitting = true;                          // before-quit: quitPlugin sets it right after stopJxaHelper
    try {
        C.stopJxaHelper();
        const r = await Promise.race([p, tick(1000).then(() => 'unanswered')]);
        assert.deepEqual(r, { ok: true, cancelled: true });
        await tick(400);
        assert.equal(children.length, n + 1, 'no helper spawned during the quit');
        assert.equal(C.isColorPanelOpen(), false);
    } finally { state.isQuitting = false; }
});
