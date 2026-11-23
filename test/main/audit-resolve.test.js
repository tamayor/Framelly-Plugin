// Regression tests for audit fixes in the Resolve-facing main-process modules (timeline-sync, automation, repair,
// boilerplates, placement, settle, tool-schemas, row-sfx), against the fake Resolve API.
//
// The automation server writes its endpoint file to ~/.framelly: HOME points at a temporary folder for this file's
// process (set before anything reads it), so the real endpoint of a running panel is never touched.
const fs = require('fs');
const os = require('os');
const path = require('path');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'framelly-test-home-'));
process.env.HOME = HOME;
process.on('exit', () => { try { fs.rmSync(HOME, { recursive: true, force: true }); } catch (e) { /* temp folder */ } });

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const env = require('../helpers/env');
const { makeItem, makeTimeline, makeProject, makeResolve } = require('../helpers/fake-resolve');

// ------------------------------------------------------------------ stubs (set before the modules that use them load)
// The Fusion helper is a Python process: every call is answered here instead.
let bridge = async () => ({});
const bridgeLog = [];
const FB = env.main('fusion-bridge');
FB.bridgeCall = (op, args) => { bridgeLog.push([op, args]); return bridge(op, args); };

// Title templates live in Resolve's own folder: they are kept in a temporary one here.
const TITLES = fs.mkdtempSync(path.join(os.tmpdir(), 'framelly-test-titles-'));
process.on('exit', () => { try { fs.rmSync(TITLES, { recursive: true, force: true }); } catch (e) { /* temp folder */ } });
const TT = env.main('title-templates');
TT.presetTitleFor = (file, title) => title || 'Pop Title';
TT.presetTitleNames = () => new Map();
TT.presetOutputFor = () => null;
TT.titleKindFor = () => 'text';
TT.titlesDir = () => TITLES;

const LIB = env.main('library');
let lib = { animations: [] };
LIB.loadLib = () => JSON.parse(JSON.stringify(lib));

// Inserting a title is the playhead dance of placement.js: here it just lands at the end of V1.
const PL = env.main('placement');
let nextInsert = null;      // (item) => void, to change how the inserted clip behaves
PL.insertTitleAtEnd = async (tl, meta, endFrame) => {
    const it = live(tl).add('video', 1, { name: 'Pop Title', start: endFrame, end: endFrame + 100 });
    if (nextInsert) nextInsert(it);
    return { item: it };
};
PL.fitDuration = async (item, want) => { item.end = item.start + want; return true; };

const config = env.main('config');
const state = env.state;

// ------------------------------------------------------------------ a timeline whose clips can move and be deleted
function live(tl) {
    if (tl.add) return tl;
    const where = (it) => {
        for (const kind of ['video', 'audio', 'subtitle']) {
            const trs = tl.tracks[kind] || [];
            for (let t = 0; t < trs.length; t++) if (trs[t].items.includes(it)) return [kind, t + 1];
        }
        return null;
    };
    const take = (it) => { const w = where(it); if (w) { const tr = tl.tracks[w[0]][w[1] - 1]; tr.items.splice(tr.items.indexOf(it), 1); } return w; };
    const wire = (it) => {
        it.moves = 0;
        it.GetTrackTypeAndIndex = () => where(it);
        it.SetPosition = ({ trackIndex, startFrame }) => {
            it.moves++;
            if (it.allowMoves !== undefined && it.moves > it.allowMoves) return false;
            const w = take(it);
            const kind = w ? w[0] : 'video';
            while (tl.tracks[kind].length < trackIndex) tl.tracks[kind].push({ items: [], locked: false, enabled: true });
            const len = it.end - it.start;
            it.start = startFrame; it.end = startFrame + len;
            tl.tracks[kind][trackIndex - 1].items.push(it);
            return true;
        };
        it.GetProperties = () => Object.assign({}, it.properties);
        it.GetFusionCompNameList = () => ['Composition 1'];
        it.GetFusionCompCount = () => 1;
        it.SetClipColor = () => true;
        return it;
    };
    for (const kind of ['video', 'audio', 'subtitle']) for (const tr of tl.tracks[kind]) tr.items.forEach(wire);
    tl.add = (kind, t, o) => {
        while (tl.tracks[kind].length < t) tl.tracks[kind].push({ items: [], locked: false, enabled: true });
        const it = wire(makeItem(o));
        tl.tracks[kind][t - 1].items.push(it);
        return it;
    };
    tl.where = where;
    tl.DeleteClips = (items) => { for (const it of items) take(it); return true; };
    tl.GetEndFrame = () => Math.max(0, ...['video', 'audio'].flatMap(k => tl.tracks[k].flatMap(tr => tr.items.map(x => x.end))));
    tl.GetCurrentTimecode = () => '00:00:00:00';
    tl.SetCurrentTimecode = () => true;
    tl.GetSelectedClips = () => [];
    tl.GetMarkInOut = () => ({});
    return tl;
}
function connect(tl, project) {
    project = project || makeProject({ timeline: tl });
    env.useResolve(makeResolve({ project }));
    return project;
}
const ids = (tl, kind, t) => (tl.tracks[kind][t - 1] || { items: [] }).items.map(x => x.id);

// ------------------------------------------------------------------ PR-01 timeline-sync: live sound volume
test('syncLiveTransform sets the last placed sound clip\'s volume (findItemsByIds argument order)', async () => {
    const TS = env.main('timeline-sync');
    const tl = live(makeTimeline({ tracks: {
        video: [[{ name: 'A001.mov', start: 0, end: 300 }], [{ name: 'Text+ Pop', start: 50, end: 90, id: 'txt-1' }]],
        audio: [[{ name: 'pop.wav', start: 50, end: 70, id: 'aud-1' }]]
    } }));
    const audio = tl.tracks.audio[0].items[0];
    audio.GetMediaPoolItem = () => { throw new Error('no media pool item'); };      // unmeasured: the slider value is used
    connect(tl);
    state.lastPlacedItemId = 'txt-1';
    state.lastPlacedAudioId = 'aud-1';
    await TS.syncLiveTransform(null, { posX: 0, posY: 0, scale: 1, rotation: 0, sfxVolume: -4 });
    assert.equal(audio.properties.AudioVolume, -4);
    assert.equal(audio.properties.AudioVolumeEnabled, true);
});

// ------------------------------------------------------------------ PR-10 tool-schemas
test('checkToolArgs checks the type of a property that may also be null', () => {
    const T = env.main('tool-schemas');
    assert.match(T.checkToolArgs('set_rules', { font: 12345 }), /font must be object/);
    assert.match(T.checkToolArgs('set_rules', { color: [1, 2] }), /color must be string/);
    assert.equal(T.checkToolArgs('set_rules', { font: null, color: null }), null, 'null still clears');
    assert.equal(T.checkToolArgs('set_rules', { font: { font: 'Poppins' }, color: '#ffffff' }), null);
});

// ------------------------------------------------------------------ PR-09 settle
test('settleNow keeps owed wakes scheduled when a preview stops them from running now', async () => {
    const S = env.main('settle');
    bridge = async () => ({});
    S.settleLater('settle-1', 'Composition 1');
    state.liveSession = { itemId: 'preview' };
    try { await S.settleNow(); } finally { state.liveSession = null; }
    const woke = () => bridgeLog.some(([op, a]) => op === 'refresh' && a && a.item === 'settle-1');
    assert.equal(woke(), false, 'nothing runs while the preview is on');
    await new Promise(r => setTimeout(r, 1800));      // settleDelayMs default 1500
    assert.equal(woke(), true, 'the wake runs once the panel is idle again');
});

// ------------------------------------------------------------------ PR-04 repair_inspector
function repairSetup() {
    fs.writeFileSync(path.join(config.ANIM_DIR, 'pop.setting'), '{ Tools = ordered() { Template = TextPlus { }, Follower1 = StyledTextFollower { } } }');
    fs.writeFileSync(path.join(TITLES, 'Pop Title.setting'), '{ Tools = ordered() { Template = TextPlus { }, Follower1 = StyledTextFollower { }, MediaOut1 = MediaOut { } } }');
    lib = { animations: [{ id: 'a1', name: 'Pop', file: 'pop.setting' }] };
    bridge = async (op) => {
        if (op === 'tools') return { tools: [['Template'], ['Follower1'], ['MediaOut1']] };
        return {};
    };
    const tl = live(makeTimeline({ tracks: {
        video: [[{ name: 'A001.mov', start: 0, end: 300, id: 'foot' }], [{ name: 'Text+', start: 50, end: 90, id: 'old' }]]
    } }));
    connect(tl);
    return tl;
}

test('repair_inspector keeps the old clip when the rebuilt one cannot be moved off V1', async () => {
    const REPAIR = env.main('repair');
    const tl = repairSetup();
    nextInsert = (it) => { it.allowMoves = 0; };
    try {
        const r = await REPAIR.repairInspector({});
        assert.equal(r.rebuilt.length, 0);
        assert.equal(r.failed.length, 1);
        assert.match(r.failed[0].error, /old clip was kept/);
        assert.deepEqual(ids(tl, 'video', 2), ['old'], 'the caption is still on the timeline');
        assert.deepEqual(ids(tl, 'video', 1), ['foot'], 'the fresh clip was taken out again');
    } finally { nextInsert = null; }
});

test('repair_inspector puts the rebuilt clip where the old one was', async () => {
    const REPAIR = env.main('repair');
    const tl = repairSetup();
    const r = await REPAIR.repairInspector({});
    assert.equal(r.failed.length, 0, JSON.stringify(r.failed));
    assert.equal(r.rebuilt.length, 1);
    const fresh = tl.tracks.video[1].items;
    assert.equal(fresh.length, 1);
    assert.notEqual(fresh[0].id, 'old');
    assert.deepEqual([fresh[0].start, fresh[0].end], [50, 90]);
    assert.deepEqual(ids(tl, 'video', 1), ['foot']);
});

// ------------------------------------------------------------------ PR-14 boilerplates
test('insertBoilerplate takes a clip it could not slide into place back out', async () => {
    const B = env.main('boilerplates');
    bridge = async () => ({});
    const tl = live(makeTimeline({ tracks: { video: [[{ name: 'A001.mov', start: 0, end: 300, id: 'foot' }], []] } }));
    connect(tl);
    nextInsert = (it) => { it.allowMoves = 1; };      // the track change works, the slide does not
    try {
        const r = await B.insertBoilerplate(null, 'text');
        assert.ok(r.error, 'an error is returned');
        const all = ['video', 'audio'].flatMap(k => tl.tracks[k].flatMap(tr => tr.items.map(x => x.id)));
        assert.deepEqual(all, ['foot'], 'no stray boilerplate clip left at the end of the timeline');
        assert.equal(state.applying, false);
    } finally { nextInsert = null; }
});

// ------------------------------------------------------------------ PR-15 placement: direct placement cut check
test('directPlaceTitle is not turned off by the slot reserved for the main sound', async () => {
    const tl = live(makeTimeline({ tracks: { video: [[{ name: 'A001.mov', start: 0, end: 300, id: 'foot' }], []], audio: [[]] } }));
    const mp = { AppendToTimeline: ([o]) => [tl.add('video', o.trackIndex, { name: 'Pop Title', start: o.recordFrame, end: o.recordFrame + (o.endFrame - o.startFrame) })] };
    const project = makeProject({ timeline: tl });
    project.GetMediaPool = () => mp;
    connect(tl, project);
    const T = PL.presetTplState('Direct Title');
    T.auto = { name: 'media pool item' };
    const snap = { tracks: {
        video: [{ t: 1, locked: false, enabled: true, items: [{ name: 'A001.mov', start: 0, end: 300 }] }, { t: 2, locked: false, enabled: true, items: [] }],
        audio: [{ t: 1, locked: false, enabled: true, items: [{ name: 'sfx', start: 100, end: 120 }] }]      // reserved, not placed yet
    } };
    const item = await PL.directPlaceTitle(tl, project, 2, 100, 50, 'text', 'Direct Title', snap);
    assert.ok(item, 'the title was placed directly');
    assert.equal(T.broken, false);
    assert.deepEqual(ids(tl, 'video', 2), [item.id]);
});

// ------------------------------------------------------------------ PR-17 row-sfx: a failed re-placement
test('refitRowSfx records the sets it handled when placing one of them fails', async () => {
    const RS = env.main('row-sfx');
    const file = path.join(config.SFX_DIR, 'row-pop.wav');
    fs.writeFileSync(file, 'RIFF');
    const tl = live(makeTimeline({ tracks: {
        video: [[{ name: 'A001.mov', start: 0, end: 300 }], [{ name: 'Kinetic Cloud', start: 100, end: 200, id: 'row-txt' }]],
        audio: [[{ name: 'row-pop.wav', start: 100, end: 110, id: 'row-a1' }, { name: 'row-pop.wav', start: 120, end: 130, id: 'row-a2' }]]
    } }));
    const project = makeProject({ timeline: tl });
    project.GetMediaPool = () => { throw new Error('Media Pool unavailable'); };
    connect(tl, project);
    RS.rowSfxSet('row-txt', { layer: { id: 'L1', file }, end: 100, track: 1, frames: [0, 20], ids: ['row-a1', 'row-a2'] });
    bridge = async (op) => (op === 'row_times' ? { frames: [0, 40] } : {});
    const r = await RS.refitRowSfx(tl, project, { fps: 25, width: 1920, height: 1080 }, tl.tracks.video[1].items[0], 'row-txt', true);
    assert.equal(r.moved, 0);
    assert.equal(r.failed, 1);
    assert.deepEqual(RS.segSfxRecord('row-txt').rows, [], 'the record no longer lists the deleted copies');
});

// ------------------------------------------------------------------ PR-03 / PR-06 / PR-13 automation server
const AUTO = env.main('automation');
const SESSION = env.main('auto-session');
const NAMES = env.main('names');
async function endpoint() {
    AUTO.startAutomation();
    const file = path.join(NAMES.HOME_DIR, 'mcp-endpoint.json');
    assert.ok(NAMES.HOME_DIR.startsWith(HOME), 'the endpoint goes to the test HOME');
    for (let i = 0; i < 100 && !fs.existsSync(file); i++) await new Promise(r => setTimeout(r, 20));
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function post(ep, body, tokenOverride) {
    return new Promise((resolve, reject) => {
        const s = JSON.stringify(body);
        const req = http.request({ host: '127.0.0.1', port: ep.port, path: '/call', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s), 'x-sa-token': tokenOverride === undefined ? ep.token : tokenOverride } }, (res) => {
            let raw = '';
            res.setEncoding('utf8');
            res.on('data', (c) => { raw += c; });
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => req.destroy(new Error('no answer')));
        req.end(s);
    });
}

test('a token header of the right length but other bytes is refused, not thrown on', async () => {
    const ep = await endpoint();
    // written as raw latin1 bytes (Node's own client may send the header as UTF-8): the server reads 48 characters
    // that are 96 bytes in UTF-8
    const status = await new Promise((resolve, reject) => {
        const sock = require('net').connect(ep.port, '127.0.0.1', () => {
            sock.end(Buffer.from('POST /call HTTP/1.1\r\nHost: 127.0.0.1:' + ep.port + '\r\nx-sa-token: ' + 'é'.repeat(ep.token.length) +
                '\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}', 'latin1'));
        });
        let raw = '';
        sock.on('data', (c) => { raw += c.toString('latin1'); });
        sock.on('end', () => resolve(Number((/^HTTP\/1\.1 (\d+)/.exec(raw) || [])[1])));
        sock.on('error', reject);
        sock.setTimeout(3000, () => { sock.destroy(); resolve('no answer'); });
    });
    assert.equal(status, 401);
});

test('remove_placed called in parallel removes exactly the records it was asked for', async () => {
    const ep = await endpoint();
    const tl = live(makeTimeline({ tracks: { video: [[{ name: 'A001.mov', start: 0, end: 300 }], [
        { name: 'Pop', start: 10, end: 20, id: 'pA' }, { name: 'Pop', start: 30, end: 40, id: 'pB' }, { name: 'Pop', start: 50, end: 60, id: 'pC' }
    ]] } }));
    connect(tl);
    SESSION.placed.splice(0, SESSION.placed.length,
        { itemId: 'pA', subtitle: 1, preset: 'Pop' }, { itemId: 'pB', subtitle: 2, preset: 'Pop' }, { itemId: 'pC', subtitle: 3, preset: 'Pop' });
    // the first call's Fusion round trip ends first
    bridge = (op, a) => new Promise(r => setTimeout(() => r({ removed: 0 }), a && a.item === 'pA' ? 20 : 80));
    const [ra, rb] = await Promise.all([post(ep, { tool: 'remove_placed', args: { itemId: 'pA' } }), post(ep, { tool: 'remove_placed', args: { itemId: 'pB' } })]);
    assert.equal(ra.body.ok, true, JSON.stringify(ra.body));
    assert.equal(rb.body.ok, true, JSON.stringify(rb.body));
    assert.deepEqual(SESSION.placed.map(p => p.itemId), ['pC']);
    assert.deepEqual(ids(tl, 'video', 2), ['pC']);
});

test('remove_placed counts the sounds it removed when the text clip is already gone', async () => {
    const ep = await endpoint();
    const tl = live(makeTimeline({ tracks: { video: [[{ name: 'A001.mov', start: 0, end: 300 }]], audio: [[
        { name: 'pop.wav', start: 10, end: 20, id: 'sD1' }, { name: 'whoosh.wav', start: 12, end: 22, id: 'sD2' }
    ]] } }));
    connect(tl);
    SESSION.placed.splice(0, SESSION.placed.length, { itemId: 'pD', audioId: 'sD1', extraAudioIds: ['sD2'], subtitle: 4, preset: 'Pop' });
    bridge = async () => ({ removed: 0 });
    const r = await post(ep, { tool: 'remove_placed', args: { itemId: 'pD' } });
    assert.equal(r.body.ok, true, JSON.stringify(r.body));
    assert.equal(r.body.result.soundClipsRemoved, 2);
    AUTO.stopAutomation();
});
