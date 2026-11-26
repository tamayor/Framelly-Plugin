// Builds the installer app and puts it in Installers/ in the code folder, where people pick an installer.
// The app finds "Framelly Plugin" by looking up from wherever it sits, so it works from there.
//   npm run build                 for this computer
//   npm run build -- win32 x64    for Windows: one "Install Framelly (Windows).exe"

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const OUT = path.join(HERE, '..', 'Installers');
const NAME = 'Install Framelly';
const APP_ID = 'com.framelly.installer';

(async () => {
    const { packager } = require('@electron/packager');
    const platform = process.argv[2] || process.platform;
    const arch = process.argv[3] || process.arch;
    const [dir] = await packager({
        dir: HERE, out: path.join(HERE, 'dist'), overwrite: true, platform, arch,
        name: NAME, executableName: NAME, appBundleId: APP_ID, asar: true, prune: true,
        win32metadata: { CompanyName: 'Framelly', FileDescription: NAME, ProductName: NAME },
        icon: platform === 'win32' ? path.join(HERE, 'windows', 'icon.ico') : path.join(HERE, 'mac', 'icon.icns'),
        ignore: [/^\/dist($|\/)/, /^\/icon($|\/)/, /^\/build\.js$/, /^\/package-lock\.json$/],
    });
    if (platform === 'win32') {
        // One .exe for the main folder: it unpacks the app folder (kept in dist/) to a temporary place and starts it.
        const builder = require('electron-builder');
        const out = path.join(HERE, 'dist', 'windows-portable');
        fs.rmSync(out, { recursive: true, force: true });
        const [exe] = await builder.build({
            targets: builder.Platform.WINDOWS.createTarget('portable', arch === 'arm64' ? builder.Arch.arm64 : builder.Arch.x64),
            prepackaged: dir, projectDir: HERE,
            config: {
                appId: APP_ID, productName: NAME, directories: { output: out },
                toolsets: { nsis: '1.2.1' },          // this NSIS bundle also runs on Apple silicon Macs
                win: { signAndEditExecutable: false, icon: path.join(HERE, 'windows', 'icon.ico') },
                portable: { artifactName: NAME + '.exe' },
            },
        });
        fs.mkdirSync(OUT, { recursive: true });
        const dest = path.join(OUT, NAME + ' (Windows).exe');
        fs.copyFileSync(exe, dest);
        console.log('Built ' + dest);
        return;
    }
    if (platform !== 'darwin') { console.log('Built ' + dir); return; }
    const built = path.join(dir, NAME + '.app');
    fs.mkdirSync(OUT, { recursive: true });
    const dest = path.join(OUT, NAME + ' (Mac).app');
    fs.rmSync(dest, { recursive: true, force: true });
    execFileSync('/usr/bin/ditto', [built, dest]);          // keeps the app's signature and links
    console.log('Built ' + dest);
})().catch((e) => { console.error(e); process.exit(1); });
