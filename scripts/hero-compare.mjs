#!/usr/bin/env node
// Before/after report for a hero revamp: reads two hero-audit.mjs output folders and writes one HTML page with
// the first screens side by side (desktop and phone) and every measurement with its change. Also prints a
// Markdown summary for a PR description or a reply.
//
//   node <skill>/scripts/hero-compare.mjs <before-dir> <after-dir> [--out report.html]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const [beforeDir, afterDir] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
if (!beforeDir || !afterDir) { console.error("usage: hero-compare.mjs <before-dir> <after-dir> [--out report.html]"); process.exit(2); }
const outFile = resolve(args.includes("--out") ? args[args.indexOf("--out") + 1] : join(afterDir, "report.html"));
const load = (d) => JSON.parse(readFileSync(join(d, "audit.json"), "utf8"));
const A = load(beforeDir), B = load(afterDir);
const img = (d, v) => { const f = join(d, `${v}.png`); return existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString("base64")}` : ""; };

// [label, getter, better: "lower" | "higher" | "none", format]
const ms = (v) => (v == null ? "–" : `${v} ms`);
const METRICS = [
  ["LCP", (v) => v.perf.lcp?.t, "lower", ms],
  ["CLS", (v) => v.perf.cls, "lower", (v) => (v == null ? "–" : String(v))],
  ["First contentful paint", (v) => v.perf.fcp, "lower", ms],
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

const rows = (view) => METRICS.map(([label, get, better, fmt]) => {
  const a = A.views[view] ? get(A.views[view]) : null, b = B.views[view] ? get(B.views[view]) : null;
  let cls = "", note = "";
  if (a != null && b != null && better !== "none" && a !== b) {
    const good = better === "lower" ? b < a : b > a;
    cls = good ? "up" : "down";
    if (typeof a === "number" && typeof b === "number" && a) note = `${good ? "" : ""}${b > a ? "+" : ""}${Math.round(((b - a) / Math.abs(a)) * 100)}%`;
  }
  return { label, a: fmt(a), b: fmt(b), cls, note };
});

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const table = (view) => `<table><thead><tr><th>${view}</th><th>Before</th><th>After</th><th></th></tr></thead><tbody>${rows(view).map((r) => `<tr class="${r.cls}"><td>${esc(r.label)}</td><td>${esc(r.a)}</td><td>${esc(r.b)}</td><td>${r.note}</td></tr>`).join("")}</tbody></table>`;
const shots = (view) => `<div class="pair ${view}"><figure><img src="${img(beforeDir, view)}" alt="Before, ${view}"><figcaption>Before</figcaption></figure><figure><img src="${img(afterDir, view)}" alt="After, ${view}"><figcaption>After</figcaption></figure></div>`;

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
tr.up td:last-child::before{content:"better ";}tr.down td:last-child::before{content:"worse ";}
@media (max-width:700px){.pair{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Hero revamp: before and after</h1>
<p class="meta">${esc(B.target)} · measured with hero-audit.mjs${B.throttle ? " (throttled: Slow 4G, 4× CPU)" : ""} · ${esc(B.at.slice(0, 16).replace("T", " "))}</p>
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
