import { writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const sizes = [192, 512];
const iconSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="100" fill="#4299E1" />
  <path d="M256 128C185.307 128 128 185.307 128 256C128 326.693 185.307 384 256 384C326.693 384 384 326.693 384 256C384 185.307 326.693 128 256 128ZM256 352C203.065 352 160 308.935 160 256C160 203.065 203.065 160 256 160C308.935 160 352 203.065 352 256C352 308.935 308.935 352 256 352Z" fill="white"/>
  <path d="M256 192C220.654 192 192 220.654 192 256C192 291.346 220.654 320 256 320C291.346 320 320 291.346 320 256C320 220.654 291.346 192 256 192ZM256 288C238.327 288 224 273.673 224 256C224 238.327 238.327 224 256 224C273.673 224 288 238.327 288 256C288 273.673 273.673 288 256 288Z" fill="white"/>
</svg>`;

async function generateIcons() {
  const publicDir = join(process.cwd(), 'public');

  for (const size of sizes) {
    const buffer = Buffer.from(iconSvg);
    await sharp(buffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, `icon-${size}.png`));
  }
}

generateIcons().catch(console.error); 