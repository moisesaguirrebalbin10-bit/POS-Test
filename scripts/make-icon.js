const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;

const src = path.join(__dirname, '..', 'electron', 'Logo_Vendomax.png');
const out = path.join(__dirname, '..', 'electron', 'icon.ico');
const sizes = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const buffers = await Promise.all(
    sizes.map(size =>
      sharp(src)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );
  const ico = await pngToIco(buffers);
  fs.writeFileSync(out, ico);
  console.log('icon.ico generado en', out);
}

main().catch(err => { console.error(err); process.exit(1); });
