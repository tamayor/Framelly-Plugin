// Small renderer fixes that need no DOM: file URLs for Windows paths (core/helpers.js) and the word lane's delayed
// send, which keeps the clip it was made on (timeline/anim-timing.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPanelScripts } = require('../helpers/renderer');

test('fileUrl: POSIX and Windows paths give valid file URLs', () => {
    const { fileUrl } = loadPanelScripts(['core/helpers.js']);
    assert.equal(fileUrl('/Users/me/a b/p00.png'), 'file:///Users/me/a%20b/p00.png');
    assert.equal(fileUrl('C:\\Users\\me\\a b\\p00.png'), 'file:///C:/Users/me/a%20b/p00.png');
    assert.equal(fileUrl('C:/Users/x.wav'), 'file:///C:/Users/x.wav');
    for (const p of ['/Users/me/a b/p00.png', 'C:\\Users\\me\\p00.png', 'D:/x/#1.wav']) {
        const u = new URL(fileUrl(p));
        assert.equal(u.protocol, 'file:');
        assert.equal(u.host, '', p + ' has no host part');
    }
});

test('word lane: a release sent after another clip is selected still re-keys the clip it was made on', async () => {
    const sent = [];
    const ctx = loadPanelScripts(['timeline/anim-timing.js'], {
        document: { body: { classList: { contains: () => false } }, getElementById: () => null, addEventListener() { } },
        window: { sa: { setClipWordTimings: async (id, segs) => { sent.push([id, JSON.parse(JSON.stringify(segs))]); return { ok: true }; } } },
        state: {}, $: () => null, setStatus() { }
    });
    ctx.renderTiming = () => { }; ctx.tmRenderWords = () => { }; ctx.tmLoadWordLane = () => { };
    const T = ctx.tmState;
    T.info = { itemId: 'A', ranges: [{ start: 0, end: 20, hasStart: true }] };
    T.wordLane = { itemId: 'A', segs: [{ s: 0, e: 10 }, { s: 10, e: 20 }] };
    ctx.tmWordLaneEdit(1, 12, 22, true);
    // clip B is selected (and its lane loaded) before the 500 ms send
    T.info = { itemId: 'B', ranges: [{ start: 0, end: 30, hasStart: true }] };
    T.wordLane = { itemId: 'B', segs: [{ s: 0, e: 30 }] };
    await new Promise(r => setTimeout(r, 650));
    assert.deepEqual(sent, [['A', [{ s: 0, e: 10 }, { s: 12, e: 22 }]]]);
    assert.equal(T.info.ranges[0].end, 30, "B's bar is left alone");
});
