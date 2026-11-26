// The timeline lock B-roll and Collage edits take (src/main/broll.js claimTimeline): taken when free, waited for
// when another operation holds it, and refused (state left as the holder set it) when that holder stays busy.
const test = require('node:test');
const assert = require('node:assert/strict');
const env = require('../helpers/env');

const { claimTimeline, putBack } = env.main('broll');
const state = env.main('state');

test('claimTimeline takes a free lock', async () => {
    state.applying = false;
    await claimTimeline();
    assert.equal(state.applying, true);
    state.applying = false;
});

test('claimTimeline waits for another holder to finish', async () => {
    state.applying = true;
    setTimeout(() => { state.applying = false; }, 120);
    const t0 = Date.now();
    await claimTimeline();
    assert.ok(Date.now() - t0 >= 100);
    assert.equal(state.applying, true);
    state.applying = false;
});

test('putBack re-places the deleted clip from its Media Pool item, else gives null', async () => {
    const calls = [];
    const item = { GetUniqueId: async () => 'new-id', SetClipColor: async () => true, ClearClipColor: async () => true, GetProperty: async () => null, SetProperty: async () => true };
    const project = { GetMediaPool: async () => ({ AppendToTimeline: async (list) => { calls.push(list[0]); return [item]; } }) };
    const back = await putBack(project, {}, { mpi: true }, null, 100, 50, 3, false);
    assert.deepEqual(back, { itemId: 'new-id', track: 'V3' });
    assert.equal(calls[0].trackIndex, 3);
    assert.equal(calls[0].recordFrame, 100);
    assert.equal(calls[0].endFrame, 50);
    assert.equal(await putBack(project, {}, null, '/no/such/file.mov', 0, 10, 2, false), null);
});
