#!/usr/bin/env node
// Before/after report for a hero revamp: reads two hero-audit.mjs output folders and writes one HTML page with
// the first screens side by side (desktop and phone) and every measurement with its change. Also prints a
// Markdown summary for a PR description or a reply.
//
//   node <skill>/scripts/hero-compare.mjs <before-dir> <after-dir> [--out report.html]

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const [beforeDir, afterDir] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
if (!beforeDir || !afterDir) { console.error("usage: hero-compare.mjs <before-dir> <after-dir> [--out report.html]"); process.exit(2); }
const outFile = resolve(args.includes("--out") ? args[args.indexOf("--out") + 1] : join(afterDir, "report.html"));
const load = (d) => JSON.parse(readFileSync(join(d, "audit.json"), "utf8"));
const A = load(beforeDir), B = load(afterDir);
// Screenshots are copied next to the report and linked (not embedded), so the page stays light.
const img = (d, v, side) => {
  const f = [`${v}.jpg`, `${v}.png`].map((n) => join(d, n)).find(existsSync);
  if (!f) return "";
  const name = `${side}-${basename(f)}`;
  if (resolve(dirname(outFile), name) !== resolve(f)) copyFileSync(f, join(dirname(outFile), name));
  return name;
};

// [label, getter, better: "lower" | "higher" | "none", format, noise]: a change smaller than the noise is reported
// as unchanged (timings vary run to run: 50 ms or 10%, whichever is larger)
const ms = (v) => (v == null ? "–" : `${v} ms`);
const METRICS = [
  ["LCP", (v) => v.perf.lcp?.t, "lower", ms, "time"],
  ["CLS", (v) => v.perf.cls, "lower", (v) => (v == null ? "–" : String(v)), 0.01],
  ["First contentful paint", (v) => v.perf.fcp, "lower", ms, "time"],
  ["Total blocking time", (v) => v.perf.tbt, "lower", ms, "time"],
  ["Render-blocking files", (v) => v.perf.renderBlocking.length, "lower", String],
  ["Headline words", (v) => v.headline?.words, "none", (v) => (v == null ? "no h1" : String(v))],
  ["Headline lines", (v) => v.headline?.lines, "lower", (v) => (v == null ? "–" : String(v))],
  ["Headline size", (v) => v.headline?.fontSize, "none", (v) => (v == null ? "–" : `${v}px`)],
  ["Headline contrast (2nd-percentile pixel)", (v) => v.headlineContrast, "higher", (v) => (v == null ? "–" : `${v}:1`)],
  ["Subhead words", (v) => v.sub?.words, "none", (v) => (v == null ? "none" : String(v))],
  ["CTAs in first screen", (v) => v.ctas.length, "none", String],
  ["Smallest CTA height", (v) => (v.ctas.length ? Math.min(...v.ctas.map((c) => c.h)) : null), "higher", (v) => (v == null ? "–" : `${v}px`)],
  ["Lowest CTA label contrast", (v) => { const c = v.ctas.map((x) => x.contrast).filter((x) => x != null); return c.length ? Math.min(...c) : null; }, "higher", (v) => (v == null ? "–" : `${v}:1`)],
  ["First-load weight", (v) => +(v.bytes.total / 1048576).toFixed(2), "lower", (v) => `${v} MB`],
  ["Motion left on under reduced motion", (v) => v.motion.infiniteAnimations + v.motion.playingVideos, "lower", String],
];
const fails = (r) => r.findings.filter((f) => f.level === "FAIL").length;
const warns = (r) => r.findings.filter((f) => f.level === "WARN").length;

const rows = (view) => METRICS.map(([label, get, better, fmt, noise]) => {
  const a = A.views[view] ? get(A.views[view]) : null, b = B.views[view] ? get(B.views[view]) : null;
  let cls = "", note = "";
  const tol = noise === "time" ? Math.max(50, Math.abs(a || 0) * 0.1) : typeof noise === "number" ? noise : 0;
  if (a != null && b != null && better !== "none" && typeof a === "number" && Math.abs(b - a) <= tol && a !== b) note = "within noise";
  else if (a != null && b != null && better !== "none" && a !== b) {
    const good = better === "lower" ? b < a : b > a;
    cls = good ? "up" : "down";
    if (typeof a === "number" && typeof b === "number" && a) note = `${good ? "" : ""}${b > a ? "+" : ""}${Math.round(((b - a) / Math.abs(a)) * 100)}%`;
  }
  return { label, a: fmt(a), b: fmt(b), cls, note };
});

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const table = (view) => `<table><thead><tr><th>${view}</th><th>Before</th><th>After</th><th></th></tr></thead><tbody>${rows(view).map((r) => `<tr class="${r.cls}"><td>${esc(r.label)}</td><td>${esc(r.a)}</td><td>${esc(r.b)}</td><td>${r.note}</td></tr>`).join("")}</tbody></table>`;
const dims = (r, view) => r.views[view]?.viewport || { width: 16, height: 9 };
const shots = (view) => `<div class="pair ${view}">${[["Before", A, beforeDir, "before"], ["After", B, afterDir, "after"]].map(([label, r, d, side]) =>
  `<figure><img src="${img(d, view, side)}" width="${dims(r, view).width}" height="${dims(r, view).height}" alt="${label}, ${view} first screen" decoding="async"${view === "phone" ? ' loading="lazy"' : ""}><figcaption>${label}</figcaption></figure>`).join("")}</div>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hero revamp: before and after</title>
<style>
:root{color-scheme:light dark;--bg:#f6f6f4;--ink:#16171a;--muted:#5d6068;--line:#dcdcd6;--up:#1d7a3c;--down:#b3261e;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#111214;--ink:#eceef1;--muted:#a1a5ad;--line:#2b2d31;--up:#5fd28a;--down:#ff8a80;--card:#191a1d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1240px;margin:0 auto;padding:40px 20px 80px}h1{font-size:28px;margin:0 0 6px;letter-spacing:-.01em}.meta{color:var(--muted);margin:0 0 28px}
.score{display:flex;gap:16px;flex-wrap:wrap;margin:0 0 32px}.score div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px;min-width:180px}.score b{display:block;font-size:22px}
h2{font-size:18px;margin:40px 0 14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair.phone{grid-template-columns:repeat(2,minmax(0,300px));justify-content:start}
figure{margin:0}figure img{width:100%;height:auto;display:block;border-radius:10px;border:1px solid var(--line)}figcaption{color:var(--muted);font-size:13px;margin-top:6px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:18px}
th,td{text-align:left;padding:9px 14px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}th{font-size:13px;color:var(--muted);font-weight:600;text-transform:capitalize}
tr.up td:nth-child(3){color:var(--up);font-weight:600}tr.down td:nth-child(3){color:var(--down);font-weight:600}td:last-child{color:var(--muted);font-size:13px}
tr.up td:last-child::before{content:"better ";}tr.down td:last-child::before{content:"worse ";}figure img{height:auto}
@media (max-width:700px){.pair{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Hero revamp: before and after</h1>
<p class="meta">${esc(B.target)} · measured with hero-audit.mjs${B.throttle ? " on a throttled phone connection (Slow 4G, 4× CPU)" : " (unthrottled: timings are only indicative)"}${B.views.desktop?.perf.runs ? `, median of ${B.views.desktop.perf.runs.length} loads` : ""} · ${esc(B.at.slice(0, 10))}</p>
<div class="score"><div>Failures<b>${fails(A)} → ${fails(B)}</b></div><div>Warnings<b>${warns(A)} → ${warns(B)}</b></div><div>Desktop LCP<b>${ms(A.views.desktop?.perf.lcp?.t)} → ${ms(B.views.desktop?.perf.lcp?.t)}</b></div></div>
<h2>Desktop</h2>${shots("desktop")}${table("desktop")}
<h2>Phone</h2>${shots("phone")}${table("phone")}
</main></body></html>`;
writeFileSync(outFile, html);

// Markdown summary
const md = [`## Hero revamp: before → after`, ``, `Failures ${fails(A)} → ${fails(B)}, warnings ${warns(A)} → ${warns(B)}.`, ``];
for (const view of ["desktop", "phone"]) {
  md.push(`| ${view} | Before | After |`, `|---|---|---|`);
  for (const r of rows(view)) if (r.a !== r.b) md.push(`| ${r.label} | ${r.a} | ${r.b}${r.cls === "up" ? " ✓" : r.cls === "down" ? " ✕" : ""} |`);
  md.push("");
}
console.log(md.join("\n"));
console.log(`Report: ${outFile}`);
