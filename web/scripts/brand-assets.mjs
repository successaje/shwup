// Generates the ShwUp logo system as outlined SVGs (no font needed to display them) + PNG exports.
//   pnpm brand            → writes public/brand/*.svg, public/brand/png/*.png and the kit zip
// Bricolage Grotesque (SIL Open Font License) is fetched from Google Fonts into a temp dir on first run.
// Proportions follow the site header: text size ≈ 1.04 × mark height, gap 0.4 × mark, tracking -0.03em.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import opentype from "opentype.js";
import { Resvg } from "@resvg/resvg-js";

const OUT = process.argv[2] ?? new URL("../public/brand", import.meta.url).pathname;
fs.mkdirSync(path.join(OUT, "png"), { recursive: true });

const C = { stamp: "#d9481f", stampDark: "#ff6a3d", ink: "#18170f", paper: "#f4f1e8" };
async function loadFont() {
  const cached = path.join(os.tmpdir(), "shwup-bricolage-700.ttf");
  if (!fs.existsSync(cached)) {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@96,700")).text();
    const url = css.match(/https:[^)]+\.ttf/)?.[0];
    if (!url) throw new Error("Couldn't find the Bricolage Grotesque TTF on Google Fonts");
    fs.writeFileSync(cached, Buffer.from(await (await fetch(url)).arrayBuffer()));
  }
  return opentype.parse(fs.readFileSync(cached));
}
const font = await loadFont();

// ── the mark: a ticket stub (24-unit box) with a perforation cut out ──
const STUB = "M4 4h16a1 1 0 0 1 1 1v4.2a2.8 2.8 0 0 0 0 5.6V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4.2a2.8 2.8 0 0 0 0-5.6V5a1 1 0 0 1 1-1Z";
const PERF = "M15 6.5v11";
let maskId = 0;
/** The mark at (x, y), `size` tall, perforation as real holes (transparent). */
function mark(x, y, size, fill) {
  const id = `perf${maskId++}`;
  const k = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${k})">
    <mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
      <rect width="24" height="24" fill="#fff"/>
      <path d="${PERF}" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.1 3.2"/>
    </mask>
    <path d="${STUB}" fill="${fill}" mask="url(#${id})"/>
  </g>`;
}
// The stub's drawn area inside the 24 box: x 3..21, y 4..20 (ink bounds), used to trim whitespace.
const STUB_BOX = { x0: 3, y0: 4, x1: 21, y1: 20 };

// ── the wordmark ──
/** SVG path data from opentype commands (its own toPathData emits NaN at some sizes). */
function pathData(p) {
  const n = (v) => {
    if (!Number.isFinite(v)) throw new Error("non-finite coordinate in glyph path");
    return (Math.round(v * 100) / 100).toString();
  };
  return p.commands
    .map((c) => {
      if (c.type === "M" || c.type === "L") return `${c.type}${n(c.x)} ${n(c.y)}`;
      if (c.type === "Q") return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      if (c.type === "C") return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      return "Z";
    })
    .join("");
}
function word(fontSize) {
  // Glyph-by-glyph layout (the font's contextual features aren't supported by opentype.js and aren't
  // needed for five letters): advance widths + the font's pair kerning + -0.03em tracking.
  const scale = fontSize / font.unitsPerEm;
  const glyphs = [..."ShwUp"].map((ch) => font.charToGlyph(ch));
  const p = new opentype.Path();
  let x = 0;
  glyphs.forEach((g, i) => {
    p.extend(g.getPath(x, 0, fontSize));
    const next = glyphs[i + 1];
    x += g.advanceWidth * scale + (next ? font.getKerningValue(g, next) * scale : 0) - 0.03 * fontSize;
  });
  const b = p.getBoundingBox();
  const cap = (font.tables.os2.sCapHeight || 0.7 * font.unitsPerEm) * scale; // baseline is y = 0
  return { d: pathData(p), x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, w: b.x2 - b.x1, h: b.y2 - b.y1, cap };
}

function svg(w, h, body, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${body}</svg>\n`;
}

const files = {};

// Mark alone, trimmed to the stub (square viewBox, small padding).
for (const [name, fill] of [["mark", C.stamp], ["mark-dark", C.stampDark], ["mark-ink", C.ink], ["mark-paper", C.paper]]) {
  const S = 96; // stub drawn 96 units wide-ish
  const k = S / (STUB_BOX.x1 - STUB_BOX.x0);
  const size = 24 * k;
  const pad = 8;
  const W = S + pad * 2;
  files[`${name}.svg`] = svg(W, W, mark(pad - STUB_BOX.x0 * k, (W - (STUB_BOX.y1 - STUB_BOX.y0) * k) / 2 - STUB_BOX.y0 * k, size, fill));
}

// Wordmark alone.
for (const [name, fill] of [["wordmark-ink", C.ink], ["wordmark-paper", C.paper]]) {
  const t = word(100);
  const pad = 4;
  files[`${name}.svg`] = svg(Math.ceil(t.w + pad * 2), Math.ceil(t.h + pad * 2), `<path transform="translate(${pad - t.x1} ${pad - t.y1})" d="${t.d}" fill="${fill}"/>`);
}

// Horizontal lockup: mark + wordmark, capitals centred on the stub; canvas fits both shapes exactly.
function horizontal(markFill, textFill) {
  const H = 100; // stub ink height
  const k = H / (STUB_BOX.y1 - STUB_BOX.y0);
  const size = 24 * k;
  const t0 = word(100);
  const t = word((100 * 0.9 * H) / t0.cap); // capitals ≈ 90% of the stub's height, as in the site header
  const gap = H * 0.42;
  const stubW = (STUB_BOX.x1 - STUB_BOX.x0) * k;
  const pad = 6;
  // Vertical extents relative to the stub's top (y = 0): stub 0..H; text baseline at H/2 + cap/2.
  const baseline = H / 2 + t.cap / 2;
  const top = Math.min(0, baseline + t.y1);
  const bottom = Math.max(H, baseline + t.y2);
  const height = Math.ceil(bottom - top + pad * 2);
  const stubTop = pad - top;
  const markX = pad - STUB_BOX.x0 * k;
  const markY = stubTop - STUB_BOX.y0 * k;
  const textX = pad + stubW + gap - t.x1;
  const textY = stubTop + baseline;
  const width = Math.ceil(pad + stubW + gap + t.w + pad);
  return svg(width, height, mark(markX, markY, size, markFill) + `<path transform="translate(${textX} ${textY})" d="${t.d}" fill="${textFill}"/>`);
}
files["lockup-light.svg"] = horizontal(C.stamp, C.ink); // for light backgrounds
files["lockup-dark.svg"] = horizontal(C.stampDark, C.paper); // for dark backgrounds
files["lockup-ink.svg"] = horizontal(C.ink, C.ink);
files["lockup-paper.svg"] = horizontal(C.paper, C.paper);

// Stacked lockup: mark above wordmark, centred.
function stacked(markFill, textFill) {
  const H = 120;
  const k = H / (STUB_BOX.y1 - STUB_BOX.y0);
  const size = 24 * k;
  const stubW = (STUB_BOX.x1 - STUB_BOX.x0) * k;
  const t = word(120);
  const gap = H * 0.35;
  const pad = 8;
  const width = Math.ceil(Math.max(stubW, t.w) + pad * 2);
  const height = Math.ceil(pad + H + gap + t.h + pad);
  const markX = (width - stubW) / 2 - STUB_BOX.x0 * k;
  const markY = pad - STUB_BOX.y0 * k;
  const textX = (width - t.w) / 2 - t.x1;
  const textY = pad + H + gap - t.y1;
  return svg(width, height, mark(markX, markY, size, markFill) + `<path transform="translate(${textX} ${textY})" d="${t.d}" fill="${textFill}"/>`);
}
files["stacked-light.svg"] = stacked(C.stamp, C.ink);
files["stacked-dark.svg"] = stacked(C.stampDark, C.paper);

// App icon: the stub on ink, rounded square (platforms apply their own masks to the PNG).
{
  const W = 1024;
  const H = W * 0.5;
  const k = H / (STUB_BOX.y1 - STUB_BOX.y0);
  const size = 24 * k;
  const stubW = (STUB_BOX.x1 - STUB_BOX.x0) * k;
  files["app-icon.svg"] = svg(W, W, mark((W - stubW) / 2 - STUB_BOX.x0 * k, (W - H) / 2 - STUB_BOX.y0 * k, size, C.stamp), C.ink);
}

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), content);
  // PNG exports: lockups at 2× of an 80px-high use, marks/icons at 1024.
  const base = name.replace(/\.svg$/, "");
  const isSquare = /^(mark|app-icon)/.test(base);
  const png = new Resvg(content, { fitTo: isSquare ? { mode: "width", value: 1024 } : { mode: "height", value: 320 } }).render().asPng();
  fs.writeFileSync(path.join(OUT, "png", `${base}.png`), png);
}
console.log(Object.keys(files).join("\n"));
