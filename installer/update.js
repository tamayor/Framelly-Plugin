#!/usr/bin/env node
// The installer's "keep it current" steps without its window: for each item that is already set up (or required) and
// now reports "update", run its install. Items that were never installed are left alone, so this never adds an engine.
//   npm run update                 (in the code folder) after moving/renaming the main folder or changing the code
//   node installer/update.js --check   only lists what is out of date
// It needs no Electron. The panel's own copy is also brought up to date each time it opens (src/main/self-update.js).

const path = require('path');
const E = require('./shared/env');
const P = require('./shared/platform');
const C = require('./shared/items');

(async () => {
    const check = process.argv.includes('--check');
    const codeDir = E.findCodeDir([path.join(__dirname, '..')]);
    if (!codeDir) throw new Error('The plugin\'s code folder was not found above ' + __dirname);
    const ctx = { ...E.locations(codeDir), paths: P.resolvePaths() };
    console.log('Code: ' + ctx.codeDir + '\nData: ' + ctx.dataDir);
    let failed = 0;
    for (const item of C.ITEMS) {
        let d;
        try { d = await item.detect(ctx); } catch (e) { d = { state: 'missing', note: String(e.message || e) }; }
        const due = d.state === 'update' || (item.required && d.state === 'missing');
        console.log((due ? '* ' : '  ') + item.title + ': ' + d.note);
        if (!due || check) continue;
        try {
            await item.install(ctx, (text) => console.log('    ' + text));
            const after = await item.detect(ctx);
            if (after.state !== 'ok') throw new Error(after.note);
            console.log('    done');
        } catch (e) { failed++; console.log('    FAILED: ' + String(e && e.message || e)); }
    }
    if (failed) process.exit(1);
})().catch((e) => { console.error(String(e && e.message || e)); process.exit(1); });
