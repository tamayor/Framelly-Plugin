// Regression tests for the preset library on disk (library.json, its backup, sounds and previews), the version
// bump, the MCP server's local tools and the installer constants it mirrors.
//
// Everything runs in temporary folders: HOME points at one too, so nothing reaches Resolve's real Templates folder or
// the user's ~/.framelly.

const fs = require('fs');
const os = require('os');
const path = require('path');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-test-home-'));
process.env.HOME = HOME;
process.on('exit', () => { try { fs.rmSync(HOME, { recursive: true, force: true }); } catch (e) { /* temp folder */ } });

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const http = require('http');
const env = require('../helpers/env');

const config = env.main('config');
const { LIB_FILE, SFX_DIR, SFX_ORIG_DIR, ANIM_DIR, ANIM_ORIG_DIR, PREV_DIR, DATA_DIR } = config;

// Title templates and fonts would write to Resolve's and the system's folders: not in a test.
const TT = env.main('title-templates');
TT.syncTemplates = () => [];
TT.presetTitleNames = () => new Map();
env.main('fonts').copyFontsForSetting = async () => {};

const LIB = env.main('library');
const ACT = env.main('library-actions');
const OVR = env.main('library-overwrite');

const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const anim = (id, extra) => Object.assign({ id, name: 'Preset ' + id, file: id + '.setting', fileOrig: id + '.setting', segSfxSeeded: true, sfxLinkedDefault: true, tailCapped: true }, extra || {});
const libText = (animations) => JSON.stringify({ alwaysOnTop: true, animations, tags: [] }, null, 2);
const corruptCopies = () => fs.readdirSync(DATA_DIR).filter(f => f.startsWith('library.json.corrupt-'));
function clearLibFiles() {
    for (const f of fs.readdirSync(DATA_DIR)) if (f.startsWith('library.json')) fs.rmSync(path.join(DATA_DIR, f), { force: true });
}

// This must be the first loadLib of the file: the clean-up runs once per process.
test('start-up clean-up keeps a different "<name> 2" sound and drops only a byte-identical copy (PC-04)', () => {
    write(path.join(SFX_ORIG_DIR, 'Click.wav'), 'click A');
    write(path.join(SFX_ORIG_DIR, 'Click 2.wav'), 'click B, another pack');
    write(path.join(SFX_ORIG_DIR, 'Whoosh.wav'), 'same whoosh');
    write(path.join(SFX_ORIG_DIR, 'Whoosh 2.wav'), 'same whoosh');
    write(LIB_FILE, libText([]));
    LIB.loadLib();
    assert.ok(fs.existsSync(path.join(SFX_ORIG_DIR, 'Click 2.wav')), 'a different sound under a free name is the user\'s');
    assert.ok(!fs.existsSync(path.join(SFX_ORIG_DIR, 'Whoosh 2.wav')), 'an identical duplicate still goes');
    assert.ok(fs.existsSync(path.join(SFX_ORIG_DIR, 'Whoosh.wav')));
});

test('a missing library.json is brought back from library.json.bak (PC-01)', () => {
    clearLibFiles();
    const text = libText([anim('a1'), anim('a2')]);
    write(LIB_FILE + '.bak', text);
    const lib = LIB.loadLib();
    assert.deepEqual(lib.animations.map(a => a.id), ['a1', 'a2']);
    assert.ok(fs.existsSync(LIB_FILE), 'library.json is written back');
    assert.deepEqual(JSON.parse(fs.readFileSync(LIB_FILE, 'utf8')).animations.map(a => a.id), ['a1', 'a2']);
    assert.equal(fs.readFileSync(LIB_FILE + '.bak', 'utf8'), text, 'the backup is left as it was');
});

test('a library.json that exists but cannot be read is an error, never an empty library (PC-01)', { skip: process.getuid && process.getuid() === 0 }, () => {
    clearLibFiles();
    const text = libText([anim('b1')]);
    write(LIB_FILE, text);
    fs.chmodSync(LIB_FILE, 0o000);
    try {
        assert.throws(() => LIB.loadLib(), /Could not read the library/);
    } finally { fs.chmodSync(LIB_FILE, 0o644); }
    assert.equal(fs.readFileSync(LIB_FILE, 'utf8'), text, 'the file is untouched');
    assert.deepEqual(LIB.loadLib().animations.map(a => a.id), ['b1']);
});

test('a damaged library.json with no backup is copied aside once, not on every load (PC-02)', () => {
    clearLibFiles();
    write(LIB_FILE, '{ "animations": [ broken');
    const nextMs = () => { const t = Date.now(); while (Date.now() === t) { /* the copy's name has the time in it */ } };
    for (let i = 0; i < 5; i++) { nextMs(); assert.deepEqual(LIB.loadLib().animations, []); }
    assert.equal(corruptCopies().length, 1);
    nextMs();
    write(LIB_FILE, '{ "animations": [ broken again, longer');
    LIB.loadLib();
    assert.equal(corruptCopies().length, 2, 'a new damaged version is kept too');
});

test('a damaged library.json is restored from the backup (PC-01 / PC-02)', () => {
    clearLibFiles();
    write(LIB_FILE + '.bak', libText([anim('c1')]));
    write(LIB_FILE, '{ trunc');
    assert.deepEqual(LIB.loadLib().animations.map(a => a.id), ['c1']);
    assert.deepEqual(JSON.parse(fs.readFileSync(LIB_FILE, 'utf8')).animations.map(a => a.id), ['c1']);
    assert.equal(corruptCopies().length, 1);
});

test('saveLib leaves no temp file and never copies a damaged library.json over the backup (PC-03)', () => {
    clearLibFiles();
    const good = libText([anim('d1')]);
    write(LIB_FILE + '.bak', good);
    const old = (Date.now() - 3600 * 1000) / 1000;
    fs.utimesSync(LIB_FILE + '.bak', old, old);
    write(LIB_FILE, '{ damaged');
    LIB.saveLib({ alwaysOnTop: true, animations: [anim('d2')], tags: [] });
    assert.equal(fs.readFileSync(LIB_FILE + '.bak', 'utf8'), good, 'the good backup is kept');
    assert.deepEqual(JSON.parse(fs.readFileSync(LIB_FILE, 'utf8')).animations.map(a => a.id), ['d2']);
    assert.deepEqual(fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.tmp')), []);
    // a good library.json rotates into the backup as before
    fs.utimesSync(LIB_FILE + '.bak', old, old);
    LIB.saveLib({ alwaysOnTop: true, animations: [anim('d3')], tags: [] });
    assert.deepEqual(JSON.parse(fs.readFileSync(LIB_FILE + '.bak', 'utf8')).animations.map(a => a.id), ['d2']);
});

const EDITED = 'Hit-20240101-120000.wav';
function libWithSharedClip() {
    clearLibFiles();
    write(path.join(SFX_ORIG_DIR, 'Hit.wav'), 'orig');
    write(path.join(SFX_DIR, EDITED), 'trimmed');
    for (const id of ['e1', 'e2']) { write(path.join(ANIM_DIR, id + '.setting'), '{}'); write(path.join(ANIM_ORIG_DIR, id + '.setting'), '{}'); }
    LIB.saveLib({ alwaysOnTop: true, tags: [], animations: [anim('e1', { sfx: EDITED, sfxOrig: 'Hit.wav' }), anim('e2', { sfx: EDITED, sfxOrig: 'Hit.wav' })] });
}

test('reverting or re-sounding a preset keeps an edited clip another preset still uses (PC-06)', () => {
    libWithSharedClip();
    assert.ok(!ACT.revertAnimation(null, 'e1').error);
    assert.ok(fs.existsSync(path.join(SFX_DIR, EDITED)), 'e2 still plays it');
    assert.ok(!OVR.revertAnimationAudio(null, 'e2').error);
    assert.ok(!fs.existsSync(path.join(SFX_DIR, EDITED)), 'deleted once no preset uses it');

    libWithSharedClip();
    write(path.join(HOME, 'New.wav'), 'new sound');
    assert.ok(!ACT.setAnimationSfx(null, 'e1', path.join(HOME, 'New.wav')).error);
    assert.ok(fs.existsSync(path.join(SFX_DIR, EDITED)));
    assert.ok(!OVR.overwriteAudioFromFile(null, 'e2', path.join(HOME, 'New.wav')).error);
    assert.ok(!fs.existsSync(path.join(SFX_DIR, EDITED)));
});

test('a variant of a preset with an edited sound keeps the real original (PC-07)', () => {
    libWithSharedClip();
    const r = ACT.saveAnimationVariant(null, { sourceId: 'e1', name: 'Variant', sfxOrig: 'Hit.wav', sfx: EDITED, sfxPath: path.join(SFX_DIR, EDITED) });
    assert.ok(r.ok, r.error);
    const v = LIB.loadLib().animations.find(a => a.id === r.createdId);
    assert.equal(v.sfxOrig, 'Hit.wav');
    assert.equal(v.sfx, EDITED);
    // a sound from outside the library is still copied in as the variant's new original
    write(path.join(HOME, 'Other.wav'), 'other');
    const r2 = ACT.saveAnimationVariant(null, { sourceId: 'e1', name: 'Variant 2', sfxOrig: 'Hit.wav', sfx: EDITED, sfxPath: path.join(HOME, 'Other.wav') });
    const v2 = LIB.loadLib().animations.find(a => a.id === r2.createdId);
    assert.equal(v2.sfxOrig, 'Other.wav');
    assert.equal(v2.sfx, 'Other.wav');
});

test('lib:remove with an unknown or path-like id deletes nothing (PC-08)', () => {
    libWithSharedClip();
    write(path.join(PREV_DIR, 'e1', 'p00.png'), 'png');
    for (const id of ['', '.', '..', '../..', 'nope']) {
        const r = ACT.removeAnimation(null, id);
        assert.ok(r.lib, 'answers with the library as before');
    }
    assert.ok(fs.existsSync(LIB_FILE));
    assert.ok(fs.existsSync(path.join(PREV_DIR, 'e1', 'p00.png')));
    assert.equal(LIB.loadLib().animations.length, 2);
});

test('removing a preset keeps a preset file another entry uses, and deletes after saving (PC-18)', () => {
    libWithSharedClip();
    const lib = LIB.loadLib();
    lib.animations[1].file = 'e1.setting';      // both entries point at the same file
    LIB.saveLib(lib);
    write(path.join(PREV_DIR, 'e1', 'p00.png'), 'png');
    ACT.removeAnimation(null, 'e1');
    assert.ok(fs.existsSync(path.join(ANIM_DIR, 'e1.setting')), 'e2 still uses it');
    assert.ok(!fs.existsSync(path.join(PREV_DIR, 'e1')), 'its previews go');
    assert.ok(fs.existsSync(path.join(SFX_DIR, EDITED)), 'e2 still uses the edited clip');
    assert.deepEqual(LIB.loadLib().animations.map(a => a.id), ['e2']);
    ACT.removeAnimation(null, 'e2');
    assert.ok(!fs.existsSync(path.join(ANIM_DIR, 'e1.setting')));
    assert.ok(!fs.existsSync(path.join(SFX_DIR, EDITED)));
});

test('overwriting a sound from the timeline keeps library changes made while Resolve answered (PC-05)', async () => {
    libWithSharedClip();
    const wav = path.join(HOME, 'From timeline.wav');
    write(wav, 'timeline sound');
    const clip = { GetMediaPoolItem: async () => ({ GetClipProperty: async () => ({ 'File Path': wav }) }) };
    const timeline = {
        GetSelectedClips: async () => {
            // a slider / tag save lands while Resolve is answering
            const lib = LIB.loadLib();
            lib.animations.find(a => a.id === 'e2').name = 'Renamed meanwhile';
            LIB.saveLib(lib);
            await new Promise(r => setTimeout(r, 10));
            return [clip];
        }
    };
    const project = { GetCurrentTimeline: async () => timeline };
    env.useResolve({ GetProjectManager: async () => ({ GetCurrentProject: async () => project }) });
    const r = await OVR.overwriteAudioFromTimeline(null, 'e1');
    assert.ok(r.ok, r.error);
    const lib = LIB.loadLib();
    assert.equal(lib.animations.find(a => a.id === 'e2').name, 'Renamed meanwhile');
    assert.equal(lib.animations.find(a => a.id === 'e1').sfx, 'From timeline.wav');
    env.useResolve(null);
});

test('setAppVersion refuses text that would break manifest.xml and writes $ patterns literally (PC-10)', () => {
    const dir = fs.mkdtempSync(path.join(HOME, 'ver-'));
    const pkg = path.join(dir, 'package.json'), man = path.join(dir, 'manifest.xml');
    write(pkg, JSON.stringify({ name: 'x', version: '1.0.0' }));
    write(man, '<?xml version="1.0"?>\n<Plugin><Version>1.0.0</Version></Plugin>\n');
    const saved = { PACKAGE_JSON: config.PACKAGE_JSON, MANIFEST_XML: config.MANIFEST_XML };
    config.PACKAGE_JSON = pkg; config.MANIFEST_XML = man;
    let V;
    try {
        delete require.cache[require.resolve(path.join(env.MAIN_DIR, 'app-version'))];
        V = env.main('app-version');
    } finally { Object.assign(config, saved); }
    for (const bad of ['2.0 <beta>', '1.1 & fixes', 'a"b', 'x'.repeat(60)]) {
        assert.equal(V.setAppVersion(null, bad).error, 'Invalid version string', bad);
    }
    assert.match(fs.readFileSync(man, 'utf8'), /<Version>1\.0\.0<\/Version>/);
    assert.equal(V.setAppVersion(null, 'v2.1-$1').version, '2.1-$1');
    assert.match(fs.readFileSync(man, 'utf8'), /<Version>2\.1-\$1<\/Version>/);
    assert.equal(JSON.parse(fs.readFileSync(pkg, 'utf8')).version, '2.1-$1');
    assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.tmp')), []);
});

// ------------------------------------------------------------------ the MCP server (a child process, HOME = temp)

function startMcp() {
    const child = spawn(process.execPath, [path.join(env.ROOT, 'mcp', 'framelly-mcp.js')], { env: Object.assign({}, process.env, { HOME }), stdio: ['pipe', 'pipe', 'inherit'] });
    let buf = '';
    const waiting = new Map(), order = [];
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
        buf += d;
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
            const msg = JSON.parse(buf.slice(0, nl));
            buf = buf.slice(nl + 1);
            order.push(msg.id);
            const w = waiting.get(msg.id);
            if (w) { waiting.delete(msg.id); w(msg); }
        }
    });
    let nextId = 1;
    const call = (method, params) => new Promise((resolve) => {
        const id = nextId++;
        waiting.set(id, resolve);
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
    const tool = async (name, args) => (await call('tools/call', { name, arguments: args })).result;
    return { child, call, tool, order, stop: () => child.kill() };
}

test('MCP local tools: arguments are checked, blank groups and the source behind another path are refused (PC-12 / PC-15)', { timeout: 10000 }, async () => {
    const mcp = startMcp();
    try {
        const r1 = await mcp.tool('read_srt', {});
        assert.equal(r1.isError, true);
        assert.match(r1.content[0].text, /read_srt: path is required/);

        const dir = fs.mkdtempSync(path.join(HOME, 'srt-'));
        const src = path.join(dir, 'talk.srt');
        write(src, '1\n00:00:00,000 --> 00:00:01,000\nhello there\n\n2\n00:00:01,000 --> 00:00:02,000\ngeneral kenobi\n');
        const r2 = await mcp.tool('chop_srt', { path: src, groups: [{ blocks: [1], phrases: ['hello there'] }, { blocks: [2], phrases: ['  '] }] });
        assert.equal(r2.isError, true);
        assert.match(r2.content[0].text, /Group 2 has no text/);

        const r3 = await mcp.tool('chop_srt', { path: src, groups: [{ blocks: [1] }] });
        assert.equal(r3.isError, true);
        assert.match(r3.content[0].text, /phrases/);

        const link = path.join(dir, 'link.srt');
        fs.symlinkSync(src, link);
        const before = fs.readFileSync(src, 'utf8');
        const r4 = await mcp.tool('chop_srt', { path: src, outPath: link, groups: [{ blocks: [1], phrases: ['hello there'] }, { blocks: [2], phrases: ['general kenobi'] }] });
        assert.equal(r4.isError, true);
        assert.match(r4.content[0].text, /outPath is the source file/);
        assert.equal(fs.readFileSync(src, 'utf8'), before);

        const r5 = await mcp.tool('read_srt', { path: src, maxWords: '1' });
        assert.ok(!r5.isError);
        assert.equal(JSON.parse(r5.content[0].text).limits.words, '1–1', 'a number sent as text counts');
    } finally { mcp.stop(); }
});

test('MCP: ping is answered while a panel tool call is still running (PC-13)', { timeout: 10000 }, async () => {
    let release, arrived;
    const reached = new Promise(r => { arrived = r; });
    const server = http.createServer((req, res) => {
        release = () => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, result: { done: true } })); };
        arrived();
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    write(path.join(HOME, '.framelly', 'mcp-endpoint.json'), JSON.stringify({ port: server.address().port, token: 't' }));
    const mcp = startMcp();
    try {
        const slow = mcp.tool('status', {});
        // waits for the call to reach the panel (a fixed sleep failed when the test files run in parallel)
        let timer;
        await Promise.race([reached, new Promise((_, j) => { timer = setTimeout(() => j(new Error('tool call never reached the panel')), 5000); })]);
        clearTimeout(timer);
        const pong = await mcp.call('ping', {});
        assert.deepEqual(pong.result, {});
        assert.ok(release, 'the tool call reached the panel');
        release();
        const r = await slow;
        assert.deepEqual(JSON.parse(r.content[0].text), { done: true });
        assert.deepEqual(mcp.order, [2, 1], 'ping first');
    } finally {
        mcp.stop();
        server.close();
        fs.rmSync(path.join(HOME, '.framelly'), { recursive: true, force: true });
    }
});

// ------------------------------------------------------------------ installer constants mirrored from the plugin

test('the installer\'s matting model and Pillow Pythons match the panel\'s (XP-13)', () => {
    const read = (rel) => fs.readFileSync(path.join(env.ROOT, rel), 'utf8');
    const items = read('installer/mac/items.js');
    const spot = read('src/main/spotlight.js');
    const one = (re, text, what) => { const m = re.exec(text); assert.ok(m, what); return m[1]; };
    assert.equal(one(/url:\s*'([^']+)'/, items, 'installer url'), one(/const MODEL_URL = '([^']+)'/, spot, 'panel url'));
    assert.equal(one(/file:\s*'([^']+)'/, items, 'installer file'), one(/const MODEL_FILE = '([^']+)'/, spot, 'panel file'));
    assert.equal(one(/bytes:\s*(\d+)/, items, 'installer bytes'), one(/const MODEL_BYTES = (\d+)/, spot, 'panel bytes'));
    const list = (text, name) => {
        const body = one(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];'), text, name);
        return Array.from(body.matchAll(/'([^']+)'/g), m => m[1]);
    };
    assert.deepEqual(list(items, 'PILLOW_PYTHONS'), list(read('src/main/match-cut.js'), 'PYTHONS'));
});
