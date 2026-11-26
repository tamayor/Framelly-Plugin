// The panel itself: the one item every platform installs. The files are the same everywhere; where they go and how
// they get there is the platform's part (placePlugin in mac/platform.js and windows/platform.js).

const fs = require('fs');
const os = require('os');
const path = require('path');
const E = require('./env');
const P = require('./platform');

// The runtime file list (manifest.xml, package.json, main.js, src/ and the names skipped) is the panel's own, in
// src/main/self-update.js, so the panel's self-update and this installer copy the same files. It is loaded from the
// code folder because the packaged installer app does not carry src/.
function runtimeFiles(codeDir) { return require(path.join(codeDir, 'src', 'main', 'self-update.js')).runtimeFiles(codeDir); }

function detect(ctx) {
    const { dest, sampleNode } = ctx.paths;
    if (!E.exists(sampleNode) && !E.exists(path.join(ctx.codeDir, 'WorkflowIntegration.node'))) {
        return { state: 'blocked', note: 'DaVinci Resolve Studio was not found on this computer' };
    }
    if (!E.exists(path.join(dest, 'manifest.xml'))) return { state: 'missing', note: 'Not installed' };
    const loc = E.readJson(path.join(dest, 'data-location.json'), null);
    if (!loc || loc.codeDir !== ctx.codeDir || loc.dataDir !== ctx.dataDir) {
        return { state: 'update', note: 'Installed from another folder' + (loc && loc.mainDir ? ': ' + loc.mainDir : '') };
    }
    for (const [rel, f] of runtimeFiles(ctx.codeDir)) {
        let st;
        try { st = fs.statSync(path.join(dest, rel)); } catch (e) { return { state: 'update', note: 'The code changed since the last install' }; }
        if (st.size !== f.size || Math.floor(st.mtimeMs / 1000) !== f.mtime) return { state: 'update', note: 'The code changed since the last install' };
    }
    return { state: 'ok', note: 'Installed and up to date' };
}

async function install(ctx, log) {
    const node = [ctx.paths.sampleNode, path.join(ctx.codeDir, 'WorkflowIntegration.node')].find(E.exists);
    if (!node) throw new Error('Could not find Blackmagic\'s WorkflowIntegration.node. Is DaVinci Resolve Studio installed?');

    // Build the finished plugin folder in a temporary place, then put it where Resolve reads it in one step.
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-install-'));
    try {
        const files = runtimeFiles(ctx.codeDir);
        for (const rel of files.keys()) {
            fs.mkdirSync(path.dirname(path.join(stage, rel)), { recursive: true });
            fs.cpSync(path.join(ctx.codeDir, rel), path.join(stage, rel), { preserveTimestamps: true });
        }
        fs.copyFileSync(node, path.join(stage, 'WorkflowIntegration.node'));
        // Tells the installed plugin where the data folder and the code folder are (read by src/main/config.js).
        fs.writeFileSync(path.join(stage, 'data-location.json'),
            JSON.stringify({ mainDir: ctx.mainDir, dataDir: ctx.dataDir, codeDir: ctx.codeDir }, null, 2) + '\n');
        fs.mkdirSync(ctx.dataDir, { recursive: true });
        log(files.size + ' files to ' + ctx.paths.dest);
        await P.placePlugin(stage, ctx.paths, log);
    } finally { fs.rmSync(stage, { recursive: true, force: true }); }
    log('Installed. Resolve loads it the next time it starts.');
}

// Replaces what is in the plugin folder with the staged copy. For a folder the user can already write to.
function replaceContents(stage, dest) {
    for (const n of fs.readdirSync(dest)) fs.rmSync(path.join(dest, n), { recursive: true, force: true });
    fs.cpSync(stage, dest, { recursive: true, preserveTimestamps: true });
}

module.exports = {
    replaceContents,
    ITEM: {
        id: 'plugin', group: 'resolve', required: true, title: 'Framelly panel',
        detail: 'Copies the panel into Resolve\'s plugin folder and records where this folder is.',
        detect, install,
    },
};
