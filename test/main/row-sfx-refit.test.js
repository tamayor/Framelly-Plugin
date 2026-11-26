// Per-row sound copies follow a timing change by moving in place (src/main/row-sfx.js refitRowSfx): no delete and
// append per copy, copies deleted by hand stay deleted, and each copy keeps its id (so its pitch / volume).
const test = require('node:test');
const assert = require('node:assert/strict');
const env = require('../helpers/env');
const { makeTimeline, makeItem } = require('../helpers/fake-resolve');

const RS = env.main('row-sfx');
const bridge = env.main('fusion-bridge');

// audio items that can be moved like Resolve's (SetPosition keeps the length)
function movable(tl) {
    const moves = [];
    for (const tr of tl.tracks.audio) for (const it of tr.items) {
        it.SetPosition = (o) => { const d = it.end - it.start; it.start = o.startFrame; it.end = it.start + d; moves.push(it.id); return true; };
        it.GetTrackTypeAndIndex = () => ['audio', 1];
    }
    tl.AppendToTimeline = () => { throw new Error('no append expected'); };
    return moves;
}
function withRows(frames, fn) {
    const real = bridge.bridgeCall;
    bridge.bridgeCall = async (op) => (op === 'row_times' ? { frames } : null);
    return fn().finally(() => { bridge.bridgeCall = real; });
}
const layer = { id: 'L1', file: 'missing-tap.wav', lenMode: 'clip', offset: 0 };

test('changed row times move and trim the copies that are there, without placing them again', async () => {
    const tl = makeTimeline({ tracks: { audio: [[
        { id: 'a1', start: 100, end: 120, rightOffset: 50 },
        { id: 'a2', start: 120, end: 140, rightOffset: 50 },
        { id: 'a3', start: 140, end: 200, rightOffset: 0 }
    ]] } });
    const moves = movable(tl);
    const text = makeItem({ id: 'txt1', start: 100, end: 200 });
    // an entry written before rows / vary were recorded: the rows are worked out from the frames
    RS.rowSfxSet('txt1', { layer, end: 100, track: 1, frames: [0, 20, 40], ids: ['a1', 'a2', 'a3'] });
    const r = await withRows([0, 30, 60], () => RS.refitRowSfx(tl, null, { fps: 25 }, text, 'txt1', true));
    assert.equal(r.failed, 0);
    assert.equal(r.moved, 3);
    assert.deepEqual(r.swaps, []);
    assert.equal(r.relink, true);
    const [a1, a2, a3] = tl.tracks.audio[0].items;
    assert.deepEqual([a1.start, a1.end], [100, 130]);
    assert.deepEqual([a2.start, a2.end], [130, 160]);
    assert.deepEqual([a3.start, a3.end], [160, 200]);
    assert.deepEqual(moves.sort(), ['a2', 'a3']);
    // the same times again: nothing is touched
    const again = await withRows([0, 30, 60], () => RS.refitRowSfx(tl, null, { fps: 25 }, text, 'txt1', true));
    assert.deepEqual(again, { moved: 0, failed: 0, swaps: [], relink: false });
});

test('a copy deleted by hand is not put back; the others still move', async () => {
    const tl = makeTimeline({ tracks: { audio: [[
        { id: 'b1', start: 100, end: 120, rightOffset: 50 },
        { id: 'b3', start: 140, end: 200, rightOffset: 0 }
    ]] } });
    movable(tl);
    const text = makeItem({ id: 'txt2', start: 100, end: 200 });
    RS.rowSfxSet('txt2', { layer, end: 100, track: 1, frames: [0, 20, 40], ids: ['b1', 'b2', 'b3'], rows: [0, 1, 2],
        vary: [{ cents: 10, db: 0.5 }, { cents: -20, db: 0 }, { cents: 30, db: -0.5 }] });
    const r = await withRows([0, 10, 50], () => RS.refitRowSfx(tl, null, { fps: 25 }, text, 'txt2', false));
    assert.equal(r.failed, 0);
    assert.equal(r.relink, false);               // a live preview's copies are not linked
    assert.equal(tl.tracks.audio[0].items.length, 2);
    const [b1, b3] = tl.tracks.audio[0].items;
    assert.deepEqual([b1.start, b1.end], [100, 110]);
    assert.deepEqual([b3.start, b3.end], [150, 200]);
    // the record keeps the two copies with their rows and variation, so the next refit moves them again
    const next = await withRows([0, 20, 40], () => RS.refitRowSfx(tl, null, { fps: 25 }, text, 'txt2', false));
    assert.equal(next.failed, 0);
    assert.deepEqual([b1.start, b3.start], [100, 140]);
});
