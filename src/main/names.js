// The plugin's names on disk and in Resolve.
//
// The plugin was called "El Subtitle Animator" before it became "Framelly". Anything made from now on gets the
// current name. A folder, bin or template an earlier version already made keeps working: it is used as it is (a
// project's files stay online, the speech engine is not downloaded again) or, for the plugin's own template folders,
// renamed once.
//
// Node only and no other project module: config.js and mcp/framelly-mcp.js both load this. installer/shared/env.js
// mirrors the names.

const fs = require('fs');
const os = require('os');
const path = require('path');

const APP_NAME = 'Framelly';
const OLD_APP_NAME = 'El Subtitle Animator';
// The Media Pool bin for sounds and the category of the title and effect templates. Earlier: "Subtitle Animator".
const CATEGORY = APP_NAME;
const OLD_CATEGORY = 'Subtitle Animator';
// The main folder holds the code folder ("Framelly") and the data folder ("Framelly Source Assets"). Until 2026-11-26
// they were "Framelly Plugin" and "Framelly", before that "El Subtitle Animator Plugin" and "El Subtitle Animator".
// The code folder's new name is the data folder's old one, so an old-named data folder only counts when it is not a
// code folder (isCodeFolder).
const CODE_FOLDER_NAME = APP_NAME;
const OLD_CODE_FOLDER_NAMES = [APP_NAME + ' Plugin', OLD_APP_NAME + ' Plugin'];
const OLD_CODE_FOLDER_NAME = OLD_CODE_FOLDER_NAMES[0];
const DATA_FOLDER_NAME = APP_NAME + ' Source Assets';
const OLD_DATA_FOLDER_NAMES = [APP_NAME, OLD_APP_NAME];

function exists(p) { try { return fs.existsSync(p); } catch (e) { return false; } }

// `dir`, unless only the folder an earlier version made is there.
function existingOr(dir, oldDir) { return !exists(dir) && exists(oldDir) ? oldDir : dir; }

// A plugin code folder: it has main.js and src/main (installer/shared/env.js isCodeDir also checks the manifest).
function isCodeFolder(dir) { return exists(path.join(dir, 'main.js')) && exists(path.join(dir, 'src', 'main')); }
// The data folder inside `mainDir`: the current name, else one with an earlier name, else the current name (made later).
function dataFolderIn(mainDir) {
    const cur = path.join(mainDir, DATA_FOLDER_NAME);
    if (exists(cur)) return cur;
    for (const n of OLD_DATA_FOLDER_NAMES) { const d = path.join(mainDir, n); if (exists(d) && !isCodeFolder(d)) return d; }
    return cur;
}

// "Framelly SFX" -> "El Subtitle Animator SFX": what an earlier version called the same folder or bin.
function oldName(name) {
    const s = String(name);
    if (s === APP_NAME) return OLD_APP_NAME;
    return s.startsWith(APP_NAME + ' ') ? OLD_APP_NAME + s.slice(APP_NAME.length) : s;
}
// Is `name` this folder or bin, under its current or its earlier name?
function sameName(name, want) { return name === want || name === oldName(want); }
// The plugin's output folder `name` inside `base`: the earlier one when the project already has it.
function outDirIn(base, name) { return existingOr(path.join(base, name), path.join(base, oldName(name))); }
// A folder the plugin made for its own files ("Framelly SFX", "El Subtitle Animator B-roll", ...).
function isOwnName(part) { return String(part).startsWith(APP_NAME + ' ') || String(part).startsWith(OLD_APP_NAME + ' '); }

// Renames a folder only the plugin writes to (its templates in Resolve's support folder) to its current name, so
// Resolve lists one category. Left alone when the new one is already there.
function adoptOldDir(dir, oldDir) {
    try { if (!exists(dir) && exists(oldDir)) fs.renameSync(oldDir, dir); } catch (e) { /* the old one stays; the new one is made beside it */ }
    return dir;
}

// ~/.framelly: the speech engine, word timings and the MCP endpoint file.
const HOME_DIR = existingOr(path.join(os.homedir(), '.framelly'), path.join(os.homedir(), '.el-subtitle-animator'));

// The Glass Blur registry fusion_bridge.py keeps (its glass_reg_path(): the same folders, the same fallback).
// Looked up on each call, because the bridge makes the folder the first time it writes.
function glassRegistryFile(home = os.homedir(), platform = process.platform) {
    const base = platform === 'darwin' ? path.join(home, 'Library', 'Application Support') : home;
    const pre = platform === 'darwin' ? '' : '.';
    const dir = path.join(base, pre + 'framelly'), old = path.join(base, pre + 'el-subtitle-animator');
    return path.join(fs.existsSync(dir) || !fs.existsSync(old) ? dir : old, 'glass.json');
}

module.exports = {
    APP_NAME, OLD_APP_NAME, CATEGORY, OLD_CATEGORY, CODE_FOLDER_NAME, OLD_CODE_FOLDER_NAME, OLD_CODE_FOLDER_NAMES,
    DATA_FOLDER_NAME, OLD_DATA_FOLDER_NAMES, HOME_DIR, isCodeFolder, dataFolderIn,
    existingOr, oldName, sameName, outDirIn, isOwnName, adoptOldDir, glassRegistryFile,
};
