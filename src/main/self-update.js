// The installed panel brings itself up to date from the code folder each time Resolve opens it (called by main.js,
// before anything else loads). It copies the same runtime files the installer copies (installer/shared/plugin.js uses
// the list below), so after a sync the installer still reports the panel as up to date.
// Node only (fs, path): it must not require other project modules, and it never throws.

module.exports = { syncFromCode, runtimeFiles, wanted, isCodeDir };

const fs = require('fs');
const path = require('path');

const PLUGIN_ID = 'com.framelly.plugin';
const RUNTIME_TOP = ['manifest.xml', 'package.json', 'main.js', 'src'];
const SKIP_NAMES = new Set(['.DS_Store', '__pycache__', '.git', '.gitignore', '.editorconfig', 'README.txt']);
const LOG_MAX = 200 * 1024;

function wanted(name) { return !SKIP_NAMES.has(name) && !/\.(md|command|pyc)$/i.test(name); }

// The runtime files: manifest.xml, package.json, main.js and src/. Relative path -> { size, mtime in seconds }.
function runtimeFiles(codeDir) {
    const files = new Map();
    const walk = (rel) => {
        const st = fs.statSync(path.join(codeDir, rel));
        if (st.isDirectory()) {
            for (const n of fs.readdirSync(path.join(codeDir, rel))) if (wanted(n)) walk(path.join(rel, n));
        } else if (st.isFile()) files.set(rel, { size: st.size, mtime: Math.floor(st.mtimeMs / 1000) });
    };
    for (const top of RUNTIME_TOP) if (fs.existsSync(path.join(codeDir, top))) walk(top);
    return files;
}

// The code folder: it has the plugin's manifest.xml, main.js and src/main (as installer/shared/env.js isCodeDir).
function isCodeDir(dir) {
    try {
        return fs.readFileSync(path.join(dir, 'manifest.xml'), 'utf8').includes(PLUGIN_ID)
            && fs.existsSync(path.join(dir, 'main.js')) && fs.existsSync(path.join(dir, 'src', 'main'));
    } catch (e) { return false; }
}

function sameDir(a, b) {
    try { return fs.realpathSync(a) === fs.realpathSync(b); } catch (e) { return path.resolve(a) === path.resolve(b); }
}

function writable(dir) {
    try {
        fs.accessSync(dir, fs.constants.W_OK);
        if (fs.existsSync(path.join(dir, 'src'))) fs.accessSync(path.join(dir, 'src'), fs.constants.W_OK);
        return true;
    } catch (e) { return false; }
}

// One line per sync in <dataDir>/_app/self-update.log. Best effort: a missing data folder is not created.
function logLine(dataDir, res) {
    try {
        if (!dataDir || !fs.existsSync(dataDir)) return;
        const dir = path.join(dataDir, '_app');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'self-update.log');
        const what = res.error ? 'error: ' + res.error
            : res.updated ? res.changed.length + ' copied, ' + res.removed.length + ' removed'
                + (res.changed.length ? ' (' + res.changed.slice(0, 5).join(', ') + (res.changed.length > 5 ? ', ...' : '') + ')' : '')
                : res.reason;
        let size = 0;
        try { size = fs.statSync(file).size; } catch (e) { /* new log */ }
        if (size > LOG_MAX) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').slice(-LOG_MAX / 2));       // keeps the newest half
        fs.appendFileSync(file, new Date().toISOString() + ' ' + what + '\n');
    } catch (e) { /* only a log */ }
}

// A folder for `rel`'s file: a file standing where a folder must go is removed first.
function ensureParent(root, rel) {
    const parts = path.dirname(rel).split(path.sep).filter(p => p && p !== '.');
    let dir = root;
    for (const p of parts) {
        dir = path.join(dir, p);
        let st = null;
        try { st = fs.lstatSync(dir); } catch (e) { /* not there yet */ }
        if (st && !st.isDirectory()) { fs.rmSync(dir, { force: true }); st = null; }
        if (!st) fs.mkdirSync(dir);
    }
}

// Copies one file through a temp file and a rename, keeping the source's times (the installer compares mtimes).
function copyOne(codeDir, appRoot, rel) {
    const src = path.join(codeDir, rel), dest = path.join(appRoot, rel);
    ensureParent(appRoot, rel);
    const tmp = dest + '.self-update-tmp';
    try {
        fs.copyFileSync(src, tmp);
        const st = fs.statSync(src);
        fs.utimesSync(tmp, st.atime, st.mtime);
        let old = null;
        try { old = fs.lstatSync(dest); } catch (e) { /* new file */ }
        if (old && old.isDirectory()) fs.rmSync(dest, { recursive: true, force: true });
        fs.renameSync(tmp, dest);
    } catch (e) {
        try { fs.rmSync(tmp, { force: true }); } catch (err) { /* ignore */ }
        throw e;
    }
}

// Files under appRoot/src that the code folder no longer has. Skipped names (__pycache__ ...) are left alone; folders
// left empty go too.
function removeStale(appRoot, files) {
    const removed = [];
    const walk = (rel) => {
        const abs = path.join(appRoot, rel);
        const st = fs.lstatSync(abs);
        if (st.isDirectory()) {
            for (const n of fs.readdirSync(abs)) if (wanted(n) && !n.endsWith('.self-update-tmp')) walk(path.join(rel, n));
            if (rel !== 'src' && !files.has(rel) && fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
        } else if (!files.has(rel)) {
            fs.rmSync(abs, { force: true });
            removed.push(rel);
        }
    };
    if (fs.existsSync(path.join(appRoot, 'src'))) walk('src');
    return removed;
}

function syncFromCode(appRoot) {
    let dataDir = null;
    const done = (res) => { logLine(dataDir, res); return res; };
    try {
        let loc;
        try { loc = JSON.parse(fs.readFileSync(path.join(appRoot, 'data-location.json'), 'utf8')); } catch (e) {
            return { updated: false, reason: 'no data-location.json (running from the code folder)' };
        }
        dataDir = loc && typeof loc.dataDir === 'string' ? loc.dataDir : null;
        const codeDir = loc && typeof loc.codeDir === 'string' ? loc.codeDir : null;
        if (!codeDir) return done({ updated: false, reason: 'no code folder in data-location.json' });
        if (sameDir(codeDir, appRoot)) return done({ updated: false, reason: 'running from the code folder' });
        if (!isCodeDir(codeDir)) return done({ updated: false, reason: 'code folder not found: ' + codeDir });
        if (!writable(appRoot)) return done({ updated: false, reason: 'the installed panel folder is read-only' });

        const files = runtimeFiles(codeDir);
        const changed = [];
        for (const [rel, f] of files) {
            let st = null;
            try { st = fs.statSync(path.join(appRoot, rel)); } catch (e) { /* new file */ }
            if (st && st.isFile() && st.size === f.size && Math.floor(st.mtimeMs / 1000) === f.mtime) continue;
            copyOne(codeDir, appRoot, rel);
            changed.push(rel);
        }
        const removed = removeStale(appRoot, files);
        if (!changed.length && !removed.length) return done({ updated: false, reason: 'up to date' });
        return done({ updated: true, changed, removed });
    } catch (e) {
        return done({ updated: false, error: String(e && e.message || e) });
    }
}
