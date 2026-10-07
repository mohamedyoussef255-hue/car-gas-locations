// Official Cargas NGV Logo & Marker Assets

export const CARGAS_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" class="w-full h-full">
  <!-- White circular card background -->
  <circle cx="80" cy="80" r="76" fill="#ffffff" stroke="#059669" stroke-width="4" />
  
  <!-- Green Lotus / Leaf Emblem -->
  <path d="M 80,18 C 102,40 128,68 132,88 C 135,102 120,118 80,118 C 40,118 25,102 28,88 C 32,68 58,40 80,18 Z" fill="#008844" />
  
  <!-- Yellow Gas Flame Curves -->
  <!-- Center Flame -->
  <path d="M 80,28 C 87,42 92,58 87,70 C 83,77 75,76 77,66 C 78,58 84,48 80,28 Z" fill="#FFD200" />
  <!-- Left Flame -->
  <path d="M 72,42 C 67,52 65,65 72,74 C 70,66 69,56 72,42 Z" fill="#FFC000" />
  <!-- Right Flame -->
  <path d="M 88,42 C 93,52 95,65 88,74 C 90,66 91,56 88,42 Z" fill="#FFE500" />

  <!-- Arabic Calligraphy "كارجاس" inside leaf -->
  <text x="80" y="104" text-anchor="middle" font-family="'Cairo', sans-serif" font-weight="900" font-size="22" fill="#FFD200" letter-spacing="1">كارجاس</text>

  <!-- NGV Letters in Bold Italic with Stroke -->
  <g transform="skewX(-10)">
    <text x="92" y="146" text-anchor="middle" font-family="'Impact', 'Arial Black', sans-serif" font-weight="900" font-size="34" fill="#FFD200" stroke="#006028" stroke-width="4" paint-order="stroke fill" letter-spacing="2">NGV</text>
  </g>
</svg>
`.trim();

export const CARGAS_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(CARGAS_LOGO_SVG)}`;
