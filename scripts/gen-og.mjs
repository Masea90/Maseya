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
    <text x="90" y="335" font-size="40" fill="#FFFFFF">Tu escáner personalizado de productos</text>
    <text x="90" y="390" font-size="32" fill="#95D5B2">Alergias · intolerancias · halal · piel sensible</text>

    <!-- Footer -->
    <text x="90" y="560" font-size="28" fill="#FFFFFF" opacity="0.85">maseya.es · gratis</text>
  </g>

  <!-- Right circular badge -->
  <g transform="translate(950,315)">
    <circle cx="0" cy="0" r="170" fill="#FFFFFF"/>
    <text x="0" y="62" font-family="Arial, Helvetica, sans-serif" font-size="200" font-weight="bold" fill="#2D6A4F" text-anchor="middle">M</text>
    <!-- Leaf top-right -->
    <g transform="translate(115,-115) rotate(-30)">
      <ellipse cx="0" cy="0" rx="38" ry="16" fill="#95D5B2"/>
      <line x1="-34" y1="10" x2="34" y2="-10" stroke="#2D6A4F" stroke-width="2.5"/>
    </g>
  </g>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile("public/og-image.png");

console.log("done");
