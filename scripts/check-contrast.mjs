#!/usr/bin/env node
// DESIGN.md の components から文字色×地色のペアを機械抽出し、WCAG AA（4.5:1）を検証する。
// トークンの「値」はこのファイルに一切書かない。すべて DESIGN.md から読む。依存パッケージ無し。
//
// ペアの規則: 同じグループ（screen / button-primary / note-success …）内で、
// 前景部位（text / text-muted / accent）× 地部位（surface / background）の全組み合わせ × theme。
// border は文字ではないため対象外（非テキストの 3:1 はここでは扱わない）。
//
// usage: node scripts/check-contrast.mjs [path/to/DESIGN.md]

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, "DESIGN.md");
const raw = readFileSync(SRC, "utf8");
const fm = raw.match(/^---\n([\s\S]*?)\n---/);
if (!fm) throw new Error(`frontmatter not found in ${SRC}`);

// ── 最小パース（build-catalog.mjs と同じ 2-space 構造前提）────────────
const colors = {};
for (const m of fm[1].matchAll(/^ {2}([a-z]+-\d+):\s*"(oklch\([^)]+\))"/gm)) colors[m[1]] = m[2];
const rolesMap = {};
const rolesBlock = fm[1].match(/^roles:\n((?: {2}.*\n?)*)/m);
for (const m of (rolesBlock?.[1] || "").matchAll(/^ {2}([\w-]+):\s*([\w-]+)/gm)) rolesMap[m[1]] = m[2];
const components = {}; // name -> {light, dark, <state>-light, <state>-dark, …}
const compBlock = fm[1].match(/^components:\n((?: {2,}.*\n?)*)/m);
let cur = null;
for (const line of (compBlock?.[1] || "").split("\n")) {
  let m;
  if ((m = line.match(/^ {2}([\w-]+):\s*$/))) components[(cur = m[1])] = {};
  else if (cur && (m = line.match(/^ {4}([\w-]+):\s*([\w-]+)/))) components[cur][m[1]] = m[2];
}

const resolveRole = (ref) => {
  const m = ref.match(/^([a-z]+)-color-(\d+)$/);
  if (!m) throw new Error(`役割層トークンではない参照: ${ref}`);
  const v = colors[`${rolesMap[m[1]]}-${m[2]}`];
  if (!v) throw new Error(`解決できない参照: ${ref}`);
  return v;
};

// ── oklch → 相対輝度 → コントラスト比 ────────────────────────────────
function luminance(oklch) {
  const [L, C, H] = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/).slice(1).map(Number);
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v))); // linear sRGB
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
const contrast = (fg, bg) => {
  const [y1, y2] = [luminance(fg), luminance(bg)];
  return (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
};

// ── グループ化してペアを列挙 ──────────────────────────────────────────
const FG_PARTS = ["text-muted", "text", "accent", "placeholder"];
const BG_PARTS = ["surface", "background"];
const RING_AA = 3; // 非テキスト（フォーカスリング）は 3:1
const partOf = (name) => {
  const stem = name.replace(/-color$/, "");
  for (const p of [...FG_PARTS, ...BG_PARTS, "border", "ring"]) if (stem.endsWith(`-${p}`)) return { group: stem.slice(0, -p.length - 1), part: p };
  throw new Error(`部位を特定できないトークン名: ${name}`);
};
const groups = {};
for (const name of Object.keys(components)) {
  const { group, part } = partOf(name);
  (groups[group] ||= {})[part] = name;
}

// state 分岐（<state>-light 等）も検証する。fg 側に同じ分岐が無ければ同 theme の基本値に落とす。
const themeOf = (key) => (key.endsWith("dark") ? "dark" : "light");
const AA = 4.5;
let fail = 0, checked = 0;
// フォーカスリング × screen の地（リングは outline-offset で地の上に出るため）
for (const [name, t] of Object.entries(components)) {
  if (!name.endsWith("-ring-color")) continue;
  for (const mode of ["light", "dark"]) {
    const c = contrast(resolveRole(t[mode]), resolveRole(components["screen-background-color"][mode]));
    checked++;
    const ok = c >= RING_AA;
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"} ${c.toFixed(2).padStart(5)} ${mode.padEnd(11)} ${name} on screen-background (need ${RING_AA})`);
  }
}
for (const [group, parts] of Object.entries(groups)) {
  for (const fgPart of FG_PARTS) {
    for (const bgPart of BG_PARTS) {
      if (!parts[fgPart] || !parts[bgPart]) continue;
      const fgTok = components[parts[fgPart]];
      const bgTok = components[parts[bgPart]];
      const keys = [...new Set([...Object.keys(fgTok), ...Object.keys(bgTok)])];
      for (const key of keys) {
        if (key.startsWith("disabled")) continue; // WCAG: inactive UI component はコントラスト要件の対象外

        const fg = resolveRole(fgTok[key] ?? fgTok[themeOf(key)]);
        const bg = resolveRole(bgTok[key] ?? bgTok[themeOf(key)]);
        const c = contrast(fg, bg);
        checked++;
        const ok = c >= AA;
        if (!ok) fail++;
        console.log(`${ok ? "PASS" : "FAIL"} ${c.toFixed(2).padStart(5)} ${key.padEnd(11)} ${group}: ${fgPart} on ${bgPart}`);
      }
    }
  }
}
console.log(`\n${checked} pairs checked, ${fail} failed (AA ${AA}:1)`);
if (fail > 0) process.exit(1);
