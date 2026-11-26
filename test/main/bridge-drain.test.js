// Fusion helper queue (src/main/fusion-bridge.js): a request that timed out is still running in the helper, so
// nothing else is written to it until it answers. Before, the next requests were piped in behind it, reported as
// failed, and then still run later (writes included).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const env = require('../helpers/env');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-bridge-drain-'));
process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* temp folder */ } });
const script = path.join(dir, 'helper.js');
// one request at a time, like fusion_bridge.py: "slow" answers after 600 ms; "seen" answers with every op received
fs.writeFileSync(script, `
const seen = [];
const queue = [];
let busy = false;
function next() {
    if (busy || !queue.length) return;
    const req = queue.shift();
    seen.push(req.op);
    const reply = () => { process.stdout.write(JSON.stringify({ id: req.id, ok: true, result: req.op === 'seen' ? seen.slice() : req.op }) + '\\n'); busy = false; next(); };
    busy = true;
    if (req.op === 'slow') setTimeout(reply, 600); else reply();
}
let buf = '';
process.stdin.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\\n')) >= 0) {
        const req = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
        if (req.id === 0) continue;
        queue.push(req); next();
    }
});
`);

const config = env.main('config');
config.RESOLVE_PYTHON = process.execPath;      // read by fusion-bridge.js when it is first required
config.BRIDGE_SCRIPT = script;
const { bridgeCall } = env.main('fusion-bridge');
const state = env.main('state');

test.after(() => {
    for (const k of ['bridge', 'bridgeRender']) { try { if (state[k]) state[k].kill(); } catch (e) { /* gone */ } }
});

test('a write queued behind a timed-out request fails as busy and never reaches the helper', async () => {
    assert.equal(await bridgeCall('ping', {}, 5000), 'ping');
    const first = state.bridge;
    const slow = bridgeCall('slow', {}, 150, { lane: 1 });
    const write = bridgeCall('controls_set', { x: 1 }, 5000, { maxWaitMs: 300 });
    await assert.rejects(slow, /did not answer/);
    await assert.rejects(write, /busy/);
    // once the slow one has answered, the queue goes on with the same helper
    const seen = await bridgeCall('seen', {}, 5000);
    assert.deepEqual(seen, ['ping', 'slow', 'seen']);
    assert.equal(state.bridge, first);
});
