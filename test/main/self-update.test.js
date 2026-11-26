'use strict';
// src/main/self-update.js: the installed panel copying the code folder's runtime files at each open.
// Everything happens in temp folders: a fake code folder, a fake installed copy and a fake data folder.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-self-update-')));
process.on('exit', () => { try { chmodAll(tmp, 0o755); fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* temp */ } });
process.env.HOME = path.join(tmp, 'home');                 // the installer modules never see the real home folder
const SU = require('../../src/main/self-update');

function chmodAll(dir, mode) {
    try { fs.chmodSync(dir, mode); for (const n of fs.readdirSync(dir)) { const p = path.join(dir, n); if (fs.lstatSync(p).isDirectory()) chmodAll(p, mode); } } catch (e) { /* gone */ }
}
const write = (f, text, when) => {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text);
    if (when) fs.utimesSync(f, when, when);
};
const secs = (f) => Math.floor(fs.statSync(f).mtimeMs / 1000);
let n = 0;

// A code folder, its installed copy (as the installer makes it) and a data folder.
function setup() {
    const root = path.join(tmp, 'case' + (++n));
    const code = path.join(root, 'Framelly'), app = path.join(root, 'installed'), data = path.join(root, 'Framelly Source Assets');
    const old = new Date('2026-01-02T03:04:05Z');
    write(path.join(code, 'manifest.xml'), '<Plugin><Id>com.framelly.plugin</Id></Plugin>', old);
    write(path.join(code, 'package.json'), '{"main":"main.js"}', old);
    write(path.join(code, 'main.js'), 'require("./src/main");', old);
    write(path.join(code, 'src', 'main', 'index.js'), '// v1', old);
    write(path.join(code, 'src', 'main', 'gone.js'), '// removed later', old);
    write(path.join(code, 'src', 'python', 'a.py'), 'x = 1', old);
    write(path.join(code, 'src', 'main', 'self-update.js'), fs.readFileSync(require.resolve('../../src/main/self-update')), old);
    write(path.join(code, 'src', 'NOTES.md'), 'not copied', old);
    write(path.join(code, 'README.md'), 'not copied', old);
    fs.mkdirSync(data, { recursive: true });
    for (const rel of SU.runtimeFiles(code).keys()) {
        fs.mkdirSync(path.dirname(path.join(app, rel)), { recursive: true });
        fs.cpSync(path.join(code, rel), path.join(app, rel), { preserveTimestamps: true });
    }
    write(path.join(app, 'WorkflowIntegration.node'), 'native');
    write(path.join(app, 'data-location.json'), JSON.stringify({ mainDir: root, dataDir: data, codeDir: code }));
    write(path.join(app, 'src', 'python', '__pycache__', 'a.cpython-311.pyc'), 'cache');      // made by Python at run time
    return { root, code, app, data };
}

test('runtimeFiles: the runtime set only, with the installer\'s skip rules', () => {
    const { code } = setup();
    assert.deepEqual([...SU.runtimeFiles(code).keys()].sort(), ['main.js', 'manifest.xml', 'package.json',
        path.join('src', 'main', 'gone.js'), path.join('src', 'main', 'index.js'), path.join('src', 'main', 'self-update.js'),
        path.join('src', 'python', 'a.py')].sort());
});

test('nothing changed: no copy, and a line in the log', () => {
    const { app, data } = setup();
    const r = SU.syncFromCode(app);
    assert.deepEqual(r, { updated: false, reason: 'up to date' });
    assert.match(fs.readFileSync(path.join(data, '_app', 'self-update.log'), 'utf8'), /up to date\n$/);
});

test('a changed file is copied with its mtime, a removed one deleted, the rest kept', () => {
    const { code, app, data } = setup();
    const when = new Date('2026-11-20T10:00:00Z');
    write(path.join(code, 'src', 'main', 'index.js'), '// v2, longer', when);
    write(path.join(code, 'src', 'main', 'new', 'added.js'), '// new', when);
    fs.rmSync(path.join(code, 'src', 'main', 'gone.js'));
    fs.rmSync(path.join(code, 'src', 'python', 'a.py'));
    const before = fs.readFileSync(path.join(app, 'data-location.json'), 'utf8');

    const r = SU.syncFromCode(app);
    assert.equal(r.updated, true);
    assert.deepEqual(r.changed.sort(), [path.join('src', 'main', 'index.js'), path.join('src', 'main', 'new', 'added.js')].sort());
    assert.deepEqual(r.removed.sort(), [path.join('src', 'main', 'gone.js'), path.join('src', 'python', 'a.py')].sort());
    assert.equal(fs.readFileSync(path.join(app, 'src', 'main', 'index.js'), 'utf8'), '// v2, longer');
    assert.equal(secs(path.join(app, 'src', 'main', 'index.js')), Math.floor(when.getTime() / 1000));
    assert.equal(fs.existsSync(path.join(app, 'src', 'main', 'gone.js')), false);
    assert.equal(fs.readFileSync(path.join(app, 'data-location.json'), 'utf8'), before);
    assert.equal(fs.readFileSync(path.join(app, 'WorkflowIntegration.node'), 'utf8'), 'native');
    assert.ok(fs.existsSync(path.join(app, 'src', 'python', '__pycache__', 'a.cpython-311.pyc')), 'skipped names are left alone');
    assert.equal(fs.readdirSync(path.join(app, 'src', 'main')).some(f => f.endsWith('.self-update-tmp')), false);
    assert.match(fs.readFileSync(path.join(data, '_app', 'self-update.log'), 'utf8'), /2 copied, 2 removed/);
    assert.deepEqual(SU.syncFromCode(app), { updated: false, reason: 'up to date' }, 'a second open has nothing to do');
});

test('a folder left empty goes; a file where a folder now is (and the other way round) is replaced', () => {
    const { code, app } = setup();
    write(path.join(app, 'src', 'old', 'x.js'), 'stale');
    fs.rmSync(path.join(code, 'src', 'python', 'a.py'));
    write(path.join(code, 'src', 'python', 'a.py', 'inner.py'), 'y = 2');
    const r = SU.syncFromCode(app);
    assert.equal(r.updated, true, JSON.stringify(r));
    assert.equal(fs.existsSync(path.join(app, 'src', 'old')), false);
    assert.equal(fs.readFileSync(path.join(app, 'src', 'python', 'a.py', 'inner.py'), 'utf8'), 'y = 2');
});

test('running from the code folder is a no-op', () => {
    const { code } = setup();
    write(path.join(code, 'data-location.json'), JSON.stringify({ codeDir: code, dataDir: path.join(tmp, 'nodata') }));
    assert.deepEqual(SU.syncFromCode(code), { updated: false, reason: 'running from the code folder' });
    fs.rmSync(path.join(code, 'data-location.json'));
    const r = SU.syncFromCode(code);
    assert.equal(r.updated, false);
    assert.match(r.reason, /no data-location\.json/);
});

test('a missing or wrong code folder is a no-op', () => {
    const { code, app } = setup();
    fs.renameSync(code, code + '-moved');
    let r = SU.syncFromCode(app);
    assert.equal(r.updated, false);
    assert.match(r.reason, /code folder not found/);
    fs.mkdirSync(code);
    write(path.join(code, 'manifest.xml'), '<Plugin><Id>com.other.plugin</Id></Plugin>');
    write(path.join(code, 'main.js'), '');
    fs.mkdirSync(path.join(code, 'src', 'main'), { recursive: true });
    r = SU.syncFromCode(app);
    assert.match(r.reason, /code folder not found/);
    assert.equal(fs.readFileSync(path.join(app, 'src', 'main', 'index.js'), 'utf8'), '// v1');
});

test('a read-only installed folder is a no-op', { skip: process.getuid && process.getuid() === 0 ? 'root can write anywhere' : false }, () => {
    const { code, app } = setup();
    write(path.join(code, 'src', 'main', 'index.js'), '// v2', new Date('2026-11-20T10:00:00Z'));
    fs.chmodSync(app, 0o555);
    try {
        const r = SU.syncFromCode(app);
        assert.deepEqual(r, { updated: false, reason: 'the installed panel folder is read-only' });
        assert.equal(fs.readFileSync(path.join(app, 'src', 'main', 'index.js'), 'utf8'), '// v1');
    } finally { fs.chmodSync(app, 0o755); }
});

test('an error stops the sync and is returned, never thrown', { skip: process.getuid && process.getuid() === 0 ? 'root can read anywhere' : false }, () => {
    const { code, app } = setup();
    write(path.join(code, 'src', 'main', 'index.js'), '// v2', new Date('2026-11-20T10:00:00Z'));
    fs.chmodSync(path.join(code, 'src', 'main', 'index.js'), 0o000);
    try {
        const r = SU.syncFromCode(app);
        assert.equal(r.updated, false);
        assert.ok(r.error, JSON.stringify(r));
        assert.equal(fs.readFileSync(path.join(app, 'src', 'main', 'index.js'), 'utf8'), '// v1');
    } finally { fs.chmodSync(path.join(code, 'src', 'main', 'index.js'), 0o644); }
    assert.equal(SU.syncFromCode(null).updated, false);
});

test('the installer reports the panel up to date after a sync', async () => {
    const PLUGIN = require('../../installer/shared/plugin');
    const { root, code, app, data } = setup();
    const ctx = { mainDir: root, codeDir: code, dataDir: data, paths: { dest: app, sampleNode: path.join(app, 'WorkflowIntegration.node') } };
    assert.equal((await PLUGIN.ITEM.detect(ctx)).state, 'ok');
    write(path.join(code, 'src', 'main', 'index.js'), '// v2', new Date('2026-11-20T10:00:00Z'));
    assert.equal((await PLUGIN.ITEM.detect(ctx)).state, 'update');
    assert.equal(SU.syncFromCode(app).updated, true);
    assert.equal((await PLUGIN.ITEM.detect(ctx)).state, 'ok');
});

test('main.js syncs first, so the same open loads the new src/', () => {
    const { execFileSync } = require('child_process');
    const { code, app } = setup();
    fs.copyFileSync(path.join(__dirname, '..', '..', 'main.js'), path.join(app, 'main.js'));
    write(path.join(code, 'src', 'main', 'index.js'), 'console.log("v2 " + global.framellySelfUpdate.changed.length);', new Date('2026-11-20T10:00:00Z'));
    assert.equal(execFileSync(process.execPath, [path.join(app, 'main.js')], { encoding: 'utf8' }).trim(), 'v2 2');      // index.js and main.js
});
