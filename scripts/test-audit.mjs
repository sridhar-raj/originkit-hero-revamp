#!/usr/bin/env node
// Tests for hero-audit.mjs: each fixture must produce (or must not produce) certain findings. Run after any edit
// to the audit, so a change can't quietly turn a failure into a pass.
//
//   node <skill>/scripts/test-audit.mjs
// Needs Playwright (Chromium) in the current project. Exit code 1 if any case misbehaves.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => join(here, "fixtures", f);

// [fixture, extra args, expected exit, [regexes that must appear], [regexes that must not]]
const CASES = [
  ["bad-hero.html", ["--src", fx("src-bad")], 1, [
    /FAIL\s+desktop headline contrast/, /FAIL\s+desktop large first-screen image is loading="lazy"/,
    /WARN\s+desktop 2 <h1>/, /WARN\s+phone\s+headline wraps to \d+ lines/, /WARN\s+desktop 4 CTA/,
    /WARN\s+phone\s+CTA "Learn more" is 30px tall/, /WARN\s+desktop subhead \d+ words/, /WARN\s+desktop headline 30px on desktop/,
    /looping animation\(s\)/, /WARN\s+desktop CTA labels don't name an outcome|WARN\s+desktop CTA "Learn more" label contrast/,
    /src\s+Hero\.tsx:\d+\s+next\/image `priority` is deprecated/, /h-screen/, /FAIL\s+src\s+Hero\.tsx:\d+\s+<video autoPlay> without muted/,
    /<Image fill> without sizes/,
  ], []],
  ["good-hero.html", [], 0, [/PASS\s+desktop headline: 4 words/, /PASS\s+phone\s+2 CTA\(s\)/, /0 fail, 0 warn/], [/FAIL/, /WARN/]],
];

let bad = 0;
for (const [file, extra, code, must, mustNot] of CASES) {
  const out = mkdtempSync(join(tmpdir(), "hero-audit-test-"));
  const r = spawnSync(process.execPath, [join(here, "hero-audit.mjs"), fx(file), "--out", out, ...extra], { encoding: "utf8" });
  const text = (r.stdout || "") + (r.stderr || "");
  const problems = [];
  if (r.status !== code) problems.push(`exit ${r.status}, expected ${code}`);
  for (const re of must) if (!re.test(text)) problems.push(`missing ${re}`);
  for (const re of mustNot) if (re.test(text)) problems.push(`unexpected ${re}`);
  try { JSON.parse(readFileSync(join(out, "audit.json"), "utf8")); } catch { problems.push("audit.json missing or invalid"); }
  if (problems.length) { bad++; console.log(`FAIL  ${file}\n      ${problems.join("\n      ")}`); } else console.log(`ok    ${file}`);
}
console.log(bad ? `\n${bad} audit test(s) failed.` : "\nAll audit tests pass.");
process.exitCode = bad ? 1 : 0;
