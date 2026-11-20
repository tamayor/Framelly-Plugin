// Fusion helper queue (src/main/fusion-bridge.js) against a stand-in helper: Node runs a small script in place of
// python/fusion_bridge.py, answering requests by id like the real one.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const env = require('../helpers/env');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-bridge-test-'));
process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* temp folder */ } });
const script = path.join(dir, 'helper.js');
// "capture" never answers; when killed the helper writes half a line (as a dying process flushing its buffer can)
fs.writeFileSync(script, `
process.on('SIGTERM', () => { process.stdout.write('{"id": 1, "ok": tr', () => process.exit(0)); });
let buf = '';
process.stdin.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\\n')) >= 0) {
        const req = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
        if (req.id === 0 || req.op === 'capture') continue;
        process.stdout.write(JSON.stringify({ id: req.id, ok: true, result: req.op }) + '\\n');
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

test('a killed helper\'s last output does not spoil the first answer of the helper started after it', async () => {
    assert.equal(await bridgeCall('ping', {}, 5000), 'ping');
    const first = state.bridge;
    const stuck = bridgeCall('capture', {}, 300, { lane: 1 });
    const next = bridgeCall('ping', { again: true }, 5000);
    await assert.rejects(stuck, /did not answer/);
    assert.equal(await next, 'ping');
    assert.notEqual(state.bridge, first);
});
