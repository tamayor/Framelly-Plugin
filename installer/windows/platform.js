// Windows: where Resolve keeps things and how the panel gets into its plugin folder.
// Only the panel is installed here: the plugin's Claude Code connection, tools and engines use macOS tools.

const fs = require('fs');
const path = require('path');
const E = require('../shared/env');
const { quiet } = require('../shared/run');

function resolvePaths() {
    const root = path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Blackmagic Design', 'DaVinci Resolve', 'Support');
    return {
        dest: path.join(root, 'Workflow Integration Plugins', E.PLUGIN_ID),
        oldDests: E.OLD_PLUGIN_IDS.map(id => path.join(root, 'Workflow Integration Plugins', id)),
        sampleNode: path.join(root, 'Developer', 'Workflow Integrations', 'Examples', 'SamplePlugin', 'WorkflowIntegration.node'),
        app: path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Blackmagic Design', 'DaVinci Resolve', 'Resolve.exe'),
        userData: path.join(process.env.APPDATA || path.join(E.HOME, 'AppData', 'Roaming'), 'Electron'),
    };
}

// <main>\Installers\Framelly\Install Framelly (Windows).exe unpacks itself to a temporary folder and runs from there; it passes the
// folder it was started from in PORTABLE_EXECUTABLE_DIR. The unpacked app folder (dist/) is looked up from itself.
function appFolder() { return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath); }

async function resolveRunning() {
    return /Resolve\.exe/i.test((await quiet('tasklist', ['/FI', 'IMAGENAME eq Resolve.exe', '/NH'])).out);
}

async function quitResolve() { return { ok: false, error: 'Quit DaVinci Resolve yourself, then open it again.' }; }

const QUIT_FIRST = 'Quit DaVinci Resolve first: Windows keeps the open panel\'s files locked. Then run the installer again.';

async function placePlugin(stage, paths) {
    const { dest, oldDests } = paths;
    // While Resolve has the panel loaded, WorkflowIntegration.node cannot be deleted, and it goes last: the folder would
    // be left with nothing else in it. A first install has nothing loaded, so it can go ahead.
    const loaded = [dest, ...oldDests].some(d => E.exists(path.join(d, 'WorkflowIntegration.node')));
    if (loaded && await resolveRunning()) throw new Error(QUIT_FIRST);
    try {
        fs.mkdirSync(dest, { recursive: true });
        for (const d of oldDests) fs.rmSync(d, { recursive: true, force: true });
        require('../shared/plugin').replaceContents(stage, dest);
    } catch (e) {
        const code = String(e && e.code);
        if (code === 'EBUSY' || (code === 'EPERM' && /\.node$/i.test(String(e && e.path)))) throw new Error(QUIT_FIRST);
        if (!/EPERM|EACCES/.test(code)) throw e;
        throw new Error('Windows did not allow writing to ' + dest + '. Close this installer, right-click it and choose "Run as administrator".');
    }
}

module.exports = { resolvePaths, appFolder, resolveRunning, quitResolve, placePlugin, ITEMS: [] };
