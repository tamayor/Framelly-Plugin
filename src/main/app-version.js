// Reading and bumping the plugin version (package.json + manifest.xml).

module.exports = {
    getAppVersion, setAppVersion
};

const fs = require('fs');
const { app } = require('electron');

const { MANIFEST_XML, PACKAGE_JSON } = require('./config');

// The version, plus what main.js's self-update copied at this open (src/main/self-update.js), told only once.
function getAppVersion() {
    const v = readVersion();
    const r = global.framellySelfUpdate;
    if (!r || !r.updated) return v;
    global.framellySelfUpdate = { ...r, updated: false, shown: true };
    return { ...v, selfUpdate: { changed: r.changed.length, removed: r.removed.length } };
}

function readVersion() {
    try {
        const pkgPath = PACKAGE_JSON;
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg && pkg.version) return { version: String(pkg.version).trim() };
        }
    } catch (e) {
        console.warn('Failed reading package.json version:', e);
    }
    try {
        if (app && app.getVersion) {
            const v = app.getVersion();
            if (v && v !== '0.0.0') return { version: String(v).trim() };
        }
    } catch (e) {}
    return { version: '1.0.0' };
}

function setAppVersion(event, newVer) {
    if (!newVer || typeof newVer !== 'string') {
        return { error: 'Invalid version string' };
    }
    const cleanVer = newVer.trim().replace(/^v/i, '').trim();
    // It goes into manifest.xml (read by Resolve to load the plugin) and package.json: no markup, quotes or control
    // characters, which would break the XML.
    if (!cleanVer || cleanVer.length > 40 || /[<>&"'\\\u0000-\u001f\u007f]/.test(cleanVer)) return { error: 'Invalid version string' };

    const pkgPath = PACKAGE_JSON;
    try {
        let pkg = {};
        if (fs.existsSync(pkgPath)) {
            pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        }
        pkg.version = cleanVer;
        writeWhole(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
    } catch (e) {
        return { error: 'Failed to update package.json: ' + (e.message || e) };
    }

    const manifestPath = MANIFEST_XML;
    try {
        if (fs.existsSync(manifestPath)) {
            let xml = fs.readFileSync(manifestPath, 'utf8');
            if (/<Version>.*?<\/Version>/.test(xml)) {
                xml = xml.replace(/<Version>.*?<\/Version>/, () => '<Version>' + cleanVer + '</Version>');
                writeWhole(manifestPath, xml);
            }
        }
    } catch (e) {
        console.warn('Failed to update manifest.xml:', e);
    }

    return { ok: true, version: cleanVer };
}

// Through a temp file, so an interrupted write never leaves half a manifest.
function writeWhole(file, text) {
    const tmp = file + '.' + process.pid + '.tmp';
    try {
        fs.writeFileSync(tmp, text, 'utf8');
        fs.renameSync(tmp, file);
    } catch (e) {
        try { fs.rmSync(tmp, { force: true }); } catch (e2) { /* ignore */ }
        throw e;
    }
}
