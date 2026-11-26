// The automation lock (auto-session.js waitFree with a function): one tool call at a time, nested calls pass, the
// panel flag is set only when asked and given back when the last flagged hold ends.
const env = require('../helpers/env');
const test = require('node:test');
const assert = require('node:assert/strict');

const SESSION = env.main('auto-session');
const state = env.main('state');
const tick = (ms) => new Promise(r => setTimeout(r, ms));

test('waitFree with a function holds the lock: a second call waits for it', async () => {
    const order = [];
    const a = SESSION.waitFree(1000, async () => { order.push('a+'); await tick(200); order.push('a-'); });
    const b = SESSION.waitFree(1000, async () => { order.push('b+'); order.push('b-'); });
    await Promise.all([a, b]);
    assert.deepEqual(order, ['a+', 'a-', 'b+', 'b-']);
    assert.equal(state.applying, false);
});

test('a caller that cannot get the lock in time is told the panel is busy', async () => {
    const long = SESSION.waitFree(1000, () => tick(500));
    await assert.rejects(SESSION.waitFree(100), /busy/);
    await assert.rejects(SESSION.waitFree(100, () => 1), /busy/);
    await long;
    assert.equal(await SESSION.waitFree(100, () => 7), 7);
});

test('nested calls inside a hold do not wait for themselves', async () => {
    const r = await SESSION.waitFree(200, async () => {
        await SESSION.waitFree(200);                     // e.g. auto-place.js inside the place tool's hold
        return SESSION.waitFree(200, async () => 'inner');
    });
    assert.equal(r, 'inner');
});

test('flag: true sets state.applying for the hold only; without it the flag stays clear', async () => {
    await SESSION.waitFree(200, async () => { assert.equal(state.applying, false); });
    await SESSION.waitFree(200, async () => { assert.equal(state.applying, true); }, { flag: true });
    assert.equal(state.applying, false);
    await assert.rejects(SESSION.waitFree(200, async () => { throw new Error('boom'); }, { flag: true }), /boom/);
    assert.equal(state.applying, false, 'released after a throw');
});

test('work left running in the background does not keep the hold', async () => {
    let later;
    await SESSION.waitFree(200, async () => { later = tick(50).then(() => SESSION.waitFree(100, () => 'bg')); });
    const other = SESSION.waitFree(500, () => tick(300));    // a new hold while the background work asks for one
    await assert.rejects(later, /busy/);
    await other;
});

test('the panel placing (state.applying) keeps automation waiting', async () => {
    state.applying = true;
    try { await assert.rejects(SESSION.waitFree(100, () => 1), /busy/); }
    finally { state.applying = false; }
});

test('a nested wait inside an unflagged hold still waits while the panel is applying', async () => {
    await SESSION.waitFree(200, async () => {
        state.applying = true;          // a panel Apply that started during the hold (apply.js does not take the lock)
        try { await assert.rejects(SESSION.waitFree(100), /busy/); }
        finally { state.applying = false; }
        await SESSION.waitFree(100);    // free again
    });
    await SESSION.waitFree(200, async () => { await SESSION.waitFree(100); }, { flag: true });    // its own flag does not block it
});

test('a panel preview refuses the lock, unless the tool asks for allowLive (get_frame)', async () => {
    state.liveSession = { itemId: 'x' };
    try {
        await assert.rejects(SESSION.waitFree(100, () => 1), /Preview in Resolve/);
        assert.equal(await SESSION.waitFree(100, () => 2, { allowLive: true }), 2);
    } finally { state.liveSession = null; }
});
