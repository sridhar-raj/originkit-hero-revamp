#!/usr/bin/env node
// pinterest-refs.mjs: collect hero references from Pinterest and build a moodboard.
//
//   node pinterest-refs.mjs "ai saas hero dark" "fintech landing page hero" [--count 10] [--out .hero/refs]
//        [--min 5] [--dark | --light] [--exclude "template,themeforest"]
//
// Searches Pinterest (signed out, its own JSON endpoint) for each query, keeps landscape, high-resolution,
// hero-shaped designs, prefers designer sources (Dribbble, Behance, Awwwards) over template marketplaces, drops
// repins of the same image, downloads the best --count (5-12) originals, measures each one's palette and
// brightness, and renders a numbered moodboard (moodboard.jpg) with palette chips. Writes refs.json.
//
// The images are other people's work: references for mood, kept local, never published or copied.
// Needs Playwright in the project for the moodboard image (the download works without it).

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const VALUE = new Set(["--count", "--out", "--min", "--exclude"]);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const queries = argv.filter((a, i) => !a.startsWith("--") && !VALUE.has(argv[i - 1]));
if (!queries.length) { console.error('usage: pinterest-refs.mjs "query one" "query two" [--count 10] [--out .hero/refs] [--dark|--light]'); process.exit(2); }
const COUNT = Math.min(12, Math.max(5, Number(opt("--count", 10)) || 10));
const MIN = Math.max(1, Number(opt("--min", 5)) || 5);
const out = resolve(opt("--out", ".hero/refs")); mkdirSync(out, { recursive: true });
const tone = argv.includes("--dark") ? "dark" : argv.includes("--light") ? "light" : null;
const exclude = (opt("--exclude", "") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

// Sources: designers first, marketplaces last (their shots are often busy template collages).
const GOOD = /dribbble|behance|awwwards|godly|land-book|lapa\.ninja|saaslandingpage|siteinspire|framer\.website|cosmos\.so|mobbin/i;
const MEH = /themeforest|envato|creativemarket|ui8|flowoly|templatemonster|etsy|gumroad|webflow\.com\/templates|freepik|canva/i;
const BAD_WORDS = /mockup bundle|template pack|ui kit|logo|poster|flyer|instagram|social media|mobile app|app ui|wireframe kit|icon set/i;

async function search(q, bookmark) {
  const data = { options: { query: q, scope: "pins", page_size: 50, rs: "typed", ...(bookmark ? { bookmarks: [bookmark] } : {}) }, context: {} };
  const u = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent("/search/pins/?q=" + q)}&data=${encodeURIComponent(JSON.stringify(data))}`;
  const res = await fetch(u, { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-Pinterest-PWS-Handler": "www/search/[scope].js", "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
  if (res.status === 429) throw new Error("Pinterest is limiting requests from this machine; wait ~10 minutes");
  const j = await res.json().catch(() => null);
  const r = j?.resource_response;
  if (!res.ok || r?.status !== "success") throw new Error(`Pinterest search failed: ${r?.message || res.status}`);
  return { results: r.data?.results || [], bookmark: r.bookmark || null };
}

const seen = new Set(); const pool = [];
for (const q of queries) {
  let bookmark = null;
  for (let page = 0; page < 2; page++) {
    let r;
    try { r = await search(q, bookmark); } catch (e) { console.warn(`  "${q}": ${e.message}`); break; }
    for (const p of r.results) {
      if (p.type !== "pin" || !p.images?.orig?.url) continue;
      const o = p.images.orig; const ratio = o.width / o.height;
      const text = `${p.title || ""} ${p.grid_title || ""} ${p.description || ""}`;
      const source = `${p.domain || ""} ${p.link || ""}`;
      const sig = p.image_signature || o.url;
      if (seen.has(sig)) continue; seen.add(sig);
      if (ratio < 1.2 || ratio > 2.4 || o.width < 1000) continue;            // hero-shaped and sharp
      if (BAD_WORDS.test(text)) continue;
      if (exclude.some((x) => (text + source).toLowerCase().includes(x))) continue;
      let score = Math.min(o.width, 3000) / 1000;                           // resolution
      if (GOOD.test(source)) score += 2.5;
      if (MEH.test(source)) score -= 2;
      if (/hero|landing|homepage|website|web design|saas|header/i.test(text)) score += 1.5;
      if (ratio >= 1.35 && ratio <= 1.9) score += 0.5;                       // a single screen, not a long page
      score += (p.repin_count || p.aggregated_pin_data?.aggregated_stats?.saves || 0) > 50 ? 0.5 : 0;
      pool.push({ id: p.id, title: (p.title || p.grid_title || "").trim().slice(0, 90), query: q, url: `https://www.pinterest.com/pin/${p.id}/`, source: (p.domain || "").replace(/^Uploaded by user$/, "uploaded"), link: p.link || null, img: o.url, width: o.width, height: o.height, score });
    }
    bookmark = r.bookmark; if (!bookmark) break;
  }
}
pool.sort((a, b) => b.score - a.score);
console.log(`${pool.length} hero-shaped candidates from ${queries.length} quer${queries.length > 1 ? "ies" : "y"}`);

// Download more than needed; keep the best COUNT that match the requested tone.
const refs = [];
for (const c of pool.slice(0, COUNT * 3)) {
  if (refs.length >= COUNT * 2) break;
  try {
    const res = await fetch(c.img, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = c.img.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1]?.toLowerCase().replace("jpeg", "jpg") || "jpg";
    const file = `ref-${String(refs.length + 1).padStart(2, "0")}.${ext}`;
    writeFileSync(join(out, file), buf);
    refs.push({ ...c, file });
  } catch {}
}

// Palette and brightness per image (in a browser canvas), then the moodboard.
let chromium = null;
try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright")); } catch { try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright-core")); } catch {} }
if (chromium) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Same folder as the images, so the canvas may read them (a blank tab can't load file:// images).
  writeFileSync(join(out, "blank.html"), "<!doctype html><title>refs</title>");
  await page.goto(pathToFileURL(join(out, "blank.html")).href);
  for (const r of refs) {
    const stats = await page.evaluate(async (src) => {
      const img = new Image(); img.src = src; await img.decode();
      const w = 160, h = Math.round((160 * img.height) / img.width);
      const c = new OffscreenCanvas(w, h), g = c.getContext("2d"); g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data; const bins = new Map(); let lum = 0, sat = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const [R, G, B] = [d[i], d[i + 1], d[i + 2]]; const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        lum += 0.2126 * R + 0.7152 * G + 0.0722 * B; sat += mx ? (mx - mn) / mx : 0; n++;
        const k = ((R >> 5) << 6) | ((G >> 5) << 3) | (B >> 5); const b = bins.get(k) || { n: 0, r: 0, g: 0, b: 0 }; b.n++; b.r += R; b.g += G; b.b += B; bins.set(k, b);
      }
      const hex = (v) => Math.round(v).toString(16).padStart(2, "0");
      const all = [...bins.values()].sort((a, b) => b.n - a.n).map((b) => ({ hex: "#" + hex(b.r / b.n) + hex(b.g / b.n) + hex(b.b / b.n), share: b.n / n, s: (() => { const r = b.r / b.n, g = b.g / b.n, bb = b.b / b.n, mx = Math.max(r, g, bb), mn = Math.min(r, g, bb); return mx ? (mx - mn) / mx : 0; })() }));
      const base = all.slice(0, 3);
      const accent = all.filter((c) => c.s > 0.45 && c.share > 0.004).slice(0, 2); // the saturated colour that pops
      return { brightness: Math.round((lum / n / 255) * 100), saturation: Math.round((sat / n) * 100), palette: [...base, ...accent.filter((a) => !base.some((b) => b.hex === a.hex))].map((c) => ({ hex: c.hex, share: Math.round(c.share * 1000) / 10 })) };
    }, `data:image/${r.file.split(".").pop() === "jpg" ? "jpeg" : r.file.split(".").pop()};base64,${readFileSync(join(out, r.file)).toString("base64")}`).catch((e) => { if (process.env.REFS_DEBUG) console.warn(e.message); return null; });
    Object.assign(r, stats || {});
    r.tone = r.brightness == null ? null : r.brightness < 35 ? "dark" : r.brightness > 65 ? "light" : "mid";
  }
  let keep = refs;
  if (tone) { const match = refs.filter((r) => r.tone === tone || r.tone === "mid"); if (match.length >= MIN) keep = match; }
  keep = keep.slice(0, COUNT);
  keep.forEach((r, i) => (r.n = i + 1));
  // Moodboard: a numbered grid with palette chips.
  const cols = keep.length > 6 ? 4 : 3; const tileW = 520, tileH = Math.round(tileW / 1.6);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#0d0d0f;font:13px/1.3 -apple-system,system-ui,sans-serif;color:#ddd;padding:24px}
    h1{font-size:15px;font-weight:600;margin:0 0 16px;color:#fff}
    .g{display:grid;grid-template-columns:repeat(${cols},${tileW}px);gap:18px}
    figure{margin:0;background:#17171a;border-radius:10px;overflow:hidden}
    .im{width:${tileW}px;height:${tileH}px;background-size:cover;background-position:top center;position:relative}
    .n{position:absolute;top:8px;left:8px;background:#000c;color:#fff;font-weight:700;padding:3px 8px;border-radius:6px}
    figcaption{padding:8px 10px;display:flex;gap:6px;align-items:center}
    .c{width:18px;height:18px;border-radius:4px;border:1px solid #fff2}
    .t{margin-left:auto;color:#888;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}
  </style></head><body><h1>Moodboard · ${queries.map((q) => `“${q}”`).join(" · ")} · ${keep.length} references</h1><div class="g">${keep.map((r) => `
    <figure><div class="im" style="background-image:url('${r.file}')"><span class="n">${r.n}</span></div>
    <figcaption>${(r.palette || []).map((c) => `<span class="c" style="background:${c.hex}" title="${c.hex}"></span>`).join("")}<span class="t">${r.tone || ""} · ${r.source || ""} · ${r.title.replace(/[<>"]/g, "")}</span></figcaption></figure>`).join("")}</div></body></html>`;
  writeFileSync(join(out, "moodboard.html"), html);
  const rows = Math.ceil(keep.length / cols);
  await page.setViewportSize({ width: cols * tileW + (cols - 1) * 18 + 48, height: rows * (tileH + 40) + (rows - 1) * 18 + 80 });
  await page.goto(pathToFileURL(join(out, "moodboard.html")).href); await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, "moodboard.jpg"), type: "jpeg", quality: 85, fullPage: true });
  await browser.close();
  writeFileSync(join(out, "refs.json"), JSON.stringify({ queries, at: new Date().toISOString(), refs: keep }, null, 2));
  const dark = keep.filter((r) => r.tone === "dark").length, light = keep.filter((r) => r.tone === "light").length;
  for (const r of keep) console.log(`${String(r.n).padStart(2)} ${r.tone?.padEnd(5) ?? ""} ${(r.source || "").padEnd(14).slice(0, 14)} ${r.file}  ${r.title.slice(0, 60)}`);
  console.log(`\n${keep.length} references (${dark} dark, ${light} light) → ${join(out, "moodboard.jpg")}`);
  if (keep.length < MIN) { console.log(`only ${keep.length} found (minimum ${MIN}): add broader queries`); process.exit(1); }
} else {
  writeFileSync(join(out, "refs.json"), JSON.stringify({ queries, at: new Date().toISOString(), refs: refs.slice(0, COUNT) }, null, 2));
  console.log(`${Math.min(COUNT, refs.length)} references downloaded to ${out} (install Playwright for the moodboard and palettes)`);
}
