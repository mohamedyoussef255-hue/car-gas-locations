// Official Corporate Identity of CARGAS (شركة الغاز الطبيعي للسيارات - كارجاس)
// Perfectly faithful representation of the official Cargas emblem:
// - Circular badge with crisp emerald green ring & clean white background
// - Iconic Green Leaf / Drop (رمز النقاء والغاز والبيئة)
// - Tri-color layered Natural Gas Flame (لهب الغاز الطبيعي المتدرج بالذهبي والبرتقالي والأصفر)
// - Bold Cairo Typography "كارجاس"
// - Official Sub-brand "NGV" (Natural Gas Vehicles) in bold green
// - Strict 1:1 Aspect Ratio with viewBox="0 0 200 200" and vector precision

export const CARGAS_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" style="display:block; max-width:100%; max-height:100%;">
  <defs>
    <!-- Corporate Green Gradient for Outer Ring & Shield -->
    <linearGradient id="cargasGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#009647" />
      <stop offset="100%" stop-color="#006c32" />
    </linearGradient>

    <!-- Natural Gas Flame Glow Gradient (Orange -> Golden Yellow) -->
    <linearGradient id="cargasFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFA000" />
      <stop offset="50%" stop-color="#FFD54F" />
      <stop offset="100%" stop-color="#FFE082" />
    </linearGradient>

    <!-- Center Flame High-Temp Core -->
    <linearGradient id="cargasCoreFlame" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFF9C4" />
      <stop offset="100%" stop-color="#FFF" />
    </linearGradient>
  </defs>

  <!-- Crisp Circular Base with Pure White Fill -->
  <circle cx="100" cy="100" r="97" fill="#ffffff" stroke="url(#cargasGreenGrad)" stroke-width="5" />
  
  <!-- Subtle Internal Accent Ring -->
  <circle cx="100" cy="100" r="91" fill="none" stroke="#22c55e" stroke-width="1.2" opacity="0.6" stroke-dasharray="3 1.5" />

  <!-- The Official Cargas Green Teardrop / Leaf Body -->
  <path d="M 100 18 C 132 48 166 84 168 116 C 170 140 148 156 100 156 C 52 156 30 140 32 116 C 34 84 68 48 100 18 Z" 
        fill="url(#cargasGreenGrad)" />

  <!-- Golden Gas Flame Cluster Inside the Leaf -->
  <!-- Left Outer Flame Tongue -->
  <path d="M 85 58 C 76 72 75 92 84 104 C 82 93 81 78 85 58 Z" fill="#F57C00" />

  <!-- Right Outer Flame Tongue -->
  <path d="M 115 58 C 124 72 125 92 116 104 C 118 93 119 78 115 58 Z" fill="#F57C00" />

  <!-- Center Main Natural Gas Flame -->
  <path d="M 100 34 C 112 56 118 80 111 98 C 105 108 95 108 97 93 C 100 81 107 66 100 34 Z" 
        fill="url(#cargasFlameGrad)" />

  <!-- White-Hot Pure Gas Core Flame -->
  <path d="M 100 62 C 105 74 107 88 102 98 C 98 104 93 103 95 93 C 97 85 102 75 100 62 Z" 
        fill="url(#cargasCoreFlame)" />

  <!-- Arabic Corporate Name "كارجاس" In Genuine Calligraphy / Bold Proportions -->
  <text x="100" y="142" 
        text-anchor="middle" 
        font-family="'Cairo', 'Segoe UI', Tahoma, system-ui, sans-serif" 
        font-weight="900" 
        font-size="30" 
        fill="#FFD54F" 
        letter-spacing="0.5">كارجاس</text>

  <!-- NGV Brand Subtext (Natural Gas Vehicles) -->
  <text x="100" y="184" 
        text-anchor="middle" 
        font-family="'Impact', 'Arial Black', sans-serif" 
        font-weight="900" 
        font-size="28" 
        fill="#007a38" 
        letter-spacing="2.5">NGV</text>

  <!-- Symmetric Accent Accreditations -->
  <circle cx="56" cy="174" r="3" fill="#F57C00" />
  <circle cx="144" cy="174" r="3" fill="#F57C00" />
</svg>
`.trim();

export const CARGAS_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(CARGAS_LOGO_SVG)}`;
