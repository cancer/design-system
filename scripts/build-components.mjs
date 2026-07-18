#!/usr/bin/env node
// DESIGN.md を単一の真実の源として、消費側の resolve 層 components/tokens.css を生成する。
// トークンの「値」はこのファイルに一切書かない。すべて DESIGN.md（primitive スケール）から読む。
// 依存パッケージ無し（build-catalog.mjs と同じ流儀）。
//
// 位置づけ: foundation（DESIGN.md）は primitive ＋ role→スケール参照だけを持ち、意味を持たない。
// このスクリプトは「1 消費者」として role × subject × modifier(theme/state) を primitive の段へ解決する。
// 解決の判断（どの段を選ぶか）はここ＝消費側に属する。値そのものは DESIGN.md から引く。
//
// usage: node scripts/build-components.mjs [path/to/DESIGN.md] [path/to/components/tokens.css]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, "DESIGN.md");
const OUT = process.argv[3] ? resolve(process.argv[3]) : resolve(ROOT, "components/tokens.css");

// ── フロントマター抽出 ────────────────────────────────────────────────
const raw = readFileSync(SRC, "utf8");
const fm = raw.match(/^---\n([\s\S]*?)\n---/);
if (!fm) throw new Error(`frontmatter not found in ${SRC}`);
const body = raw.slice(fm[0].length);

// ── 最小 YAML パーサ（2 階層・2-space インデント専用。build-catalog.mjs と同構造）──
const unquote = (v) => v.replace(/^["']|["']$/g, "");
const stripComment = (v) => {
  const s = v.trim();
  if (s.startsWith('"') || s.startsWith("'")) return s;
  return s.replace(/\s+#.*$/, "").trim();
};
function parseFrontmatter(text) {
  const lines = text.split("\n");
  const out = {};
  let topKey = null;
  let nestKey = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const content = line.trim();
    if (indent === 0) {
      const m = content.match(/^([\w-]+):\s*(.*)$/);
      if (!m) continue;
      topKey = m[1];
      out[topKey] = {};
      nestKey = null;
    } else if (indent === 2) {
      const m = content.match(/^([\w-]+):\s*(.*)$/);
      if (!m) continue;
      if (stripComment(m[2]) === "") {
        nestKey = m[1];
        out[topKey][nestKey] = {};
      } else {
        out[topKey][m[1]] = unquote(stripComment(m[2]));
        nestKey = null;
      }
    } else if (indent === 4 && nestKey) {
      const m = content.match(/^([\w-]+):\s*(.*)$/);
      if (!m) continue;
      out[topKey][nestKey][m[1]] = unquote(stripComment(m[2]));
    }
  }
  return out;
}

const data = parseFrontmatter(fm[1]);
const colors = data.colors || {};
const roles = data.roles || {};
const typography = data.typography || {};
const rounded = data.rounded || {};
const spacing = data.spacing || {};

// shadow は本文の CSS フェンスから読む（frontmatter に elevation 型が無い）。
const shadows = {};
for (const m of body.matchAll(/--shadow-(\w+):\s*([^;]+);/g)) shadows[m[1]] = m[2].trim();

// ── 消費側の resolve 表 ───────────────────────────────────────────────
// role をスケール名で参照しない。roles（primary→blue 等）を介してのみ色相族へ辿る。
// 段（50〜950）の選択はこの消費者の判断。theme は modifier ＝ 値ではなく引数として light/dark で持つ。
// neutral は地・構造。他 role は「塗り(solid)/その上の文字(on)/hover/淡い面(subtle)/淡い縁(border)/面上の文字(text)」。
const REF = { primary: roles.primary, danger: roles.danger, warning: roles.warning, success: roles.success, neutral: roles.neutral };

const STEP = {
  light: {
    background: [REF.neutral, 100],
    surface: [REF.neutral, 50],
    border: [REF.neutral, 200],
    text: [REF.neutral, 900],
    "text-muted": [REF.neutral, 700],
    "on-solid": [REF.neutral, 50], // 濃い塗りの上に載る文字
    primary: [REF.primary, 700],
    "primary-hover": [REF.primary, 800],
    "primary-surface": [REF.primary, 50],
    "primary-border": [REF.primary, 200],
    danger: [REF.danger, 700],
    "danger-hover": [REF.danger, 800],
    "danger-surface": [REF.danger, 50],
    "danger-border": [REF.danger, 200],
    warning: [REF.warning, 700],
    "warning-surface": [REF.warning, 50],
    "warning-border": [REF.warning, 200],
    success: [REF.success, 700],
    "success-surface": [REF.success, 50],
    "success-border": [REF.success, 200],
  },
  dark: {
    background: [REF.neutral, 950],
    surface: [REF.neutral, 900],
    border: [REF.neutral, 700],
    text: [REF.neutral, 50],
    "text-muted": [REF.neutral, 400],
    "on-solid": [REF.neutral, 950],
    primary: [REF.primary, 500],
    "primary-hover": [REF.primary, 400],
    "primary-surface": [REF.primary, 950],
    "primary-border": [REF.primary, 800],
    danger: [REF.danger, 500],
    "danger-hover": [REF.danger, 400],
    "danger-surface": [REF.danger, 950],
    "danger-border": [REF.danger, 800],
    warning: [REF.warning, 400],
    "warning-surface": [REF.warning, 950],
    "warning-border": [REF.warning, 800],
    success: [REF.success, 400],
    "success-surface": [REF.success, 950],
    "success-border": [REF.success, 800],
  },
};

// 段参照 → primitive の値（DESIGN.md から引く。無ければ throw して欠落を早期検出）。
const val = ([scale, step]) => {
  const key = `${scale}-${step}`;
  const v = colors[key];
  if (!v) throw new Error(`unresolved primitive: ${key} (role ref "${scale}" step ${step})`);
  return v;
};
const colorVars = (mode, indent) =>
  Object.entries(STEP[mode])
    .map(([name, ref]) => `${indent}--color-${name}: ${val(ref)};`)
    .join("\n");

// ── 値系トークン（theme 非依存）も DESIGN.md から出す ────────────────
const scaleVars = () => {
  const lines = [];
  for (const [k, v] of Object.entries(spacing)) lines.push(`    --space-${k}: ${v};`);
  for (const [k, v] of Object.entries(rounded)) lines.push(`    --radius-${k}: ${v};`);
  for (const [k, v] of Object.entries(shadows)) lines.push(`    --shadow-${k}: ${v};`);
  lines.push(`    --font-sans: system-ui, sans-serif;`);
  lines.push(`    --font-mono: ui-monospace, monospace;`);
  for (const [k, t] of Object.entries(typography)) {
    lines.push(`    --text-${k}: ${t.fontSize};`);
    lines.push(`    --weight-${k}: ${t.fontWeight};`);
    lines.push(`    --leading-${k}: ${t.lineHeight};`);
    if (t.letterSpacing) lines.push(`    --tracking-${k}: ${t.letterSpacing};`);
  }
  return lines.join("\n");
};
// dark で影を強める（DESIGN.md「ダークは影が弱く見える」）。値は light の alpha を持ち上げるだけ。
const shadowVarsDark = (indent) =>
  Object.entries(shadows)
    .map(([k, v]) => `${indent}--shadow-${k}: ${v.replace(/rgb\(0 0 0 \/ [\d.]+\)/, (mm) => mm.replace(/[\d.]+\)$/, "0.5)"))};`)
    .join("\n");

const version = (fm[1].match(/^version:\s*(.+)$/m) || [])[1] || "";

// ── 生成 ──────────────────────────────────────────────────────────────
const css = `/*
 * components/tokens.css — 生成物（DESIGN.md → build-components.mjs）。手編集しない。
 *
 * これは foundation ではなく「1 消費者の resolve 層」。DESIGN.md の role（primary 等）と
 * primitive スケールから、role × subject × theme を具体段へ解決した結果を CSS 変数で束ねる。
 * 値の源は DESIGN.md だけ。段の選択（consumer の判断）は build-components.mjs の STEP 表にある。
 * theme は modifier: -dark 名を作らず、@media と [data-theme] で同じ変数を切り替える。
 *
 * version: ${version}
 */

:root {
${colorVars("light", "    ")}
${scaleVars()}
  }

@media (prefers-color-scheme: dark) {
  :root {
${colorVars("dark", "    ")}
${shadowVarsDark("    ")}
  }
}

:root[data-theme="light"] {
${colorVars("light", "    ")}
  }

:root[data-theme="dark"] {
${colorVars("dark", "    ")}
${shadowVarsDark("    ")}
  }
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, css);
const colorCount = Object.keys(STEP.light).length;
console.log(`✓ ${OUT}`);
console.log(
  `  color(resolved): ${colorCount} · roles: ${Object.keys(roles).length} · type: ${Object.keys(typography).length} · spacing: ${Object.keys(spacing).length} · radius: ${Object.keys(rounded).length} · shadow: ${Object.keys(shadows).length}`,
);
