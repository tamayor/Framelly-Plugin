// Re-encoding preview PNGs in place (src/main/png-compress.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const env = require('../helpers/env');

const P = env.main('png-compress');

// An RGB PNG with its pixels stored, not compressed (the way Resolve's ExportFrame writes them).
function rawPng(w, h, shade) {
    const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcT[n] = c >>> 0; }
    const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
    const chunk = (type, data) => { const h = Buffer.alloc(8); h.writeUInt32BE(data.length, 0); h.write(type, 4, 'latin1'); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([h.subarray(4), data]))); return Buffer.concat([h, data, c]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc(h * (1 + w * 3));
    for (let y = 0; y < h; y++) for (let x = 0; x < w * 3; x++) raw[y * (1 + w * 3) + 1 + x] = (shade + x) & 0xff;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 0 })), chunk('IEND', Buffer.alloc(0))]);
}

test('a stored PNG is re-encoded smaller under the same name', async () => {
    const f = path.join(env.DATA_DIR, 'png-a.png');
    fs.writeFileSync(f, rawPng(64, 64, 10));
    assert.equal(P.isUncompressedPng(f), true);
    assert.ok(await P.compressPng(f) > 0);
    assert.equal(P.isUncompressedPng(f), false);
});

test('a frame replaced while it is being encoded keeps the new frame', async () => {
    const f = path.join(env.DATA_DIR, 'png-b.png');
    fs.writeFileSync(f, rawPng(64, 64, 10));
    const run = P.compressPng(f);
    // a new preview (or a cache restore) puts another frame under the same name
    fs.rmSync(f);
    const fresh = rawPng(64, 64, 99);
    fs.writeFileSync(f, fresh);
    assert.equal(await run, 0);
    assert.ok(fs.readFileSync(f).equals(fresh));
    assert.deepEqual(fs.readdirSync(env.DATA_DIR).filter(n => n.startsWith('png-b.png.tmp')), []);
});
