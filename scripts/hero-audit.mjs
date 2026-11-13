#!/usr/bin/env node
// Hero audit: measures the first screen of a page, at several viewport sizes, so a revamp starts from facts
// and can prove what it changed.
//
//   node <skill>/scripts/hero-audit.mjs <url | file.html> [--out <dir>] [--selector "<hero css>"]
//        [--src <folder>] [--throttle] [--runs N] [--viewports 360x780,390x844,768x1024,1440x900]
//        [--desktop 1440x900] [--phone 390x844]
//
//   --out        folder for audit.json and the first-screen screenshots (default ./hero-audit)
//   --selector   the hero element (default: the section/header that holds the first h1, else the first screen)
//   --src        the hero's source folder or file: also runs the static checks (Next.js and Tailwind traps)
//   --throttle   Slow 4G + 4x CPU slowdown for the LCP and CLS pass (what a mid-range phone on mobile data sees)
//   --runs N     load each view N times and report the median LCP / CLS / TBT / FCP / LCP subparts (use 5 for proof)
//   --viewports  comma-separated WxH list (default: the --desktop and --phone sizes). A size equal to --desktop is
//                reported as "desktop", one equal to --phone as "phone", any other as "WxH" (e.g. "768x1024").
//                Widths under 768 px are emulated as a touch phone.
// Measure a production build (next build && next start): next dev inflates LCP and long tasks; the audit warns.
//
// Writes <out>/audit.json (read by hero-compare.mjs) and one first-screen screenshot per viewport (desktop.jpg,
// phone.jpg, 768x1024.jpg, …). Prints PASS / WARN / FAIL / INFO lines. Needs Playwright (Chromium) in the current
// project. Exit code 1 when anything is FAIL.
//
// What each viewport reports (audit.json → views[name]):
//   perf          LCP (+ element), CLS, TBT, FCP, TTFB, render-blocking files, when the actions became visible,
//                 lcpBreakdown {ttfb, loadDelay, loadTime, renderDelay, biggest}, frames {p95, long, …}
//   headline, sub, ctas, media, structure, motion, bytes, headlineContrast  (the original fields, unchanged)
//   layout        primary CTA fully visible without scrolling, headline lines and widow, CTA labels that wrap,
//                 horizontal overflow (px + offending elements), clipped text
//   fonts         web-font files, KB, files requested before first paint, font-display per face, FOIT / FOUT risk
//   visual        the hero visual: format, rendered vs intrinsic size at the device pixel ratio, srcset / sizes
//   a11y          h1 count, controls without an accessible name, CTA reachable by Tab + visible focus, landmark
//   tells         template tells (heuristics, WARN at most, never FAIL): gradient word, eyebrow pill, purple glow,
//                 centred headline + two equal buttons, grey logo strip, empty or small visual slot
//   density       share of the first screen taken by the visual, by text, and empty (DOM grid), plus the share of
//                 screenshot blocks that carry visible detail
//   colour        screenshot colour sampling: purple / indigo pixel share

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--out", "--selector", "--src", "--desktop", "--phone", "--runs", "--viewports"]);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
let target = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
if (!target) { console.error('usage: hero-audit.mjs <url | file.html> [--out dir] [--selector "<css>"] [--src folder] [--throttle] [--runs N] [--viewports 390x844,1440x900]'); process.exit(2); }
if (!/^https?:|^file:/.test(target) && existsSync(target)) target = pathToFileURL(resolve(target)).href;
const outDir = resolve(opt("--out", "hero-audit"));
const selector = opt("--selector", null);
const src = opt("--src", null);
const throttle = args.includes("--throttle");
const runs = Math.max(1, Number(opt("--runs", 1)) || 1);
const median = (a) => { const v = a.filter((x) => x != null).sort((m, n) => m - n); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
const parseSize = (s) => { const [w, h] = String(s).toLowerCase().trim().split("x").map(Number); return w > 0 && h > 0 ? { width: Math.round(w), height: Math.round(h) } : null; };
const DESK = parseSize(opt("--desktop", "1440x900")) || { width: 1440, height: 900 };
const PHONE = parseSize(opt("--phone", "390x844")) || { width: 390, height: 844 };
const vpArg = opt("--viewports", null);
const vpList = vpArg ? vpArg.split(",").map(parseSize).filter(Boolean) : [DESK, PHONE];
if (!vpList.length) { console.error(`--viewports: no valid WxH sizes in "${vpArg}"`); process.exit(2); }
const same = (a, b) => a.width === b.width && a.height === b.height;
const nameOf = (vp) => (same(vp, DESK) ? "desktop" : same(vp, PHONE) ? "phone" : `${vp.width}x${vp.height}`);
const SIZES = Object.fromEntries(vpList.map((vp) => [nameOf(vp), vp]));
const phoneLike = (vp) => vp.width < 768;
const DPR = 2;

let chromium;
try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright")); }
catch { console.error("Playwright isn't installed in this project. Run: pnpm add -D playwright"); process.exit(2); }
mkdirSync(outDir, { recursive: true });

const findings = [];
// the same line twice for one view (three identical avatars, say) is reported once
const add = (level, view, msg, id) => { if (!findings.some((f) => f.level === level && f.view === view && f.msg === msg)) findings.push(id ? { level, view, msg, id } : { level, view, msg }); };

// ------------------------------------------------------------------------------------------- in-page code

// Runs before any page script: records LCP candidates, layout shifts and long tasks from the very first paint,
// and samples frame timing (requestAnimationFrame intervals) for 2 s after the load event.
const OBSERVE = () => {
  window.__hr = { lcp: [], cls: 0, shifts: [], longTasks: [], ctaVisibleAt: null, frames: [], animations: 0 };
  // When do the hero's actions become fully visible? Sample the links/buttons near the first h1 every 100 ms.
  const t0 = performance.now();
  const tick = setInterval(() => {
    const h = document.querySelector("h1");
    if (!h) return;
    const scope = h.closest("section, header, main") || h.parentElement;
    const acts = [...scope.querySelectorAll("a, button")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 24 && r.top < innerHeight; });
    if (!acts.length) return;
    const op = (el) => { let o = 1; for (let a = el; a; a = a.parentElement) o *= Number(getComputedStyle(a).opacity); return o; };
    if (acts.every((a) => op(a) >= 0.95)) { window.__hr.ctaVisibleAt = Math.round(performance.now()); clearInterval(tick); }
    if (performance.now() - t0 > 15000) clearInterval(tick);
  }, 100);
  // Frame timing: rAF intervals over ~2 s after load, while the hero's intro animation usually runs.
  addEventListener("load", () => {
    const start = performance.now();
    let last = null, peak = 0;
    const step = (t) => {
      if (last != null) window.__hr.frames.push(+(t - last).toFixed(2));
      last = t;
      try { peak = Math.max(peak, document.getAnimations().filter((a) => a.playState === "running").length); } catch { /* old engine */ }
      window.__hr.animations = peak;
      if (t - start < 2000) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
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

// Per-load numbers: Core Web Vitals, the LCP subparts and the frame-timing sample.
const PERF = () => {
  const h = window.__hr || { lcp: [], cls: 0, shifts: [], longTasks: [], frames: [] };
  const last = h.lcp[h.lcp.length - 1] || null;
  const el = last?.id ? document.querySelector(`[data-hr-lcp="${last.id}"]`) : null;
  const nav = performance.getEntriesByType("navigation")[0];
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  const resources = performance.getEntriesByType("resource");
  const blocking = resources.filter((r) => r.renderBlockingStatus === "blocking").map((r) => r.name.split("/").pop().slice(0, 60));
  const f = fcp ? fcp.startTime : 0;
  const tbt = Math.round(h.longTasks.filter((t) => t.s > f).reduce((a, t) => a + Math.max(0, t.d - 50), 0));
  const dev = !!document.querySelector("nextjs-portal, [data-nextjs-toast], script[src*='react-refresh'], script[src*='webpack-hmr']") || !!window.__NEXT_HMR_CB || /turbopack-hmr|_next\/static\/chunks\/.*hmr/.test([...document.scripts].map((s) => s.src).join(" "));

  // LCP subparts (web.dev "Optimize LCP"): TTFB → resource load delay → resource load time → element render delay.
  // Clamped in order so the four always add up to the LCP time. A text LCP has no resource: all after TTFB is render delay.
  let lcpBreakdown = null;
  if (last) {
    const lcpT = last.t, ttfb = Math.min(nav ? nav.responseStart : 0, lcpT);
    const res = last.url && !last.url.startsWith("data:") ? resources.find((r) => r.name === last.url) : null;
    let reqStart = ttfb, resEnd = ttfb;
    if (res) { reqStart = res.requestStart > 0 ? res.requestStart : res.startTime; resEnd = res.responseEnd; }
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const a = clamp(reqStart, ttfb, lcpT), b = clamp(resEnd, a, lcpT);
    lcpBreakdown = { ttfb: Math.round(ttfb), loadDelay: Math.round(a - ttfb), loadTime: Math.round(b - a), renderDelay: Math.round(lcpT - b),
      resource: res ? res.name.split("/").pop().slice(0, 60) : null, measuredResource: !!res, lcp: lcpT };
  }

  // Frame timing: p95 interval and long frames (> 50 ms) in the 2 s after load.
  const fr = (h.frames || []).filter((x) => x > 0);
  const sorted = [...fr].sort((m, n) => m - n);
  const pct = (p) => (sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))].toFixed(1) : null);
  const frames = { count: fr.length, p50: pct(0.5), p95: pct(0.95), max: sorted.length ? +sorted[sorted.length - 1].toFixed(1) : null,
    long: fr.filter((x) => x > 50).length, janky: fr.filter((x) => x > 34).length, animations: h.animations || 0 };

  return { ctaVisibleAt: h.ctaVisibleAt, lcp: last, lcpInFirstScreen: el ? el.getBoundingClientRect().top < innerHeight : null, cls: +h.cls.toFixed(3), shifts: h.shifts.slice(0, 8),
    fcp: fcp ? Math.round(fcp.startTime) : null, ttfb: nav ? Math.round(nav.responseStart) : null, tbt, renderBlocking: blocking, dev, lcpBreakdown, frames };
};

// Web fonts: faces with their font-display, the files and when they were requested relative to first paint.
const FONTS = () => {
  const fcpE = performance.getEntriesByName("first-contentful-paint")[0];
  const fcp = fcpE ? fcpE.startTime : null;
  let faces = [];
  try {
    faces = [...document.fonts].map((f) => ({ family: f.family.replace(/^["']|["']$/g, ""), weight: f.weight, style: f.style, display: f.display || "auto", status: f.status,
      adjusted: !!((f.sizeAdjust && f.sizeAdjust !== "100%") || (f.ascentOverride && f.ascentOverride !== "normal") || (f.descentOverride && f.descentOverride !== "normal")) }));
  } catch { /* no FontFaceSet */ }
  const files = performance.getEntriesByType("resource").filter((r) => /\.(woff2?|ttf|otf|eot)(\?|#|$)/i.test(r.name) || /fonts\.gstatic\.com/.test(r.name))
    .map((r) => ({ url: r.name, start: Math.round(r.startTime), end: Math.round(r.responseEnd), kb: +((r.encodedBodySize || r.transferSize || 0) / 1024).toFixed(1), beforeFcp: fcp != null && r.startTime < fcp }));
  const preloads = [...document.querySelectorAll("link[rel=preload][as=font]")].map((l) => l.href);
  return { fcp: fcp == null ? null : Math.round(fcp), faces, files, preloads };
};

// Reads the hero once the page has settled.
const INSPECT = async (sel) => {
  const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight;
  const cs = (el, p) => getComputedStyle(el, p);
  const visible = (el) => { const r = el.getBoundingClientRect(), s = cs(el); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05; };
  const h1s = [...document.querySelectorAll("h1")].filter(visible);
  let hero = sel ? document.querySelector(sel) : null;
  if (!hero && h1s[0]) hero = h1s[0].closest("section, header, [class*=hero i], main > div") || h1s[0].parentElement;
  const heroRect = hero ? hero.getBoundingClientRect() : { top: 0, left: 0, width: vw, height: vh, bottom: vh, right: vw };
  const inFirstScreen = (el) => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0; };
  const describe = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : el.classList && el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "");

  // words of an element grouped into rendered lines (robust to per-letter spans: words are found in the joined text)
  const wordLines = (el) => {
    const nodes = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let text = "";
    for (let n; (n = tw.nextNode());) {
      if (n.nodeType === 1) { if (n.tagName === "BR" || /^(block|flex|grid|list-item)$/.test(cs(n).display)) text += " "; continue; }   // a <br> or a block separates words
      if (!n.parentElement || !visible(n.parentElement)) continue;
      nodes.push({ n, at: text.length }); text += n.textContent;
    }
    if (!nodes.length) return [];
    const pos = (i) => { let k = nodes.length - 1; while (k > 0 && nodes[k].at > i) k--; return [nodes[k].n, i - nodes[k].at]; };
    const lines = [];
    for (const m of text.matchAll(/\S+/g)) {
      const r = document.createRange();
      try { const [sn, so] = pos(m.index), [en, eo] = pos(m.index + m[0].length - 1); r.setStart(sn, so); r.setEnd(en, eo + 1); } catch { continue; }
      const rects = [...r.getClientRects()].filter((q) => q.width > 0.5 && q.height > 0.5);
      if (!rects.length) continue;
      const top = rects[0].top, hgt = rects[0].height, L = lines[lines.length - 1];
      const left = rects[0].left, right = rects[rects.length - 1].right;
      if (L && top < L.top + L.h * 0.5) { L.words.push(m[0]); L.right = Math.max(L.right, right); } else lines.push({ top, h: hgt, words: [m[0]], left, right });
    }
    return lines.map((l) => Object.assign(l.words, { width: l.right - l.left }));
  };

  // headline: the first-screen h1; without one, the largest heading in the first screen (still flagged)
  const h1 = h1s.find(inFirstScreen) || null;
  const h = h1 || [...document.querySelectorAll("h2, h3, [role=heading]")].filter((e) => visible(e) && inFirstScreen(e)).sort((a, b) => parseFloat(cs(b).fontSize) - parseFloat(cs(a).fontSize))[0] || null;
  // rendered lines: height / line-height (robust to per-letter spans and stacked rotating words); falls back to
  // counting distinct line boxes when line-height is "normal"
  const lines = (el) => {
    const lh = parseFloat(cs(el).lineHeight), hh = el.getBoundingClientRect().height;
    if (lh > 0) return Math.max(1, Math.round(hh / lh));
    const range = document.createRange(); range.selectNodeContents(el);
    return new Set([...range.getClientRects()].filter((r) => r.width > 2).map((r) => Math.round(r.top))).size;
  };
  const opacityOf = (el) => { let o = 1; for (let a = el; a; a = a.parentElement) o *= Number(cs(a).opacity); return +o.toFixed(2); };
  const headline = h ? {
    tag: h.tagName.toLowerCase(), isH1: !!h1,
    text: h.textContent.trim().replace(/\s+/g, " "), words: h.textContent.trim().split(/\s+/).length, chars: h.textContent.trim().length,
    lines: lines(h), fontSize: parseFloat(cs(h).fontSize), weight: cs(h).fontWeight, lineHeight: cs(h).lineHeight, letterSpacing: cs(h).letterSpacing,
    font: cs(h).fontFamily.split(",")[0].replace(/["']/g, ""), top: Math.round(h.getBoundingClientRect().top), bottom: Math.round(h.getBoundingClientRect().bottom),
  } : null;

  // subhead: the first visible paragraph after the h1 inside the hero
  let sub = null, subEl = null;
  if (h) {
    const scope = hero || document.body;
    const ps = [...scope.querySelectorAll("p")].filter((p) => visible(p) && inFirstScreen(p) && (h.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) && p.textContent.trim().split(/\s+/).length >= 6);
    const p = ps[0];
    if (p) { subEl = p; const r = p.getBoundingClientRect(); const fs = parseFloat(cs(p).fontSize); sub = { opacity: opacityOf(p), text: p.textContent.trim().replace(/\s+/g, " ").slice(0, 220), words: p.textContent.trim().split(/\s+/).length, fontSize: fs, lines: lines(p), charsPerLine: Math.round(p.textContent.trim().length / Math.max(1, lines(p))), bottom: Math.round(r.bottom) }; }
  }

  // colour helpers
  const toRgb = (c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = "#000"; x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
  const bgOf = (el) => { for (let a = el; a; a = a.parentElement) { const c = toRgb(cs(a).backgroundColor); if (c[3] > 0.6) return c; } return null; };
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; return [hh, s, l]; };

  // eyebrow pill: a small pill-shaped element just above the headline (an announcement chip, "New: …")
  let eyebrow = null;
  if (h) {
    const hr = h.getBoundingClientRect();
    const scope = hero || h.parentElement?.parentElement || document.body;
    eyebrow = [...scope.querySelectorAll("a, span, div, p, small, button")].find((e) => {
      if (e.contains(h) || h.contains(e) || e.closest("nav") || !visible(e) || !(e.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
      const r = e.getBoundingClientRect(), s = cs(e), t = e.textContent.trim();
      if (r.height < 16 || r.height > 48 || r.width > vw * 0.8 || t.length < 2 || t.length > 70) return false;
      if (r.bottom > hr.top + 2 || hr.top - r.bottom > 140) return false;
      const radius = parseFloat(s.borderTopLeftRadius) || 0;
      const chip = toRgb(s.backgroundColor)[3] > 0.04 || parseFloat(s.borderTopWidth) > 0;
      return chip && radius >= r.height / 2 - 2;
    }) || null;
  }

  // CTAs: links and buttons in the first screen that look like buttons (padding + background or border).
  // An eyebrow pill above the headline is an announcement, not an action: it isn't counted.
  const ctaEls = [...document.querySelectorAll("a, button, [role=button]")].filter((el) => {
    if (!visible(el) || !inFirstScreen(el) || el === eyebrow) return false;
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
  });
  document.querySelectorAll("[data-hr-cta]").forEach((e) => e.removeAttribute("data-hr-cta"));
  ctaEls.forEach((el, i) => { el.dataset.hrCta = String(i); });
  const ctas = ctaEls.map((el) => {
    const r = el.getBoundingClientRect(), s = cs(el), bg = bgOf(el), fg = toRgb(s.color);
    const ghost = toRgb(s.backgroundColor)[3] < 0.3 && s.backgroundImage === "none";   // outline only: reads as weak (NN/g)
    return { opacity: opacityOf(el), label: el.textContent.trim().replace(/\s+/g, " "), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom),
      contrast: bg ? ratio(fg, bg) : null, fontSize: parseFloat(s.fontSize), ghost, left: Math.round(r.left), right: Math.round(r.right), labelLines: wordLines(el).length };
  });

  // media in the hero / first screen. density = image pixels per CSS pixel actually shown (object-fit aware);
  // a sharp image needs about the device pixel ratio.
  const dpr = devicePixelRatio || 1;
  const fmt = (u) => { const m = /^data:image\/([a-z0-9+]+)/i.exec(u || "") || /\.(avif|webp|jpe?g|png|gif|svg|bmp|jxl|heic)(?:[?#]|$)/i.exec(u || ""); return m ? m[1].toLowerCase().replace("jpeg", "jpg").replace("svg+xml", "svg") : null; };
  // the file's own pixel size: with a w-descriptor srcset, naturalWidth is divided by the chosen density, so decode
  // the chosen file again without srcset to read its real size
  const real = new Map();
  await Promise.all([...document.querySelectorAll("img")].filter((el) => visible(el) && inFirstScreen(el) && (el.currentSrc || el.src)).map(async (el) => {
    const im = new Image(); im.src = el.currentSrc || el.src;
    try { await im.decode(); } catch { /* broken or blocked */ }
    real.set(el, im.naturalWidth ? [im.naturalWidth, im.naturalHeight] : [el.naturalWidth, el.naturalHeight]);
  }));
  const natOf = (el) => real.get(el) || [el.naturalWidth, el.naturalHeight];
  const imgInfo = (el, r) => {
    const [nw, nh] = natOf(el), rw = r.width, rh = r.height, fit = cs(el).objectFit;
    let scale = rw / Math.max(1, nw);
    if (fit === "cover") scale = Math.max(rw / Math.max(1, nw), rh / Math.max(1, nh));
    else if (fit === "contain" || fit === "scale-down") scale = Math.min(rw / Math.max(1, nw), rh / Math.max(1, nh));
    else if (fit === "none") scale = 1;
    const density = nw ? +(1 / scale).toFixed(2) : null;
    const pic = el.parentElement?.tagName === "PICTURE" ? el.parentElement : null;
    const srcset = el.getAttribute("srcset") || (pic ? [...pic.querySelectorAll("source")].map((s) => s.getAttribute("srcset")).filter(Boolean).join(", ") : "") || null;
    const vector = fmt(el.currentSrc || el.src) === "svg";
    return { density, objectFit: fit, srcset, wDescriptors: !!srcset && /\s\d+w\b/.test(srcset),
      upscaled: !vector && density != null && rw >= 64 && density < dpr * 0.8,
      oversize: !vector && density != null && density > dpr * 1.6 && nw > 800 };
  };
  const media = [...document.querySelectorAll("img, video, canvas, picture source, svg image")].filter((el) => el.tagName !== "SOURCE" ? visible(el) && inFirstScreen(el) : false).map((el) => {
    const r = el.getBoundingClientRect();
    if (el.tagName === "IMG") { const i = imgInfo(el, r); return { kind: "img", src: (el.currentSrc || el.src).slice(0, 160), natural: natOf(el), rendered: [Math.round(r.width), Math.round(r.height)],
      loading: el.getAttribute("loading"), fetchpriority: el.getAttribute("fetchpriority"), sizes: el.getAttribute("sizes"), nextImage: el.hasAttribute("data-nimg"), alt: el.getAttribute("alt"),
      oversize: i.oversize, area: Math.round((r.width * r.height) / (vw * vh) * 100), format: fmt(el.currentSrc || el.src), srcset: i.srcset, wDescriptors: i.wDescriptors, density: i.density, upscaled: i.upscaled, objectFit: i.objectFit }; }
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

  // ---- first-screen elements, visual slot and density (a 64-column grid; a cell counts when its centre is covered)
  const firstScreen = [...document.body.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0; }).slice(0, 4000);
  const keyEls = [h, subEl, ...ctaEls].filter(Boolean);
  const clipArea = (r) => Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  const visuals = [];
  for (const e of firstScreen) {
    if (!visible(e) || e === document.body) continue;
    const tag = e.tagName, r = e.getBoundingClientRect(), s = cs(e), share = clipArea(r) / (vw * vh);
    let kind = null;
    if (/^(IMG|VIDEO|CANVAS|IFRAME)$/.test(tag) && r.width >= 48 && r.height >= 48) kind = tag.toLowerCase();
    else if (tag === "svg" && !e.parentElement?.closest("svg") && r.width >= 64 && r.height >= 64) kind = "svg";
    else if (/url\(/.test(s.backgroundImage) && share >= 0.02) kind = "background-image";
    else if (share >= 0.04 && !keyEls.some((k) => e.contains(k)) && !e.closest("nav") && !/^(fixed|sticky)$/.test(s.position) && e.querySelectorAll("*").length >= 4
      && (toRgb(s.backgroundColor)[3] > 0.3 || parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== "none") && !visuals.some((v) => v.el.contains(e))) kind = "mock";
    if (kind) visuals.push({ el: e, kind, r, share });
  }
  const cols = 64, rows = Math.max(1, Math.round((64 * vh) / vw)), cw = vw / cols, ch = vh / rows;
  const grid = new Uint8Array(cols * rows);
  const mark = (r, v) => {
    for (let y = Math.max(0, Math.floor(r.top / ch)); y < Math.min(rows, Math.ceil(r.bottom / ch)); y++)
      for (let x = Math.max(0, Math.floor(r.left / cw)); x < Math.min(cols, Math.ceil(r.right / cw)); x++) {
        const cx = (x + 0.5) * cw, cy = (y + 0.5) * ch;
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) grid[y * cols + x] = Math.max(grid[y * cols + x], v);
      }
  };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let tn = 0;
  for (let n; (n = tw.nextNode()) && tn < 3000;) {
    if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement)) continue;
    tn++;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const q of rg.getClientRects()) if (q.top < vh && q.bottom > 0) mark(q, 1);
  }
  for (const v of visuals) mark(v.r, 2);
  const cells = cols * rows, count = (v) => grid.filter((g) => g === v).length;
  const density = { visualShare: Math.round((count(2) / cells) * 100), textShare: Math.round((count(1) / cells) * 100), emptyShare: Math.round((count(0) / cells) * 100),
    visuals: visuals.filter((v) => !visuals.some((o) => o !== v && o.el.contains(v.el) && o.kind !== "mock")).slice(0, 6).map((v) => ({ kind: v.kind, el: describe(v.el), share: Math.round(v.share * 100) })) };

  // the hero visual: the biggest real medium (image, video, canvas, svg, background image) in the first screen
  const mediaVisuals = visuals.filter((v) => v.kind !== "mock").sort((a, b) => b.share - a.share);
  let visual = null;
  if (mediaVisuals[0]) {
    const v = mediaVisuals[0], e = v.el;
    visual = { kind: v.kind, el: describe(e), share: Math.round(v.share * 100), rendered: [Math.round(v.r.width), Math.round(v.r.height)], dpr };
    if (v.kind === "img") Object.assign(visual, { src: (e.currentSrc || e.src).slice(0, 160), format: fmt(e.currentSrc || e.src), natural: natOf(e), sizes: e.getAttribute("sizes"), ...imgInfo(e, v.r) });
    else if (v.kind === "background-image") { const u = /url\(["']?([^"')]+)/.exec(cs(e).backgroundImage); visual.src = u ? u[1].slice(0, 160) : null; visual.format = fmt(visual.src); }
    else if (v.kind === "video") Object.assign(visual, { src: (e.currentSrc || "").slice(0, 160), poster: e.poster ? fmt(e.poster) : null });
  }

  // ---- layout at this viewport
  const primary = ctaEls[0];
  let ctaFullyVisible = null;
  if (primary) { const r = primary.getBoundingClientRect(); ctaFullyVisible = r.top >= 0 && r.left >= -1 && r.bottom <= vh + 1 && r.right <= vw + 1 && opacityOf(primary) >= 0.9; }
  const hLines = h ? wordLines(h) : [];
  const lastLine = hLines[hLines.length - 1] || [], prevLine = hLines[hLines.length - 2] || [];
  // a widow: one short word alone on the last line (a long word ending a stacked headline isn't one)
  const widestLine = Math.max(0, ...hLines.map((l) => l.width || 0));
  const widow = hLines.length >= 2 && lastLine.length === 1 && prevLine.length >= 2 && (lastLine.width || 0) < widestLine * 0.4 ? lastLine[0] : null;
  const scrollW = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const overflowPx = Math.max(0, scrollW - vw);
  let overflowBy = [];
  if (overflowPx > 1) {
    const clipped = (e) => { for (let a = e.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) { const ox = cs(a).overflowX; if (ox !== "visible" && a.getBoundingClientRect().right <= vw + 1) return true; } return false; };
    const off = [...document.body.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && cs(e).position !== "fixed" && !clipped(e); });
    const named = (e) => (e.id || e.classList.length || !e.parentElement || e.parentElement === document.body ? describe(e) : `${describe(e.parentElement)} > ${describe(e)}`);
    overflowBy = off.filter((e) => !off.includes(e.parentElement)).slice(0, 3).map((e) => `${named(e)} (+${Math.round(e.getBoundingClientRect().right - vw)}px)`);
  }
  const clippedText = keyEls.filter((e) => {
    const s = cs(e), r = e.getBoundingClientRect();
    const cut = s.overflowX !== "visible" && e.scrollWidth > e.clientWidth + 1;
    const ellipsis = s.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1;
    const offscreen = r.right > vw + 1 || r.left < -1;
    return cut || ellipsis || offscreen;
  }).map((e) => ({ el: describe(e), text: e.textContent.trim().replace(/\s+/g, " ").slice(0, 40) }));
  const layout = { vw, vh, ctaFullyVisible, primaryCta: primary ? primary.textContent.trim().replace(/\s+/g, " ") : null, headlineLines: hLines.length || (headline ? headline.lines : null),
    headlineLineWords: hLines.map((l) => l.length), widow, wrappedCtas: ctas.filter((c) => c.labelLines > 1).map((c) => c.label),
    horizontalOverflow: overflowPx > 1, overflowPx: Math.round(overflowPx), overflowBy, clippedText };

  // ---- accessibility basics in the hero
  const scope = hero || document.body;
  const nameOf = (el) => {
    const lab = el.getAttribute("aria-label"); if (lab && lab.trim()) return lab.trim();
    const by = el.getAttribute("aria-labelledby"); if (by) { const t = by.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim(); if (t) return t; }
    const t = (el.innerText || el.textContent || "").trim(); if (t) return t;
    const alt = [...el.querySelectorAll("img[alt]")].map((i) => i.getAttribute("alt")).join(" ").trim(); if (alt) return alt;
    const st = el.querySelector("svg title")?.textContent?.trim(); if (st) return st;
    if (el.value && el.tagName === "INPUT") return el.value;
    return (el.getAttribute("title") || "").trim();
  };
  const controls = [...scope.querySelectorAll("a[href], button, [role=button], [role=link], input[type=submit], input[type=button]")]
    .filter((e) => visible(e) && inFirstScreen(e) && !e.closest("[aria-hidden=true]"));
  const unnamed = controls.filter((e) => !nameOf(e)).map((e) => describe(e));
  const landmarkEl = hero ? hero.closest("main, header, [role=main], [role=banner]") : null;
  const a11y = { h1Count: h1s.length, controls: controls.length, unnamed, landmark: landmarkEl ? (landmarkEl.getAttribute("role") || landmarkEl.tagName.toLowerCase()) : null };

  // ---- template tells (heuristics)
  const tells = [];
  if (h) {
    const total = h.textContent.trim().split(/\s+/).length;
    for (const e of [h, ...h.querySelectorAll("*")]) {
      const s = cs(e), clip = s.webkitBackgroundClip || s.backgroundClip;
      if (clip === "text" && /gradient/.test(s.backgroundImage)) {
        const n = e.textContent.trim().split(/\s+/).filter(Boolean).length;
        if (n && n < total && n <= 3) { tells.push({ id: "gradient-word", msg: `gradient text on ${n} of ${total} headline words ("${e.textContent.trim().slice(0, 30)}")` }); break; }
      }
    }
  }
  if (eyebrow) tells.push({ id: "eyebrow-pill", msg: `eyebrow pill above the headline ("${eyebrow.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}")` });
  // purple / indigo glow in CSS: a radial gradient, or a blurred blob, with a purple colour stop
  const purpleIn = (str) => {
    for (const m of String(str).matchAll(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/g)) {
      const a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      const [hh, ss, ll] = hsl([+m[1], +m[2], +m[3]]);
      if (a >= 0.12 && hh >= 230 && hh <= 295 && ss >= 0.35 && ll >= 0.2 && ll <= 0.85) return true;
    }
    for (const m of String(str).matchAll(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g)) {
      const a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      if (a >= 0.12 && +m[3] >= 255 && +m[3] <= 320 && +m[2] >= 0.08) return true;
    }
    return false;
  };
  const glows = [];
  for (const e of [document.documentElement, ...firstScreen]) {
    for (const p of [null, "::before", "::after"]) {
      const s = cs(e, p);
      if (p && (s.content === "none" || s.content === "normal")) continue;
      const radial = /radial-gradient/.test(s.backgroundImage) && purpleIn(s.backgroundImage);
      const blob = /blur\(/.test(s.filter) && (purpleIn(s.backgroundColor) || purpleIn(s.backgroundImage));
      if (radial || blob) glows.push(`${describe(e)}${p || ""} (${radial ? "radial gradient" : "blurred blob"})`);
    }
    if (glows.length >= 3) break;
  }
  // centred headline + two equal buttons
  if (h && ctas.length === 2) {
    const hr = h.getBoundingClientRect();
    const centred = cs(h).textAlign === "center" || (Math.abs(hr.left + hr.width / 2 - vw / 2) < vw * 0.03 && hr.left > vw * 0.08);
    const [a, b] = ctas;
    const equal = Math.abs(a.w - b.w) / Math.max(a.w, b.w) <= 0.2 && Math.abs(a.h - b.h) <= 4;
    if (centred && equal) tells.push({ id: "centred-two-buttons", msg: `centred headline over two equal buttons ("${a.label}" ${a.w}px, "${b.label}" ${b.w}px)` });
  }
  // grey logo strip: a row of 4+ short, muted, unboxed items in or just under the first screen
  const FAKE = /^(acme|globex|initech|umbrella|hooli|stark|wayne|wonka|soylent|cyberdyne|vandelay|contoso|northwind|fabrikam|tyrell|massive|pied piper|aperture|logoipsum|lorem|ipsum|company|brand|logo|acmecorp)\b/i;
  for (const box of [...document.body.querySelectorAll("*")]) {
    const kids = [...box.children].filter(visible);
    if (kids.length < 4 || kids.length > 14) continue;
    const r0 = box.getBoundingClientRect();
    if (r0.top > vh * 1.5 || r0.bottom < 0 || box.closest("nav") || keyEls.some((k) => box.contains(k))) continue;
    const rs = kids.map((k) => k.getBoundingClientRect());
    const row = rs.every((r) => Math.abs(r.top + r.height / 2 - (rs[0].top + rs[0].height / 2)) < 12 && r.height <= 64 && r.width <= vw / 3);
    if (!row) continue;
    const logoish = kids.every((k) => {
      const s = cs(k), t = k.textContent.trim();
      const isMedia = k.matches("img, svg") || (!t && k.querySelector("img, svg"));
      return (isMedia || (t.length >= 2 && t.length <= 22)) && toRgb(s.backgroundColor)[3] < 0.1 && !(parseFloat(s.borderTopWidth) > 0);
    });
    if (!logoish) continue;
    const grey = kids.every((k) => {
      const s = cs(k);
      if (/grayscale/.test(s.filter) || /grayscale/.test(cs(box).filter) || opacityOf(k) <= 0.75) return true;
      const c = toRgb(s.color), [, sat] = hsl(c), bg = bgOf(k) || [255, 255, 255, 1];
      return !!k.textContent.trim() && sat < 0.15 && ratio(c, bg) < 7;
    });
    if (!grey) continue;
    const names = kids.map((k) => k.textContent.trim() || k.getAttribute("alt") || k.querySelector("img")?.getAttribute("alt") || "").filter(Boolean);
    const fake = names.filter((n) => FAKE.test(n));
    tells.push({ id: "grey-logo-strip", msg: `grey logo strip of ${kids.length} muted items (${describe(box)})${fake.length ? `, placeholder names: ${fake.slice(0, 4).join(", ")}` : ""}`, fake });
    break;
  }
  if (density.visualShare < 15) tells.push({ id: "empty-visual", msg: density.visualShare ? `the visual takes only ${density.visualShare}% of the first screen (under 15%)` : "no visual in the first screen: the hero is text on a background" });

  return { vw, vh, heroSelector: hero ? (hero.id ? `#${hero.id}` : hero.tagName.toLowerCase() + (hero.className && typeof hero.className === "string" ? "." + hero.className.trim().split(/\s+/)[0] : "")) : null,
    headline, sub, ctas, media, pauseControl, structure, ctaBelowFold, layout, visual, a11y, tells, glows, density };
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

// Screenshot colour sampling, decoded in a blank page (so the audited page's CSP can't block it): the share of
// purple / indigo pixels, and the share of blocks that carry visible detail (not flat background).
async function sampleScreenshot(ctx, jpeg) {
  const pg = await ctx.newPage();
  try {
    await pg.setContent("<!doctype html><title>sample</title>");
    return await pg.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/jpeg;base64," + b64; await img.decode();
      const W = 240, H = Math.max(1, Math.round((img.height / img.width) * W));
      const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data;
      let purple = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
        if (!dd) continue;
        const s = dd / (1 - Math.abs(2 * l - 1));
        let hh = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; hh *= 60; if (hh < 0) hh += 360;
        if (hh >= 230 && hh <= 295 && s >= 0.3 && l >= 0.15 && l <= 0.9) purple++;
      }
      let blocks = 0, busy = 0;
      for (let by = 0; by + 8 <= H; by += 8) for (let bx = 0; bx + 8 <= W; bx += 8) {
        let sum = 0, sq = 0;
        for (let y = by; y < by + 8; y++) for (let xx = bx; xx < bx + 8; xx++) { const i = (y * W + xx) * 4; const v = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; sum += v; sq += v * v; }
        const mean = sum / 64, sd = Math.sqrt(Math.max(0, sq / 64 - mean * mean));
        blocks++; if (sd > 6) busy++;
      }
      return { purpleShare: Math.round((purple / (W * H)) * 100), detailShare: Math.round((busy / Math.max(1, blocks)) * 100) };
    }, jpeg.toString("base64"));
  } catch { return null; }
  finally { await pg.close(); }
}

// Tab from the top of the page to the primary CTA and check that focus is visible on it (WCAG 2.4.7):
// an outline, or a ring / border / background that differs from the unfocused state.
async function focusCheck(page) {
  const has = await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); return !!document.querySelector('[data-hr-cta="0"]'); });
  if (!has) return null;
  const STYLE = () => { const e = document.querySelector('[data-hr-cta="0"]'), s = getComputedStyle(e);
    return { outlineStyle: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth) || 0, outlineColor: s.outlineColor, boxShadow: s.boxShadow, borderColor: s.borderTopColor, background: s.backgroundColor + s.backgroundImage, color: s.color, decoration: s.textDecorationLine }; };
  const before = await page.evaluate(STYLE);
  let tabs = 0, reached = false;
  await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); document.body.removeAttribute("tabindex"); });
  for (; tabs < 60 && !reached; tabs++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.dataset?.hrCta === "0");
  }
  if (!reached) return { reachable: false, tabs, visible: null, how: null };
  await page.waitForTimeout(250);
  const after = await page.evaluate(STYLE);
  const focusVisible = await page.evaluate(() => { try { return document.activeElement.matches(":focus-visible"); } catch { return null; } });
  const transparent = (c) => /rgba\([^)]*,\s*0\)$/.test(c) || c === "transparent";
  let how = null;
  if (after.outlineStyle !== "none" && after.outlineWidth > 0 && !transparent(after.outlineColor)) how = `outline ${after.outlineStyle} ${after.outlineWidth}px`;
  else if (after.boxShadow !== before.boxShadow && after.boxShadow !== "none") how = "box-shadow ring";
  else if (after.borderColor !== before.borderColor) how = "border colour";
  else if (after.background !== before.background) how = "background";
  else if (after.color !== before.color || after.decoration !== before.decoration) how = "text colour / underline";
  await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); });
  return { reachable: true, tabs, visible: !!how, how, focusVisible };
}

// ------------------------------------------------------------------------------------------- run

const browser = await chromium.launch();
const report = { version: 2, target, at: new Date().toISOString(), throttle, runs, viewports: Object.keys(SIZES), views: {}, static: [] };

for (const [view, vp] of Object.entries(SIZES)) {
 const perfRuns = [];
 const phone = phoneLike(vp);
 for (let run = 0; run < runs; run++) {
  const last = run === runs - 1;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: DPR, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  await page.addInitScript(OBSERVE);
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const bytes = { total: 0, images: 0, video: 0, fonts: 0, scripts: 0, css: 0 };
  const byUrl = {};
  page.on("response", async (r) => {
    try {
      const len = Number(r.headers()["content-length"] || 0) || (await r.body().catch(() => Buffer.alloc(0))).length;
      const t = r.request().resourceType();
      byUrl[r.url()] = { len, type: t, contentType: (r.headers()["content-type"] || "").split(";")[0] };
      bytes.total += len;
      if (t === "image") bytes.images += len; else if (t === "media") bytes.video += len; else if (t === "font") bytes.fonts += len; else if (t === "script") bytes.scripts += len; else if (t === "stylesheet") bytes.css += len;
    } catch { /* gone */ }
  });
  const t0 = Date.now();
  await page.goto(target, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(throttle ? 6000 : 2500);
  const loadMs = Date.now() - t0;

  let perf = await page.evaluate(PERF);
  perfRuns.push(perf);
  if (!last) { await ctx.close(); continue; }
  if (runs > 1) {
    const mb = (k) => median(perfRuns.map((p) => p.lcpBreakdown?.[k]));
    const bd = perf.lcpBreakdown && { ...perf.lcpBreakdown, ttfb: mb("ttfb"), loadDelay: mb("loadDelay"), loadTime: mb("loadTime"), renderDelay: mb("renderDelay"), lcp: median(perfRuns.map((p) => p.lcp?.t)) };
    const mf = (k) => median(perfRuns.map((p) => p.frames?.[k]));
    perf = { ...perf, ctaVisibleAt: median(perfRuns.map((p) => p.ctaVisibleAt)), lcp: perf.lcp && { ...perf.lcp, t: median(perfRuns.map((p) => p.lcp?.t)) }, cls: median(perfRuns.map((p) => p.cls)), tbt: median(perfRuns.map((p) => p.tbt)), fcp: median(perfRuns.map((p) => p.fcp)),
      lcpBreakdown: bd, frames: { ...perf.frames, p50: mf("p50"), p95: mf("p95"), max: mf("max"), long: mf("long"), janky: mf("janky") },
      runs: perfRuns.map((p) => ({ lcp: p.lcp?.t, cls: p.cls, tbt: p.tbt, p95: p.frames?.p95 })) };
  }
  if (perf.lcpBreakdown) {
    const parts = { ttfb: "TTFB", loadDelay: "resource load delay", loadTime: "resource load time", renderDelay: "element render delay" };
    const [k] = Object.entries(parts).sort((a, b) => (perf.lcpBreakdown[b[0]] ?? 0) - (perf.lcpBreakdown[a[0]] ?? 0))[0];
    perf.lcpBreakdown.biggest = k; perf.lcpBreakdown.biggestLabel = parts[k];
  }

  // fonts (last run): fill file sizes the Resource Timing API couldn't see from the network responses
  const fontsRaw = await page.evaluate(FONTS);
  for (const f of fontsRaw.files) if (!f.kb && byUrl[f.url]) f.kb = +(byUrl[f.url].len / 1024).toFixed(1);
  for (const [u, r] of Object.entries(byUrl)) if (r.type === "font" && !fontsRaw.files.some((f) => f.url === u)) fontsRaw.files.push({ url: u, start: null, end: null, kb: +(r.len / 1024).toFixed(1), beforeFcp: null });
  const used = fontsRaw.faces.filter((f) => f.status !== "unloaded" && !f.adjusted && !/fallback/i.test(f.family));
  const fonts = { files: fontsRaw.files.map((f) => ({ ...f, url: f.url.split("/").pop().slice(0, 80) })), faces: fontsRaw.faces, preloads: fontsRaw.preloads.length,
    webFontKB: Math.round(fontsRaw.files.reduce((a, f) => a + (f.kb || 0), 0)), beforeFcp: fontsRaw.files.filter((f) => f.beforeFcp).length,
    foit: [...new Set(used.filter((f) => f.display === "auto" || f.display === "block").map((f) => f.family))],
    fout: [...new Set(used.filter((f) => f.display === "swap" || f.display === "fallback").map((f) => f.family))],
    metricAdjustedFallback: fontsRaw.faces.some((f) => f.adjusted) };

  const insp = await page.evaluate(INSPECT, selector);
  // refine image formats from the response content-type where the URL has no extension
  const ctFmt = (u) => { const t = byUrl[u]?.contentType || ""; const m = /^image\/([a-z0-9+.-]+)/.exec(t); return m ? m[1].replace("jpeg", "jpg").replace("svg+xml", "svg") : null; };
  for (const m of insp.media) if (m.kind === "img" && m.src) m.format = ctFmt(m.src) || m.format;
  if (insp.visual?.src) insp.visual.format = ctFmt(insp.visual.src) || insp.visual.format;
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
  const shot = await page.screenshot({ path: join(outDir, `${view}.jpg`), type: "jpeg", quality: 78 });   // JPEG: a report with several screenshots stays light
  const focus = await focusCheck(page);
  const colour = await sampleScreenshot(ctx, shot);

  const { layout, visual, a11y, tells: domTells, glows, density, ...rest } = insp;
  a11y.focus = focus;
  if (colour) density.detailShare = colour.detailShare;
  const tells = [...domTells];
  const purpleShare = colour?.purpleShare ?? null;
  if ((glows.length && (purpleShare ?? 0) >= 3) || (purpleShare ?? 0) >= 20)
    tells.push({ id: "purple-glow", msg: `purple / indigo glow: ${glows.length ? glows[0] : "no CSS glow found"}, ${purpleShare}% of the first screen's pixels are purple/indigo` });
  report.views[view] = { viewport: vp, loadMs, bytes, perf, ...rest, headlineContrast, motion, layout, fonts, visual, a11y, tells, density, colour: colour ? { purpleShare, glows } : null };
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
  const p = v.perf, isPhone = phoneLike(v.viewport), isDesktop = v.viewport.width >= 1024;
  if (p.lcp) {
    const lcpLimit = 2500;
    add(p.lcp.t > 4000 ? "FAIL" : p.lcp.t > lcpLimit ? "WARN" : "PASS", view, `LCP ${p.lcp.t} ms (${p.lcp.tag}${p.lcp.url ? " " + p.lcp.url.split("/").pop().slice(0, 40) : p.lcp.text ? ` "${p.lcp.text.slice(0, 30)}"` : ""})${throttle ? ", throttled" : ", unthrottled: re-run with --throttle for a phone on mobile data"}`);
  } else add("WARN", view, "no LCP entry recorded");
  const b = p.lcpBreakdown;
  if (b) {
    const total = Math.max(1, b.ttfb + b.loadDelay + b.loadTime + b.renderDelay);
    const pc = (x) => Math.round((x / total) * 100);
    add("INFO", view, `LCP breakdown: TTFB ${b.ttfb} ms (${pc(b.ttfb)}%), resource load delay ${b.loadDelay} ms (${pc(b.loadDelay)}%), resource load time ${b.loadTime} ms (${pc(b.loadTime)}%), element render delay ${b.renderDelay} ms (${pc(b.renderDelay)}%); biggest: ${b.biggestLabel}${b.measuredResource ? "" : p.lcp?.url ? " (resource timing unavailable for the LCP file)" : " (text LCP: no resource)"}`, "lcp-breakdown");
    if (b.loadDelay > 300 && b.loadDelay / total > 0.25) add("WARN", view, `LCP resource load delay ${b.loadDelay} ms (${pc(b.loadDelay)}% of LCP): the LCP file is found late. Put it in the HTML with fetchpriority="high", never lazy, no CSS/JS discovery`, "lcp-load-delay");
    if (b.renderDelay > 300 && b.renderDelay / total > 0.25 && b.measuredResource) add("WARN", view, `LCP element render delay ${b.renderDelay} ms (${pc(b.renderDelay)}% of LCP) after its file arrived: something (an opacity-0 entrance, a blocking font or script) holds the paint back`, "lcp-render-delay");
  }
  add(p.cls > 0.25 ? "FAIL" : p.cls > 0.1 ? "WARN" : "PASS", view, `CLS ${p.cls}`);
  if (p.tbt != null) add(p.tbt > 600 ? "FAIL" : p.tbt > 200 ? "WARN" : "PASS", view, `total blocking time ${p.tbt} ms${runs > 1 ? ` (median of ${runs})` : ""}`);
  if (p.ctaVisibleAt != null && p.fcp != null && p.ctaVisibleAt - p.fcp > 1000) add("WARN", view, `the hero's actions become fully visible ${p.ctaVisibleAt - p.fcp} ms after first paint (an entrance fade): visitors wait to see what to do. Show them at once`);
  if (p.dev) add("WARN", view, "this looks like a dev server (next dev): LCP and blocking time are inflated. Measure next build && next start for real numbers");
  if (p.lcp && p.lcp.tag === "h1" && p.fcp != null && p.lcp.t - p.fcp > 600) add("WARN", view, `the headline is the LCP and paints ${p.lcp.t - p.fcp} ms after first paint: ${v.fonts?.foit?.length ? `its web font blocks text (font-display ${"block/auto"} on ${v.fonts.foit.join(", ")}), or ` : ""}an entrance animation starting at opacity 0 holds LCP back. Start it visible, animate transform only`);
  if (p.renderBlocking.length) add("WARN", view, `render-blocking: ${p.renderBlocking.slice(0, 4).join(", ")}${p.renderBlocking.length > 4 ? ", …" : ""}`);

  const h = v.headline;
  if (!h) add("FAIL", view, "no heading in the first screen: the page never says what it is");
  else {
    if (!h.isH1) add(v.structure.h1Count ? "WARN" : "FAIL", view, `the hero's headline is an <${h.tag}>, not the page's <h1>${v.structure.h1Count ? "" : " (there is no h1 at all)"}: fine for a section inside a page, wrong for a landing page's first screen`);
    add(v.structure.h1Count > 1 ? "WARN" : "PASS", view, `${v.structure.h1Count} <h1> on the page`);
    add(h.words > 12 ? "WARN" : "PASS", view, `headline: ${h.words} words, ${h.lines} line(s), ${h.fontSize}px "${h.text.slice(0, 50)}"`);
    if (h.lines > 3) add("WARN", view, `headline wraps to ${h.lines} lines: shorten it or reduce the size at this width`);
    if (isPhone && h.fontSize < 28) add("WARN", view, `headline ${h.fontSize}px on a phone: too small to lead the screen`);
    if (isDesktop && h.fontSize < 40) add("WARN", view, `headline ${h.fontSize}px on desktop: too small to lead the screen (most strong heroes sit at 48-96px)`);
    if (v.headlineContrast != null) {
      const need = h.fontSize >= 24 || (h.fontSize >= 18.66 && Number(h.weight) >= 700) ? 3 : 4.5;   // WCAG large text
      add(v.headlineContrast < need ? "FAIL" : "PASS", view, `headline contrast over its backdrop (2nd-percentile pixel) ${v.headlineContrast}:1, needs ${need}:1`);
    }
  }
  if (v.ctas[0] && v.ctas[0].opacity < 0.9) add("WARN", view, `primary CTA "${v.ctas[0].label}" is still fading in (opacity ${v.ctas[0].opacity}) ${Math.round(v.loadMs / 100) / 10} s after load: show the action at once; animate the visual instead`);
  if (v.sub && v.sub.opacity < 0.9) add("WARN", view, `the subhead is still fading in (opacity ${v.sub.opacity}) when measured`);
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
      if (c.h < 44 && isPhone) add("WARN", view, `CTA "${c.label}" is ${c.h}px tall: make touch targets at least 44px`);
      if (c.contrast != null && c.contrast < 4.5) add("WARN", view, `CTA "${c.label}" label contrast ${c.contrast}:1`);
      if (c.bottom > v.vh) add("WARN", view, `CTA "${c.label}" sits below the first screen`);
    }
  }

  // layout at this viewport
  const L = v.layout;
  if (L.ctaFullyVisible != null) add(L.ctaFullyVisible ? "PASS" : "WARN", view, L.ctaFullyVisible ? `primary CTA "${L.primaryCta}" fully visible without scrolling at ${v.viewport.width}×${v.viewport.height}` : `primary CTA "${L.primaryCta}" is not fully visible without scrolling at ${v.viewport.width}×${v.viewport.height}`, "cta-visible");
  if (L.widow) add("WARN", view, `headline ends on a single word ("${L.widow}") alone on its last line (a widow): text-wrap: balance, or rephrase`, "headline-widow");
  for (const label of L.wrappedCtas) add("WARN", view, `CTA label "${label}" wraps onto two lines: shorten it, or let the button grow (whitespace-nowrap)`, "cta-label-wraps");
  if (L.horizontalOverflow) add(L.overflowPx > 16 ? "FAIL" : "WARN", view, `the page scrolls sideways: content is ${L.overflowPx}px wider than the ${v.viewport.width}px screen${L.overflowBy.length ? ` (${L.overflowBy.join(", ")})` : ""}`, "horizontal-overflow");
  else add("PASS", view, `no horizontal overflow at ${v.viewport.width}px`, "horizontal-overflow");
  for (const c of L.clippedText) add("WARN", view, `text clipped or off-screen: ${c.el} "${c.text}"`, "text-clipped");

  if (v.structure.carousel) add("WARN", view, "the hero contains a carousel");
  for (const m of v.media) {
    if (m.kind === "img" && m.oversize) add("WARN", view, `image ${m.natural.join("×")} shown at ${m.rendered.join("×")} (${m.density} image px per CSS px, the ${DPR}× screen needs ~${DPR}): serve a smaller size (sizes / srcset)`);
    if (m.kind === "img" && m.upscaled) add("WARN", view, `image ${m.natural.join("×")} shown at ${m.rendered.join("×")}: upscaled (${m.density} image px per CSS px on a ${DPR}× screen), it looks soft. Serve a larger file in srcset`, "image-upscaled");
    if (m.kind === "img" && m.wDescriptors && !m.sizes) add("WARN", view, `image with a w-descriptor srcset but no sizes (${(m.src || "").split("/").pop().slice(0, 40)}): the browser assumes 100vw and downloads the largest candidate`, "image-no-sizes");
    if (m.kind === "img" && m.area > 20 && m.loading === "lazy") add("FAIL", view, `large first-screen image is loading="lazy": it delays LCP`);
    if (m.kind === "img" && m.alt == null) add("WARN", view, `first-screen image without alt (use alt="" if decorative)`);
    if (m.kind === "video") {
      if (m.autoplay && !m.muted) add("FAIL", view, "autoplaying video is not muted");
      if (m.autoplay && !m.poster) add("WARN", view, "autoplaying video has no poster");
      if (m.autoplay && m.loop && !v.pauseControl) add("WARN", view, "looping video with no pause control (WCAG 2.2.2: moving content over 5 s needs a way to pause)");
    }
  }
  // the hero visual
  const vis = v.visual;
  if (vis && (vis.kind === "img" || vis.kind === "background-image")) {
    const raster = !!vis.format && /^(jpg|png|gif|bmp)$/.test(vis.format);
    if (raster) add("WARN", view, `hero visual is ${vis.format.toUpperCase()} (${(vis.src || "").split("/").pop().slice(0, 40)}): AVIF or WebP is usually 25-50% smaller at the same quality`, "image-format");
    else if (vis.format) add("PASS", view, `hero visual format ${vis.format.toUpperCase()}`, "image-format");
    if (vis.kind === "img" && vis.format !== "svg" && !vis.srcset && vis.share >= 10) add("WARN", view, `hero image has no srcset: every screen downloads the same ${vis.natural.join("×")} file`, "image-no-srcset");
    if (vis.kind === "img" && !vis.upscaled && !vis.oversize && vis.density != null) add("PASS", view, `hero image sharp at ${vis.dpr}×: ${vis.density} image px per CSS px`, "image-density");
  }

  // fonts
  const F = v.fonts;
  if (!F.files.length && !F.faces.some((f) => f.status !== "unloaded")) add("PASS", view, "no web fonts loaded (system fonts): no FOIT / FOUT risk", "fonts");
  else {
    add(F.webFontKB > 200 ? "WARN" : "PASS", view, `web fonts: ${F.files.length} file(s), ${F.webFontKB} KB, ${F.beforeFcp} requested before first paint; font-display: ${[...new Set(F.faces.filter((f) => f.status !== "unloaded" && !f.adjusted).map((f) => f.display))].join(", ") || "–"}`, "fonts");
    if (F.foit.length) add("WARN", view, `font-display auto/block on ${F.foit.join(", ")}: text stays invisible up to 3 s while the font loads (FOIT risk). Use swap with a size-adjusted fallback (next/font does this), or optional`, "font-foit");
    if (F.fout.length && !F.metricAdjustedFallback) add("INFO", view, `font-display swap on ${F.fout.join(", ")} without a size-adjusted fallback face: text reflows when the font arrives (FOUT); add size-adjust / ascent-override to the fallback`, "font-fout");
    if (F.beforeFcp > 2) add("WARN", view, `${F.beforeFcp} font files are requested before first paint: preload only the one or two the hero needs; subset the rest`, "fonts-before-fcp");
  }

  // accessibility basics in the hero
  const A = v.a11y;
  if (A.unnamed.length) add("FAIL", view, `${A.unnamed.length} hero control(s) without an accessible name: ${A.unnamed.slice(0, 3).join(", ")} (add text or aria-label)`, "a11y-names");
  else if (A.controls) add("PASS", view, `all ${A.controls} hero link(s)/button(s) have an accessible name`, "a11y-names");
  if (A.focus) {
    if (!A.focus.reachable) add("WARN", view, `the primary CTA can't be reached with Tab (tried ${A.focus.tabs} times): use a real <a href> or <button>`, "a11y-focus");
    else add(A.focus.visible ? "PASS" : "WARN", view, A.focus.visible ? `focus visible on the primary CTA (${A.focus.how})` : "no visible focus on the primary CTA when tabbed to (WCAG 2.4.7): add a :focus-visible outline or ring", "a11y-focus");
  }
  add(A.landmark ? "PASS" : "WARN", view, A.landmark ? `the hero sits in a <${A.landmark}> landmark` : "the hero isn't inside <main> or <header>: screen-reader landmark navigation skips it", "a11y-landmark");

  // motion
  if (v.motion.infiniteAnimations || v.motion.playingVideos) add("WARN", view, `with reduced motion on, ${v.motion.infiniteAnimations} looping animation(s) and ${v.motion.playingVideos} video(s) still play in the first screen`);
  const fr = p.frames;
  if (fr && fr.count > 10) {
    const jank = fr.p95 > 34 || fr.long >= 2;
    add(jank ? "WARN" : "PASS", view, `frame timing over 2 s after load: p95 ${fr.p95} ms, ${fr.long} long frame(s) over 50 ms, ${fr.janky} over 34 ms${fr.animations ? `, ${fr.animations} animation(s) running` : ""}${jank ? ": the intro animation drops frames. Animate transform/opacity only, move work off the main thread" : ""}`, "frames");
  }

  // template tells: heuristics, judgment, never FAIL
  for (const t of v.tells) add("WARN", view, `template tell (heuristic): ${t.msg}`, `tell:${t.id}`);
  if (!v.tells.length) add("PASS", view, "no template tells found (heuristic)", "tells");
  const D = v.density;
  add("INFO", view, `first-screen density: visual ${D.visualShare}%, text ${D.textShare}%, empty ${D.emptyShare}%${D.detailShare != null ? `; ${D.detailShare}% of the screenshot carries visible detail` : ""} (rough, DOM grid)`, "density");

  const mb = (n) => (n / 1048576).toFixed(2);
  add(v.bytes.total > 3 * 1048576 ? "WARN" : "PASS", view, `first load ${mb(v.bytes.total)} MB (images ${mb(v.bytes.images)}, video ${mb(v.bytes.video)}, fonts ${mb(v.bytes.fonts)}, JS ${mb(v.bytes.scripts)})`);
}
for (const s of report.static) findings.push({ level: s.level, view: "src", msg: `${s.where}  ${s.msg}` });

report.findings = findings;
// Never record local absolute paths in audit.json (it gets shared): file:// URLs and paths in the home folder
// become their file name.
const home = homedir();
const scrub = (s) => s.replace(/file:\/\/\/?[^\s"'()<>]*?([^/\s"'()<>]+)(?=[\s"'()<>]|$)/g, "$1")
  .replace(new RegExp(home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\\s\"'()<>]*?([^/\\s\"'()<>]+)(?=[\\s\"'()<>]|$)", "g"), "$1");
writeFileSync(join(outDir, "audit.json"), JSON.stringify(report, (k, v) => (typeof v === "string" ? scrub(v) : v), 2));
const order = { FAIL: 0, WARN: 1, INFO: 2, PASS: 3 };
for (const f of [...findings].sort((a, b) => order[a.level] - order[b.level])) console.log(`${f.level.padEnd(4)}  ${f.view.padEnd(7)} ${f.msg}`);
const fails = findings.filter((f) => f.level === "FAIL").length, warns = findings.filter((f) => f.level === "WARN").length;
console.log(`\n${fails} fail, ${warns} warn. Wrote ${join(outDir, "audit.json")}, ${Object.keys(SIZES).map((v) => `${v}.jpg`).join(", ")}`);
process.exitCode = fails ? 1 : 0;
