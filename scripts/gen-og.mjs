import sharp from "sharp";
import { writeFileSync } from "fs";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#2D6A4F"/>

  <!-- Left content -->
  <g font-family="Arial, Helvetica, sans-serif">
    <!-- Brand name -->
    <text x="90" y="260" font-size="112" font-weight="bold" fill="#FFFFFF" letter-spacing="2">MASEYA</text>
    <!-- Leaf accent above the last A -->
    <g transform="translate(505,150) rotate(-35)">
      <ellipse cx="0" cy="0" rx="34" ry="14" fill="#95D5B2"/>
      <line x1="-30" y1="8" x2="30" y2="-8" stroke="#2D6A4F" stroke-width="2"/>
    </g>

    <!-- Tagline -->
    <text x="90" y="330" font-size="34" fill="#FFFFFF">Tu escáner personalizado</text>
    <text x="90" y="380" font-size="34" fill="#FFFFFF">de productos</text>
    <text x="90" y="440" font-size="26" fill="#95D5B2">Alergias · intolerancias · halal · piel sensible</text>

    <!-- Footer -->
    <text x="90" y="560" font-size="26" fill="#FFFFFF" opacity="0.85">maseya.es · gratis</text>
  </g>

  <!-- Right circular badge -->
  <g transform="translate(1000,315)">
    <circle cx="0" cy="0" r="140" fill="#FFFFFF"/>
    <text x="0" y="52" font-family="Arial, Helvetica, sans-serif" font-size="170" font-weight="bold" fill="#2D6A4F" text-anchor="middle">M</text>
    <!-- Leaf top-right -->
    <g transform="translate(95,-95) rotate(-30)">
      <ellipse cx="0" cy="0" rx="32" ry="13" fill="#95D5B2"/>
      <line x1="-28" y1="8" x2="28" y2="-8" stroke="#2D6A4F" stroke-width="2.5"/>
    </g>
  </g>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile("public/og-image.png");

console.log("done");
