// What the automation tools share for one session: the clips they placed (so remove_placed / list_placed find them
// again, and per-row sounds re-placed after a timing change keep their ids), the current timeline, and waiting until
// the panel is not placing something itself.

const { AsyncLocalStorage } = require('async_hooks');

// Declared before module.exports: a const in the export list must exist when it runs.
const placed = [];      // clips placed through automation this session: { itemId, audioId, extraAudioIds, subtitle, presetId, preset, track }
// The automation lock (waitFree with a function): how many tool calls hold it, and the call chain that holds it, so a
// tool run inside another one's hold (place inside place_stack, waitFree inside place) is not kept waiting by itself.
const lock = { holds: 0, flag: 0 };
const holder = new AsyncLocalStorage();

module.exports = { currentTimeline, otherHold, placed, subtitleAt, swapAudioIds, waitFree };

const state = require('./state');
const { getProject, getSubtitles, timelineMeta } = require('./resolve');

function swapAudioIds(from, to) {
    for (const rec of placed) {
        const ids = rec.extraAudioIds || [];
        if (!ids.some(id => from.includes(id))) continue;
        rec.extraAudioIds = ids.filter(id => !from.includes(id)).concat(to);
    }
}

async function currentTimeline() {
    const project = await getProject();
    if (!project) throw new Error('Open a project in Resolve');
    const tl = await project.GetCurrentTimeline();
    if (!tl) throw new Error('Open a timeline in Resolve');
    return { project, tl, meta: await timelineMeta(tl, project) };
}

async function subtitleAt(tl, n) {
    const subs = await getSubtitles(tl, false);
    const s = subs.find(x => x.index === Number(n));
    if (!s) throw new Error('No subtitle #' + n + ' (the timeline has ' + subs.length + ')');
    return s;
}

// Another tool call holds the automation lock, or the panel is placing / previewing (state.applying).
// (A hold ends with its fn: work fn left running in the background does not keep it.)
function holding() { const h = holder.getStore(); return !!(h && h.active); }
// An automation tool call outside this call chain holds the lock (apply.js waits for it before a panel placement).
function otherHold() { return lock.holds > 0 && !holding(); }
function busy() {
    // inside a hold: another holder cannot be running, but the panel can still be applying (apply.js does not take the
    // lock), so a nested wait (auto-place.js inside place_stack) still waits for it, unless this hold set the flag itself
    if (holding()) return lock.flag === 0 && !!state.applying;
    return lock.holds > 0 || !!state.applying;
}

// waitFree(ms): waits until the panel is free, or throws. waitFree(ms, fn, { flag }): also takes the automation lock
// for as long as fn runs, so automation calls from several MCP servers do not run on the timeline at the same time.
// The check and the claim happen in the same tick (no await between them). flag: true also sets state.applying, so
// the panel's own previews and placements wait too; leave it off when fn needs state.applying clear (settleNow, apply,
// a module that refuses while it is set). allowLive: true also runs while a panel preview is open (a read-only tool).
async function waitFree(ms, fn, opts) {
    if (fn && holding()) return fn();       // this call chain holds the lock already
    const until = Date.now() + ms;
    while (busy() && Date.now() < until) await new Promise(r => setTimeout(r, 150));
    if (busy()) throw new Error('The panel is busy placing a clip. Try again in a moment.');
    if (state.liveSession && !(opts && opts.allowLive)) throw new Error('A "Preview in Resolve" is running in the panel. Apply or cancel it first.');
    if (!fn) return undefined;
    const flag = !!(opts && opts.flag);
    const hold = { active: true };
    lock.holds++;
    if (flag) { lock.flag++; state.applying = true; }
    try {
        return await holder.run(hold, fn);
    } finally {
        hold.active = false;
        lock.holds = Math.max(0, lock.holds - 1);
        if (flag && --lock.flag <= 0) { lock.flag = 0; state.applying = false; }
    }
}
