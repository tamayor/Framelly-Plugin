// What every platform shares: the plugin's names and how the installer finds its folders.
// These mirror src/main/config.js (PLUGIN_ID, DATA_FOLDER_NAME, data-location.json) and src/main/names.js.
// The plugin was called "El Subtitle Animator" before: its old plugin folders and MCP entry are removed on install,
// and folders that still carry the old name are found and used as they are.

const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_ID = 'com.framelly.plugin';
const OLD_PLUGIN_IDS = ['com.el.subtitleanimator', 'com.wmseditors.subtitleanimator'];
// Since 2026-11-26 the code folder is "Framelly" and the data folder "Framelly Source Assets"; before that they were
// "Framelly Plugin" and "Framelly" (and earlier "El Subtitle Animator Plugin" / "El Subtitle Animator"). An old-named
// data folder only counts when it is not a code folder: "Framelly" is now the code folder's name.
const CODE_FOLDER_NAME = 'Framelly';
const OLD_CODE_FOLDER_NAMES = ['Framelly Plugin', 'El Subtitle Animator Plugin'];
const OLD_CODE_FOLDER_NAME = OLD_CODE_FOLDER_NAMES[0];
const DATA_FOLDER_NAME = 'Framelly Source Assets';
const OLD_DATA_FOLDER_NAMES = ['Framelly', 'El Subtitle Animator'];
const OLD_DATA_FOLDER_NAME = OLD_DATA_FOLDER_NAMES[0];
const MCP_NAME = 'framelly';
const OLD_MCP_NAME = 'el-subtitle-animator';
const HOME_FOLDER_NAME = '.framelly';
const OLD_HOME_FOLDER_NAME = '.el-subtitle-animator';
const HOME = os.homedir();

function exists(p) { try { return fs.existsSync(p); } catch (e) { return false; } }
// `dir`, unless only the folder an earlier version made is there (src/main/names.js existingOr).
function existingOr(dir, oldDir) { return !exists(dir) && exists(oldDir) ? oldDir : dir; }
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; } }

// The code folder: it has the plugin's manifest.xml, main.js and src/.
function isCodeDir(dir) {
    try {
        return fs.readFileSync(path.join(dir, 'manifest.xml'), 'utf8').includes(PLUGIN_ID)
            && exists(path.join(dir, 'main.js')) && exists(path.join(dir, 'src', 'main'));
    } catch (e) { return false; }
}

// Looks for the code folder from a starting folder: the folder itself, its "Framelly" child (or one still named
// "Framelly Plugin" / "El Subtitle Animator Plugin"), then the same one level up, and so on. The installer app sits in the code folder's Installers/, or in installer/ while developing.
function findCodeDir(starts) {
    for (const start of starts) {
        let dir = start;
        for (let i = 0; dir && i < 7; i++) {
            if (isCodeDir(dir)) return dir;
            for (const name of [CODE_FOLDER_NAME, ...OLD_CODE_FOLDER_NAMES]) {
                const child = path.join(dir, name);
                if (isCodeDir(child)) return child;
            }
            const up = path.dirname(dir);
            if (up === dir) break;
            dir = up;
        }
    }
    return null;
}

function locations(codeDir) {
    const mainDir = path.dirname(codeDir);
    return { codeDir, mainDir, dataDir: dataFolderIn(mainDir) };
}
// The data folder inside `mainDir`: the current name, else one with an earlier name that is not a code folder.
function dataFolderIn(mainDir) {
    const cur = path.join(mainDir, DATA_FOLDER_NAME);
    if (exists(cur)) return cur;
    for (const n of OLD_DATA_FOLDER_NAMES) { const d = path.join(mainDir, n); if (exists(d) && !isCodeDir(d)) return d; }
    return cur;
}

module.exports = {
    PLUGIN_ID, OLD_PLUGIN_IDS, CODE_FOLDER_NAME, OLD_CODE_FOLDER_NAME, OLD_CODE_FOLDER_NAMES, DATA_FOLDER_NAME, OLD_DATA_FOLDER_NAME, OLD_DATA_FOLDER_NAMES, dataFolderIn, MCP_NAME, OLD_MCP_NAME,
    HOME_FOLDER_NAME, OLD_HOME_FOLDER_NAME, HOME, exists, existingOr, readJson, isCodeDir, findCodeDir, locations,
};
