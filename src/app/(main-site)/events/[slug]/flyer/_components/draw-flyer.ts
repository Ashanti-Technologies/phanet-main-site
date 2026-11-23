/**
 * Canvas drawing for the "I'm repping Heaven on Earth 2026" flyer.
 * Pure drawing: everything it needs comes in through `FlyerState` and `FlyerAssets`.
 * Layout numbers are in output pixels (1080 wide); the preview canvas is the same size, scaled by CSS.
 */

export type FlyerFormat = "square" | "story";

export const FORMATS = {
  square: { W: 1080, H: 1080, photo: { x: 300, y: 455, r: 205 } },
  story: { W: 1080, H: 1920, photo: { x: 540, y: 600, r: 290 } },
} as const;

export type FlyerState = {
  img: HTMLImageElement | null;
  zoom: number;
  /** Photo offset in photo-diameter units, so one position works for both sizes. */
  ox: number;
  oy: number;
  name: string;
  online: boolean;
};

export type FlyerAssets = {
  logo: HTMLImageElement | null;
  /** Gold title already cut out of the original flyer (transparent WebP). */
  title: HTMLImageElement | null;
  socials: HTMLImageElement | null;
  display: string; // CSS font-family for headings
  body: string; // CSS font-family for small caps text
};

const C = { cream: "#fffaf0", ink: "#351c17", red: "#bc3522" };

/** Largest offset (diameter units) that still keeps the circle covered. */
export function clampOffset(s: Pick<FlyerState, "img" | "zoom">, axis: "x" | "y", v: number) {
  if (!s.img) return 0;
  const cover = Math.max(1 / s.img.width, 1 / s.img.height) * s.zoom;
  const span = (axis === "x" ? s.img.width : s.img.height) * cover;
  const max = Math.max(0, (span - 1) / 2);
  return Math.min(max, Math.max(-max, v));
}

type Ctx = CanvasRenderingContext2D;

const setLS = (ctx: Ctx, px: number) => {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
};

function fitFont(ctx: Ctx, text: string, maxW: number, size: number, weight: number, family: string, min = 18) {
  for (; size > min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
}

function glow(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const STAR = "M50 0 L59 39 L100 50 L59 60 L50 100 L40 60 L0 50 L40 39Z";
function star(ctx: Ctx, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s / 100, s / 100);
  ctx.translate(-50, -50);
  const g = ctx.createLinearGradient(0, 0, 100, 0);
  g.addColorStop(0, "#fff4b4");
  g.addColorStop(0.45, "#e2a322");
  g.addColorStop(1, "#a76414");
  ctx.fillStyle = g;
  ctx.shadowColor = "#f9c65699";
  ctx.shadowBlur = 30;
  ctx.fill(new Path2D(STAR));
  ctx.restore();
}

function background(ctx: Ctx, W: number, H: number) {
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.78, -H * 0.04, W * 0.85, [[0, "rgba(108,209,237,.9)"], [0.35, "rgba(166,227,238,.55)"], [1, "rgba(166,227,238,0)"]]);
  glow(ctx, -W * 0.08, H * 0.78, W * 0.62, [[0, "rgba(128,215,231,.65)"], [1, "rgba(128,215,231,0)"]]);
  // light sweep
  ctx.save();
  ctx.translate(W * 0.62, 0);
  ctx.rotate((26 * Math.PI) / 180);
  const s = ctx.createLinearGradient(-130, 0, 130, 0);
  s.addColorStop(0, "rgba(255,249,221,0)");
  s.addColorStop(0.5, "rgba(255,249,221,.6)");
  s.addColorStop(1, "rgba(255,249,221,0)");
  ctx.fillStyle = s;
  ctx.fillRect(-130, -200, 260, H * 1.6);
  ctx.restore();
  // faint gold rings
  ctx.strokeStyle = "#b5802c";
  ([[0, 3, 0.1], [1, 1, 0.12], [2, 1, 0.14]] as const).forEach(([i, w, a]) => {
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    ctx.setLineDash(i === 1 ? [10, 12] : []);
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.48, W * (0.42 + i * 0.07), 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  // sparkles at fixed positions so every flyer matches
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.3 + 0.5 * Math.sin(i * 1.7) ** 2;
    ctx.fillStyle = i % 3 === 0 ? "#c38323" : "#ffffff";
    ctx.shadowColor = "#f9c656";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc((i * 173 + 29) % W, (i * 237 + 61) % H, 1.5 + (i % 5) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function header(ctx: Ctx, a: FlyerAssets, W: number, top: number, k = 1) {
  const size = 88 * k;
  const gap = 18 * k;
  ctx.font = `800 ${25 * k}px ${a.body}`;
  setLS(ctx, 1);
  const lines = ["PHANEROSIS PRAYER", "NETWORK INTERNATIONAL"];
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const x0 = (W - (size + gap + tw)) / 2;
  if (a.logo) ctx.drawImage(a.logo, x0, top, size, (size * a.logo.height) / a.logo.width);
  ctx.fillStyle = C.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(lines[0], x0 + size + gap, top + 40 * k);
  ctx.fillText(lines[1], x0 + size + gap, top + 72 * k);
  setLS(ctx, 0);
}

function photo(ctx: Ctx, s: FlyerState, a: FlyerAssets, { x, y, r }: { x: number; y: number; r: number }) {
  const ring = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  ring.addColorStop(0, "#fff4b4");
  ring.addColorStop(0.35, "#e2a322");
  ring.addColorStop(0.7, "#a76414");
  ring.addColorStop(1, "#f6d174");
  ctx.save();
  ctx.shadowColor = "rgba(114,66,27,.3)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 22;
  ctx.beginPath();
  ctx.arc(x, y, r + 20, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r + 7, 0, Math.PI * 2);
  ctx.fillStyle = C.cream;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (s.img) {
    const d = 2 * r;
    const k = Math.max(d / s.img.width, d / s.img.height) * s.zoom;
    const w = s.img.width * k;
    const h = s.img.height * k;
    ctx.drawImage(s.img, x - w / 2 + clampOffset(s, "x", s.ox) * d, y - h / 2 + clampOffset(s, "y", s.oy) * d, w, h);
  } else {
    ctx.fillStyle = "#e4f5f8";
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = "#bfe3ea";
    ctx.beginPath();
    ctx.arc(x, y - r * 0.18, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.78, r * 0.66, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5e9aa6";
    ctx.font = `800 ${Math.round(r * 0.12)}px ${a.body}`;
    setLS(ctx, 4);
    ctx.textAlign = "center";
    ctx.fillText("YOUR PHOTO", x, y + r * 0.34);
    setLS(ctx, 0);
  }
  ctx.restore();
}

function tag(ctx: Ctx, a: FlyerAssets, text: string, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-2.5 * Math.PI) / 180);
  ctx.font = `800 ${size}px ${a.body}`;
  setLS(ctx, size * 0.16);
  const w = ctx.measureText(text).width + size * 1.4;
  const h = size * 1.9;
  ctx.fillStyle = C.red;
  ctx.shadowColor = "rgba(114,66,27,.25)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = C.cream;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size * 0.08, 2);
  ctx.restore();
}

function titleArt(ctx: Ctx, a: FlyerAssets, x: number, y: number, w: number) {
  if (!a.title) return;
  ctx.save();
  ctx.shadowColor = "rgba(114,66,27,.22)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 16;
  ctx.drawImage(a.title, x, y, w, (w * a.title.height) / a.title.width);
  ctx.restore();
}

function centerText(ctx: Ctx, text: string, cx: number, y: number, size: number, weight: number, family: string, color: string, maxW: number, spacing = 0) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  setLS(ctx, spacing);
  fitFont(ctx, text, maxW, size, weight, family);
  ctx.fillStyle = color;
  ctx.fillText(text, cx, y);
  setLS(ctx, 0);
}

function nameLine(ctx: Ctx, s: FlyerState, a: FlyerAssets, cx: number, baseline: number, maxW: number, size: number) {
  const name = s.name.trim();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  fitFont(ctx, name || "Your Name", maxW, size, 800, a.display, 40);
  setLS(ctx, -1);
  ctx.fillStyle = name ? C.ink : "rgba(53,28,23,.28)";
  ctx.fillText(name || "Your Name", cx, baseline);
  setLS(ctx, 0);
}

function divider(ctx: Ctx, cx: number, y: number, w: number) {
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, "#b87c1c");
  g.addColorStop(1, "#f6d174");
  ctx.fillStyle = g;
  ctx.fillRect(cx - w / 2, y, w, 5);
}

/** The socials strip cut straight from the original flyer (Facebook/YouTube + X/Instagram). */
function footer(ctx: Ctx, a: FlyerAssets, W: number, H: number) {
  if (!a.socials) return;
  const h = (W * a.socials.height) / a.socials.width;
  ctx.drawImage(a.socials, 0, H - h, W, h);
}

export function drawFlyer(ctx: Ctx, fmt: FlyerFormat, s: FlyerState, a: FlyerAssets) {
  const F = FORMATS[fmt];
  const where = s.online ? "JOINING ONLINE" : "PENTECOST PENSIONS GUEST HOUSE, GBAWE";
  const { W, H } = F;
  ctx.clearRect(0, 0, W, H);
  background(ctx, W, H);
  if (fmt === "square") {
    header(ctx, a, W, 38);
    star(ctx, 70, 230, 60, 0.3);
    star(ctx, 1010, 690, 70, -0.2);
    photo(ctx, s, a, F.photo);
    tag(ctx, a, "I'M REPPING", 790, 262, 30);
    titleArt(ctx, a, 548, 300, 488);
    nameLine(ctx, s, a, W / 2, 770, 960, 88);
    divider(ctx, W / 2, 796, 180);
    centerText(ctx, "IMPACTING WORLDS, TRANSFORMING GENERATIONS", W / 2, 858, 34, 800, a.display, C.red, 980);
    centerText(ctx, `30 DEC 2026 – 3 JAN 2027   |   ${where}`, W / 2, 908, 24, 800, a.body, C.ink, 990, 0.5);
    footer(ctx, a, W, H);
  } else {
    header(ctx, a, W, 120, 1.35);
    star(ctx, 110, 420, 80, 0.3);
    star(ctx, 975, 870, 90, -0.2);
    star(ctx, 120, 1480, 55, 0.5);
    photo(ctx, s, a, F.photo);
    nameLine(ctx, s, a, W / 2, 1012, 980, 116);
    tag(ctx, a, "I'M REPPING", W / 2, 1085, 38);
    titleArt(ctx, a, (W - 680) / 2, 1130, 680);
    centerText(ctx, "IMPACTING WORLDS, TRANSFORMING GENERATIONS", W / 2, 1666, 40, 800, a.display, C.red, 980);
    divider(ctx, W / 2, 1694, 180);
    centerText(ctx, "30 DEC 2026 – 3 JAN 2027", W / 2, 1752, 34, 800, a.body, C.ink, 980, 1);
    centerText(ctx, where, W / 2, 1796, 28, 800, a.body, C.ink, 980, 1);
    footer(ctx, a, W, H);
  }
}
