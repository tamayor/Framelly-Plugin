// apply()'s guard: a panel placement (or live preview) waits for an MCP tool holding the automation lock in another
// call chain and for another apply, while the MCP place's own apply (inside its hold) is not kept waiting by it.
// The calls name no animation, so applyInner stops at once with "Pick an animation first".
const env = require('../helpers/env');
const test = require('node:test');
const assert = require('node:assert/strict');

const SESSION = env.main('auto-session');
const state = env.main('state');
const { apply } = env.main('apply');
const tick = (ms) => new Promise(r => setTimeout(r, ms));

for (const live of [false, true]) {
    test('apply' + (live ? ' (live preview)' : '') + ' waits for an MCP hold in another call chain', async () => {
        let released = 0;
        const hold = SESSION.waitFree(500, async () => { await tick(200); released = Date.now(); });
        await tick(20);
        const r = await apply(null, { animationId: 'none', live });
        assert.ok(released && Date.now() >= released, 'ran after the hold ended');
        assert.match(r.error, /Pick an animation/);
        await hold;
        assert.equal(state.applying, false);
    });
}

test('the apply inside an MCP hold is not kept waiting by that hold', async () => {
    const r = await SESSION.waitFree(500, async () => {
        const t = Date.now();
        const res = await apply(null, { animationId: 'none' });
        assert.ok(Date.now() - t < 1000);
        return res;
    });
    assert.match(r.error, /Pick an animation/);
    assert.equal(state.applying, false);
});

test('a second apply waits while another one holds state.applying, and does not clear it', async () => {
    state.applying = true;        // e.g. a running apply, B-roll claimTimeline or a row-sound refit
    const p = apply(null, { animationId: 'none' });
    await tick(150);
    assert.equal(state.applying, true, 'still the other step\'s flag');
    state.applying = false;
    const r = await p;
    assert.match(r.error, /Pick an animation/);
    assert.equal(state.applying, false);
});
