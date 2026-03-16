import { writeFileSync } from 'node:fs';

const ACCENT_COLOR = '#d94d73';
const BACKGROUND_COLOR = '#09090f';

function generateSvg({ size, padding }: { size: number; padding: number }): string {
  const center = size / 2;
  const radius = (size - padding * 2) / 2;
  const innerRadius = radius * 0.6;
  const ringWidth = radius * 0.15;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND_COLOR}" rx="${size * 0.15}"/>
  <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${ACCENT_COLOR}" stroke-width="${ringWidth}" opacity="0.3"/>
  <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="${ACCENT_COLOR}"/>
  <text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="sans-serif" font-weight="bold" font-size="${size * 0.25}">C</text>
</svg>`;
}

function generateMaskableSvg(size: number): string {
  const center = size / 2;
  const safeRadius = size * 0.35;
  const innerRadius = safeRadius * 0.6;
  const ringWidth = safeRadius * 0.15;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND_COLOR}"/>
  <circle cx="${center}" cy="${center}" r="${safeRadius}" fill="none" stroke="${ACCENT_COLOR}" stroke-width="${ringWidth}" opacity="0.3"/>
  <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="${ACCENT_COLOR}"/>
  <text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="sans-serif" font-weight="bold" font-size="${size * 0.18}">C</text>
</svg>`;
}

const ICONS_DIR = './public/icons';

writeFileSync(`${ICONS_DIR}/icon-192.svg`, generateSvg({ size: 192, padding: 16 }));
writeFileSync(`${ICONS_DIR}/icon-512.svg`, generateSvg({ size: 512, padding: 40 }));
writeFileSync(`${ICONS_DIR}/icon-512-maskable.svg`, generateMaskableSvg(512));

console.log('SVG icons generated successfully');
