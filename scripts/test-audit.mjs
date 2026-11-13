#!/usr/bin/env node
// Tests for hero-audit.mjs: each fixture must produce (or must not produce) certain findings and audit.json
// fields. Run after any edit to the audit, so a change can't quietly turn a failure into a pass.
//
//   node <skill>/scripts/test-audit.mjs
// Needs Playwright (Chromium) in the current project. Exit code 1 if any case misbehaves.
//
// The fixtures are served from a local HTTP server (so fonts, resource timing and response sizes behave as on a
// real site); one case also loads a fixture as a plain file path. A request under /slow/ is answered after 900 ms.
//
//   bad-hero.html       the classic broken hero: busy photo, lazy image, tiny low-contrast type, 4 CTAs (+ --src)
//   template-hero.html  the AI/SaaS template: eyebrow pill, gradient word, purple glow, two equal buttons, grey
//                       logo strip, peeking screenshot; plus a blocking font, an unnamed button, no focus ring,
//                       a janky JS intro, sideways scroll and a wrapping button label on a phone
//   good-hero.html      a rebuilt hero that passes everything at the default viewports

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => join(here, "fixtures", f);

// ---- fixture server
const TYPES = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]), delay = 0;
  if (p.startsWith("/slow/")) { p = p.slice(5); delay = 900; }
  if (p.includes("..")) { res.writeHead(400); return res.end(); }
  try {
    const body = await readFile(join(here, "fixtures", p));
    setTimeout(() => { res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream", "content-length": body.length }); res.end(body); }, delay);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const http = (f) => `http://127.0.0.1:${server.address().port}/${f}`;

const run = (argv) => new Promise((resolveRun) => {
  const p = spawn(process.execPath, [join(here, "hero-audit.mjs"), ...argv], { env: process.env });
  let text = "";
  p.stdout.on("data", (d) => (text += d)); p.stderr.on("data", (d) => (text += d));
  p.on("close", (code) => resolveRun({ code, text }));
});

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const noLocalPaths = (raw) => (raw.includes(homedir()) || /file:\/\//.test(raw) ? ["audit.json records a local absolute path"] : []);

// [name, target, extra args, expected exit (null: any), [must match], [must not match], json check → problems[]]
const CASES = [
  ["bad-hero.html (file path + --src)", fx("bad-hero.html"), ["--src", fx("src-bad")], 1, [
    /FAIL\s+desktop headline contrast/, /FAIL\s+desktop large first-screen image is loading="lazy"/,
    /WARN\s+desktop 2 <h1>/, /WARN\s+phone\s+headline wraps to \d+ lines/, /WARN\s+desktop 4 CTA/,
    /WARN\s+phone\s+CTA "Learn more" is 30px tall/, /WARN\s+desktop subhead \d+ words/, /WARN\s+desktop headline 30px on desktop/,
    /looping animation\(s\)/, /WARN\s+desktop CTA labels don't name an outcome|WARN\s+desktop CTA "Learn more" label contrast/,
    /src\s+Hero\.tsx:\d+\s+next\/image `priority` is deprecated/, /h-screen/, /FAIL\s+src\s+Hero\.tsx:\d+\s+<video autoPlay> without muted/,
    /<Image fill> without sizes/,
    // images: format and srcset of the hero visual
    /WARN\s+desktop hero visual is JPG \(busy-photo\.jpg\)/, /WARN\s+phone\s+hero image has no srcset: every screen downloads the same 3200×2000 file/,
    // landmark
    /WARN\s+desktop the hero isn't inside <main> or <header>/,
  ], [/template tell \(heuristic\)/], (j, raw) => [
    ...noLocalPaths(raw),
    ...(j.target === "bad-hero.html" ? [] : [`target should be the file name, got ${j.target}`]),
    ...(j.views.desktop.visual?.kind === "img" && j.views.desktop.visual.natural[0] === 3200 ? [] : ["visual.natural should be the file's real 3200 px"]),
    ...(j.views.desktop.density.visualShare >= 90 ? [] : [`full-bleed photo should fill the visual share, got ${j.views.desktop.density.visualShare}%`]),
  ]],

  ["template-hero.html", http("template-hero.html"), [], 1, [
    // template tells: all WARN, each named as a heuristic
    /WARN\s+desktop template tell \(heuristic\): gradient text on 1 of 4 headline words \("AI"\)/,
    /WARN\s+desktop template tell \(heuristic\): eyebrow pill above the headline/,
    /WARN\s+desktop template tell \(heuristic\): purple \/ indigo glow: section\.hero::before \(radial gradient\)/,
    /WARN\s+desktop template tell \(heuristic\): centred headline over two equal buttons/,
    /WARN\s+desktop template tell \(heuristic\): grey logo strip of 5 muted items .*placeholder names: Acme, Globex/,
    /WARN\s+desktop template tell \(heuristic\): the visual takes only \d+% of the first screen \(under 15%\)/,
    // viewport layout
    /WARN\s+desktop headline ends on a single word \("AI"\)/, /WARN\s+phone\s+headline ends on a single word \("AI"\)/,
    /WARN\s+phone\s+CTA label "Get started free" wraps onto two lines/,
    /FAIL\s+phone\s+the page scrolls sideways: content is \d+px wider than the 390px screen \(div\.logos/,
    /PASS\s+desktop no horizontal overflow at 1440px/, /PASS\s+desktop primary CTA "Get started free" fully visible without scrolling/,
    // fonts
    /WARN\s+desktop font-display auto\/block on Display: .*FOIT/, /PASS\s+desktop web fonts: 1 file\(s\), 2\d KB, 1 requested before first paint; font-display: block/,
    // images
    /WARN\s+desktop image 700×438 shown at 900×\d+: upscaled/, /WARN\s+desktop image with a w-descriptor srcset but no sizes/, /WARN\s+desktop hero image has no srcset/,
    // LCP breakdown: the text LCP waits for the slow blocking font
    /INFO\s+desktop LCP breakdown: TTFB \d+ ms .*element render delay \d+ ms .*biggest: element render delay \(text LCP: no resource\)/,
    // accessibility
    /FAIL\s+desktop 1 hero control\(s\) without an accessible name: button\.play/, /WARN\s+desktop no visible focus on the primary CTA/,
    /WARN\s+desktop the hero isn't inside <main> or <header>/, /PASS\s+desktop 1 <h1>/,
    // motion
    /WARN\s+desktop frame timing over 2 s after load: p95 \d+(\.\d)? ms, \d+ long frame/,
    // density
    /INFO\s+desktop first-screen density: visual \d+%, text \d+%, empty \d+%/,
  ], [/FAIL.*template tell/, /FAIL\s+\S+\s+(headline ends|CTA label)/], (j, raw) => {
    const d = j.views.desktop, out = noLocalPaths(raw);
    if (!(d.perf.lcpBreakdown?.renderDelay > 700)) out.push(`render delay should carry the 900 ms font wait, got ${d.perf.lcpBreakdown?.renderDelay}`);
    if (!(d.perf.frames.p95 > 34 && d.perf.frames.long >= 2)) out.push(`frames should be janky: ${JSON.stringify(d.perf.frames)}`);
    if (!(d.fonts.foit.includes("Display") && d.fonts.webFontKB > 20)) out.push("fonts.foit / webFontKB");
    if (d.a11y.focus?.reachable !== true || d.a11y.focus.visible !== false) out.push(`a11y.focus ${JSON.stringify(d.a11y.focus)}`);
    if (!(d.colour?.purpleShare >= 3)) out.push(`colour.purpleShare ${d.colour?.purpleShare}`);
    if (!(j.views.phone.layout.overflowPx > 16)) out.push("phone layout.overflowPx");
    if (d.ctas.some((c) => /New:/.test(c.label))) out.push("the eyebrow pill must not count as a CTA");
    const ids = d.tells.map((t) => t.id).sort().join(",");
    if (ids !== "centred-two-buttons,empty-visual,eyebrow-pill,gradient-word,grey-logo-strip,purple-glow") out.push(`tells: ${ids}`);
    if (j.findings.some((f) => f.id?.startsWith("tell:") && f.level !== "WARN")) out.push("a template tell is not WARN");
    return out;
  }],

  ["good-hero.html", http("good-hero.html"), [], 0, [
    /PASS\s+desktop headline: 4 words/, /PASS\s+phone\s+2 CTA\(s\)/, /0 fail, 0 warn/,
    /PASS\s+phone\s+primary CTA "Start free" fully visible without scrolling at 390×844/, /PASS\s+phone\s+no horizontal overflow at 390px/,
    /PASS\s+desktop hero visual format WEBP/, /PASS\s+phone\s+hero image sharp at 2×/,
    /PASS\s+desktop no web fonts loaded/, /PASS\s+desktop all 2 hero link\(s\)\/button\(s\) have an accessible name/,
    /PASS\s+desktop focus visible on the primary CTA \(outline/, /PASS\s+desktop the hero sits in a <main> landmark/,
    /PASS\s+desktop frame timing over 2 s after load: p95/, /PASS\s+desktop no template tells found \(heuristic\)/,
    /INFO\s+desktop LCP breakdown: .*biggest: /, /INFO\s+phone\s+first-screen density: visual \d+%/,
  ], [/FAIL/, /WARN/], (j, raw) => {
    const out = noLocalPaths(raw);
    for (const [name, v] of Object.entries(j.views)) {
      const b = v.perf.lcpBreakdown;
      if (!b || !b.measuredResource) out.push(`${name}: the image LCP should have a measured resource`);
      else if (!near(b.ttfb + b.loadDelay + b.loadTime + b.renderDelay, v.perf.lcp.t, 2)) out.push(`${name}: LCP subparts don't add up to LCP`);
      const D = v.density;
      if (!near(D.visualShare + D.textShare + D.emptyShare, 100, 2) || D.visualShare < 15) out.push(`${name}: density ${JSON.stringify(D)}`);
      if (v.layout.ctaFullyVisible !== true || v.layout.horizontalOverflow) out.push(`${name}: layout`);
      if (v.tells.length) out.push(`${name}: unexpected tells ${v.tells.map((t) => t.id)}`);
    }
    if (j.views.desktop.visual?.natural?.[0] !== 1200) out.push(`desktop visual.natural should be the real 1200 px file, got ${j.views.desktop.visual?.natural}`);
    return out;
  }],

  ["--viewports 360x780,768x1024,1440x900", http("good-hero.html"), ["--viewports", "360x780,768x1024,1440x900"], null, [
    /PASS\s+360x780 primary CTA "Start free" fully visible without scrolling at 360×780/, /PASS\s+768x1024 no horizontal overflow at 768px/,
  ], [/^\w+\s+phone\s/m], (j, raw, out) => {
    const p = [...noLocalPaths(raw)];
    if (Object.keys(j.views).join(",") !== "360x780,768x1024,desktop") p.push(`views ${Object.keys(j.views)}`);
    if (j.viewports.join(",") !== "360x780,768x1024,desktop") p.push(`viewports ${j.viewports}`);
    for (const f of ["360x780.jpg", "768x1024.jpg", "desktop.jpg"]) if (!existsSync(join(out, f))) p.push(`missing ${f}`);
    return p;
  }],

  ["--viewports garbage", http("good-hero.html"), ["--viewports", "big"], 2, [/--viewports: no valid WxH/], [], null],
];

let bad = 0;
for (const [name, target, extra, code, must, mustNot, check] of CASES) {
  const out = mkdtempSync(join(tmpdir(), "hero-audit-test-"));
  const r = await run([target, "--out", out, ...extra]);
  const problems = [];
  if (code != null && r.code !== code) problems.push(`exit ${r.code}, expected ${code}`);
  for (const re of must) if (!re.test(r.text)) problems.push(`missing ${re}`);
  for (const re of mustNot) if (re.test(r.text)) problems.push(`unexpected ${re}`);
  if (check) {
    try { const raw = readFileSync(join(out, "audit.json"), "utf8"); problems.push(...check(JSON.parse(raw), raw, out)); }
    catch (e) { problems.push(`audit.json missing or invalid (${e.message})`); }
  }
  if (problems.length) { bad++; console.log(`FAIL  ${name}\n      ${problems.join("\n      ")}`); } else console.log(`ok    ${name}`);
}
server.close();
console.log(bad ? `\n${bad} audit test(s) failed.` : "\nAll audit tests pass.");
process.exitCode = bad ? 1 : 0;
