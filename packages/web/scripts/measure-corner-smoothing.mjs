// Measures the web's corner smoothing (src/styles/shape.ts) — Chromium's `border-radius: r·m; corner-shape:
// superellipse(k)` — against Figma's corner-smoothing construction (the figma-squircle formulas, MIT, drawn as an SVG
// path in the same browser) and against the CoreGraphics reference masks of
// packages/flutter/tool/continuous_corner_reference.swift (8×, 1600×800 a8, box at (10,10)):
//
//   swiftc -O ../flutter/tool/continuous_corner_reference.swift -o /tmp/ccref && /tmp/ccref <refdir>
//   node scripts/measure-corner-smoothing.mjs <refdir> 180x80-r20 0.6 1.24:1.38     # the shipped pair at 0.6
//   node scripts/measure-corner-smoothing.mjs <refdir> 180x80-r20 0.6 grid          # search (m, k) against Figma's path
//   PRESERVE=1 …                                                                  # figma-squircle's preserveSmoothing
//
// Prints the area of the symmetric difference in logical px² (Δfigma, Δcirc, Δcont). Run from packages/web.
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const [refDir, shape, sArg, ...rest] = process.argv.slice(2);
const [w, h, r] = shape.match(/(\d+)x(\d+)-r(\d+)/).slice(1).map(Number);
const s = Number(sArg);
const SCALE = 8;
const ref = (name) => { try { return new Uint8Array(fs.readFileSync(`${refDir}/${name}-${shape}.a8`)); } catch { return null; } };
const continuous = ref('apple-continuous');
const circular = ref('apple-circular');

const rad = (deg) => (deg * Math.PI) / 180;
/** figma-squircle `getPathParamsForCorner` (preserveSmoothing: false): the budget clamps p and the smoothing. */
function cornerParams(radius, smoothing, budget, preserve = process.env.PRESERVE === '1') {
  radius = Math.min(radius, budget);
  let p = (1 + smoothing) * radius;
  if (!preserve) {
    const maxSmoothing = budget / radius - 1;
    smoothing = Math.min(smoothing, maxSmoothing);
    p = Math.min(p, budget);
  }
  const arcMeasure = 90 * (1 - smoothing);
  const arcSectionLength = Math.sin(rad(arcMeasure / 2)) * radius * Math.SQRT2;
  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4Distance = radius * Math.tan(rad(angleAlpha / 2));
  const angleBeta = 45 * smoothing;
  const c = p3ToP4Distance * Math.cos(rad(angleBeta));
  const d = c * Math.tan(rad(angleBeta));
  let b = (p - arcSectionLength - c - d) / 3;
  let a = 2 * b;
  if (preserve && p > budget) {
    const p1ToP3MaxDistance = budget - d - arcSectionLength - c;
    const minA = p1ToP3MaxDistance / 6;
    const maxB = p1ToP3MaxDistance - minA;
    b = Math.min(b, maxB);
    a = p1ToP3MaxDistance - b;
    p = Math.min(p, budget);
  }
  return { a, b, c, d, p, arc: arcSectionLength, radius };
}
export function figmaPath(width, height, radius, smoothing) {
  const budget = Math.min(width, height) / 2;
  const q = cornerParams(radius, smoothing, budget);
  const { a, b, c, d, p, arc, radius: R } = q;
  const f = (n) => +n.toFixed(4);
  const A = `a ${f(R)} ${f(R)} 0 0 1`;
  return [
    `M ${f(width - p)} 0`,
    `c ${f(a)} 0 ${f(a + b)} 0 ${f(a + b + c)} ${f(d)} ${A} ${f(arc)} ${f(arc)} c ${f(d)} ${f(c)} ${f(d)} ${f(b + c)} ${f(d)} ${f(a + b + c)}`,
    `L ${f(width)} ${f(height - p)}`,
    `c 0 ${f(a)} 0 ${f(a + b)} ${f(-d)} ${f(a + b + c)} ${A} ${f(-arc)} ${f(arc)} c ${f(-c)} ${f(d)} ${f(-(b + c))} ${f(d)} ${f(-(a + b + c))} ${f(d)}`,
    `L ${f(p)} ${f(height)}`,
    `c ${f(-a)} 0 ${f(-(a + b))} 0 ${f(-(a + b + c))} ${f(-d)} ${A} ${f(-arc)} ${f(-arc)} c ${f(-d)} ${f(-c)} ${f(-d)} ${f(-(b + c))} ${f(-d)} ${f(-(a + b + c))}`,
    `L 0 ${f(p)}`,
    `c 0 ${f(-a)} 0 ${f(-(a + b))} ${f(d)} ${f(-(a + b + c))} ${A} ${f(arc)} ${f(-arc)} c ${f(c)} ${f(-d)} ${f(b + c)} ${f(-d)} ${f(a + b + c)} ${f(-d)}`,
    'Z',
  ].join(' ');
}

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: SCALE, viewport: { width: 200, height: 100 } });
const page = await context.newPage();

async function coverageOf(body) {
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:#fff}#b{position:absolute;left:10px;top:10px;width:${w}px;height:${h}px}</style></head><body>${body}</body></html>`);
  const png = await page.screenshot({ scale: 'device', clip: { x: 0, y: 0, width: 200, height: 100 } });
  const data = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const out = new Array(c.width * c.height);
    for (let i = 0; i < out.length; i++) out[i] = 255 - d[i * 4];
    return out;
  }, png.toString('base64'));
  return Uint8Array.from(data);
}
const box = (m, k) => coverageOf(`<div id="b" style="background:#000;border-radius:${r * m}px;corner-shape:superellipse(${k})"></div>`);
const svg = (d) => coverageOf(`<svg id="b" viewBox="0 0 ${w} ${h}"><path d="${d}" fill="#000"/></svg>`);

const diff = (a, b) => { let t = 0; for (let i = 0; i < a.length; i++) t += Math.abs(a[i] - b[i]); return t / 255 / (SCALE * SCALE); };
const area = (a) => a.reduce((t, v) => t + v, 0) / 255 / (SCALE * SCALE);
const vs = (cov, target) => (target ? diff(cov, target).toFixed(3) : '-');

const figma = await svg(figmaPath(w, h, r, s));
console.log(`figma s=${s}: area ${area(figma).toFixed(2)} Δcirc ${vs(figma, circular)} Δcont ${vs(figma, continuous)}`);
const report = async (m, k) => {
  const cov = await box(m, k);
  const dv = diff(cov, figma);
  console.log(`m=${m} k=${k}: area ${area(cov).toFixed(2)} Δfigma ${dv.toFixed(3)} Δcirc ${vs(cov, circular)} Δcont ${vs(cov, continuous)}`);
  return dv;
};
if (rest[0] === 'grid') {
  let best = { d: Infinity };
  const search = async (ms, ks) => {
    for (const m of ms) for (const k of ks) {
      const cov = await box(m, k);
      const d = diff(cov, figma);
      if (d < best.d) best = { d, m, k };
    }
  };
  const range = (from, to, step) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => +(from + i * step).toFixed(4));
  await search(range(1, 1.6, 0.1), range(1, 2.4, 0.1));
  console.log('coarse', best);
  await search(range(best.m - 0.08, best.m + 0.08, 0.02), range(best.k - 0.08, best.k + 0.08, 0.02));
  console.log('fine', best);
  await report(best.m, best.k);
} else {
  for (const spec of rest) {
    const [m, k] = spec.split(':').map(Number);
    await report(m, k);
  }
}
await browser.close();
