/* Generates public/og.png + public/icon.svg — branded, programmatic. */
const sharp = require("sharp");
const fs = require("fs");

const W = 1200;
const H = 630;

/* ── OG image: SVG → PNG ─────────────────────────────────── */
const nodes = [
  [600, 315, 26, "#55e6ff"],
  [396, 258, 12, "#8b7bff"],
  [812, 288, 12, "#3ddc97"],
  [404, 388, 10, "#ffc857"],
  [804, 375, 12, "#ff5470"],
  [600, 448, 9, "#5ea8ff"],
  [600, 172, 9, "#c9d6ea"],
  [300, 320, 8, "#b78bff"],
  [880, 245, 7, "#7d8aa0"],
];

let links = "";
for (const [x, y] of nodes.slice(1)) {
  const mx = (600 + x) / 2;
  const my = (315 + y) / 2 - 40;
  links += `<path d="M600 315 Q ${mx} ${my} ${x} ${y}" stroke="rgba(90,130,190,0.35)" stroke-width="1.5" fill="none"/>`;
}
let dots = "";
for (const [x, y, r, c] of nodes) {
  dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="0.9"/>`;
  dots += `<circle cx="${x}" cy="${y}" r="${r + 14}" fill="none" stroke="${c}" stroke-opacity="0.25"/>`;
}

let stars = "";
let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
for (let i = 0; i < 160; i++) {
  stars += `<circle cx="${rand() * W}" cy="${rand() * H}" r="${rand() * 1.4}" fill="#9db8dd" opacity="${0.15 + rand() * 0.5}"/>`;
}

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#55e6ff" stop-opacity="0.25"/>
      <stop offset="60%" stop-color="#55e6ff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#55e6ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0f1c"/>
      <stop offset="100%" stop-color="#04040a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#floor)"/>
  ${stars}
  <circle cx="600" cy="315" r="210" fill="url(#core)"/>
  ${links}
  ${dots}
  <text x="80" y="130" font-family="Arial, sans-serif" font-size="64" font-weight="700" letter-spacing="10" fill="#ffffff">PRINCE <tspan fill="#55e6ff">//</tspan> WORLD</text>
  <text x="82" y="170" font-family="monospace" font-size="17" letter-spacing="9" fill="#7d8aa0">AN EXPLORABLE REAL-TIME DIGITAL UNIVERSE</text>
  <rect x="80" y="520" width="330" height="1.5" fill="rgba(85,230,255,0.4)"/>
  <text x="80" y="556" font-family="monospace" font-size="14" letter-spacing="6" fill="#55e6ff" opacity="0.9">ENTER · EXPLORE · DISCOVER · MEET PRINCE</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile("/home/z/my-project/public/og.png")
  .then(() => console.log("og.png done"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/* ── favicon icon ────────────────────────────────────────── */
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#04040a"/>
  <circle cx="32" cy="32" r="9" fill="#55e6ff"/>
  <circle cx="32" cy="32" r="16" fill="none" stroke="#55e6ff" stroke-opacity="0.5"/>
  <circle cx="32" cy="32" r="24" fill="none" stroke="#55e6ff" stroke-opacity="0.2"/>
  <circle cx="53" cy="18" r="3" fill="#8b7bff"/>
  <circle cx="12" cy="44" r="2.5" fill="#ff5470"/>
  <circle cx="50" cy="48" r="2" fill="#3ddc97"/>
</svg>`;
fs.writeFileSync("/home/z/my-project/public/icon.svg", icon);
console.log("icon.svg done");
