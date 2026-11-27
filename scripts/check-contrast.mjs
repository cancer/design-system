#!/usr/bin/env node
// DESIGN.md の components から文字色×地色（4.5:1）と操作部品の border×隣接色（3:1）を機械検証する。
// トークンの「値」はこのファイルに一切書かない。すべて DESIGN.md から読む。依存パッケージ無し。
//
// 文字ペア: 同じ group 内で、前景部位（text / text-muted / accent / placeholder）×
// 地部位（surface / background）の全組み合わせ × theme。地を持たない group は screen の地を使う。
// 非テキストペア: card / input の border を同 group の surface と screen-background 上で検証する。
// screen は画面上の構造、note-success / note-warning / note-danger / note-neutral は告知面のため除外。
// border-color を持つ group は対象か除外かを明示する。disabled* と state 間の差は検証しない。
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
const partOf = (name) => {
  const stem = name.replace(/-color$/, "");
  for (const p of [...FG_PARTS, ...BG_PARTS, "border"]) if (stem.endsWith(`-${p}`)) return { group: stem.slice(0, -p.length - 1), part: p };
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
const NON_TEXT_AA = 3;
const NON_TEXT_GROUPS = new Set(["card", "input"]);
const NON_TEXT_EXCLUDED_GROUPS = new Set(["screen", "note-success", "note-warning", "note-danger", "note-neutral"]);
let fail = 0, checked = 0;
// 地を持たない component（link 等）は screen の面・地の上に置かれるため、それらを bg として検証する
for (const parts of Object.values(groups)) {
  if (FG_PARTS.some((f) => parts[f]) && !BG_PARTS.some((b) => parts[b])) {
    parts.surface = "screen-surface-color";
    parts.background = "screen-background-color";
  }
}
for (const [group, parts] of Object.entries(groups)) {
  if (!parts.border || NON_TEXT_EXCLUDED_GROUPS.has(group)) continue;
  if (!NON_TEXT_GROUPS.has(group)) {
    throw new Error(`非テキストコントラストの対象/除外が未定義の group: ${group}`);
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
for (const [group, parts] of Object.entries(groups)) {
  if (!NON_TEXT_GROUPS.has(group) || !parts.border) continue;

  const borderTok = components[parts.border];
  const surfaceTok = components[parts.surface];
  const screenBackgroundTok = components["screen-background-color"];
  if (!surfaceTok || !screenBackgroundTok) {
    throw new Error(`非テキストコントラストの地が見つからない group: ${group}`);
  }

  for (const [bgPart, bgTok] of [["surface", surfaceTok], ["screen-background", screenBackgroundTok]]) {
    for (const key of Object.keys(borderTok)) {
      if (key.startsWith("disabled")) continue;

      const border = resolveRole(borderTok[key]);
      const bg = resolveRole(bgTok[key] ?? bgTok[themeOf(key)]);
      const c = contrast(border, bg);
      checked++;
      const ok = c >= NON_TEXT_AA;
      if (!ok) fail++;
      console.log(`${ok ? "PASS" : "FAIL"} ${c.toFixed(2).padStart(5)} ${key.padEnd(11)} ${group}: border on ${bgPart} (${NON_TEXT_AA}:1)`);
    }
  }
}
console.log(`\n${checked} pairs checked, ${fail} failed (text ${AA}:1 / non-text ${NON_TEXT_AA}:1)`);
if (fail > 0) process.exit(1);
