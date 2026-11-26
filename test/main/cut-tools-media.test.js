// cut-tools.js timelineMedia: Text+ / MultiText titles are skipped by name before GetMediaPoolItem, which returns nil
// for them (Resolve logs "Nil ScriptVal" for every such call).
const test = require('node:test');
const assert = require('node:assert/strict');
const env = require('../helpers/env');
const { makeResolve, makeProject, makeTimeline } = require('../helpers/fake-resolve');

const CUT = env.main('cut-tools');

function withMedia(item, file) {
    item.GetMediaPoolItem = () => {
        item.mpiAsked = (item.mpiAsked || 0) + 1;
        if (!file) return null;
        return { GetClipProperty: (k) => ({ 'File Path': file, Type: 'Video + Audio', FPS: '25' })[k] || '' };
    };
    item.GetSourceStartFrame = () => 0;
    item.GetSourceEndFrame = () => item.end - item.start;
    return item;
}

test('timelineMedia does not ask a title clip for its media pool item', async () => {
    const tl = makeTimeline({
        tracks: {
            video: [[{ name: 'A001.mov', start: 0, end: 100 }], [{ name: 'Text+ Pop', start: 10, end: 50 }, { name: 'MultiText Seg', start: 50, end: 90 }]],
            audio: [[{ name: 'A001.mov', start: 0, end: 100 }]]
        }
    });
    tl.GetEndFrame = () => 100;
    const [v1, v2] = [tl.tracks.video[0].items[0], tl.tracks.video[1].items];
    withMedia(v1, '/media/A001.mov');
    for (const t of v2) withMedia(t, null);
    withMedia(tl.tracks.audio[0].items[0], '/media/A001.mov');
    env.useResolve(makeResolve({ project: makeProject({ timeline: tl }) }));

    const r = await CUT.timelineMedia({ startFrame: 0, endFrame: 100 });
    assert.equal(v2[0].mpiAsked, undefined);
    assert.equal(v2[1].mpiAsked, undefined);
    assert.equal(v1.mpiAsked, 1);
    assert.deepEqual(r.segments.map(s => s.kind + ':' + s.name), ['video:A001.mov', 'audio:A001.mov']);
    assert.equal(v1.calls.GetName, 1, 'the name read for the title check is reused');
});
