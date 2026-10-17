const fs = require('fs');
const path = require('path');

const svgs = {
  // Products (Transparent background, clean floor shadows)
  'products/mechanical-dragon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
    <defs>
      <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E0A96D"/>
        <stop offset="40%" stop-color="#C68B59"/>
        <stop offset="70%" stop-color="#8E5431"/>
        <stop offset="100%" stop-color="#5A321B"/>
      </linearGradient>
      <linearGradient id="bronzeHighlight" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#FFE0B2"/>
        <stop offset="50%" stop-color="#D79A63"/>
        <stop offset="100%" stop-color="#7B4222"/>
      </linearGradient>
      <radialGradient id="shadowG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(29, 29, 31, 0.16)"/>
        <stop offset="70%" stop-color="rgba(29, 29, 31, 0.04)"/>
        <stop offset="100%" stop-color="rgba(29, 29, 31, 0)"/>
      </radialGradient>
    </defs>
    <!-- Floor shadow -->
    <ellipse cx="300" cy="380" rx="210" ry="24" fill="url(#shadowG)"/>
    <!-- Dragon segments -->
    <g transform="translate(60, 40)">
      <!-- Tail segments -->
      <path d="M 60 260 Q 90 280 130 250 Q 150 230 180 250 L 175 275 Q 140 260 110 285 Z" fill="url(#bronzeGrad)"/>
      <circle cx="178" cy="260" r="12" fill="url(#bronzeHighlight)"/>
      <!-- Body Spine Segment 1 -->
      <path d="M 170 250 Q 210 210 260 230 L 255 265 Q 210 240 175 275 Z" fill="url(#bronzeGrad)"/>
      <!-- Scales & Spine Dorsal Fin -->
      <polygon points="215,220 230,175 245,225" fill="url(#bronzeHighlight)"/>
      <polygon points="265,228 285,160 305,232" fill="url(#bronzeHighlight)"/>
      <polygon points="325,235 345,185 365,242" fill="url(#bronzeHighlight)"/>
      <!-- Body Segment 2 -->
      <path d="M 255 230 Q 320 235 370 245 L 365 285 Q 310 270 255 265 Z" fill="url(#bronzeGrad)"/>
      <!-- Neck & Chest -->
      <path d="M 365 245 Q 400 200 410 140 L 445 165 Q 425 230 365 285 Z" fill="url(#bronzeHighlight)"/>
      <!-- Head -->
      <path d="M 405 145 L 470 120 L 495 145 L 465 170 L 425 165 Z" fill="url(#bronzeGrad)"/>
      <polygon points="415,140 435,90 445,135" fill="url(#bronzeHighlight)"/>
      <polygon points="445,130 475,85 470,125" fill="url(#bronzeHighlight)"/>
      <!-- Jaw -->
      <path d="M 435 170 L 475 175 L 450 190 Z" fill="#7B4222"/>
      <!-- Eye glow -->
      <circle cx="455" cy="138" r="4" fill="#0071E3"/>
      <!-- Front Talon/Claw -->
      <path d="M 330 270 L 350 330 L 380 340 L 370 320 L 350 270 Z" fill="url(#bronzeGrad)"/>
      <!-- Rear Talon -->
      <path d="M 190 265 L 180 325 L 210 335 L 205 315 L 215 265 Z" fill="url(#bronzeGrad)"/>
    </g>
  </svg>`,

  'products/wave-vase.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
    <defs>
      <linearGradient id="ceramicGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E8ECEF"/>
        <stop offset="35%" stop-color="#FFFFFF"/>
        <stop offset="70%" stop-color="#DFE4E8"/>
        <stop offset="100%" stop-color="#CAD2D8"/>
      </linearGradient>
      <linearGradient id="innerCavity" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#6E767D"/>
        <stop offset="100%" stop-color="#363C42"/>
      </linearGradient>
      <radialGradient id="shadowVase" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(30, 40, 50, 0.18)"/>
        <stop offset="60%" stop-color="rgba(30, 40, 50, 0.04)"/>
        <stop offset="100%" stop-color="rgba(30, 40, 50, 0)"/>
      </radialGradient>
    </defs>
    <ellipse cx="300" cy="385" rx="140" ry="20" fill="url(#shadowVase)"/>
    <g transform="translate(180, 50)">
      <path d="M 80 40 
               C 30 90, 10 140, 50 200 
               C 90 260, 20 300, 40 330 
               L 200 330 
               C 220 300, 150 260, 190 200 
               C 230 140, 210 90, 160 40 
               Z" fill="url(#ceramicGrad)"/>
      <path d="M 95 42 C 55 95, 38 145, 75 205 C 110 265, 48 302, 65 330" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="4"/>
      <path d="M 120 44 C 85 98, 70 148, 105 208 C 140 268, 85 304, 100 330" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="4"/>
      <path d="M 145 42 C 125 96, 120 148, 145 208 C 170 268, 135 304, 150 330" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="5"/>
      <ellipse cx="120" cy="40" rx="40" ry="12" fill="url(#innerCavity)"/>
      <ellipse cx="120" cy="40" rx="36" ry="10" fill="#20252A"/>
      <ellipse cx="120" cy="330" rx="80" ry="8" fill="rgba(0,0,0,0.05)"/>
    </g>
  </svg>`,

  'products/controller-stand.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
    <defs>
      <linearGradient id="stealthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4B4E53"/>
        <stop offset="50%" stop-color="#2D3035"/>
        <stop offset="100%" stop-color="#1B1D20"/>
      </linearGradient>
      <linearGradient id="standFacet" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#60646B"/>
        <stop offset="100%" stop-color="#36393E"/>
      </linearGradient>
    </defs>
    <ellipse cx="300" cy="385" rx="160" ry="22" fill="rgba(20,22,25,0.14)"/>
    <g transform="translate(160, 60)">
      <polygon points="40,310 240,310 280,340 0,340" fill="url(#stealthGrad)"/>
      <polygon points="0,340 280,340 280,350 0,350" fill="#141618"/>
      <polygon points="110,90 170,90 190,320 90,320" fill="url(#stealthGrad)"/>
      <polygon points="110,90 135,90 115,320 90,320" fill="url(#standFacet)"/>
      <path d="M 60 110 L 220 110 L 200 140 Q 140 170 80 140 Z" fill="url(#standFacet)"/>
      <path d="M 75 118 Q 140 145 205 118" fill="none" stroke="#0071E3" stroke-width="3" opacity="0.9"/>
      <path d="M 70 200 L 210 200 L 195 230 Q 140 255 85 230 Z" fill="url(#standFacet)"/>
      <path d="M 85 208 Q 140 230 195 208" fill="none" stroke="#0071E3" stroke-width="3" opacity="0.9"/>
    </g>
  </svg>`,

  'products/astronaut-lamp.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
    <defs>
      <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="60%" stop-color="#ECEFF2"/>
        <stop offset="100%" stop-color="#C5CCD3"/>
      </linearGradient>
      <radialGradient id="visorGlow" cx="45%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#FFF2A3"/>
        <stop offset="35%" stop-color="#FFBE3B"/>
        <stop offset="75%" stop-color="#D97706"/>
        <stop offset="100%" stop-color="#78350F"/>
      </radialGradient>
      <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(255, 190, 59, 0.28)"/>
        <stop offset="60%" stop-color="rgba(255, 190, 59, 0.05)"/>
        <stop offset="100%" stop-color="rgba(255, 190, 59, 0)"/>
      </radialGradient>
    </defs>
    <circle cx="300" cy="180" r="140" fill="url(#lampGlow)"/>
    <ellipse cx="300" cy="380" rx="130" ry="18" fill="rgba(25, 28, 32, 0.14)"/>
    <g transform="translate(190, 70)">
      <ellipse cx="110" cy="305" rx="75" ry="16" fill="#8B5E3C"/>
      <path d="M 35 305 L 35 320 C 35 330 185 330 185 320 L 185 305 Z" fill="#694326"/>
      <path d="M 65 200 C 65 170 155 170 155 200 L 160 270 L 125 270 L 110 230 L 95 270 L 60 270 Z" fill="url(#suitGrad)"/>
      <rect x="55" y="270" width="38" height="20" rx="6" fill="#A4B0BA"/>
      <rect x="127" y="270" width="38" height="20" rx="6" fill="#A4B0BA"/>
      <rect x="42" y="165" width="22" height="75" rx="8" fill="#B0BAC3"/>
      <circle cx="110" cy="115" r="58" fill="url(#suitGrad)"/>
      <ellipse cx="114" cy="118" rx="42" ry="32" fill="url(#visorGlow)"/>
      <ellipse cx="106" cy="108" rx="14" ry="7" fill="rgba(255,255,255,0.75)"/>
    </g>
  </svg>`,

  'products/cyber-samurai.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
    <defs>
      <linearGradient id="armorMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#46494F"/>
        <stop offset="50%" stop-color="#28292D"/>
        <stop offset="100%" stop-color="#141517"/>
      </linearGradient>
      <linearGradient id="armorHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#737984"/>
        <stop offset="100%" stop-color="#3C3F46"/>
      </linearGradient>
    </defs>
    <ellipse cx="300" cy="385" rx="130" ry="18" fill="rgba(15, 17, 20, 0.16)"/>
    <g transform="translate(170, 50)">
      <polygon points="50,260 210,260 230,340 30,340" fill="url(#armorMetal)"/>
      <polygon points="70,230 190,230 205,270 55,270" fill="url(#armorHighlight)"/>
      <polygon points="20,240 65,220 60,270 10,280" fill="url(#armorMetal)"/>
      <polygon points="240,240 195,220 200,270 250,280" fill="url(#armorMetal)"/>
      <polygon points="90,190 170,190 180,230 80,230" fill="#1C1E22"/>
      <polygon points="95,140 165,140 180,190 80,190" fill="url(#armorHighlight)"/>
      <polygon points="105,145 155,145 150,152 110,152" fill="#0071E3"/>
      <path d="M 65 130 C 65 60 195 60 195 130 Z" fill="url(#armorMetal)"/>
      <polygon points="130,100 80,15 115,50 130,80 145,50 180,15" fill="#D4AF37"/>
      <circle cx="130" cy="95" r="10" fill="#D4AF37"/>
    </g>
  </svg>`,

  'products/whale-sculpture.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
    <defs>
      <linearGradient id="whaleOcean" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#5B86A6"/>
        <stop offset="50%" stop-color="#3B5B73"/>
        <stop offset="100%" stop-color="#243847"/>
      </linearGradient>
      <linearGradient id="frostHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#C2D9E8"/>
        <stop offset="100%" stop-color="#6992AF"/>
      </linearGradient>
    </defs>
    <ellipse cx="300" cy="385" rx="140" ry="20" fill="rgba(30, 45, 60, 0.14)"/>
    <g transform="translate(110, 80)">
      <rect x="185" y="240" width="10" height="80" rx="4" fill="#88929A"/>
      <ellipse cx="190" cy="320" rx="50" ry="12" fill="#D5DCE2"/>
      <polygon points="60,180 150,130 170,180" fill="url(#frostHighlight)"/>
      <polygon points="60,180 170,180 150,230" fill="url(#whaleOcean)"/>
      <polygon points="150,130 250,140 170,180" fill="#759DB8"/>
      <polygon points="170,180 250,140 270,190" fill="url(#frostHighlight)"/>
      <polygon points="170,180 270,190 230,225" fill="url(#whaleOcean)"/>
      <polygon points="150,230 170,180 230,225" fill="#2E4353"/>
      <polygon points="175,190 140,260 190,210" fill="#4B6E87"/>
      <polygon points="250,140 330,165 270,190" fill="#658BA4"/>
      <polygon points="270,190 330,165 315,200" fill="url(#whaleOcean)"/>
      <polygon points="330,165 370,130 355,170" fill="url(#frostHighlight)"/>
      <polygon points="330,165 375,195 350,175" fill="#3B576C"/>
    </g>
  </svg>`,

  // Categories (Pure transparent background vectors with refined geometry)
  'categories/models.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
    <g transform="translate(50, 50)">
      <circle cx="100" cy="100" r="76" fill="none" stroke="#2D3035" stroke-width="16" stroke-dasharray="26 12"/>
      <circle cx="100" cy="100" r="46" fill="#FFFFFF" stroke="#8E939C" stroke-width="6"/>
      <circle cx="100" cy="100" r="18" fill="#0071E3"/>
    </g>
  </svg>`,

  'categories/decoration.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
    <defs>
      <linearGradient id="catDecoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E2E7EC"/>
        <stop offset="100%" stop-color="#B2BFCB"/>
      </linearGradient>
    </defs>
    <g transform="translate(60, 20)">
      <path d="M 90 20 C 40 70, 20 130, 60 190 C 100 240, 30 250, 50 260 L 130 260 C 150 250, 80 240, 120 190 C 160 130, 140 70, 90 20 Z" fill="url(#catDecoGrad)" stroke="#7F91A2" stroke-width="3"/>
      <ellipse cx="90" cy="20" rx="26" ry="8" fill="#5F7182"/>
    </g>
  </svg>`,

  'categories/toys.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
    <g transform="translate(70, 40)">
      <rect x="40" y="25" width="80" height="60" rx="18" fill="#2E333B"/>
      <circle cx="62" cy="52" r="8" fill="#0071E3"/>
      <circle cx="98" cy="52" r="8" fill="#0071E3"/>
      <rect x="25" y="95" width="110" height="90" rx="20" fill="#4B535E"/>
      <rect x="0" y="105" width="20" height="65" rx="10" fill="#788494"/>
      <rect x="140" y="105" width="20" height="65" rx="10" fill="#788494"/>
      <rect x="42" y="195" width="28" height="65" rx="12" fill="#2E333B"/>
      <rect x="90" y="195" width="28" height="65" rx="12" fill="#2E333B"/>
    </g>
  </svg>`,

  'categories/home.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
    <g transform="translate(50, 35)">
      <polygon points="100,20 20,90 40,90 40,220 160,220 160,90 180,90" fill="#485260"/>
      <rect x="80" y="125" width="40" height="95" rx="6" fill="#F4F6F8"/>
      <rect x="90" y="50" width="20" height="40" fill="#7A8796"/>
    </g>
  </svg>`,

  'categories/accessories.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
    <g transform="translate(60, 40)">
      <path d="M 30 100 A 60 60 0 0 1 150 100" fill="none" stroke="#22252A" stroke-width="14" stroke-linecap="round"/>
      <rect x="18" y="90" width="28" height="52" rx="14" fill="#474C54"/>
      <rect x="134" y="90" width="28" height="52" rx="14" fill="#474C54"/>
      <line x1="90" y1="40" x2="90" y2="210" stroke="#7E8792" stroke-width="8"/>
      <ellipse cx="90" cy="215" rx="55" ry="14" fill="#22252A"/>
    </g>
  </svg>`,

  'categories/figures.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
    <g transform="translate(70, 20)">
      <polygon points="50,75 62,45 78,66 90,40 102,66 118,45 130,75" fill="#FFAA2B"/>
      <circle cx="90" cy="130" r="54" fill="#F0CEB5"/>
      <circle cx="72" cy="125" r="8" fill="#1D1D1F"/>
      <circle cx="108" cy="125" r="8" fill="#1D1D1F"/>
      <path d="M 50 180 C 50 160 130 160 130 180 L 138 240 L 42 240 Z" fill="#6DB3DE"/>
      <rect x="58" y="235" width="24" height="30" rx="8" fill="#3D4B5C"/>
      <rect x="98" y="235" width="24" height="30" rx="8" fill="#3D4B5C"/>
    </g>
  </svg>`,

  'categories/custom.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
    <g transform="translate(60, 40)">
      <polygon points="90,40 165,85 90,130 15,85" fill="none" stroke="#0071E3" stroke-width="5"/>
      <polygon points="15,85 90,130 90,215 15,170" fill="none" stroke="#0071E3" stroke-width="5"/>
      <polygon points="90,130 165,85 165,170 90,215" fill="none" stroke="#0071E3" stroke-width="5"/>
      <polygon points="90,105 80,85 100,85" fill="#FF9500"/>
      <line x1="90" y1="40" x2="90" y2="85" stroke="#FF9500" stroke-width="5"/>
    </g>
  </svg>`
};

for (const [relPath, content] of Object.entries(svgs)) {
  const fullPath = path.join(__dirname, 'public', 'images', relPath);
  fs.writeFileSync(fullPath, content.trim(), 'utf8');
}
console.log('Successfully regenerated all clean transparent SVGs!');
