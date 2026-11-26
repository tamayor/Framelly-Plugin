// Fusion helper: a long-running Python process (python/fusion_bridge.py) that performs the Fusion operations
// the Workflow Integration API cannot. Requests are JSON lines matched to replies by id.
//
// The helper handles one request at a time, so the requests are queued here in three lanes and sent one by one:
//   lane 0  interactive reads the panel is waiting on (live frame, Inspector read-outs, timing watch)
//   lane 1  placement work (set_text, set_boxes, refresh after placing, highlight box...), the default
//   lane 2  background work (preview renders, the idle settle wakes, the seg sweep)
// A request's timeout starts when it is SENT, not when it was queued: a 90 s preview render no longer makes the
// 4 s timing watch behind it fail. While queued, a request waits at most maxWaitMs (default twice its timeout, capped),
// then fails with "helper busy". Identical read requests already waiting share one answer.
// A request that times out is still running in Python (it reads one line at a time). Nothing more is sent until it
// answers (the "drain"): otherwise the next requests would be written behind it, time out themselves, and still run
// later, writes included, after their callers were told they failed. A helper that has not answered after DRAIN_MS
// is killed and a fresh one takes the queue. A stuck render (capture) is killed at once.
// perf.json renderProcess: a second helper takes the renders (capture / live_frame), so they never hold up the rest.

module.exports = {
    bridgeCall, bridgeLane
};

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const state = require('./state');
const { BRIDGE_SCRIPT, RESOLVE_PYTHON, RESOLVE_SCRIPT_API, RESOLVE_SCRIPT_LIB } = require('./config');
const { bridgeFixes } = require('./fusion-fixes');
const PERF = require('./perf');

const LANES = 3;
const LANE_OF = {
    live_frame: 0, controls_get: 0, controls_set: 0, mt_rows_get: 0, mt_rows_set: 0, timing_get: 0, timing_set: 0, seg_watch: 0, ping: 0, config: 0, fonts: 0, probe_render: 0,
    fx_get: 0, fx_set: 0, fx_param: 0, fx_strength: 0,      // effect preset toggles: the user is waiting on them
    capture: 2, seg_sweep: 2, timeline_frames: 2     // render check frames (cut-tools.js): background, never ahead of a placement
};
const COALESCE = new Set(['fx_get', 'seg_watch', 'controls_get', 'timing_get', 'row_times', 'ping', 'fonts', 'tools']);
const RENDER_OPS = new Set(['capture', 'live_frame', 'timeline_frames']);
const MAX_WAIT_CAP_MS = 60000;
const DRAIN_MS = 30000;

function bridgeLane(op) { return LANE_OF[op] === undefined ? 1 : LANE_OF[op]; }

function pythonPath() {
    const list = [RESOLVE_PYTHON, '/usr/bin/python3', '/opt/homebrew/bin/python3', '/usr/local/bin/python3'];
    return list.find(p => fs.existsSync(p)) || 'python3';
}

// One helper process with its queue. `slot` is the state field that holds the process ('bridge' or 'bridgeRender').
class Helper {
    constructor(slot) {
        this.slot = slot;
        this.proc = null;
        this.buf = ''; this.err = '';
        this.queue = []; for (let i = 0; i < LANES; i++) this.queue.push([]);
        this.inflight = null;
        this.seq = 1;
        this.draining = null;      // id of a request that timed out but is still running in the helper
        this.drainSince = 0;
        this.drainOp = '';
        this.drainTimer = null;
    }

    endDrain() {
        this.draining = null; this.drainSince = 0; this.drainOp = '';
        if (this.drainTimer) { clearTimeout(this.drainTimer); this.drainTimer = null; }
    }

    alive() {
        const p = this.proc;
        return !!(p && p.exitCode === null && !p.killed && p.stdin && !p.stdin.destroyed);
    }

    start() {
        const env = Object.assign({}, process.env, {
            RESOLVE_SCRIPT_API,
            RESOLVE_SCRIPT_LIB,
            PYTHONPATH: path.join(RESOLVE_SCRIPT_API, 'Modules') + path.delimiter + (process.env.PYTHONPATH || '')
        });
        this.buf = ''; this.err = '';
        this.endDrain();      // a new process has nothing of the old one's still running
        const proc = spawn(pythonPath(), [BRIDGE_SCRIPT], { env });
        this.proc = proc;
        state[this.slot] = proc;
        // a replaced helper (killed after a timeout) can still flush output: it must not mix into the new one's
        proc.stdout.on('data', (d) => {
            if (this.proc !== proc) return;
            this.buf += d.toString();
            let i;
            while ((i = this.buf.indexOf('\n')) >= 0) {
                const line = this.buf.slice(0, i); this.buf = this.buf.slice(i + 1);
                let msg;
                try { msg = JSON.parse(line); } catch (e) { continue; }      // stray output
                this.onReply(msg);
            }
        });
        proc.stderr.on('data', (d) => { if (this.proc === proc) this.err = (this.err + d.toString()).slice(-400); });
        proc.stdin.on('error', () => { /* helper went away: the exit handler rejects what was waiting */ });
        proc.stdout.on('error', () => { /* ignore */ });
        proc.stderr.on('error', () => { /* ignore */ });
        const fail = (why) => {
            if (this.proc !== proc) return;
            const reason = why + (this.err ? ' ' + this.err : '');
            const job = this.inflight; this.inflight = null;
            this.endDrain();
            if (job) this.settle(job, null, new Error(reason));
            for (const q of this.queue) { for (const j of q.splice(0)) this.settle(j, null, new Error(reason)); }
            this.proc = null;
            if (state[this.slot] === proc) state[this.slot] = null;
        };
        proc.on('error', (e) => fail('Could not start Python: ' + e.message));
        proc.on('exit', () => fail('The Fusion helper stopped.'));
        // the user's Fusion fixes settings, before any other request (id 0: its answer is not waited for)
        try { proc.stdin.write(JSON.stringify({ id: 0, op: 'config', args: bridgeFixes() }) + '\n'); } catch (e) { /* the exit handler reports it */ }
    }

    enqueue(job) {
        if (!this.alive()) this.start();
        if (COALESCE.has(job.op)) {
            const same = this.queue[job.lane].find(j => j.key === job.key);
            if (same) { same.waiters.push(job); return; }
        }
        this.queue[job.lane].push(job);
        job.waitTimer = setTimeout(() => {
            const q = this.queue[job.lane];
            const i = q.indexOf(job);
            if (i >= 0) { q.splice(i, 1); this.settle(job, null, new Error('The Fusion helper is busy (' + (this.inflight ? this.inflight.op : (this.drainOp || '?')) + ').')); }
        }, job.maxWaitMs);
        if (job.waitTimer.unref) job.waitTimer.unref();
        this.pump();
    }

    pump() {
        if (this.inflight) return;
        if (this.draining !== null) {
            if (Date.now() - this.drainSince < DRAIN_MS) return;      // still waiting for the timed-out request's answer
            const old = this.proc;      // it never answered: a fresh helper takes the queue
            this.proc = null; state[this.slot] = null;
            this.endDrain();
            try { if (old) old.kill('SIGKILL'); } catch (e) { /* ignore */ }
        }
        if (!this.alive()) {
            // the helper is gone (timed out and killed, or its pipe broke): a new one takes the jobs still queued
            if (!this.queue.some(q => q.length)) return;
            this.start();
            if (!this.alive()) return;
        }
        let job = null;
        for (const q of this.queue) { if (q.length) { job = q.shift(); break; } }
        if (!job) return;
        clearTimeout(job.waitTimer); job.waitTimer = null;
        job.id = this.seq++;
        job.sentAt = Date.now();
        PERF.record('bridge.wait.' + job.op, job.sentAt - job.queuedAt);
        this.inflight = job;
        job.timer = setTimeout(() => {
            if (this.inflight !== job) return;
            this.inflight = null;
            this.settle(job, null, new Error('The Fusion helper did not answer'));
            if (job.op === 'capture') {      // a stuck render: the helper is killed and started fresh for the next job
                const old = this.proc;
                this.proc = null; state[this.slot] = null;
                try { if (old) old.kill(); } catch (e) { /* ignore */ }
                this.pump();
                return;
            }
            // still running in Python: nothing else is sent until it answers (onReply) or DRAIN_MS have passed
            this.draining = job.id; this.drainSince = Date.now(); this.drainOp = job.op;
            this.drainTimer = setTimeout(() => { this.drainTimer = null; this.pump(); }, DRAIN_MS + 10);
            if (this.drainTimer.unref) this.drainTimer.unref();
        }, job.timeoutMs);
        try { this.proc.stdin.write(JSON.stringify({ id: job.id, op: job.op, args: job.args }) + '\n'); }
        catch (e) {
            clearTimeout(job.timer);
            this.inflight = null;
            this.settle(job, null, e);
            const old = this.proc;
            this.proc = null; state[this.slot] = null;
            try { if (old) old.kill(); } catch (err) { /* ignore */ }
            this.pump();
        }
    }

    onReply(msg) {
        if (this.draining !== null && msg.id === this.draining) {      // the timed-out request is done: the queue goes on
            this.endDrain();
            this.pump();
            return;
        }
        const job = this.inflight;
        if (!job || msg.id !== job.id) return;
        clearTimeout(job.timer);
        this.inflight = null;
        const ms = Date.now() - job.sentAt;
        PERF.record('bridge.' + job.op, ms, msg.ok ? undefined : { error: String(msg.error || '').slice(0, 120) });
        if (PERF.perfEnabled() && msg.perf && typeof msg.perf === 'object') {
            if (Number.isFinite(msg.perf.ms)) PERF.record('bridge.py.' + job.op, msg.perf.ms);
            const c = msg.perf.counters;
            if (c && typeof c === 'object') for (const k of Object.keys(c)) if (Number.isFinite(c[k]) && c[k]) PERF.record('bridge.' + job.op + '#' + k, c[k]);
            const st = msg.perf.steps;
            if (st && typeof st === 'object') for (const k of Object.keys(st)) if (Number.isFinite(st[k])) PERF.record('bridge.py.' + job.op + '.' + k, st[k]);
        }
        if (msg.ok) this.settle(job, msg.result, null);
        else this.settle(job, null, new Error(msg.error || 'Fusion helper error'));
        this.pump();
    }

    settle(job, result, err) {
        if (job.waitTimer) { clearTimeout(job.waitTimer); job.waitTimer = null; }
        for (const j of [job].concat(job.waiters || [])) {
            if (err) j.reject(err); else j.resolve(result);
        }
    }
}

const helpers = { bridge: new Helper('bridge'), bridgeRender: new Helper('bridgeRender') };

function helperFor(op) {
    if (RENDER_OPS.has(op) && PERF.getPerf().renderProcess) return helpers.bridgeRender;
    return helpers.bridge;
}

// opts: { lane: 0 | 1 | 2, maxWaitMs }. The timeout counts from the moment the request is sent to the helper.
function bridgeCall(op, args, timeoutMs, opts) {
    const timeout = op === 'capture' ? Math.min(timeoutMs || 90000, 90000) : (timeoutMs || 20000);
    const lane = (opts && Number.isInteger(opts.lane) && opts.lane >= 0 && opts.lane < LANES) ? opts.lane : bridgeLane(op);
    const maxWaitMs = (opts && opts.maxWaitMs) || Math.min(MAX_WAIT_CAP_MS, Math.max(timeout, timeout * 2));
    return new Promise((resolve, reject) => {
        const job = {
            op, args, lane, timeoutMs: timeout, maxWaitMs, resolve, reject,
            queuedAt: Date.now(), key: COALESCE.has(op) ? op + JSON.stringify(args || {}) : null, waiters: []
        };
        try { helperFor(op).enqueue(job); } catch (e) { reject(e); }
    });
}
