#!/usr/bin/env node
// Before/after report for a hero revamp: reads two hero-audit.mjs output folders and writes one self-contained HTML
// page (inline CSS and JS, works offline; the screenshots are copied next to it and referenced relatively) with:
//   - a scorecard: FAIL / WARN / PASS counts, before → after
//   - per viewport: a before/after drag slider and every metric with its change (green / red arrows)
//   - the LCP breakdown (TTFB, resource load delay, resource load time, element render delay) before and after
//   - the template tells removed (and any still there or added)
//   - the findings fixed, still open and new
// It also prints a Markdown summary for a PR description or a reply, and embeds it in the page with a copy button.
//
//   node <skill>/scripts/hero-compare.mjs <before-dir> <after-dir> [--out report.html]
// Works with audit.json from older versions of the audit (missing fields show as "–").

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const [beforeDir, afterDir] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
if (!beforeDir || !afterDir) { console.error("usage: hero-compare.mjs <before-dir> <after-dir> [--out report.html]"); process.exit(2); }
const outFile = resolve(args.includes("--out") ? args[args.indexOf("--out") + 1] : join(afterDir, "report.html"));
const load = (d) => JSON.parse(readFileSync(join(d, "audit.json"), "utf8"));
const A = load(beforeDir), B = load(afterDir);
// Screenshots are copied next to the report and linked relatively (not embedded), so the page stays light.
const img = (d, v, side) => {
  const f = [`${v}.jpg`, `${v}.png`].map((n) => join(d, n)).find(existsSync);
  if (!f) return "";
  const name = `${side}-${basename(f)}`;
  if (resolve(dirname(outFile), name) !== resolve(f)) copyFileSync(f, join(dirname(outFile), name));
  return name;
};
// never print a local absolute path into the report
const home = homedir();
const safeTarget = (t) => (/^file:/.test(t || "") || (t || "").startsWith(home) ? basename(t) : t || "");

const ORDER = ["desktop", "phone"];
const views = [...new Set([...(B.viewports || Object.keys(B.views)), ...(A.viewports || Object.keys(A.views))])]
  .filter((v) => A.views[v] || B.views[v])
  .sort((a, b) => { const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b); if (ia >= 0 || ib >= 0) return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib); return (B.views[b] || A.views[b]).viewport.width - (B.views[a] || A.views[a]).viewport.width; });

// ------------------------------------------------------------------------------------------- metrics

// [label, getter, better: "lower" | "higher" | "none", format, noise, group]: a change within the noise is reported
// as unchanged (timings vary run to run: 50 ms or 10%, whichever is larger)
const ms = (v) => (v == null ? "–" : `${v} ms`);
const str = (v) => (v == null ? "–" : String(v));
const yes = (v) => (v == null ? "–" : v ? "yes" : "no");
const pct = (v) => (v == null ? "–" : `${v}%`);
const bool = (v) => (v == null ? null : v ? 1 : 0);
const METRICS = [
  ["LCP", (v) => v.perf.lcp?.t, "lower", ms, "time", "Speed"],
  ["  TTFB", (v) => v.perf.lcpBreakdown?.ttfb, "lower", ms, "time", "Speed"],
  ["  Resource load delay", (v) => v.perf.lcpBreakdown?.loadDelay, "lower", ms, "time", "Speed"],
  ["  Resource load time", (v) => v.perf.lcpBreakdown?.loadTime, "lower", ms, "time", "Speed"],
  ["  Element render delay", (v) => v.perf.lcpBreakdown?.renderDelay, "lower", ms, "time", "Speed"],
  ["CLS", (v) => v.perf.cls, "lower", str, 0.01, "Speed"],
  ["First contentful paint", (v) => v.perf.fcp, "lower", ms, "time", "Speed"],
  ["Total blocking time", (v) => v.perf.tbt, "lower", ms, "time", "Speed"],
  ["Actions fully visible after", (v) => v.perf.ctaVisibleAt, "lower", ms, "time", "Speed"],
  ["Render-blocking files", (v) => v.perf.renderBlocking?.length, "lower", str, 0, "Speed"],
  ["Web fonts", (v) => v.fonts?.webFontKB, "lower", (x) => (x == null ? "–" : `${x} KB`), 5, "Speed"],
  ["Font files before first paint", (v) => v.fonts?.beforeFcp, "lower", str, 0, "Speed"],
  ["First-load weight", (v) => (v.bytes ? +(v.bytes.total / 1048576).toFixed(2) : null), "lower", (x) => (x == null ? "–" : `${x} MB`), 0.02, "Speed"],
  ["Frame time p95 (2 s after load)", (v) => v.perf.frames?.p95, "lower", ms, 4, "Motion"],
  ["Long frames (> 50 ms)", (v) => v.perf.frames?.long, "lower", str, 0, "Motion"],
  ["Motion left on under reduced motion", (v) => (v.motion ? v.motion.infiniteAnimations + v.motion.playingVideos : null), "lower", str, 0, "Motion"],
  ["Headline words", (v) => v.headline?.words, "none", (x) => (x == null ? "no h1" : String(x)), 0, "Message"],
  ["Headline lines", (v) => v.layout?.headlineLines ?? v.headline?.lines, "lower", str, 0, "Message"],
  ["Headline size", (v) => v.headline?.fontSize, "none", (x) => (x == null ? "–" : `${x}px`), 0, "Message"],
  ["Headline contrast (2nd-percentile pixel)", (v) => v.headlineContrast, "higher", (x) => (x == null ? "–" : `${x}:1`), 0.1, "Message"],
  ["Subhead words", (v) => v.sub?.words, "none", (x) => (x == null ? "none" : String(x)), 0, "Message"],
  ["CTAs in first screen", (v) => v.ctas?.length, "none", str, 0, "Action"],
  ["Primary CTA visible without scrolling", (v) => bool(v.layout?.ctaFullyVisible), "higher", yes, 0, "Action"],
  ["Smallest CTA height", (v) => (v.ctas?.length ? Math.min(...v.ctas.map((c) => c.h)) : null), "higher", (x) => (x == null ? "–" : `${x}px`), 0, "Action"],
  ["Lowest CTA label contrast", (v) => { const c = (v.ctas || []).map((x) => x.contrast).filter((x) => x != null); return c.length ? Math.min(...c) : null; }, "higher", (x) => (x == null ? "–" : `${x}:1`), 0.1, "Action"],
  ["Horizontal overflow", (v) => v.layout?.overflowPx, "lower", (x) => (x == null ? "–" : `${x}px`), 0, "Layout"],
  ["Visual share of first screen", (v) => v.density?.visualShare, "higher", pct, 2, "Layout"],
  ["Empty share of first screen", (v) => v.density?.emptyShare, "none", pct, 2, "Layout"],
  ["Template tells (heuristic)", (v) => v.tells?.length, "lower", str, 0, "Layout"],
  ["Controls without a name", (v) => v.a11y?.unnamed?.length, "lower", str, 0, "Access"],
  ["Focus visible on primary CTA", (v) => bool(v.a11y?.focus?.visible), "higher", yes, 0, "Access"],
  ["Hero in a landmark", (v) => (v.a11y ? bool(!!v.a11y.landmark) : null), "higher", yes, 0, "Access"],
];
const count = (r, level) => r.findings.filter((f) => f.level === level).length;

const rows = (view) => METRICS.map(([label, get, better, fmt, noise, group]) => {
  const safe = (r) => { try { return r.views[view] ? get(r.views[view]) : null; } catch { return null; } };
  const a = safe(A), b = safe(B);
  let cls = "same", note = "", arrow = "";
  if (a != null && b != null && typeof a === "number" && typeof b === "number" && a !== b) {
    const tol = noise === "time" ? Math.max(50, Math.abs(a) * 0.1) : noise || 0;
    arrow = b > a ? "▲" : "▼";
    if (better === "none") { cls = "neutral"; note = delta(a, b, fmt); }
    else if (Math.abs(b - a) <= tol) { cls = "noise"; note = "within noise"; }
    else { cls = (better === "lower" ? b < a : b > a) ? "up" : "down"; note = delta(a, b, fmt); }
  }
  return { label: label.trim(), sub: label.startsWith("  "), group, a: fmt(a), b: fmt(b), cls, note, arrow };
});
function delta(a, b, fmt) {
  if (fmt === yes) return b ? "now yes" : "now no";
  const d = +(b - a).toFixed(2);
  const unit = fmt === ms ? " ms" : fmt === pct ? " pts" : "";
  const rel = a ? ` (${b > a ? "+" : ""}${Math.round(((b - a) / Math.abs(a)) * 100)}%)` : "";
  return `${d > 0 ? "+" : ""}${d}${unit}${unit === " pts" ? "" : rel}`;
}

// findings: fixed, still open, new (matched per view by id, else by the message with numbers stripped)
const keyOf = (f) => `${f.view}|${f.id || f.msg.replace(/[\d.,]+/g, "#")}`;
const open = (r) => r.findings.filter((f) => f.level === "FAIL" || f.level === "WARN");
const bKeys = new Set(open(B).map(keyOf)), aKeys = new Set(open(A).map(keyOf));
const fixed = open(A).filter((f) => !bKeys.has(keyOf(f)));
const still = open(B).filter((f) => aKeys.has(keyOf(f)));
const added = open(B).filter((f) => !aKeys.has(keyOf(f)));

// template tells, across all viewports
const tellsOf = (r) => { const m = new Map(); for (const [v, x] of Object.entries(r.views)) for (const t of x.tells || []) { if (!m.has(t.id)) m.set(t.id, { ...t, views: [] }); m.get(t.id).views.push(v); } return m; };
const tA = tellsOf(A), tB = tellsOf(B);
const tellRows = [...new Set([...tA.keys(), ...tB.keys()])].map((id) => ({ id, msg: (tA.get(id) || tB.get(id)).msg, before: tA.get(id)?.views || [], after: tB.get(id)?.views || [],
  status: tA.has(id) && !tB.has(id) ? "removed" : tA.has(id) ? "still there" : "new" }));
const TELL_NAMES = { "gradient-word": "Gradient text on one word", "eyebrow-pill": "Eyebrow pill above the h1", "purple-glow": "Purple / indigo glow", "centred-two-buttons": "Centred headline + two equal buttons",
  "grey-logo-strip": "Grey logo strip", "empty-visual": "Empty or small visual slot (< 15%)" };

// ------------------------------------------------------------------------------------------- HTML

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dims = (view) => (B.views[view] || A.views[view]).viewport;
const label = (view) => { const d = dims(view); return `${view === "desktop" ? "Desktop" : view === "phone" ? "Phone" : "Viewport"} · ${d.width}×${d.height}`; };

const slider = (view) => {
  const a = A.views[view] ? img(beforeDir, view, "before") : "", b = B.views[view] ? img(afterDir, view, "after") : "", d = dims(view);
  if (!a || !b) return `<p class="muted">Screenshot missing for ${esc(view)} on one side.</p>`;
  return `<div class="cmp ${d.width < 768 ? "narrow" : ""}" style="--pos:50%;aspect-ratio:${d.width}/${d.height}">
  <img src="${esc(a)}" alt="Before, ${esc(view)} first screen" width="${d.width}" height="${d.height}" decoding="async">
  <img class="after" src="${esc(b)}" alt="After, ${esc(view)} first screen" width="${d.width}" height="${d.height}" decoding="async">
  <span class="tag l">Before</span><span class="tag r">After</span><span class="bar" aria-hidden="true"><span class="knob"></span></span>
  <input type="range" min="0" max="100" value="50" step="0.5" aria-label="Drag to compare before and after (${esc(view)})">
</div>`;
};

const metricTable = (view) => {
  let g = "";
  return `<div class="tw"><table><thead><tr><th>Metric</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>${rows(view).filter((r) => !(r.a === "–" && r.b === "–")).map((r) => {
    const head = r.group !== g ? `<tr class="grp"><th colspan="4">${esc((g = r.group))}</th></tr>` : "";
    return `${head}<tr class="${r.cls}${r.sub ? " sub" : ""}"><td>${esc(r.label)}</td><td>${esc(r.a)}</td><td>${esc(r.b)}</td><td>${r.arrow && r.cls !== "noise" ? `<span class="ar">${r.arrow}</span> ` : ""}${esc(r.note)}</td></tr>`;
  }).join("")}</tbody></table></div>`;
};

const PARTS = [["ttfb", "TTFB"], ["loadDelay", "Load delay"], ["loadTime", "Load time"], ["renderDelay", "Render delay"]];
const lcpBars = (view) => {
  const a = A.views[view]?.perf.lcpBreakdown, b = B.views[view]?.perf.lcpBreakdown;
  if (!a && !b) return `<p class="muted">No LCP breakdown in these audits (re-run hero-audit.mjs to get one).</p>`;
  const tot = (x) => (x ? PARTS.reduce((s, [k]) => s + (x[k] || 0), 0) : 0);
  const max = Math.max(tot(a), tot(b), 1);
  const bar = (x, side) => x ? `<div class="lrow"><span class="lside">${side}</span><div class="lbar" role="img" aria-label="${side}: ${PARTS.map(([k, n]) => `${n} ${x[k]} ms`).join(", ")}">${PARTS.map(([k], i) => `<span class="seg s${i}" style="width:${((x[k] || 0) / max) * 100}%"></span>`).join("")}</div><b>${tot(x)} ms</b></div>
    <p class="lnote">${PARTS.map(([k, n]) => `${n} ${x[k]} ms`).join(" · ")}${x.biggestLabel ? ` · biggest: <b>${esc(x.biggestLabel)}</b>` : ""}</p>` : `<div class="lrow"><span class="lside">${side}</span><span class="muted">not measured</span></div>`;
  return `<div class="lcp"><h4>${esc(label(view))}</h4>${bar(a, "Before")}${bar(b, "After")}</div>`;
};

const LV = { FAIL: 0, WARN: 1 };
const findingList = (list) => list.length ? `<ul class="fl">${[...list].sort((a, b) => LV[a.level] - LV[b.level]).map((f) => `<li><span class="lv ${f.level}">${f.level}</span><span class="fv">${esc(f.view)}</span> ${esc(f.msg)}</li>`).join("")}</ul>` : `<p class="muted">None.</p>`;

const score = (lvl) => { const a = count(A, lvl), b = count(B, lvl); const good = lvl === "PASS" ? b > a : b < a; const d = b - a;
  return `<div class="sc ${lvl}"><span class="k">${lvl === "FAIL" ? "Failures" : lvl === "WARN" ? "Warnings" : "Passes"}</span><span class="v">${a}<i>→</i>${b}</span><span class="d ${d === 0 ? "" : good ? "good" : "bad"}">${d === 0 ? "no change" : `${d > 0 ? "+" : ""}${d}`}</span></div>`; };
const lcpTile = (view) => { const a = A.views[view]?.perf.lcp?.t, b = B.views[view]?.perf.lcp?.t; return `<div class="sc"><span class="k">LCP · ${esc(view)}</span><span class="v sm">${ms(a)}<i>→</i>${ms(b)}</span><span class="d ${a != null && b != null && b < a - Math.max(50, a * 0.1) ? "good" : a != null && b != null && b > a + Math.max(50, a * 0.1) ? "bad" : ""}">${a != null && b != null ? delta(a, b, ms) : "–"}</span></div>`; };

// Markdown summary
const md = [`## Hero revamp: before → after`, ``,
  `| | Before | After |`, `|---|---|---|`, `| Failures | ${count(A, "FAIL")} | ${count(B, "FAIL")} |`, `| Warnings | ${count(A, "WARN")} | ${count(B, "WARN")} |`, `| Passes | ${count(A, "PASS")} | ${count(B, "PASS")} |`, ``];
if (tellRows.length) md.push(`**Template tells** (heuristics): ${tellRows.map((t) => `${TELL_NAMES[t.id] || t.id} ${t.status === "removed" ? "✓ removed" : t.status === "new" ? "✕ new" : "✕ still there"}`).join(" · ")}`, ``);
for (const view of views) {
  const changed = rows(view).filter((r) => r.a !== r.b);
  if (!changed.length) continue;
  md.push(`| ${view} | Before | After | |`, `|---|---|---|---|`);
  for (const r of changed) md.push(`| ${r.sub ? "↳ " : ""}${r.label} | ${r.a} | ${r.b} | ${r.cls === "up" ? "✓ better" : r.cls === "down" ? "✕ worse" : r.cls === "noise" ? "within noise" : ""} |`);
  md.push("");
}
md.push(`Measured with hero-audit.mjs${B.throttle ? " (Slow 4G + 4× CPU)" : " (unthrottled: timings are indicative)"}${B.runs > 1 ? `, median of ${B.runs} loads` : ""}. Template tells and density are heuristics.`);
const mdText = md.join("\n");

const meta = `${esc(safeTarget(A.target))} → ${esc(safeTarget(B.target))} · ${B.throttle ? "throttled: Slow 4G, 4× CPU" : "unthrottled: timings are only indicative"}${B.runs > 1 || B.views.desktop?.perf.runs ? `, median of ${B.runs || B.views.desktop.perf.runs.length} loads` : ""} · ${esc((B.at || "").slice(0, 10))}`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hero revamp report</title>
<style>
:root{--bg:#fafaf9;--card:#fff;--ink:#17181c;--muted:#666b75;--line:#e6e6e3;--soft:#f3f3f1;--good:#13803f;--goodbg:#e8f5ec;--bad:#c0281f;--badbg:#fcebea;--warn:#a15c00;--warnbg:#fdf3e2;
  --s0:#9aa3b2;--s1:#e0a33a;--s2:#4f7ad8;--s3:#d0563f}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-feature-settings:"tnum" 1,"cv11" 1}
main{max-width:1120px;margin:0 auto;padding:48px 20px 96px}
header h1{font-size:clamp(26px,3.2vw,36px);line-height:1.1;letter-spacing:-.02em;margin:0 0 8px;font-weight:650}
.meta{color:var(--muted);margin:0;font-size:14px;overflow-wrap:anywhere}
h2{font-size:20px;letter-spacing:-.01em;margin:56px 0 6px;font-weight:650}h2+p.lead{color:var(--muted);margin:0 0 18px;font-size:14px}
h3{font-size:16px;margin:32px 0 12px;font-weight:600}h4{font-size:14px;margin:0 0 10px;font-weight:600}
.muted{color:var(--muted)}
.scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:28px 0 0}
.sc{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}
.sc .k{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.sc .v{font-size:28px;font-weight:650;letter-spacing:-.02em}.sc .v.sm{font-size:19px;padding:6px 0 3px}.sc .v i{font-style:normal;color:var(--muted);font-weight:400;margin:0 8px}
.sc .d{font-size:13px;color:var(--muted)}.sc .d.good{color:var(--good)}.sc .d.bad{color:var(--bad)}
.sc.FAIL .k{color:var(--bad)}.sc.WARN .k{color:var(--warn)}.sc.PASS .k{color:var(--good)}
nav.toc{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 0}nav.toc a{font-size:13px;color:var(--ink);text-decoration:none;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:4px 12px}
nav.toc a:hover{border-color:#c9c9c4}
.view{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:start}
.view.narrow{grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:28px}
.view .cmp{max-width:980px}
@media (min-width:861px){.view.narrow .cmp{position:sticky;top:16px}}
.cmp{position:relative;width:100%;overflow:hidden;border-radius:12px;border:1px solid var(--line);background:var(--soft);user-select:none;touch-action:pan-y}
.cmp.narrow{max-width:340px}
.cmp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.cmp img.after{clip-path:inset(0 0 0 var(--pos))}
.cmp .bar{position:absolute;top:0;bottom:0;left:var(--pos);width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.18);pointer-events:none}
.cmp .knob{position:absolute;top:50%;left:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25),0 0 0 1px rgba(0,0,0,.08)}
.cmp .knob::before,.cmp .knob::after{content:"";position:absolute;top:50%;width:0;height:0;border:5px solid transparent;margin-top:-5px}
.cmp .knob::before{left:6px;border-right-color:#555}.cmp .knob::after{right:6px;border-left-color:#555}
.cmp .tag{position:absolute;top:10px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;background:rgba(23,24,28,.72);color:#fff;pointer-events:none}
.cmp .tag.l{left:10px}.cmp .tag.r{right:10px}
.cmp input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize}
.cmp:has(input:focus-visible){outline:2px solid #3b6fd8;outline-offset:3px}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th,td{text-align:left;padding:7px 12px;border-bottom:1px solid var(--line);white-space:nowrap}
td:first-child{white-space:normal;min-width:150px;width:46%}
thead th{font-size:12px;color:var(--muted);font-weight:600;background:var(--soft)}
tr.grp th{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);background:var(--card);padding-top:14px;border-bottom:1px solid var(--line)}
tr.sub td:first-child{padding-left:26px;color:var(--muted)}
tbody tr:last-child td{border-bottom:0}
td:last-child{color:var(--muted);font-size:12.5px}
tr.up td:nth-child(3){color:var(--good);font-weight:600}tr.up td:last-child{color:var(--good)}
tr.down td:nth-child(3){color:var(--bad);font-weight:600}tr.down td:last-child{color:var(--bad)}
.ar{font-size:10px}
.lcp{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:0 0 12px}
.lrow{display:grid;grid-template-columns:56px 1fr 72px;gap:10px;align-items:center;font-size:13px}
.lrow b{text-align:right;font-weight:600}.lside{color:var(--muted)}
.lbar{display:flex;height:14px;border-radius:4px;overflow:hidden;background:var(--soft)}
.seg{display:block;height:100%;min-width:0}.seg.s0{background:var(--s0)}.seg.s1{background:var(--s1)}.seg.s2{background:var(--s2)}.seg.s3{background:var(--s3)}
.lnote{margin:4px 0 12px 66px;font-size:12px;color:var(--muted)}
.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:var(--muted);margin:0 0 14px}.legend span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px;background:var(--c)}
.lcps{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:12px}
.tells{display:grid;gap:8px;padding:0;margin:0;list-style:none}
.tells li{display:flex;gap:12px;align-items:baseline;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:11px 14px;font-size:14px}
.st{flex:none;font-size:11.5px;font-weight:600;border-radius:999px;padding:2px 9px}
.st.removed{background:var(--goodbg);color:var(--good)}.st.still{background:var(--warnbg);color:var(--warn)}.st.new{background:var(--badbg);color:var(--bad)}
.tells small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
details{background:var(--card);border:1px solid var(--line);border-radius:12px;margin:0 0 10px}
summary{cursor:pointer;padding:12px 16px;font-weight:600;font-size:14px}summary span{color:var(--muted);font-weight:400}
.fl{list-style:none;margin:0;padding:0 16px 12px}.fl li{font-size:13px;padding:6px 0;border-top:1px solid var(--line);overflow-wrap:anywhere}
.lv{display:inline-block;font-size:10.5px;font-weight:700;border-radius:4px;padding:1px 5px;margin-right:6px}.lv.FAIL{background:var(--badbg);color:var(--bad)}.lv.WARN{background:var(--warnbg);color:var(--warn)}
.fv{color:var(--muted);font-size:12px;margin-right:4px}
.md{position:relative}.md pre{margin:0;background:#17181c;color:#e9eaee;border-radius:12px;padding:16px;font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;overflow:auto;max-height:420px}
.md button{position:absolute;top:10px;right:10px;font:600 12px Inter,system-ui,sans-serif;border:0;border-radius:8px;padding:6px 10px;background:#fff;color:#17181c;cursor:pointer}
.md button:focus-visible{outline:2px solid #3b6fd8;outline-offset:2px}
footer{margin-top:56px;color:var(--muted);font-size:12.5px}
@media (max-width:860px){.view{grid-template-columns:1fr}main{padding:32px 16px 72px}h2{margin-top:44px}}
@media (max-width:480px){.lrow{grid-template-columns:48px 1fr 60px}.lnote{margin-left:0}.sc .v{font-size:24px}.sc .v.sm{font-size:16px}
  th,td{padding:6px 8px}table{font-size:12.5px}td:first-child{min-width:118px}tr.sub td:first-child{padding-left:18px}}
.sc .v.sm{white-space:nowrap}
</style></head><body><main>
<header>
<h1>Hero revamp: before and after</h1>
<p class="meta">${meta}</p>
<div class="scores">${score("FAIL")}${score("WARN")}${score("PASS")}${views.filter((v) => ORDER.includes(v)).map(lcpTile).join("")}</div>
<nav class="toc" aria-label="Sections">${views.map((v) => `<a href="#v-${esc(v)}">${esc(label(v))}</a>`).join("")}<a href="#lcp">LCP breakdown</a><a href="#tells">Template tells</a><a href="#findings">Findings</a><a href="#markdown">Markdown</a></nav>
</header>
${views.map((v) => `<section id="v-${esc(v)}"><h2>${esc(label(v))}</h2><p class="lead">Drag the handle to compare the first screens. Green is better, red is worse; changes within run-to-run noise are marked.</p>
<div class="view${dims(v).width < 768 ? " narrow" : ""}">${slider(v)}${metricTable(v)}</div></section>`).join("\n")}
<section id="lcp"><h2>LCP breakdown</h2><p class="lead">Where the time to the largest paint goes (web.dev subparts). Bars share one scale per viewport.</p>
<div class="legend">${PARTS.map(([, n], i) => `<span style="--c:var(--s${i})">${n}</span>`).join("")}</div>
<div class="lcps">${views.map(lcpBars).join("")}</div></section>
<section id="tells"><h2>Template tells</h2><p class="lead">Heuristics from the DOM, computed styles and the screenshot's colours: judgment calls, reported as warnings, never failures.</p>
${tellRows.length ? `<ul class="tells">${tellRows.map((t) => `<li><span class="st ${t.status === "still there" ? "still" : t.status}">${t.status}</span><div>${esc(TELL_NAMES[t.id] || t.id)}<small>${esc(t.msg)} · ${t.status === "removed" ? `was on ${t.before.join(", ")}` : `on ${t.after.join(", ")}`}</small></div></li>`).join("")}</ul>` : `<p class="muted">No template tells before or after.</p>`}</section>
<section id="findings"><h2>Findings</h2><p class="lead">FAIL and WARN lines matched across the two audits.</p>
<details open><summary>Fixed <span>${fixed.length}</span></summary>${findingList(fixed)}</details>
<details${added.length ? " open" : ""}><summary>New in the after audit <span>${added.length}</span></summary>${findingList(added)}</details>
<details><summary>Still open <span>${still.length}</span></summary>${findingList(still)}</details></section>
<section id="markdown"><h2>For the PR</h2><p class="lead">The same summary as Markdown.</p>
<div class="md"><button type="button" id="copy">Copy</button><pre id="mdtext">${esc(mdText)}</pre></div></section>
<footer>Generated by hero-compare.mjs from two hero-audit.mjs runs. Timings vary between runs; template tells and density are heuristics, not measurements of quality.</footer>
</main>
<script>
for (const c of document.querySelectorAll(".cmp")) {
  const r = c.querySelector("input");
  const set = () => c.style.setProperty("--pos", r.value + "%");
  r.addEventListener("input", set); set();
}
const b = document.getElementById("copy");
b.addEventListener("click", async () => {
  const t = document.getElementById("mdtext").textContent;
  try { await navigator.clipboard.writeText(t); b.textContent = "Copied"; }
  catch { const s = getSelection(), rg = document.createRange(); rg.selectNodeContents(document.getElementById("mdtext")); s.removeAllRanges(); s.addRange(rg); b.textContent = "Selected"; }
  setTimeout(() => (b.textContent = "Copy"), 1600);
});
</script>
</body></html>`;
writeFileSync(outFile, html);

console.log(mdText);
console.log(`\nReport: ${outFile}`);
