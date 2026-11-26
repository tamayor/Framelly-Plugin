// Framelly - DaVinci Resolve Studio Workflow Integration plugin.
// Resolve loads this file (see manifest.xml); the main process lives in src/main/.

// The installed copy first brings itself up to date from the code folder (src/main/self-update.js), so this open
// already loads the new src/. A broken updater must never stop the panel.
try { global.framellySelfUpdate = require('./src/main/self-update').syncFromCode(__dirname); } catch (e) { /* open as installed */ }

require('./src/main');
