'use strict';
// installer/mac/items.js: moved-folder paths, old MCP entries, the skills and which Python takes Pillow.
// HOME points to a temp folder, so ~/.claude.json and ~/.claude/skills are the test's own.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'elsa-installer-')));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* temp */ } });
const home = path.join(tmp, 'home');
fs.mkdirSync(home, { recursive: true });
process.env.HOME = home;
const I = require('../../installer/mac/items');

const touch = (f) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, ''); };

test('movedPaths: the rest of the old main folder only moves when the file moved too', () => {
    const old = path.join(tmp, 'Desktop'), main = path.join(tmp, 'Framelly Main');
    const ctx = { mainDir: main, dataDir: path.join(main, 'Framelly'), codeDir: path.join(main, 'Framelly Plugin') };
    touch(path.join(old, 'interview.mov'));          // still on the Desktop
    touch(path.join(main, 'safe-zone.png'));         // moved with the main folder
    const text = JSON.stringify({ a: old + '/Framelly/_app/broll/a.mov', b: old + '/interview.mov', c: old + '/safe-zone.png', d: old + '/gone.mov' });
    const out = JSON.parse(I.movedPaths(text, old, ctx));
    assert.equal(out.a, ctx.dataDir + '/_app/broll/a.mov');
    assert.equal(out.b, old + '/interview.mov');
    assert.equal(out.c, main + '/safe-zone.png');
    assert.equal(out.d, old + '/gone.mov');
});

// 2026-11-26: "Framelly Plugin Main/{Framelly Plugin, Framelly}" became "Appselly/{Framelly, Framelly Source Assets}".
test('movedPaths: the old "Framelly" data folder goes to "Framelly Source Assets", the old code folder to "Framelly"', () => {
    const old = path.join(tmp, 'Framelly Plugin Main'), main = path.join(tmp, 'Appselly');
    const ctx = { mainDir: main, dataDir: path.join(main, 'Framelly Source Assets'), codeDir: path.join(main, 'Framelly') };
    touch(path.join(ctx.dataDir, 'layouts', 'safe.png'));
    touch(path.join(ctx.codeDir, 'broll', 'render.mjs'));
    const text = JSON.stringify({
        data: old + '/Framelly/layouts/safe.png', gone: old + '/Framelly/_app/broll/x.mov', dir: old + '/Framelly',
        code: old + '/Framelly Plugin/broll/render.mjs', codeOnly: old + '/Framelly/broll/render.mjs',
    });
    assert.deepEqual(I.stalePrefixes(text, ctx), [old]);
    const out = JSON.parse(I.movedPaths(text, old, ctx));
    assert.equal(out.data, ctx.dataDir + '/layouts/safe.png');
    assert.equal(out.gone, ctx.dataDir + '/_app/broll/x.mov');         // neither has it: the old layout's data folder
    assert.equal(out.dir, ctx.dataDir);
    assert.equal(out.code, ctx.codeDir + '/broll/render.mjs');
    assert.equal(out.codeOnly, ctx.codeDir + '/broll/render.mjs');     // only the code folder has it
    assert.deepEqual(I.stalePrefixes(JSON.stringify(out), ctx), []);
});

test('mcpEntries: a project entry whose folder is gone is left out', () => {
    const live = path.join(tmp, 'live-project');
    fs.mkdirSync(live, { recursive: true });
    const entry = { command: 'node', args: ['/x/mcp/el-sa-mcp.js'] };
    fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({
        projects: { [path.join(tmp, 'deleted-project')]: { mcpServers: { 'el-subtitle-animator': entry } }, [live]: { mcpServers: { 'el-subtitle-animator': entry } } },
    }));
    assert.deepEqual(I.mcpEntries().map(e => e.project), [live]);
});

test('installSkills: a skill without the job-prompt path gets the template, the user copy goes to .bak', () => {
    const ctx = { dataDir: path.join(tmp, 'Main', 'Framelly') };
    const file = path.join(home, '.claude', 'skills', 'framelly-prompt', 'SKILL.md');
    const auto = path.join(home, '.claude', 'skills', 'framelly-prompt-auto', 'SKILL.md');
    touch(file);
    fs.writeFileSync(file, 'My own notes, the path was taken out.\n');
    touch(auto);
    fs.writeFileSync(auto, 'Kept edit.\n`/old/place/Framelly/job-prompt.md`\n');
    I.installSkills(ctx, () => {});
    const want = '`' + path.join(ctx.dataDir, 'job-prompt.md') + '`';
    assert.ok(fs.readFileSync(file, 'utf8').includes(want));
    assert.equal(fs.readFileSync(file + '.bak', 'utf8'), 'My own notes, the path was taken out.\n');
    assert.equal(fs.readFileSync(auto, 'utf8'), 'Kept edit.\n' + want + '\n');
    assert.ok(!fs.existsSync(auto + '.bak'));
    assert.equal(I.detectSkills(ctx).state, 'ok');
});

test('isBrewPython: a link into a Cellar is Homebrew\'s, another Python is not', () => {
    const real = path.join(tmp, 'usr', 'local', 'Cellar', 'python@3.12', 'bin', 'python3');
    touch(real);
    const link = path.join(tmp, 'usr', 'local', 'bin', 'python3');
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(real, link);
    assert.ok(I.isBrewPython(link));
    const other = path.join(tmp, 'Library', 'Frameworks', 'Python.framework', 'bin', 'python3');
    touch(other);
    assert.ok(!I.isBrewPython(other));
    assert.ok(!I.isBrewPython(null));
    assert.ok(!I.isBrewPython(path.join(tmp, 'missing')));
});
