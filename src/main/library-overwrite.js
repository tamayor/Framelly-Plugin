// Replacing a preset's Fusion setting or sound from the timeline, from a file or from the current edit,
// and the file / folder pickers used for that.

module.exports = {
    overwriteAudioFromCurrent, overwriteAudioFromFile, overwriteAudioFromTimeline,
    overwriteSettingFromCurrent, overwriteSettingFromFile, overwriteSettingFromTimeline, pickFileOrFolder,
    revertAnimationAudio
};

const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');

const state = require('./state');
const { ANIM_DIR, ANIM_ORIG_DIR, PREV_DIR, SFX_DIR, SFX_ORIG_DIR, ensureDirs } = require('./config');
const { copyFontsForSetting } = require('./fonts');
const { clearDesignCache, copyPreset } = require('./fusion-setting');
const { libForUI, loadLib, saveLib, uniqueName } = require('./library');
const { exportSelectedClip, makePreview } = require('./previews');
const { getProject } = require('./resolve');
const { copySfx, isEditedSfxName, sfxFilePath } = require('./sfx');

// Deletes the preset's edited sound clip (sounds/current/) when it has one that no other preset uses: variants share
// their source's clip. (Same rule as library-actions.js dropEditedClip.)
function dropEditedClip(lib, a) {
    const f = a.sfx;
    if (!f || !a.sfxOrig || f === a.sfxOrig || !isEditedSfxName(f)) return;
    const used = lib.animations.some(o => o !== a && o.id !== a.id && (o.sfx === f || o.sfxOrig === f ||
        (Array.isArray(o.sfxLayers) && o.sfxLayers.some(l => l && (l.file === f || l.orig === f)))));
    const full = path.resolve(SFX_DIR, f);
    if (used || !full.startsWith(SFX_DIR + path.sep)) return;
    try { fs.rmSync(full, { force: true }); } catch (e) { /* ignore */ }
}
function dropPreviews(id) {
    if (typeof id !== 'string' || !id || id !== path.basename(id) || id === '.' || id === '..') return;
    fs.rmSync(path.join(PREV_DIR, id), { recursive: true, force: true });
}

function resolveSettingPath(p) {
    if (!p) return null;
    try {
        const resolved = path.resolve(String(p));
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(resolved);
            for (const f of files) {
                const ext = path.extname(f).toLowerCase();
                if (['.setting', '.comp'].includes(ext)) {
                    return path.join(resolved, f);
                }
            }
            return null;
        }
        const ext = path.extname(resolved).toLowerCase();
        return ['.setting', '.comp'].includes(ext) ? resolved : null;
    } catch (e) {
        return null;
    }
}

function resolveAudioPath(p) {
    if (!p) return null;
    try {
        const resolved = path.resolve(String(p));
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(resolved);
            for (const f of files) {
                const ext = path.extname(f).toLowerCase();
                if (['.wav', '.mp3', '.aif', '.aiff', '.m4a', '.flac', '.ogg'].includes(ext)) {
                    return path.join(resolved, f);
                }
            }
            return null;
        }
        const ext = path.extname(resolved).toLowerCase();
        return ['.wav', '.mp3', '.aif', '.aiff', '.m4a', '.flac', '.ogg'].includes(ext) ? resolved : null;
    } catch (e) {
        return null;
    }
}

async function overwriteSettingFromTimeline(event, animId) {
    const before = loadLib().animations.find(x => x.id === animId);
    if (!before) return { error: 'Animation not found' };

    const ex = await exportSelectedClip(before.name || 'animation');
    // Read the library after Resolve answered: a save made while waiting (a slider, tags, a preview) is kept.
    const lib = loadLib();
    const a = lib.animations.find(x => x.id === animId);
    if (!a) {
        try { fs.rmSync(path.join(ANIM_DIR, ex.file), { force: true }); } catch (e) {}
        return { error: 'Animation not found' };
    }
    const targetFile = a.file || ex.file;
    const origFile = a.fileOrig || targetFile;

    ensureDirs();
    copyPreset(path.join(ANIM_DIR, ex.file), path.join(ANIM_ORIG_DIR, origFile));
    copyPreset(path.join(ANIM_DIR, ex.file), path.join(ANIM_DIR, targetFile));
    if (ex.file !== targetFile) {
        try { fs.rmSync(path.join(ANIM_DIR, ex.file), { force: true }); } catch (e) {}
    }

    a.file = targetFile;
    a.fileOrig = origFile;

    if (ex.props) {
        if (ex.props.Pan !== undefined && !isNaN(Number(ex.props.Pan))) a.posX = Math.round(Number(ex.props.Pan) * 1000) / 1000;
        if (ex.props.Tilt !== undefined && !isNaN(Number(ex.props.Tilt))) a.posY = Math.round(Number(ex.props.Tilt) * 1000) / 1000;
        if (ex.props.ZoomX !== undefined && !isNaN(Number(ex.props.ZoomX))) a.scale = Math.round(Number(ex.props.ZoomX) * 1000) / 1000;
        if (ex.props.RotationAngle !== undefined && !isNaN(Number(ex.props.RotationAngle))) a.rotation = Math.round(Number(ex.props.RotationAngle) * 1000) / 1000;
    }

    a.orig = {
        name: a.name,
        textDesign: a.textDesign ? JSON.parse(JSON.stringify(a.textDesign)) : null,
        boxes: a.boxes ? JSON.parse(JSON.stringify(a.boxes)) : {},
        posX: a.posX || 0,
        posY: a.posY || 0,
        scale: a.scale !== undefined ? a.scale : 1,
        rotation: a.rotation || 0,
        textOffset: a.textOffset || 0,
        sfxOffset: a.sfxOffset || 0,
        tail: a.tail || 0,
        sfxVolume: a.sfxVolume || 0,
        textTrack: a.textTrack || 0,
        sfxTrack: a.sfxTrack || 0,
        useSfx: a.useSfx !== false,
        linked: a.linked !== false,
        sfx: a.sfx || null,
        sfxOrig: a.sfxOrig || a.sfx || null
    };

    clearDesignCache();
    saveLib(lib);
    copyFontsForSetting(path.join(ANIM_DIR, a.file), a.textDesign).catch(() => {});

    try {
        dropPreviews(a.id);
        a.preview = null;
    } catch (e) {}
    try { await makePreview(null, a.id); } catch (e) {}

    return { ok: true, lib: libForUI() };
}

async function overwriteSettingFromFile(event, animId, srcPath) {
    const p = resolveSettingPath(srcPath);
    if (!p) return { error: 'Please choose a Fusion .setting / .comp file or a folder containing one' };
    const ext = path.extname(p).toLowerCase();
    if (!['.comp', '.setting'].includes(ext)) return { error: 'Must be a Fusion .comp or .setting file' };

    const lib = loadLib();
    const a = lib.animations.find(x => x.id === animId);
    if (!a) return { error: 'Animation not found' };

    ensureDirs();
    const targetFile = a.file || uniqueName(ANIM_DIR, (a.name || 'animation') + ext);
    const origFile = a.fileOrig || targetFile;

    copyPreset(p, path.join(ANIM_ORIG_DIR, origFile));
    copyPreset(p, path.join(ANIM_DIR, targetFile));

    a.file = targetFile;
    a.fileOrig = origFile;

    clearDesignCache();
    a.textDesign = null;
    a.boxes = {};
    if (a.orig) {
        a.orig.textDesign = null;
        a.orig.boxes = {};
    }
    saveLib(lib);
    copyFontsForSetting(path.join(ANIM_DIR, a.file), a.textDesign).catch(() => {});
    try {
        dropPreviews(a.id);
        a.preview = null;
    } catch (e) {}
    try { await makePreview(null, a.id); } catch (e) {}

    return { ok: true, lib: libForUI() };
}

function overwriteSettingFromCurrent(event, animId) {
    const lib = loadLib();
    const a = lib.animations.find(x => x.id === animId);
    if (!a) return { error: 'Animation not found' };

    ensureDirs();
    const activePath = path.join(ANIM_DIR, a.file);
    if (!fs.existsSync(activePath)) return { error: 'Active .settings file not found' };

    const origFile = a.fileOrig || a.file;
    copyPreset(activePath, path.join(ANIM_ORIG_DIR, origFile));
    a.fileOrig = origFile;

    a.orig = {
        name: a.name,
        textDesign: a.textDesign ? JSON.parse(JSON.stringify(a.textDesign)) : null,
        boxes: a.boxes ? JSON.parse(JSON.stringify(a.boxes)) : {},
        posX: a.posX || 0,
        posY: a.posY || 0,
        scale: a.scale !== undefined ? a.scale : 1,
        rotation: a.rotation || 0,
        textOffset: a.textOffset || 0,
        sfxOffset: a.sfxOffset || 0,
        tail: a.tail || 0,
        sfxVolume: a.sfxVolume || 0,
        textTrack: a.textTrack || 0,
        sfxTrack: a.sfxTrack || 0,
        useSfx: a.useSfx !== false,
        linked: a.linked !== false,
        sfx: a.sfx || null,
        sfxOrig: a.sfxOrig || a.sfx || null
    };

    saveLib(lib);
    return { ok: true, lib: libForUI() };
}

function revertAnimationAudio(event, id) {
    const lib = loadLib();
    const a = lib.animations.find(x => x.id === id);
    if (!a) return { error: 'Animation not found' };

    dropEditedClip(lib, a);

    a.sfx = a.sfxOrig || null;
    a.sfxTrimIn = 0;
    a.sfxLen = 0;
    if (a.orig) {
        a.sfxVolume = a.orig.sfxVolume !== undefined ? a.orig.sfxVolume : a.sfxVolume;
        a.sfxOffset = a.orig.sfxOffset !== undefined ? a.orig.sfxOffset : a.sfxOffset;
    }
    saveLib(lib);
    return { ok: true, lib: libForUI() };
}

async function overwriteAudioFromTimeline(event, animId) {
    if (!loadLib().animations.some(x => x.id === animId)) return { error: 'Animation not found' };

    const project = await getProject();
    const tl = project && await project.GetCurrentTimeline();
    if (!tl) return { error: 'Open a timeline in Resolve' };
    const sel = (await tl.GetSelectedClips()) || [];

    let audioPath = null;
    for (const c of sel) {
        try {
            const mpi = await c.GetMediaPoolItem();
            if (mpi) {
                let fp = null;
                if (typeof mpi.GetClipProperty === 'function') {
                    const props = await mpi.GetClipProperty();
                    if (typeof props === 'string') {
                        fp = props;
                    } else if (props && typeof props === 'object') {
                        fp = props['File Path'] || (props['Clip Directory'] && props['File Name'] && path.join(props['Clip Directory'], props['File Name']));
                    }
                }
                if (fp) {
                    const ext = path.extname(fp).toLowerCase();
                    if (['.wav', '.mp3', '.aif', '.aiff', '.m4a', '.flac', '.ogg'].includes(ext)) {
                        audioPath = fp;
                        break;
                    }
                }
            }
        } catch (e) {}
    }

    if (!audioPath) return { error: 'Select an audio clip on your timeline first' };

    // Read the library after Resolve answered: a save made while waiting is kept.
    const lib = loadLib();
    const a = lib.animations.find(x => x.id === animId);
    if (!a) return { error: 'Animation not found' };
    dropEditedClip(lib, a);

    const file = copySfx(audioPath);
    a.sfxOrig = file;
    a.sfx = file;
    if (a.orig) {
        a.orig.sfx = file;
        a.orig.sfxOrig = file;
    }
    saveLib(lib);
    return { ok: true, lib: libForUI() };
}

function overwriteAudioFromFile(event, animId, srcPath) {
    const p = resolveAudioPath(srcPath);
    if (!p) return { error: 'Please choose an audio file (.wav, .mp3, .aif, .m4a, .flac) or a folder containing one' };

    const lib = loadLib();
    const a = lib.animations.find(x => x.id === animId);
    if (!a) return { error: 'Animation not found' };

    dropEditedClip(lib, a);

    const file = copySfx(p);
    a.sfxOrig = file;
    a.sfx = file;
    if (a.orig) {
        a.orig.sfx = file;
        a.orig.sfxOrig = file;
    }
    saveLib(lib);
    return { ok: true, lib: libForUI() };
}

function overwriteAudioFromCurrent(event, animId) {
    const lib = loadLib();
    const a = lib.animations.find(x => x.id === animId);
    if (!a) return { error: 'Animation not found' };
    if (!a.sfx) return { error: 'No audio currently attached' };

    // The current (edited) clip becomes the new original: it moves from sounds/current/ into sounds/original/.
    const cur = a.sfx;
    const curPath = sfxFilePath(cur);
    let file = cur;
    if (path.dirname(curPath) === SFX_DIR) {
        try {
            file = uniqueName(SFX_ORIG_DIR, cur);
            fs.copyFileSync(curPath, path.join(SFX_ORIG_DIR, file));
        } catch (e) { return { error: e.message }; }
        if (!lib.animations.some(o => o.id !== a.id && (o.sfx === cur || o.sfxOrig === cur))) {
            try { fs.rmSync(curPath, { force: true }); } catch (e) { /* ignore */ }
        }
    }
    a.sfx = file;
    a.sfxOrig = file;
    if (a.orig) {
        a.orig.sfx = file;
        a.orig.sfxOrig = file;
    }
    saveLib(lib);
    return { ok: true, lib: libForUI() };
}

async function pickFileOrFolder(event, kind) {
    const filters = kind === 'sfx'
        ? [{ name: 'Audio', extensions: ['wav', 'mp3', 'aif', 'aiff', 'm4a', 'flac', 'ogg'] }]
        : [{ name: 'Fusion comp / setting', extensions: ['comp', 'setting'] }];
    const r = await dialog.showOpenDialog(state.mainWindow, {
        properties: ['openFile', 'openDirectory'],
        filters
    });
    return r.canceled || !r.filePaths.length ? null : r.filePaths[0];
}
