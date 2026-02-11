/**
 * Generate a 16x16 fully transparent favicon.ico
 * ICO format: 6-byte header + 16-byte directory + 40-byte BITMAPINFOHEADER + 16*16*4 ARGB (all zero = transparent)
 */
const fs = require('fs');
const path = require('path');

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);   // reserved
header.writeUInt16LE(1, 2);   // type 1 = ICO
header.writeUInt16LE(1, 4);   // number of images

const entry = Buffer.alloc(16);
entry[0] = 16; entry[1] = 0;   // width, height
entry[2] = 0; entry[3] = 0;    // no palette
entry.writeUInt16LE(1, 4);     // color planes
entry.writeUInt16LE(32, 6);   // 32 bpp
entry.writeUInt32LE(1064, 8); // size of image data (40 + 1024)
entry.writeUInt32LE(22, 12);  // offset to image data (6+16)

const dib = Buffer.alloc(40);
dib.writeUInt32LE(40, 0);     // header size
dib.writeInt32LE(16, 4);      // width
dib.writeInt32LE(32, 8);      // height (16*2 for AND mask)
dib.writeUInt16LE(1, 12);     // planes
dib.writeUInt16LE(32, 14);   // bpp
dib.writeUInt32LE(0, 16);    // compression
dib.writeUInt32LE(1024, 20);  // image size
dib.writeInt32LE(16, 24);     // ppm X
dib.writeInt32LE(16, 28);     // ppm Y
dib.writeUInt32LE(0, 32);    // colors used
dib.writeUInt32LE(0, 36);    // important colors

const pixels = Buffer.alloc(1024); // 16*16*4 ARGB, all zero = transparent

const ico = Buffer.concat([header, entry, dib, pixels]);
const outPath = path.join(__dirname, '..', 'src', 'app', 'favicon.ico');
fs.writeFileSync(outPath, ico);
console.log('Wrote', outPath, ico.length, 'bytes');
