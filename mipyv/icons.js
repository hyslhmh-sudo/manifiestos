// Librería de íconos SVG simples y reconocibles por silueta.
// Cada ícono viene con un color de fondo distinto por categoría para
// reforzar el reconocimiento visual (no depende solo de la forma).

function svgWrap(inner, bg) {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="${bg}"/>
    <g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
  </svg>`;
}

const ICONS = {
  // ---------- PLAGAS ----------
  spider: (bg="#6B4C8A") => svgWrap(`
    <circle cx="32" cy="30" r="8" fill="#fff" stroke="none"/>
    <circle cx="32" cy="18" r="4.5" fill="#fff" stroke="none"/>
    <path d="M24 24L14 18M24 28L12 28M24 33L14 40M40 24L50 18M40 28L52 28M40 33L50 40"/>
  `, bg),
  roach: (bg="#7A5C3E") => svgWrap(`
    <ellipse cx="32" cy="34" rx="13" ry="9" fill="#fff" stroke="none"/>
    <path d="M25 24L20 14M39 24L44 14M20 34H10M20 40L12 46M44 34H54M44 40L52 46M20 27H10"/>
  `, bg),
  rodent: (bg="#8A6F52") => svgWrap(`
    <ellipse cx="30" cy="34" rx="14" ry="10" fill="#fff" stroke="none"/>
    <circle cx="42" cy="26" r="5" fill="#fff" stroke="none"/>
    <path d="M44 44Q54 50 58 42" stroke-width="3"/>
    <circle cx="43" cy="25" r="1.4" fill="${bg}" stroke="none"/>
  `, bg),
  fly: (bg="#4A5A6B") => svgWrap(`
    <ellipse cx="32" cy="32" rx="7" ry="9" fill="#fff" stroke="none"/>
    <ellipse cx="22" cy="26" rx="10" ry="6" fill="#fff" fill-opacity=".55" stroke="none" transform="rotate(-20 22 26)"/>
    <ellipse cx="42" cy="26" rx="10" ry="6" fill="#fff" fill-opacity=".55" stroke="none" transform="rotate(20 42 26)"/>
    <path d="M27 40L20 46M37 40L44 46"/>
  `, bg),
  mosquito: (bg="#4A7A6B") => svgWrap(`
    <ellipse cx="34" cy="32" rx="5" ry="10" fill="#fff" stroke="none" transform="rotate(20 34 32)"/>
    <path d="M18 18L28 26"/>
    <ellipse cx="26" cy="24" rx="9" ry="5" fill="#fff" fill-opacity=".5" stroke="none" transform="rotate(-15 26 24)"/>
    <ellipse cx="40" cy="28" rx="9" ry="5" fill="#fff" fill-opacity=".5" stroke="none" transform="rotate(25 40 28)"/>
    <path d="M30 40L24 48M38 40L42 48"/>
  `, bg),
  pigeon: (bg="#5A6E8A") => svgWrap(`
    <ellipse cx="30" cy="36" rx="14" ry="11" fill="#fff" stroke="none"/>
    <circle cx="44" cy="24" r="7" fill="#fff" stroke="none"/>
    <path d="M50 24L57 22" stroke-width="3"/>
    <path d="M22 44L18 52M32 46L30 54"/>
  `, bg),
  mite: (bg="#8A7A4A") => svgWrap(`
    <circle cx="32" cy="32" r="9" fill="#fff" stroke="none"/>
    <path d="M25 26L17 22M25 32H15M25 38L17 42M39 26L47 22M39 32H49M39 38L47 42"/>
  `, bg),
  bedbug: (bg="#8A4A4A") => svgWrap(`
    <ellipse cx="32" cy="32" rx="11" ry="14" fill="#fff" stroke="none"/>
    <path d="M22 22L14 18M22 42L14 46M42 22L50 18M42 42L50 46"/>
  `, bg),
  bat: (bg="#4A4A5A") => svgWrap(`
    <path d="M32 22C28 12 14 14 10 24C18 22 24 26 26 32C24 26 14 26 10 34C20 34 26 30 32 36C38 30 44 34 54 34C50 26 40 26 38 32C40 26 46 22 54 24C50 14 36 12 32 22Z" fill="#fff" stroke="none"/>
  `, bg),
  earwig: (bg="#5A7A4A") => svgWrap(`
    <ellipse cx="30" cy="32" rx="12" ry="6" fill="#fff" stroke="none"/>
    <path d="M42 28Q52 20 50 30M42 36Q52 44 50 34"/>
    <path d="M20 24L12 18M20 32H10M20 38L12 44"/>
  `, bg),
  ant: (bg="#4A3A2A") => svgWrap(`
    <circle cx="20" cy="30" r="5" fill="#fff" stroke="none"/>
    <circle cx="32" cy="32" r="6.5" fill="#fff" stroke="none"/>
    <circle cx="45" cy="30" r="5.5" fill="#fff" stroke="none"/>
    <path d="M32 25L28 16M32 25L36 16M24 30L14 26M24 34L14 38M40 30L50 24M40 34L48 40"/>
  `, bg),

  // ---------- PRODUCTOS ----------
  bottle: (bg) => svgWrap(`
    <rect x="24" y="18" width="16" height="8" rx="2" fill="#fff" stroke="none"/>
    <path d="M26 26H38V46Q38 50 34 50H30Q26 50 26 46Z" fill="#fff" stroke="none"/>
    <rect x="27" y="14" width="10" height="5" rx="1.5" fill="#fff" stroke="none"/>
  `, bg),
  spray: (bg) => svgWrap(`
    <rect x="22" y="26" width="18" height="24" rx="3" fill="#fff" stroke="none"/>
    <rect x="27" y="18" width="8" height="8" fill="#fff" stroke="none"/>
    <path d="M35 20L46 14M42 12L48 18" stroke-width="3"/>
  `, bg),
  powder: (bg) => svgWrap(`
    <path d="M24 46L28 20H36L40 46Z" fill="#fff" stroke="none"/>
    <rect x="26" y="16" width="12" height="5" rx="1.5" fill="#fff" stroke="none"/>
    <circle cx="20" cy="44" r="2" fill="#fff" stroke="none"/><circle cx="44" cy="40" r="2" fill="#fff" stroke="none"/>
  `, bg),
  pellet: (bg) => svgWrap(`
    <circle cx="24" cy="38" r="5" fill="#fff" stroke="none"/>
    <circle cx="36" cy="30" r="5.5" fill="#fff" stroke="none"/>
    <circle cx="42" cy="44" r="4.5" fill="#fff" stroke="none"/>
    <circle cx="28" cy="24" r="4" fill="#fff" stroke="none"/>
  `, bg),
  shield: (bg) => svgWrap(`
    <path d="M32 14L48 20V32Q48 44 32 50Q16 44 16 32V20Z" fill="#fff" stroke="none"/>
    <path d="M26 32L30 36L38 26" stroke="${bg}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  `, bg),

  // ---------- EPP ----------
  gloves: () => svgWrap(`
    <path d="M22 44V26Q22 22 26 22Q30 22 30 26V30M30 30V20Q30 16 34 16Q38 16 38 20V30M38 24Q38 20 42 20Q46 20 46 24V32M42 32V40Q42 48 34 48H28Q22 48 22 42V44"/>
  `, "#3E6E8A"),
  mask: () => svgWrap(`
    <path d="M18 30Q32 20 46 30V38Q32 48 18 38Z" fill="#fff" stroke="none"/>
    <path d="M24 34H40M28 40H36"/>
  `, "#3E6E8A"),
  goggles: () => svgWrap(`
    <circle cx="24" cy="32" r="9" fill="#fff" stroke="none"/>
    <circle cx="42" cy="32" r="9" fill="#fff" stroke="none"/>
    <path d="M33 32H33"/>
  `, "#3E6E8A"),
  boots: () => svgWrap(`
    <path d="M26 14V34L18 40Q16 42 18 46H36V34H30V14Z" fill="#fff" stroke="none"/>
  `, "#3E6E8A"),
  coverall: () => svgWrap(`
    <path d="M24 14H40V22L44 26V48H36V36H28V48H20V26L24 22Z" fill="#fff" stroke="none"/>
    <circle cx="32" cy="18" r="3" fill="#3E6E8A" stroke="none"/>
  `, "#3E6E8A"),
  cap_epp: () => svgWrap(`
    <path d="M18 32Q18 18 32 18Q46 18 46 32V36H18Z" fill="#fff" stroke="none"/>
    <rect x="16" y="36" width="32" height="6" rx="3" fill="#fff" stroke="none"/>
  `, "#3E6E8A"),
  shoe_covers: () => svgWrap(`
    <path d="M20 40Q20 26 26 22Q30 20 34 22Q38 24 38 32V40Z" fill="#fff" stroke="none"/>
    <ellipse cx="29" cy="42" rx="14" ry="4" fill="#fff" stroke="none"/>
  `, "#3E6E8A"),

  // ---------- ESTABLECIMIENTO ----------
  hospital: () => svgWrap(`
    <rect x="16" y="22" width="32" height="28" rx="2" fill="#fff" stroke="none"/>
    <path d="M32 28V42M25 35H39" stroke="#5894A7" stroke-width="3"/>
  `, "#0D313F"),
  building: () => svgWrap(`
    <rect x="20" y="16" width="24" height="34" rx="2" fill="#fff" stroke="none"/>
    <rect x="25" y="22" width="5" height="5" fill="#0D313F" stroke="none"/>
    <rect x="34" y="22" width="5" height="5" fill="#0D313F" stroke="none"/>
    <rect x="25" y="31" width="5" height="5" fill="#0D313F" stroke="none"/>
    <rect x="34" y="31" width="5" height="5" fill="#0D313F" stroke="none"/>
  `, "#5894A7"),
  cap: () => svgWrap(`
    <path d="M18 34L32 22L46 34V48H18Z" fill="#fff" stroke="none"/>
    <rect x="28" y="38" width="8" height="10" fill="#5894A7" stroke="none"/>
  `, "#2E9E5B"),

  // ---------- SANEAMIENTO (PROP-HYS-045) ----------
  yard: (bg="#4E7A3E") => svgWrap(`
    <path d="M32 48V30M32 30Q24 30 22 20Q32 22 32 30Q32 22 42 20Q40 30 32 30Z" fill="#fff" stroke="none"/>
    <path d="M20 48H44"/>
  `, bg),
  pipe: (bg="#5A6E7A") => svgWrap(`
    <path d="M16 24H36V34H48" stroke-width="7"/>
    <circle cx="48" cy="34" r="3.5" fill="#fff" stroke="none"/>
  `, bg),
  tank: (bg="#3E7A8E") => svgWrap(`
    <rect x="20" y="20" width="24" height="26" rx="3" fill="#fff" stroke="none"/>
    <rect x="24" y="14" width="16" height="6" rx="1.5" fill="#fff" stroke="none"/>
    <path d="M26 46V50M38 46V50" stroke-width="3"/>
  `, bg),
  drain: (bg="#4A6A7A") => svgWrap(`
    <rect x="18" y="24" width="28" height="18" rx="3" fill="#fff" stroke="none"/>
    <path d="M24 30H40M24 35H40" stroke="${bg}" stroke-width="2.5"/>
    <path d="M32 42V50" stroke-width="3"/>
  `, bg),
  broom: (bg="#3E8E5B") => svgWrap(`
    <path d="M38 14L24 38" stroke-width="3.5"/>
    <path d="M24 38L14 50M24 38L20 50M24 38L28 48" stroke-width="2.6"/>
  `, bg),
  bug: (bg="#0D313F") => svgWrap(`
    <ellipse cx="32" cy="34" rx="10" ry="13" fill="#fff" stroke="none"/>
    <path d="M24 26L16 20M40 26L48 20M22 34H12M42 34H52M24 42L16 48M40 42L48 48"/>
  `, bg),
  calendar_new: (bg="#4E7A3E") => svgWrap(`
    <rect x="16" y="18" width="32" height="28" rx="3" fill="#fff" stroke="none"/>
    <rect x="16" y="18" width="32" height="8" fill="${bg}" stroke="none"/>
    <path d="M32 30V42M26 36H38" stroke="${bg}" stroke-width="3"/>
  `, bg),
  calendar_continue: (bg="#6E8E4E") => svgWrap(`
    <rect x="16" y="18" width="32" height="28" rx="3" fill="#fff" stroke="none"/>
    <rect x="16" y="18" width="32" height="8" fill="${bg}" stroke="none"/>
    <path d="M25 36L30 41L40 30" stroke="${bg}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  `, bg),

  // fallback genérico
  generic: () => svgWrap(`<circle cx="32" cy="32" r="10" fill="#fff" stroke="none"/>`, "#5894A7"),
};

function renderIcon(key, size, color) {
  const fn = ICONS[key] || ICONS.generic;
  const svg = color ? fn(color) : fn();
  return size ? svg.replace("<svg ", `<svg style="width:${size}px;height:${size}px" `) : svg;
}
