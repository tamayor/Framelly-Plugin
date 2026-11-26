// Sounds that belong to one MultiText row (Upper / Emphasis / Lower): placing them at the row's start, remembering
// them per text clip and moving them when the row's timing changes.

module.exports = {
    loneRow, placeRowSfx, refitRowSfx, rowFramesFor, rowSfxSet, segSfxAdd, segSfxFor, segSfxForget, segSfxRecord, segSfxSetEmpty
};

const path = require('path');
const fs = require('fs');

const { APP_DATA_DIR } = require('./config');
const { sfxFilePath } = require('./sfx');
const { applyLevel, clampToWindow, peakOf, variations } = require('./sfx-level');
const { importSfx } = require('./sfx-import');
const { regAdd } = require('./live-preview');
const { dlog } = require('./log');
const { deleteExtraSfx, fitDuration, linkToText, pickTrack } = require('./placement');
const { findItemsByIds, tcToFrame } = require('./resolve');
const { snapAdd } = require('./timeline-snapshot');

// ------------------------------------------------------------------ row sounds follow the row's timing
// Sounds aligned to one MultiText row (Upper / Emphasis / Lower) are remembered per text clip, so the Animation timing
// bar can move them when that row's start is dragged, and so they come and go with the row's text on a placed clip:
// _app/seg-sounds.json = { <text item id>: { sounds: [{ id, seg, off }], layers: [the row sound settings], empty: { <n>: true } } }
// (off = frames after the row's start; empty = the rows that had no text when last looked at). Older entries were a
// plain list of sounds. Entries whose clips are gone are dropped when they are next looked up.
const SEG_SFX_FILE = path.join(APP_DATA_DIR, 'seg-sounds.json');
// Read once and kept in memory; writes are gathered and made 150 ms later (a placement writes it several times in a row).
let segSfx = null, segSfxTimer = null;
function segSfxRead() {
    if (segSfx) return segSfx;
    try { const o = JSON.parse(fs.readFileSync(SEG_SFX_FILE, 'utf8')); segSfx = (o && typeof o === 'object') ? o : {}; } catch (e) { segSfx = {}; }
    return segSfx;
}
function segSfxWrite(o) {
    segSfx = o;
    const keys = Object.keys(o);
    if (keys.length > 2000) for (const k of keys.slice(0, keys.length - 2000)) delete o[k];
    if (segSfxTimer) return;
    segSfxTimer = setTimeout(segSfxFlush, 150);
    if (segSfxTimer.unref) segSfxTimer.unref();
}
function segSfxFlush() {
    if (segSfxTimer) { clearTimeout(segSfxTimer); segSfxTimer = null; }
    if (!segSfx) return;
    try {
        fs.mkdirSync(APP_DATA_DIR, { recursive: true });
        fs.writeFileSync(SEG_SFX_FILE, JSON.stringify(segSfx));
    } catch (e) { dlog('SEG-SFX-WRITE', e.message); }
}
process.on('exit', () => { try { segSfxFlush(); } catch (e) { /* ignore */ } });
// rows: the per-row copies of 'rows' sounds (Kinetic Cloud): [{ layer, end (frames after the text start the copies stop
// at), track, frames (the row frames they were placed for), ids, rows (the row index of each id), vary ([{ cents, db }]
// per id), gone (rows whose copy was deleted by hand) }], one entry per sound layer. Entries written before rows / vary existed have only ids.
const segRec = (v) => Array.isArray(v) ? { sounds: v, layers: [], empty: {}, rows: [] }
    : Object.assign({ sounds: [], layers: [], empty: {}, rows: [] }, v || {});
function rowSfxSet(videoId, entry) {
    // which row each copy belongs to and its pitch / volume variation (placeRowSfx noted them), so a refit can move the
    // copies that are still there, leave out the ones deleted by hand and keep each copy's sound
    const ids = (entry && entry.ids) || [];
    if (ids.length && (!entry.rows || !entry.vary)) {
        const got = ids.map(id => rowCopyInfo.get(String(id)));
        if (got.every(Boolean)) entry = Object.assign({}, entry, { rows: got.map(x => x.row), vary: got.map(x => ({ cents: x.cents, db: x.db })) });
    }
    for (const id of ids) rowCopyInfo.delete(String(id));
    const o = segSfxRead();
    const r = segRec(o[videoId]);
    const lid = entry.layer && entry.layer.id;
    r.rows = r.rows.filter(x => !(lid && x.layer && x.layer.id === lid)).concat([entry]);
    o[videoId] = r;
    segSfxWrite(o);
}
function segSfxAdd(videoId, links, specs, empty) {
    const o = segSfxRead();
    const r = segRec(o[videoId]);
    r.sounds = r.sounds.filter(x => !links.some(y => y.id === x.id)).concat(links);
    for (const l of (specs || [])) {
        const i = r.layers.findIndex(x => x.id === l.id);
        const copy = JSON.parse(JSON.stringify(l));
        if (i >= 0) r.layers[i] = copy; else r.layers.push(copy);
    }
    if (empty) r.empty = empty;
    o[videoId] = r;
    segSfxWrite(o);
}
// -> { sounds, layers, empty } (empty lists when nothing is recorded)
function segSfxRecord(videoId) { return segRec(segSfxRead()[String(videoId)]); }
function segSfxFor(videoId) { return segSfxRecord(videoId).sounds; }
function segSfxSetEmpty(videoId, empty) {
    const o = segSfxRead(), k = String(videoId);
    if (!o[k]) return;
    o[k] = Object.assign(segRec(o[k]), { empty });
    segSfxWrite(o);
}
function segSfxForget(videoId, ids) {
    const o = segSfxRead(), k = String(videoId);
    if (!o[k]) return;
    const r = segRec(o[k]);
    r.sounds = ids ? r.sounds.filter(x => !ids.includes(x.id)) : [];
    if (!r.sounds.length && !r.layers.length && !(r.rows || []).length) delete o[k]; else o[k] = r;
    segSfxWrite(o);
}
function loneRow(rowFrames) { return !!(rowFrames && !Array.isArray(rowFrames) && rowFrames.only); }
// The clip-relative row start frames for the 'rows' layers (null when no layer repeats per row or the comp has no
// rows). Call it AFTER the text is written to the comp: the rows are counted from the Pop<k> texts.
// With layers aligned to a MultiText row ('seg'), it returns { rows, segs, empty, only } instead (only = the one row with text when the others are empty: then only that row's sound is placed, see loneRow) (empty = { <n>: true } for
// rows whose text is empty: their sounds are not placed): segs = { <n>: Seg<n>Start }, read
// from the placed clip (after any fit to a short clip), so the sound lands where that row's in-animation starts.
async function rowFramesFor(itemId, compName, layers, warnings) {
    // 'reveal' layers need the rows / words too: their sound lasts until the last one is in
    const wantRows = !!(layers && layers.some(l => l.align === 'rows' || l.lenMode === 'reveal'));
    const wantSegs = !!(layers && layers.some(l => l.align === 'seg'));
    if (!wantRows && !wantSegs) return null;
    const { bridgeCall } = require('./fusion-bridge');              // required here: fusion-bridge loads before this module
    let rows = null, segs = null, empty = null, only = null;
    if (wantRows) {
        try {
            const r = await bridgeCall('row_times', { item: itemId, comp: compName });
            rows = (r && Array.isArray(r.frames) && r.frames.length) ? r.frames : null;
        } catch (e) { if (warnings) warnings.push('Could not read the row timing for the repeated sound: ' + e.message); }
    }
    if (!wantSegs) return rows;
    try {
        const r = await bridgeCall('timing_get', { item: itemId, comp: compName }, 6000);
        if (r && r.kind === 'segments' && Array.isArray(r.ranges)) {
            segs = {}; empty = {};
            only = r.only ? Number(r.only) : null;
            for (const x of r.ranges) {
                segs[Number(x.key)] = Math.max(0, Math.round(Number(x.start) || 0));
                if (x.empty) empty[Number(x.key)] = true;      // rows left without text get no sound
            }
        }
    } catch (e) { if (warnings) warnings.push('Could not read the Upper / Emphasis / Lower timing for their sounds: ' + e.message); }
    return { rows, segs, empty, only };
}
// The copies' cuts: one per row that starts before textEnd, [{ row (index in rows), start, len }]. total = the source
// frames after trimIn (Infinity when unknown: a 'clip' length is then the room until the next row).
function rowCuts(rows, textStart, textEnd, tlStart, off, total, mode, cap) {
    const cuts = [];
    for (let i = 0; i < rows.length; i++) {
        const start = Math.max(tlStart, textStart + Math.round(Number(rows[i]) || 0) + off);
        let len = total;
        if (mode === 'clip') {
            const next = i + 1 < rows.length ? textStart + Math.round(Number(rows[i + 1]) || 0) + off : textEnd;
            len = Math.min(len, Math.max(1, Math.min(next, textEnd) - start));
        } else if (cap > 0) len = Math.min(len, cap);
        len = Math.max(1, len);
        if (start >= textEnd) continue;
        cuts.push({ row: i, start, len });
    }
    return cuts;
}
function rowLayerCut(l) {
    const cap = Math.round(Number(l.len) || 0);
    const off = Math.round(Number(l.offset) || 0);
    const mode = (l.lenMode === 'fixed' || l.lenMode === 'clip') ? l.lenMode : (cap > 0 ? 'fixed' : 'clip');
    return { cap, off, mode };
}
// id -> { row, cents, db } of the copies placeRowSfx made, until rowSfxSet records them (bounded)
const rowCopyInfo = new Map();
function noteRowCopy(id, info) {
    rowCopyInfo.set(id, info);
    if (rowCopyInfo.size > 500) rowCopyInfo.delete(rowCopyInfo.keys().next().value);
}
// One copy of the sound per row: each starts at its row's frame (+ the layer's offset); a 'clip' length runs until the
// next row starts (and never past the text end), a fixed length is kept. All copies share one audio track.
// opts (a refit): { only: Set of the row indices to place (null = all), vary: Map row -> { cents, db } to reuse }
async function placeRowSfx(tl, project, meta, l, rows, textStart, textEnd, tlStart, notes, videoItem, warnings, place, projectCopy, snap, opts) {
    const out = [];
    const p = sfxFilePath(l.file);
    if (!fs.existsSync(p)) { warnings.push('Layered sound "' + path.basename(l.file) + '" is missing.'); return out; }
    const { mp, item: mpi } = await importSfx(project, p, projectCopy);
    if (!mpi) { warnings.push('Resolve could not import "' + path.basename(l.file) + '".'); return out; }
    const total = Math.max(1, tcToFrame(await mpi.GetClipProperty('Duration'), meta));
    const trimIn = Math.max(0, Math.min(total - 1, Math.round(Number(l.trimIn) || 0)));
    const { cap, off, mode } = rowLayerCut(l);
    const fps = Math.round((meta && meta.fps) || 25);
    const only = opts && opts.only, keepVary = opts && opts.vary;
    const cuts = rowCuts(rows, textStart, textEnd, tlStart, off, total - trimIn, mode, cap).filter(c => !only || only.has(c.row));
    if (!cuts.length) return out;
    const first = cuts[0].start, last = cuts[cuts.length - 1];
    const track = await pickTrack(tl, 'audio', Math.round(Number(l.track)) || 0, first, last.start + last.len, 1, notes, place, snap);
    const items = [];
    // every copy: the cut's peak inside the window, plus a slight pitch / volume change so the run is not monotonous
    const vary = cuts.length > 1 && l.vary !== false ? variations() : null;
    const peaks = new Map();
    for (const c of cuts) {
        const placed = await mp.AppendToTimeline([{ mediaPoolItem: mpi, mediaType: 2, trackIndex: track, recordFrame: c.start, startFrame: trimIn, endFrame: trimIn + c.len }]);
        if (!placed || !placed.length) { warnings.push('Layered sound "' + path.basename(l.file) + '" could not be placed at frame ' + (c.start - textStart) + '.'); continue; }
        const it = placed[0];
        snapAdd(snap, 'audio', track, { it, name: path.basename(l.file), start: c.start, end: c.start + c.len });
        const fade = Math.max(0, Math.min(c.len, (l.fade === null || l.fade === undefined) ? Math.min(c.len, Math.round(fps / 5)) : Math.round(Number(l.fade) || 0)));
        if (fade > 0) { try { if (typeof it.SetFades === 'function') await it.SetFades({ FadeIn: 0, FadeOut: fade }); } catch (e) { /* the fade is a convenience */ } }
        if (!peaks.has(c.len)) peaks.set(c.len, await peakOf(p, trimIn, c.len, fps));
        const v = (keepVary && keepVary.get(c.row)) || (vary ? vary.next() : { cents: 0, db: 0 });
        await applyLevel(it, clampToWindow((Number(l.volume) || 0) + v.db, peaks.get(c.len)), v.cents);
        const id = String(await it.GetUniqueId());
        if (!projectCopy) regAdd(id);      // a preview's sound is temporary; a placed one is not
        items.push(it);
        noteRowCopy(id, { row: c.row, cents: v.cents, db: v.db });
        out.push({ id, it, track, start: c.start, frames: c.len, link: l.link !== false, row: c.row, cents: v.cents, db: v.db });
    }
    if (l.link !== false && videoItem && items.length) {
        try { await linkToText(tl, videoItem, items); } catch (e) { /* linking is optional */ }
    }
    notes.push('sound "' + path.basename(l.file) + '" repeated for ' + items.length + ' row' + (items.length === 1 ? '' : 's'));
    return out;
}
// The animation of a placed row-by-row clip was sped up / slowed down (Animation Start / Frames) or its words were
// re-timed: its per-row sound copies follow the new row times. The copies still on the timeline are moved in place
// (SetPosition, and a 'clip' length trimmed to the room until the next row), so they keep their id, cut, pitch and
// volume, and Resolve does not get a delete + append per copy on every edit. Only when that is not possible (a row
// needs a copy it never had, a move or trim fails, an old record without rows) are they deleted and placed again,
// with the same pitch / volume where it is known. Copies deleted by hand stay deleted; a set whose copies were all
// deleted is forgotten; one Resolve would not delete is left.
// -> null (no per-row sounds) or { moved, failed, swaps: [{ from: [ids], to: [ids], link }], relink }
//    relink: linked copies were moved on their own, so the text clip's link group should be linked again
async function refitRowSfx(tl, project, meta, textItem, itemId, projectCopy) {
    const rec = segSfxRecord(itemId);
    if (!rec.rows.length) return null;
    const { bridgeCall } = require('./fusion-bridge');
    const r = await bridgeCall('row_times', { item: String(itemId) }, 6000);
    const frames = (r && Array.isArray(r.frames)) ? r.frames.map(f => Math.round(Number(f) || 0)) : [];
    if (!frames.length) return null;
    const textStart = Number(await textItem.GetStart()), clipEnd = Number(await textItem.GetEnd());
    const tlStart = await tl.GetStartFrame();
    let moved = 0, failed = 0, relink = false;
    const swaps = [], keep = [];
    for (const set of rec.rows) {
        if (JSON.stringify(set.frames || []) === JSON.stringify(frames)) { keep.push(set); continue; }
        const ids = (set.ids || []).map(String);
        let found = new Map();
        try { found = await findItemsByIds(tl, ids, 'audio'); } catch (e) { found = new Map(); }
        const there = ids.filter(id => found.has(id));
        if (!there.length) continue;                       // removed by hand: stays removed
        const end = textStart + Math.max(1, Math.min(Math.round(Number(set.end) || 0) || (clipEnd - textStart), clipEnd - textStart));
        const l = Object.assign({}, set.layer, { track: set.track });
        const { cap, off, mode } = rowLayerCut(l);
        // the row of each copy: recorded, else worked out from the frames it was placed for (copies go in row order)
        let rowOf = Array.isArray(set.rows) && set.rows.length === ids.length ? set.rows.map(Number) : null;
        if (!rowOf) {
            const old = rowCuts(set.frames || [], textStart, end, tlStart, off, Infinity, mode, cap);
            if (old.length === ids.length) rowOf = old.map(c => c.row);
        }
        const varyOf = new Map();
        if (rowOf && Array.isArray(set.vary) && set.vary.length === ids.length) ids.forEach((id, k) => { if (set.vary[k]) varyOf.set(rowOf[k], set.vary[k]); });
        // rows whose copy was deleted by hand get none again (now or at an earlier refit: set.gone)
        const gone = new Set(rowOf ? ids.map((id, k) => found.has(id) ? null : rowOf[k]).filter(x => x !== null).concat(set.gone || []) : []);
        const cuts = rowCuts(frames, textStart, end, tlStart, off, Infinity, mode, cap).filter(c => !gone.has(c.row));
        if (rowOf) {
            const m = await moveRowCopies(tl, ids.map((id, k) => ({ id, it: found.get(id), row: rowOf[k], vary: set.vary && set.vary.length === ids.length ? set.vary[k] : null })).filter(x => x.it), cuts, mode, found);
            if (m) {
                moved += m.moved;
                if (m.moved && projectCopy && l.link !== false) relink = true;
                if (m.dropped.length) swaps.push({ from: m.dropped, to: [], link: [] });
                const next = Object.assign({}, set, { frames: frames.slice(), ids: m.stay.map(x => x.id), rows: m.stay.map(x => x.row), gone: [...gone] });
                if (m.stay.every(x => x.vary)) next.vary = m.stay.map(x => x.vary); else delete next.vary;
                keep.push(next);
                continue;
            }
        }
        // placed again: the copies that are left are deleted first (a move above may have gone part way or dropped some)
        const stillThere = ids.filter(id => found.has(id));
        const left = await deleteExtraSfx(tl, stillThere, found);
        if (left.length) { failed++; keep.push(set); continue; }
        const warnings = [];
        // a failed placement counts as failed: the sets already moved are still written to seg-sounds.json below
        const only = rowOf ? new Set(cuts.map(c => c.row)) : null;
        let copies = [];
        try { copies = await placeRowSfx(tl, project, meta, l, frames, textStart, end, tlStart, [], projectCopy ? textItem : null, warnings, null, projectCopy, undefined, { only, vary: varyOf }); }
        catch (e) { dlog('ROW-SFX-REFIT-FAIL', String(e && e.message || e)); copies = []; }
        for (const x of copies) rowCopyInfo.delete(x.id);
        if (!copies.length) { failed++; continue; }
        moved += copies.length;
        swaps.push({ from: there, to: copies.map(x => x.id), link: copies.filter(x => x.link).map(x => x.id) });
        keep.push(Object.assign({}, set, { track: copies[0].track, frames: frames.slice(), ids: copies.map(x => x.id),
            rows: copies.map(x => x.row), vary: copies.map(x => ({ cents: x.cents, db: x.db })), gone: [...gone] }));
    }
    const o = segSfxRead();
    o[String(itemId)] = Object.assign(segRec(o[String(itemId)]), { rows: keep });
    segSfxWrite(o);
    return { moved, failed, swaps, relink };
}
// Moves one set's copies to the new cuts in place. copies: [{ id, it, row, vary }] (the ones still on the timeline);
// cuts: [{ row, start, len }] (len = the room until the next row for a 'clip' length). Copies whose row has no cut any
// more are deleted. -> { moved, stay: [copies kept, in row order], dropped: [ids] }, or null when the set has to be
// placed again (a cut without a copy, a delete, trim or move that did not take).
async function moveRowCopies(tl, copies, cuts, mode, found) {
    const byRow = new Map(copies.map(x => [x.row, x]));
    if (cuts.some(c => !byRow.has(c.row))) return null;
    const cutOf = new Map(cuts.map(c => [c.row, c]));
    const dropped = copies.filter(x => !cutOf.has(x.row)).map(x => x.id);
    if (dropped.length) {
        const left = await deleteExtraSfx(tl, dropped, found);
        if (left.length) return null;
        for (const id of dropped) found.delete(id);
    }
    const stay = copies.filter(x => cutOf.has(x.row)).sort((a, b) => a.row - b.row);
    const plan = [];
    for (const x of stay) {
        const s0 = Number(await x.it.GetStart()), d0 = Number(await x.it.GetEnd()) - s0;
        const c = cutOf.get(x.row);
        if (!Number.isFinite(s0) || !(d0 > 0)) return null;
        plan.push({ x, s0, d0, s1: c.start, len: mode === 'clip' ? c.len : d0 });
    }
    let n = 0;
    try {
        // shorter first, then moves (later ones from the last copy back, earlier ones from the first on), then longer:
        // a copy never has to go where another one still is
        for (const p of plan) if (p.len < p.d0) { if (!(await fitDuration(p.x.it, p.len))) return null; }
        const later = plan.filter(p => p.s1 > p.s0).sort((a, b) => b.s0 - a.s0);
        const earlier = plan.filter(p => p.s1 < p.s0).sort((a, b) => a.s0 - b.s0);
        for (const p of later.concat(earlier)) {
            if (typeof p.x.it.SetPosition !== 'function' || !(await p.x.it.SetPosition({ startFrame: p.s1 }, false))) return null;
        }
        for (const p of plan) {
            if (!(p.len > p.d0)) continue;
            // a copy can grow only as far as its sound goes (as placeRowSfx cuts it): nothing trimmed off is the end
            if (!(await fitDuration(p.x.it, p.len)) && Number(await p.x.it.GetRightOffset()) !== 0) return null;
        }
        n = plan.filter(p => p.s1 !== p.s0 || p.len !== p.d0).length;
    } catch (e) { dlog('ROW-SFX-MOVE-FAIL', String(e && e.message || e)); return null; }
    return { moved: n, stay, dropped };
}
