'use strict';
// names.js: the plugin's names on disk, and the ones it had as "El Subtitle Animator". New things get the current
// name; what an earlier version made is found (or, for the plugin's own template folders, renamed once).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const env = require('../helpers/env');

const N = env.main('names');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-names-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* temp */ } });

test('the earlier name of a folder or bin', () => {
    assert.equal(N.oldName('Framelly SFX'), 'El Subtitle Animator SFX');
    assert.equal(N.oldName('Framelly'), 'El Subtitle Animator');
    assert.equal(N.oldName('Framelly2'), 'Framelly2');
    assert.ok(N.sameName('El Subtitle Animator MatchCut', 'Framelly MatchCut'));
    assert.ok(N.sameName('Framelly MatchCut', 'Framelly MatchCut'));
    assert.ok(!N.sameName('Framelly SFX', 'Framelly MatchCut'));
});

test('existingOr: the old folder only when it is the one there', () => {
    const cur = path.join(tmp, 'a', 'new'), old = path.join(tmp, 'a', 'old');
    assert.equal(N.existingOr(cur, old), cur);          // neither: the current name
    fs.mkdirSync(old, { recursive: true });
    assert.equal(N.existingOr(cur, old), old);
    fs.mkdirSync(cur);
    assert.equal(N.existingOr(cur, old), cur);          // both: the current name
});

test('adoptOldDir renames the old folder once and never overwrites', () => {
    const cur = path.join(tmp, 'b', 'Framelly'), old = path.join(tmp, 'b', 'Subtitle Animator');
    fs.mkdirSync(old, { recursive: true });
    fs.writeFileSync(path.join(old, 'x.setting'), 'x');
    assert.equal(N.adoptOldDir(cur, old), cur);
    assert.ok(!fs.existsSync(old));
    assert.equal(fs.readFileSync(path.join(cur, 'x.setting'), 'utf8'), 'x');
    fs.mkdirSync(old);
    fs.writeFileSync(path.join(old, 'y.setting'), 'y');
    N.adoptOldDir(cur, old);
    assert.ok(fs.existsSync(path.join(old, 'y.setting')) && !fs.existsSync(path.join(cur, 'y.setting')));
});

test('the installer uses the same names', () => {
    const E = require('../../installer/shared/env');
    const config = env.main('config');
    assert.equal(E.PLUGIN_ID, config.PLUGIN_ID);
    assert.equal(E.DATA_FOLDER_NAME, N.DATA_FOLDER_NAME);
    assert.deepEqual(E.OLD_DATA_FOLDER_NAMES, N.OLD_DATA_FOLDER_NAMES);
    assert.equal(E.CODE_FOLDER_NAME, N.CODE_FOLDER_NAME);
    assert.deepEqual(E.OLD_CODE_FOLDER_NAMES, N.OLD_CODE_FOLDER_NAMES);
    assert.equal(E.CODE_FOLDER_NAME, 'Framelly');
    assert.equal(E.DATA_FOLDER_NAME, 'Framelly Source Assets');
    assert.equal(path.basename(N.existingOr(path.join(tmp, E.HOME_FOLDER_NAME), path.join(tmp, E.OLD_HOME_FOLDER_NAME))), '.framelly');
    assert.ok(E.OLD_PLUGIN_IDS.includes('com.el.subtitleanimator') && !E.OLD_PLUGIN_IDS.includes(E.PLUGIN_ID));
});

test('the installer finds a code folder and a data folder that still have the earlier names', () => {
    const E = require('../../installer/shared/env');
    const main = path.join(tmp, 'main');
    const code = path.join(main, E.OLD_CODE_FOLDER_NAME);
    fs.mkdirSync(path.join(code, 'src', 'main'), { recursive: true });
    fs.writeFileSync(path.join(code, 'manifest.xml'), '<Id>' + E.PLUGIN_ID + '</Id>');
    fs.writeFileSync(path.join(code, 'main.js'), '');
    assert.equal(E.findCodeDir([main]), code);
    assert.equal(E.locations(code).dataDir, path.join(main, E.DATA_FOLDER_NAME));           // none yet: the current name
    fs.mkdirSync(path.join(main, E.OLD_DATA_FOLDER_NAME));
    assert.equal(E.locations(code).dataDir, path.join(main, E.OLD_DATA_FOLDER_NAME));
});

// 2026-11-26: "Framelly Plugin" + "Framelly" became "Framelly" (code) + "Framelly Source Assets" (data).
test('a code folder named "Framelly" is never taken for the old data folder of that name', () => {
    const E = require('../../installer/shared/env');
    const main = path.join(tmp, 'main-2026');
    const mk = (dir) => {
        fs.mkdirSync(path.join(dir, 'src', 'main'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'manifest.xml'), '<Id>' + E.PLUGIN_ID + '</Id>');
        fs.writeFileSync(path.join(dir, 'main.js'), '');
    };
    // the old layout, not renamed yet: "Framelly Plugin" is the code, "Framelly" the data
    const oldCode = path.join(main, 'Framelly Plugin');
    mk(oldCode);
    fs.mkdirSync(path.join(main, 'Framelly', 'presets'), { recursive: true });
    assert.equal(E.findCodeDir([main]), oldCode);
    assert.equal(E.locations(oldCode).dataDir, path.join(main, 'Framelly'));
    assert.equal(N.dataFolderIn(main), path.join(main, 'Framelly'));
    // the new layout: "Framelly" is the code folder, the data is "Framelly Source Assets" (made later when missing)
    fs.rmSync(main, { recursive: true, force: true });
    const code = path.join(main, 'Framelly');
    mk(code);
    assert.equal(E.findCodeDir([path.join(code, 'Installers')]), code);
    assert.equal(E.locations(code).dataDir, path.join(main, 'Framelly Source Assets'));
    assert.equal(N.dataFolderIn(main), path.join(main, 'Framelly Source Assets'));
    fs.mkdirSync(path.join(main, 'Framelly Source Assets'));
    assert.equal(E.locations(code).dataDir, path.join(main, 'Framelly Source Assets'));
});

// Regression (PB-01): the panel looked for glass.json in the data folder, the bridge writes it elsewhere,
// so deleted Glass Blur captions were never cleaned off the footage.
test('glassRegistryFile is the file fusion_bridge.py writes, new folder or old', () => {
    const { spawnSync } = require('child_process');
    const bridgeDir = path.join(__dirname, '..', '..', 'src', 'python');
    const fakes = path.join(__dirname, '..', 'python', 'fakes');
    const fromPython = (home) => {
        const r = spawnSync('python3', ['-B', '-c', 'import sys; sys.path[:0] = sys.argv[1:3]; import fusion_bridge as fb; print(fb.glass_reg_path())', fakes, bridgeDir],
            { env: { ...process.env, HOME: home }, encoding: 'utf8' });
        assert.equal(r.status, 0, r.stderr);
        return r.stdout.trim();
    };
    const sup = (home, name) => path.join(home, ...(process.platform === 'darwin' ? ['Library', 'Application Support', name] : ['.' + name]));
    const onlyOld = path.join(tmp, 'glass-old'); fs.mkdirSync(sup(onlyOld, 'el-subtitle-animator'), { recursive: true });
    const fresh = path.join(tmp, 'glass-new'); fs.mkdirSync(fresh, { recursive: true });
    const both = path.join(tmp, 'glass-both'); fs.mkdirSync(sup(both, 'el-subtitle-animator'), { recursive: true }); fs.mkdirSync(sup(both, 'framelly'), { recursive: true });
    assert.equal(N.glassRegistryFile(onlyOld), path.join(sup(onlyOld, 'el-subtitle-animator'), 'glass.json'));
    for (const home of [onlyOld, fresh, both]) {
        const want = N.glassRegistryFile(home);
        assert.equal(fromPython(home), want, home);
    }
});
