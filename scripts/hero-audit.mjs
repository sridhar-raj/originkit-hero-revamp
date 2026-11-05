#!/usr/bin/env node
// Hero audit: measures the first screen of a page, at desktop and phone size, so a revamp starts from facts
// and can prove what it changed.
//
//   node <skill>/scripts/hero-audit.mjs <url | file.html> [--out <dir>] [--selector "<hero css>"]
//        [--src <folder>] [--throttle] [--desktop 1440x900] [--phone 390x844]
//
//   --out       folder for audit.json and the first-screen screenshots (default ./hero-audit)
//   --selector  the hero element (default: the section/header that holds the first h1, else the first screen)
//   --src       the hero's source folder or file: also runs the static checks (Next.js and Tailwind traps)
//   --throttle  Slow 4G + 4x CPU slowdown for the LCP and CLS pass (what a mid-range phone on mobile data sees)
//   --runs N    load each view N times and report the median LCP / CLS / TBT / FCP (use 5 for before/after proof)
// Measure a production build (next build && next start): next dev inflates LCP and long tasks; the audit warns.
//
// Writes <out>/audit.json (read by hero-compare.mjs), desktop.png and phone.png. Prints PASS / WARN / FAIL lines.
// Needs Playwright (Chromium) in the current project. Exit code 1 when anything is FAIL.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--out", "--selector", "--src", "--desktop", "--phone", "--runs"]);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
let target = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
if (!target) { console.error('usage: hero-audit.mjs <url | file.html> [--out dir] [--selector "<css>"] [--src folder] [--throttle]'); process.exit(2); }
if (!/^https?:|^file:/.test(target) && existsSync(target)) target = pathToFileURL(resolve(target)).href;
const outDir = resolve(opt("--out", "hero-audit"));
const selector = opt("--selector", null);
const src = opt("--src", null);
const throttle = args.includes("--throttle");
const runs = Math.max(1, Number(opt("--runs", 1)) || 1);
const median = (a) => { const v = a.filter((x) => x != null).sort((m, n) => m - n); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
const size = (s, d) => { const [w, h] = String(opt(s, d)).split("x").map(Number); return { width: w, height: h }; };
const SIZES = { desktop: size("--desktop", "1440x900"), phone: size("--phone", "390x844") };

let chromium;
try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright")); }
catch { console.error("Playwright isn't installed in this project. Run: pnpm add -D playwright"); process.exit(2); }
mkdirSync(outDir, { recursive: true });

const findings = [];
const add = (level, view, msg) => findings.push({ level, view, msg });

// ------------------------------------------------------------------------------------------- in-page code

// Runs before any page script: records LCP candidates and layout shifts from the very first paint.
const OBSERVE = () => {
  window.__hr = { lcp: [], cls: 0, shifts: [], longTasks: [] };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const el = e.element;
        window.__hr.lcp.push({ t: Math.round(e.startTime), size: e.size, url: e.url || "", tag: el?.tagName?.toLowerCase() || "",
          text: el && !e.url ? (el.textContent || "").trim().slice(0, 60) : "", id: el ? (el.__hrId ??= Math.random().toString(36).slice(2)) : "" });
        if (el) el.dataset.hrLcp = el.__hrId;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__hr.cls += e.value; window.__hr.shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4) }); }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__hr.longTasks.push({ s: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true });
  } catch { /* old engine */ }
};

// Reads the hero once the page has settled.
const INSPECT = (sel) => {
  const vw = innerWidth, vh = innerHeight;
  const cs = (el) => getComputedStyle(el);
  const visible = (el) => { const r = el.getBoundingClientRect(), s = cs(el); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05; };
  const h1s = [...document.querySelectorAll("h1")].filter(visible);
  let hero = sel ? document.querySelector(sel) : null;
  if (!hero && h1s[0]) hero = h1s[0].closest("section, header, [class*=hero i], main > div") || h1s[0].parentElement;
  const heroRect = hero ? hero.getBoundingClientRect() : { top: 0, left: 0, width: vw, height: vh, bottom: vh, right: vw };
  const inFirstScreen = (el) => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0; };

  // headline: the first-screen h1; without one, the largest heading in the first screen (still flagged)
  const h1 = h1s.find(inFirstScreen) || null;
  const h = h1 || [...document.querySelectorAll("h2, h3, [role=heading]")].filter((e) => visible(e) && inFirstScreen(e)).sort((a, b) => parseFloat(cs(b).fontSize) - parseFloat(cs(a).fontSize))[0] || null;
  const lines = (el) => { const range = document.createRange(); range.selectNodeContents(el); const tops = new Set([...range.getClientRects()].filter((r) => r.width > 2).map((r) => Math.round(r.top))); return tops.size; };
  const headline = h ? {
    tag: h.tagName.toLowerCase(), isH1: !!h1,
    text: h.textContent.trim().replace(/\s+/g, " "), words: h.textContent.trim().split(/\s+/).length, chars: h.textContent.trim().length,
    lines: lines(h), fontSize: parseFloat(cs(h).fontSize), weight: cs(h).fontWeight, lineHeight: cs(h).lineHeight, letterSpacing: cs(h).letterSpacing,
    font: cs(h).fontFamily.split(",")[0].replace(/["']/g, ""), top: Math.round(h.getBoundingClientRect().top), bottom: Math.round(h.getBoundingClientRect().bottom),
  } : null;

  // subhead: the first visible paragraph after the h1 inside the hero
  let sub = null;
  if (h) {
    const scope = hero || document.body;
    const ps = [...scope.querySelectorAll("p")].filter((p) => visible(p) && inFirstScreen(p) && (h.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) && p.textContent.trim().split(/\s+/).length >= 6);
    const p = ps[0];
    if (p) { const r = p.getBoundingClientRect(); const fs = parseFloat(cs(p).fontSize); sub = { text: p.textContent.trim().replace(/\s+/g, " ").slice(0, 220), words: p.textContent.trim().split(/\s+/).length, fontSize: fs, lines: lines(p), charsPerLine: Math.round(p.textContent.trim().length / Math.max(1, lines(p))), bottom: Math.round(r.bottom) }; }
  }

  // CTAs: links and buttons in the first screen that look like buttons (padding + background or border)
  const toRgb = (c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = "#000"; x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
  const bgOf = (el) => { for (let a = el; a; a = a.parentElement) { const c = toRgb(cs(a).backgroundColor); if (c[3] > 0.6) return c; } return null; };
  const ctas = [...document.querySelectorAll("a, button, [role=button]")].filter((el) => {
    if (!visible(el) || !inFirstScreen(el)) return false;
    const s = cs(el), r = el.getBoundingClientRect();
    const filled = toRgb(s.backgroundColor)[3] > 0.3 || parseFloat(s.borderTopWidth) > 0 || s.backgroundImage !== "none";
    const padded = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) >= 16;
    const inHero = !hero || hero.contains(el);
    const inNav = !!el.closest("nav, header nav, [role=navigation]");
    return filled && padded && r.height >= 24 && inHero && !inNav && el.textContent.trim().length > 1 && el.textContent.trim().length < 40;
  }).filter((el, i, all) => {
    // the same CTA drawn twice in one place (a before/after split, a duplicated layer) counts once
    const r = el.getBoundingClientRect(), key = el.textContent.trim() + Math.round(r.left) + "," + Math.round(r.top);
    return all.findIndex((o) => { const q = o.getBoundingClientRect(); return o.textContent.trim() + Math.round(q.left) + "," + Math.round(q.top) === key; }) === i;
  }).map((el) => {
    const r = el.getBoundingClientRect(), s = cs(el), bg = bgOf(el), fg = toRgb(s.color);
    const ghost = toRgb(s.backgroundColor)[3] < 0.3 && s.backgroundImage === "none";   // outline only: reads as weak (NN/g)
    return { label: el.textContent.trim().replace(/\s+/g, " "), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom),
      contrast: bg ? ratio(fg, bg) : null, fontSize: parseFloat(s.fontSize), ghost };
  });

  // media in the hero / first screen
  const media = [...document.querySelectorAll("img, video, canvas, picture source, svg image")].filter((el) => el.tagName !== "SOURCE" ? visible(el) && inFirstScreen(el) : false).map((el) => {
    const r = el.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    if (el.tagName === "IMG") return { kind: "img", src: (el.currentSrc || el.src).slice(0, 160), natural: [el.naturalWidth, el.naturalHeight], rendered: [Math.round(r.width), Math.round(r.height)],
      loading: el.getAttribute("loading"), fetchpriority: el.getAttribute("fetchpriority"), sizes: el.getAttribute("sizes"), nextImage: el.hasAttribute("data-nimg"), alt: el.getAttribute("alt"),
      oversize: el.naturalWidth > r.width * dpr * 1.6 && el.naturalWidth > 800, area: Math.round((r.width * r.height) / (vw * vh) * 100) };
    if (el.tagName === "VIDEO") return { kind: "video", src: (el.currentSrc || "").slice(0, 160), autoplay: el.autoplay, muted: el.muted, playsinline: el.playsInline, loop: el.loop, poster: !!el.poster, preload: el.preload,
      paused: el.paused, area: Math.round((r.width * r.height) / (vw * vh) * 100) };
    return { kind: el.tagName.toLowerCase(), area: Math.round((r.width * r.height) / (vw * vh) * 100) };
  });
  const pauseControl = !!document.querySelector("[aria-label*=pause i], [aria-label*=play i], button[title*=pause i]");

  // structure
  const structure = { h1Count: h1s.length, headlineIsFirstHeading: !!h && document.querySelector("h1, h2, h3") === h,
    heroHeight: Math.round(heroRect.height), viewportHeight: vh, heroFillsScreen: heroRect.height >= vh * 0.98,
    carousel: !!(hero || document.body).querySelector("[class*=swiper i], [class*=carousel i], [class*=slick i], [aria-roledescription=carousel]") };
  const ctaBelowFold = ctas.length ? ctas.every((c) => c.top > vh) : null;
  return { vw, vh, heroSelector: hero ? (hero.id ? `#${hero.id}` : hero.tagName.toLowerCase() + (hero.className && typeof hero.className === "string" ? "." + hero.className.trim().split(/\s+/)[0] : "")) : null,
    headline, sub, ctas, media, pauseControl, structure, ctaBelowFold };
};

// Worst-pixel contrast of a text element over what's really behind it (text hidden, page screenshotted).
async function textContrast(page, sel) {
  const box = await page.evaluate((sel) => {
    const first = (q) => [...document.querySelectorAll(q)].filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.width > 1; });
    const el = first("h1")[0] || first("h2, h3").sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0] || null;
    if (!el) return null;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const x = document.createElement("canvas").getContext("2d"); x.fillStyle = "#000"; x.fillStyle = cs.color; x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    // hide every copy of the same text (a page can draw it twice: a before/after split, a duplicated layer)
    const txt = el.textContent.trim();
    for (const o of document.querySelectorAll("h1, h2, h3, [role=heading]")) if (o.textContent.trim() === txt) o.dataset.hrHide = "";
    return { x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)), w: Math.ceil(Math.min(r.width, innerWidth - r.left)), h: Math.ceil(Math.min(r.height, innerHeight - r.top)), color: [d[0], d[1], d[2], d[3] / 255] };
  }, sel);
  if (!box || box.w < 2 || box.h < 2) return null;
  await page.addStyleTag({ content: "[data-hr-hide],[data-hr-hide] *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}" });
  await page.waitForTimeout(80);
  const png = (await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } })).toString("base64");
  const worst = await page.evaluate(async ({ png, color }) => {
    const img = new Image(); img.src = "data:image/png;base64," + png; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r, g, b) => 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    // 2nd-percentile pixel, not the single worst: a hairline or a divider crossing the text (or anti-aliasing)
    // shouldn't decide the score, while a busy photo behind the words still does
    const rs = [];
    for (let i = 0; i < d.length; i += 8) {
      const bg = [d[i], d[i + 1], d[i + 2]], a = color[3];
      const fg = color.slice(0, 3).map((v, k) => a * v + (1 - a) * bg[k]);
      const l1 = L(...fg), l2 = L(...bg);
      rs.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
    }
    rs.sort((m, n) => m - n);
    return +rs[Math.floor(rs.length * 0.02)].toFixed(2);
  }, { png, color: box.color });
  await page.evaluate(() => { for (const e of document.querySelectorAll("[data-hr-hide]")) delete e.dataset.hrHide; });
  return worst;
}

// ------------------------------------------------------------------------------------------- run

const browser = await chromium.launch();
const report = { target, at: new Date().toISOString(), throttle, views: {}, static: [] };

for (const [view, vp] of Object.entries(SIZES)) {
 const perfRuns = [];
 for (let run = 0; run < runs; run++) {
  const last = run === runs - 1;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: view === "phone" ? 3 : 2, isMobile: view === "phone", hasTouch: view === "phone" });
  const page = await ctx.newPage();
  await page.addInitScript(OBSERVE);
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const bytes = { total: 0, images: 0, video: 0, fonts: 0, scripts: 0, css: 0 };
  page.on("response", async (r) => {
    try {
      const len = Number(r.headers()["content-length"] || 0) || (await r.body().catch(() => Buffer.alloc(0))).length;
      const t = r.request().resourceType();
      bytes.total += len;
      if (t === "image") bytes.images += len; else if (t === "media") bytes.video += len; else if (t === "font") bytes.fonts += len; else if (t === "script") bytes.scripts += len; else if (t === "stylesheet") bytes.css += len;
    } catch { /* gone */ }
  });
  const t0 = Date.now();
  await page.goto(target, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(throttle ? 6000 : 2500);
  const loadMs = Date.now() - t0;

  let perf = await page.evaluate(() => {
    const h = window.__hr || { lcp: [], cls: 0, shifts: [] };
    const last = h.lcp[h.lcp.length - 1] || null;
    const el = last?.id ? document.querySelector(`[data-hr-lcp="${last.id}"]`) : null;
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const blocking = performance.getEntriesByType("resource").filter((r) => r.renderBlockingStatus === "blocking").map((r) => r.name.split("/").pop().slice(0, 60));
    const f = fcp ? fcp.startTime : 0;
    const tbt = Math.round(h.longTasks.filter((t) => t.s > f).reduce((a, t) => a + Math.max(0, t.d - 50), 0));
    const dev = !!document.querySelector("nextjs-portal, [data-nextjs-toast], script[src*='react-refresh'], script[src*='webpack-hmr']") || !!window.__NEXT_HMR_CB || /turbopack-hmr|_next\/static\/chunks\/.*hmr/.test([...document.scripts].map((s) => s.src).join(" "));
    return { lcp: last, lcpInFirstScreen: el ? el.getBoundingClientRect().top < innerHeight : null, cls: +h.cls.toFixed(3), shifts: h.shifts.slice(0, 8),
      fcp: fcp ? Math.round(fcp.startTime) : null, ttfb: nav ? Math.round(nav.responseStart) : null, tbt, renderBlocking: blocking, dev };
  });
  perfRuns.push(perf);
  if (!last) { await ctx.close(); continue; }
  if (runs > 1) perf = { ...perf, lcp: perf.lcp && { ...perf.lcp, t: median(perfRuns.map((p) => p.lcp?.t)) }, cls: median(perfRuns.map((p) => p.cls)), tbt: median(perfRuns.map((p) => p.tbt)), fcp: median(perfRuns.map((p) => p.fcp)), runs: perfRuns.map((p) => ({ lcp: p.lcp?.t, cls: p.cls, tbt: p.tbt })) };
  const insp = await page.evaluate(INSPECT, selector);
  const headlineContrast = await textContrast(page, "h1");

  // reduced motion: what keeps moving in the first screen when the visitor asked for less
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(600);
  const motion = await page.evaluate(() => {
    const running = document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getComputedTiming?.().iterations === Infinity || (a.effect?.getComputedTiming?.().duration ?? 0) > 1000));
    const vids = [...document.querySelectorAll("video")].filter((v) => !v.paused && v.getBoundingClientRect().top < innerHeight);
    return { infiniteAnimations: running.length, playingVideos: vids.length };
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: join(outDir, `${view}.png`) });
  report.views[view] = { viewport: vp, loadMs, bytes, perf, ...insp, headlineContrast, motion };
  await ctx.close();
 }
}
await browser.close();

// ------------------------------------------------------------------------------------------- static checks (--src)

if (src) {
  const files = (p) => statSync(p).isFile() ? [p] : readdirSync(p).flatMap((n) => (n === "node_modules" || n.startsWith(".") ? [] : files(join(p, n)))).filter((f) => [".tsx", ".jsx", ".ts", ".js", ".css", ".mdx", ".html"].includes(extname(f)));
  for (const f of files(resolve(src))) {
    const s = readFileSync(f, "utf8"), rel = f.replace(resolve(src) + "/", "");
    const at = (i) => `${rel}:${s.slice(0, i).split("\n").length}`;
    const hit = (re, level, msg) => { for (const m of s.matchAll(re)) report.static.push({ level, where: at(m.index), msg }); };
    hit(/<Image\b[^>]*\bpriority\b/g, "WARN", "next/image `priority` is deprecated in Next.js 16: use `preload` only for the one LCP image, or `loading=\"eager\"` + `fetchPriority=\"high\"`.");
    hit(/\b(h-screen|min-h-screen|100vh)\b/g, "WARN", "100vh / h-screen: on phones the browser toolbar makes it taller than the visible screen (content jumps, CTA cut off). Use h-svh / min-h-svh (100svh), or dvh where it must track the toolbar.");
    hit(/<video\b(?![^>]*\bmuted)[^>]*\bautoPlay/g, "FAIL", "<video autoPlay> without muted: browsers block it. Add muted, playsInline and a poster.");
    hit(/<video\b(?![^>]*\bplaysInline)[^>]*\bautoPlay/g, "WARN", "<video autoPlay> without playsInline: iOS opens it fullscreen.");
    hit(/<video\b(?![^>]*\bposter)[^>]*>/g, "WARN", "<video> without a poster: the first frame is blank until the video loads, and the poster is the usual LCP.");
    hit(/<Image\b(?=[^>]*\bfill\b)(?![^>]*\bsizes=)[^>]*>/g, "WARN", "<Image fill> without sizes: the browser downloads the image at 100vw on every screen.");
    hit(/\b(Swiper|Slider|Carousel|Slick|embla)\b/g, "INFO", "carousel in or near the hero: rotating hero slides are rarely seen past the first slide; prefer one strong message.");
    hit(/fonts\.googleapis\.com/g, "WARN", "Google Fonts CSS link: render-blocking. Use next/font (self-hosted, size-adjusted) instead.");
  }
}

// ------------------------------------------------------------------------------------------- verdicts

for (const [view, v] of Object.entries(report.views)) {
  const p = v.perf;
  if (p.lcp) {
    const lcpLimit = 2500;
    add(p.lcp.t > 4000 ? "FAIL" : p.lcp.t > lcpLimit ? "WARN" : "PASS", view, `LCP ${p.lcp.t} ms (${p.lcp.tag}${p.lcp.url ? " " + p.lcp.url.split("/").pop().slice(0, 40) : p.lcp.text ? ` "${p.lcp.text.slice(0, 30)}"` : ""})${throttle ? ", throttled" : ", unthrottled: re-run with --throttle for a phone on mobile data"}`);
  } else add("WARN", view, "no LCP entry recorded");
  add(p.cls > 0.25 ? "FAIL" : p.cls > 0.1 ? "WARN" : "PASS", view, `CLS ${p.cls}`);
  if (p.tbt != null) add(p.tbt > 600 ? "FAIL" : p.tbt > 200 ? "WARN" : "PASS", view, `total blocking time ${p.tbt} ms${runs > 1 ? ` (median of ${runs})` : ""}`);
  if (p.dev) add("WARN", view, "this looks like a dev server (next dev): LCP and blocking time are inflated. Measure next build && next start for real numbers");
  if (p.lcp && p.lcp.tag === "h1" && p.fcp != null && p.lcp.t - p.fcp > 600) add("WARN", view, `the headline is the LCP and paints ${p.lcp.t - p.fcp} ms after first paint: an entrance animation starting at opacity 0 holds LCP back. Start it visible, animate transform only`);
  if (p.renderBlocking.length) add("WARN", view, `render-blocking: ${p.renderBlocking.slice(0, 4).join(", ")}${p.renderBlocking.length > 4 ? ", …" : ""}`);

  const h = v.headline;
  if (!h) add("FAIL", view, "no heading in the first screen: the page never says what it is");
  else {
    if (!h.isH1) add(v.structure.h1Count ? "WARN" : "FAIL", view, `the hero's headline is an <${h.tag}>, not the page's <h1>${v.structure.h1Count ? "" : " (there is no h1 at all)"}: fine for a section inside a page, wrong for a landing page's first screen`);
    add(v.structure.h1Count > 1 ? "WARN" : "PASS", view, `${v.structure.h1Count} <h1> on the page`);
    add(h.words > 12 ? "WARN" : "PASS", view, `headline: ${h.words} words, ${h.lines} line(s), ${h.fontSize}px "${h.text.slice(0, 50)}"`);
    if (h.lines > 3) add("WARN", view, `headline wraps to ${h.lines} lines: shorten it or reduce the size at this width`);
    if (view === "phone" && h.fontSize < 28) add("WARN", view, `headline ${h.fontSize}px on a phone: too small to lead the screen`);
    if (view === "desktop" && h.fontSize < 40) add("WARN", view, `headline ${h.fontSize}px on desktop: too small to lead the screen (most strong heroes sit at 48-96px)`);
    if (v.headlineContrast != null) {
      const need = h.fontSize >= 24 || (h.fontSize >= 18.66 && Number(h.weight) >= 700) ? 3 : 4.5;   // WCAG large text
      add(v.headlineContrast < need ? "FAIL" : "PASS", view, `headline contrast over its backdrop (2nd-percentile pixel) ${v.headlineContrast}:1, needs ${need}:1`);
    }
  }
  if (!v.sub) add("WARN", view, "no subhead found under the headline: one plain sentence should say what it is and for whom");
  else {
    if (v.sub.words > 30) add("WARN", view, `subhead ${v.sub.words} words: aim for one sentence, ~25 words or fewer`);
    if (v.sub.charsPerLine > 85) add("WARN", view, `subhead ~${v.sub.charsPerLine} characters per line: cap it near 60-75 (max-w-prose or ~36rem)`);
  }
  if (!v.ctas.length) add("FAIL", view, "no call-to-action button in the first screen");
  else {
    add(v.ctas.length > 2 ? "WARN" : "PASS", view, `${v.ctas.length} CTA(s): ${v.ctas.map((c) => `"${c.label}"`).join(", ")}`);
    if (v.ctas[0].ghost) add("WARN", view, `primary CTA "${v.ctas[0].label}" is a ghost (outline-only) button: NN/g found weak signifiers cost 22% more time. Fill the primary; keep ghost for the secondary`);
    if (v.ctas.length && v.ctas.every((c) => /^(learn more|read more|click here|submit|more)$/i.test(c.label))) add("WARN", view, "CTA labels don't name an outcome (\"Learn more\", \"Submit\"): say what happens (\"Start free trial\", \"Get the app\")");
    for (const c of v.ctas) {
      if (c.h < 44 && view === "phone") add("WARN", view, `CTA "${c.label}" is ${c.h}px tall: make touch targets at least 44px`);
      if (c.contrast != null && c.contrast < 4.5) add("WARN", view, `CTA "${c.label}" label contrast ${c.contrast}:1`);
      if (c.bottom > v.vh) add("WARN", view, `CTA "${c.label}" sits below the first screen`);
    }
  }
  if (v.structure.carousel) add("WARN", view, "the hero contains a carousel");
  for (const m of v.media) {
    if (m.kind === "img" && m.oversize) add("WARN", view, `image ${m.natural.join("×")} shown at ${m.rendered.join("×")}: serve a smaller size (sizes / srcset)`);
    if (m.kind === "img" && m.area > 20 && m.loading === "lazy") add("FAIL", view, `large first-screen image is loading="lazy": it delays LCP`);
    if (m.kind === "img" && m.alt == null) add("WARN", view, `first-screen image without alt (use alt="" if decorative)`);
    if (m.kind === "video") {
      if (m.autoplay && !m.muted) add("FAIL", view, "autoplaying video is not muted");
      if (m.autoplay && !m.poster) add("WARN", view, "autoplaying video has no poster");
      if (m.autoplay && m.loop && !v.pauseControl) add("WARN", view, "looping video with no pause control (WCAG 2.2.2: moving content over 5 s needs a way to pause)");
    }
  }
  if (v.motion.infiniteAnimations || v.motion.playingVideos) add("WARN", view, `with reduced motion on, ${v.motion.infiniteAnimations} looping animation(s) and ${v.motion.playingVideos} video(s) still play in the first screen`);
  const mb = (n) => (n / 1048576).toFixed(2);
  add(v.bytes.total > 3 * 1048576 ? "WARN" : "PASS", view, `first load ${mb(v.bytes.total)} MB (images ${mb(v.bytes.images)}, video ${mb(v.bytes.video)}, fonts ${mb(v.bytes.fonts)}, JS ${mb(v.bytes.scripts)})`);
}
for (const s of report.static) findings.push({ level: s.level, view: "src", msg: `${s.where}  ${s.msg}` });

report.findings = findings;
writeFileSync(join(outDir, "audit.json"), JSON.stringify(report, null, 2));
const order = { FAIL: 0, WARN: 1, INFO: 2, PASS: 3 };
for (const f of [...findings].sort((a, b) => order[a.level] - order[b.level])) console.log(`${f.level.padEnd(4)}  ${f.view.padEnd(7)} ${f.msg}`);
const fails = findings.filter((f) => f.level === "FAIL").length, warns = findings.filter((f) => f.level === "WARN").length;
console.log(`\n${fails} fail, ${warns} warn. Wrote ${join(outDir, "audit.json")}, desktop.png, phone.png`);
process.exitCode = fails ? 1 : 0;
