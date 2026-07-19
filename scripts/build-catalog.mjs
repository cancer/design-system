#!/usr/bin/env node
// DESIGN.md を単一の真実の源として catalog.html を生成する。
// トークンの「値」はこのファイルに一切書かない。すべて DESIGN.md から読む。
// 依存パッケージ無し（怠惰: 新規 npm install を避ける）。
//
// 層は primitive（値の尺度）→ 役割（roles から <役割>-color-<段> を導出）→ component（意味の完成点）。
// 共有結合（semantic）層は共有される行が現れるまで作らない。
// このカタログ自身の chrome 色は screen component トークンを参照する（1 消費者としての利用）。
//
// usage: node scripts/build-catalog.mjs [path/to/DESIGN.md] [path/to/catalog.html]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, "DESIGN.md");
const OUT = process.argv[3] ? resolve(process.argv[3]) : resolve(ROOT, "catalog.html");

// ── フロントマター抽出 ────────────────────────────────────────────────
const raw = readFileSync(SRC, "utf8");
const fm = raw.match(/^---\n([\s\S]*?)\n---/);
if (!fm) throw new Error(`frontmatter not found in ${SRC}`);
const body = raw.slice(fm[0].length);

// ── 最小 YAML パーサ（このファイルの 2 階層・2-space インデント構造専用）──
// トップキー: colors / roles / components / typography / rounded / spacing。
// colors|roles|rounded|spacing はフラット、components|typography は 2 階層。
const unquote = (v) => v.replace(/^["']|["']$/g, "");
// 値の末尾インラインコメントを落とす（引用符付きの値には触れない）。
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
        // ネストの親（typography の h1: 等）
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
const rolesMap = data.roles || {};
const components = data.components || {};
const typography = data.typography || {};
const rounded = data.rounded || {};
const spacing = data.spacing || {};

// ── shadow は本文の CSS フェンスに定義される（frontmatter に elevation 型が無い）──
const shadows = {};
for (const m of body.matchAll(/--shadow-(\w+):\s*([^;]+);/g)) shadows[m[1]] = m[2].trim();

// ── primitive をスケール別に整理 ──────────────────────────────────────
const STEP_RE = /^([a-z]+)-(\d+)$/;
const scales = {};
for (const [k, v] of Object.entries(colors)) {
  const m = k.match(STEP_RE);
  if (!m) continue;
  const [, name, step] = m;
  (scales[name] ||= { steps: [] }).steps.push({ step: Number(step), key: k, value: v });
}
for (const s of Object.values(scales)) s.steps.sort((a, b) => a.step - b.step);
// 色相は oklch の 3 番目の成分から取る（値の重複定義を避ける）
const hueOf = (oklch) => (oklch.match(/oklch\([\d.]+\s+[\d.]+\s+([\d.]+)\)/) || [])[1] || "";
// スケール → それを担う role（roles から逆引き。注記の重複定義を避ける）
const scaleRole = {};
for (const [role, sc] of Object.entries(rolesMap)) scaleRole[sc] = role;
// 役割層の導出トークン（<役割>-color-<段>）。値は roles→primitive の解決結果
const roleScales = Object.entries(rolesMap).map(([role, family]) => {
  if (!scales[family]) throw new Error(`roles.${role}: 未定義のスケール "${family}"`);
  return { role, family, steps: scales[family].steps.map((st) => ({ step: st.step, key: `${role}-color-${st.step}`, value: st.value })) };
});
// component トークンを component 名でグループ化（screen / button / note …）
const compGroups = {};
for (const [k, t] of Object.entries(components)) (compGroups[k.split("-")[0]] ||= []).push([k, t]);
// button / note 等の variant（色の行の命名 <component>-<variant>-<部位>-color から抽出。非色の行は含めない）
const variantsOf = (comp) => [...new Set(Object.entries(components)
  .filter(([k, t]) => k.startsWith(`${comp}-`) && typeof t === "object").map(([k]) => k.split("-")[1]))];
const NOTE_SAMPLE = { success: "保存しました。", warning: "未保存の変更があります。", danger: "この操作は取り消せません。", neutral: "補足: カタログは派生物。手編集しない。" };
// icon のデモ用ダミーグリフ（サンプルコンテンツ。グリフの語彙は正に無く、プロジェクト側 DESIGN.md が定義する）
const ICON_SAMPLE = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-0.125em"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-6"/></svg>`;

// ── 役割層トークン <役割>-color-<段> を roles 経由で primitive へ解決 ──
const ROLE_TOKEN_RE = /^([a-z]+)-color-(\d+)$/;
function resolveRoleToken(ref, ctx) {
  const m = String(ref).match(ROLE_TOKEN_RE);
  if (!m) throw new Error(`${ctx}: 役割層トークンではない参照 "${ref}"（<役割>-color-<段> の形で書く）`);
  const family = rolesMap[m[1]];
  if (!family) throw new Error(`${ctx}: 未定義の役割 "${m[1]}"（${ref}）`);
  const value = colors[`${family}-${m[2]}`];
  if (!value) throw new Error(`${ctx}: 未定義の段 "${family}-${m[2]}"（${ref}）`);
  return value;
}

// ── component トークンを CSS 変数へ ──────────────────────────────────
// 色の行は {light, dark} の分岐オブジェクト（役割層トークン参照）。
// 非色の行は文字列で、名前の値種別 suffix が示す尺度のキーを直接参照する。
const fontShorthand = (t) => `${t.fontWeight} ${t.fontSize}/${t.lineHeight} ${/mono/.test(t.fontFamily) ? "var(--font-mono)" : "var(--font-sans)"}`;
function resolveScaleToken(name, key) {
  const pick = (scale, kind) => {
    if (!scale[key]) throw new Error(`components.${name}: 未定義の ${kind} キー "${key}"`);
    return scale[key];
  };
  if (name.endsWith("-typography")) return fontShorthand(pick(typography, "typography"));
  if (name.endsWith("-rounded")) return pick(rounded, "rounded");
  if (name.endsWith("-spacing")) return pick(spacing, "spacing");
  if (name.endsWith("-shadow")) return pick(shadows, "shadow");
  if (name.endsWith("-color")) {
    // 分岐を持たない色の行は文脈への委譲だけ。値を持つ色は light/dark 分岐で役割層トークンを参照する
    if (key === "currentColor") return key;
    throw new Error(`components.${name}: 分岐を持たない色の行に書けるのは委譲キーワード currentColor のみ（"${key}"）`);
  }
  throw new Error(`components.${name}: 値種別を名前から特定できない（-color/-typography/-rounded/-spacing/-shadow のいずれかで終える）`);
}
const themed = Object.entries(components).filter(([, t]) => typeof t === "object");
const statics = Object.entries(components).filter(([, t]) => typeof t === "string");
for (const [k, t] of themed) {
  for (const mode of ["light", "dark"]) {
    if (!t[mode]) throw new Error(`components.${k}: ${mode} の分岐が無い`);
  }
  for (const key of Object.keys(t)) {
    if (!/^(?:[a-z]+-)?(?:light|dark)$/.test(key)) throw new Error(`components.${k}: 不正な分岐キー "${key}"（light / dark / <state>-light / <state>-dark）`);
    resolveRoleToken(t[key], `components.${k}.${key}`); // 事前検証
  }
}
// theme ごとに基本の変数、state 分岐は --<token>-<state> の変数として出す
const componentVars = (mode) => themed.flatMap(([k, t]) =>
  Object.keys(t).filter((key) => key.endsWith(mode))
    .map((key) => {
      const state = key === mode ? "" : `-${key.slice(0, -(mode.length + 1))}`;
      return `    --${k}${state}: ${resolveRoleToken(t[key], k)};`;
    })).join("\n");
const staticVars = statics.map(([k, v]) => `    --${k}: ${resolveScaleToken(k, v)};`).join("\n");

// ── カタログ用スナップショット ─────────────────────────────────────────
// カタログは variant × theme × state の全分岐を静的に描画する。hover / focus / テーマ切替の
// 操作（JS・擬似クラス）に頼らない。各タイルは component 自身のトークンを resolve した値だけで組む。
const cval = (name, key) => {
  const t = components[name];
  return resolveRoleToken(t[key] ?? t[key.endsWith("dark") ? "dark" : "light"], name);
};
const sval = (name) => resolveScaleToken(name, components[name]);
// 対象行が持つ分岐キーの全列挙（light → state-light → dark → state-dark の順）
const branchKeysOf = (names) => {
  const keys = new Set();
  for (const n of names) if (typeof components[n] === "object") for (const k of Object.keys(components[n])) keys.add(k);
  const states = [...new Set([...keys].filter((k) => k.includes("-")).map((k) => k.split("-")[0]))];
  return ["light", ...states.map((s) => `${s}-light`), "dark", ...states.map((s) => `${s}-dark`)];
};
// タイルの地は screen トークン（component は screen の上に置かれるため）
// そのタイルが使うトークン名 → この分岐で実際に使われる参照（色は分岐の役割層トークン、非色は尺度キー）
const useRef = (name, key) => {
  const t = components[name];
  return typeof t === "string" ? t : (t[key] ?? t[key.endsWith("dark") ? "dark" : "light"]);
};
const snap = (key, inner, uses) => `      <div class="snap" style="background:${cval("screen-background-color", key)};color:${cval("screen-text-color", key)}"><div class="snap-cap">${key}</div>${inner}<div class="uses" style="color:${cval("screen-text-muted-color", key)}">${uses.map((n) => `<div><code>${n}</code><span>${useRef(n, key)}</span></div>`).join("")}</div></div>`;
// 分岐は theme で対になるため 2 カラム固定（light 系の行 → dark 系の行）。スクロールも任意折返しもしない
const snapGrid = (tiles) => `    <div class="snap-grid">\n${tiles.join("\n")}\n    </div>\n`;

const SNAPSHOTS = {
  screen: () => snapGrid(["light", "dark"].map((key) => snap(key,
    `<div style="display:grid;gap:${spacing.xs};width:100%"><span>text</span><span style="color:${cval("screen-text-muted-color", key)}">text-muted</span><span style="color:${cval("screen-accent-color", key)}">accent</span><div style="background:${cval("screen-surface-color", key)};border:1px solid ${cval("screen-border-color", key)};border-radius:${rounded.sm};padding:${spacing.xs} ${spacing.sm}">surface / border</div></div>`, ["screen-text-color","screen-text-muted-color","screen-accent-color","screen-background-color","screen-surface-color","screen-border-color"]))),
  icon: () => snapGrid(["light", "dark"].map((key) => snap(key,
    `<div style="display:flex;flex-wrap:wrap;gap:${spacing.md};align-items:center">${[
      ["text", cval("screen-text-color", key)],
      ["text-muted", cval("screen-text-muted-color", key)],
      ["accent", cval("screen-accent-color", key)],
    ].map(([lbl, c]) => `<span style="display:inline-flex;gap:${spacing.xs};align-items:center;color:${c}">${ICON_SAMPLE}${lbl}</span>`).join("")}</div>`,
    ["icon-color"]))),
  link: () => ["light", "dark"].map((th) => snapGrid(["", "hover-", "active-", "focus-"].map((st) => {
    const key = `${st}${th}`;
    const style = `color:${cval("link-text-color", key)};text-decoration:underline${st === "focus-" ? ";outline:auto;outline-offset:2px" : ""}`;
    return snap(key, `本文の中の<a href="#link" style="${style}">リンク</a>はこう見える。`, ["link-text-color"]);
  }))).join(""),
  button: () => variantsOf("button").map((v) => {
    const base = [`button-${v}-surface-color`, `button-${v}-text-color`, `button-${v}-text-typography`, `button-${v}-rounded`, `button-${v}-padding-block-spacing`, `button-${v}-padding-inline-spacing`];
    return ["light", "dark"].map((th) => snapGrid(["", "hover-", "active-", "focus-", "disabled-"].map((st) => {
      const key = `${st}${th}`;
      const focus = st === "focus-";
      const style = `background:${cval(`button-${v}-surface-color`, key)};color:${cval(`button-${v}-text-color`, key)};font:${sval(`button-${v}-text-typography`)};border:0;border-radius:${sval(`button-${v}-rounded`)};padding:${sval(`button-${v}-padding-block-spacing`)} ${sval(`button-${v}-padding-inline-spacing`)}${focus ? ";outline:auto;outline-offset:2px" : ""}`;
      return snap(key, `<button style="${style}">${v}</button>`, base);
    }))).join("");
  }).join(""),
  note: () => variantsOf("note").map((v) => snapGrid(["light", "dark"].map((key) => snap(key,
    `<div style="background:${cval(`note-${v}-surface-color`, key)};border:1px solid ${cval(`note-${v}-border-color`, key)};color:${cval(`note-${v}-text-color`, key)};font:${sval(`note-${v}-text-typography`)};border-radius:${sval(`note-${v}-rounded`)};padding:${sval(`note-${v}-padding-block-spacing`)} ${sval(`note-${v}-padding-inline-spacing`)};width:100%"><b>${v}</b> — ${NOTE_SAMPLE[v] || ""}</div>`, [`note-${v}-surface-color`,`note-${v}-border-color`,`note-${v}-text-color`,`note-${v}-text-typography`,`note-${v}-rounded`,`note-${v}-padding-block-spacing`,`note-${v}-padding-inline-spacing`])))).join(""),
  card: () => snapGrid(["light", "dark"].map((key) => snap(key,
    `<div style="background:${cval("card-surface-color", key)};border:1px solid ${cval("card-border-color", key)};border-radius:${sval("card-rounded")};padding:${sval("card-padding-spacing")};box-shadow:${sval("card-shadow")};width:100%">card — 面の分離</div>`, ["card-surface-color","card-border-color","card-rounded","card-padding-spacing","card-shadow"]))),
  badge: () => variantsOf("badge").map((v) => snapGrid(["light", "dark"].map((key) => snap(key,
    `<span style="background:${cval(`badge-${v}-surface-color`, key)};color:${cval(`badge-${v}-text-color`, key)};font:${sval(`badge-${v}-text-typography`)};border-radius:${sval(`badge-${v}-rounded`)};padding:${sval(`badge-${v}-padding-block-spacing`)} ${sval(`badge-${v}-padding-inline-spacing`)}">${v}</span>`, [`badge-${v}-surface-color`,`badge-${v}-text-color`,`badge-${v}-text-typography`,`badge-${v}-rounded`,`badge-${v}-padding-block-spacing`,`badge-${v}-padding-inline-spacing`])))).join(""),
  input: () => ["light", "dark"].map((th) => snapGrid(["", "hover-", "focus-", "disabled-", "invalid-"].map((st) => {
    const key = `${st}${th}`;
    const focus = st === "focus-";
    const base = ["input-surface-color", "input-border-color", "input-text-color", "input-placeholder-color", "input-text-typography", "input-rounded", "input-padding-block-spacing", "input-padding-inline-spacing"];
    const style = `background:${cval("input-surface-color", key)};color:${cval("input-text-color", key)};border:1px solid ${cval("input-border-color", key)};font:${sval("input-text-typography")};border-radius:${sval("input-rounded")};padding:${sval("input-padding-block-spacing")} ${sval("input-padding-inline-spacing")};width:100%;box-sizing:border-box${focus ? ";outline:auto;outline-offset:2px" : ""}`;
    return snap(key,
      `<input readonly value="入力済みの文字" style="${style}"><input readonly placeholder="placeholder" class="ph-${key.endsWith("dark") ? "dark" : "light"}" style="${style}">`,
      base);
  }))).join(""),
};

// ── カタログ自身の chrome は screen component トークンを参照する ─────────
const chromeVars = `    --color-background: var(--screen-background-color);
    --color-surface: var(--screen-surface-color);
    --color-border: var(--screen-border-color);
    --color-text: var(--screen-text-color);
    --color-text-muted: var(--screen-text-muted-color);
    --color-primary: var(--screen-accent-color);`;
const shadowVars = (dark) => Object.entries(shadows).map(([k, v]) =>
  dark ? `    --shadow-${k}: ${v.replace(/rgb\(0 0 0 \/ [\d.]+\)/, (mm) => mm.replace(/[\d.]+\)$/, "0.5)"))};`
       : `    --shadow-${k}: ${v};`).join("\n");

// ── typography サンプル文（役割ごと。値ではなく体裁確認用の文言）─────────
const TYPE_SAMPLE = {
  h1: "見出しレベル1 · Aa 亜", h2: "見出しレベル2 · Aa 亜", h3: "見出しレベル3 · Aa 亜",
  "body-md": "本文。行長が伸びるほど行間を広げる。読みやすさは行長と行間で作る。",
  "body-sm": "補助本文。注釈やメタ情報など、主たる本文の一段下の情報に。",
  caption: "キャプション。図表の説明やタイムスタンプなど最小の補助テキスト。",
  label: "ラベル。ボタン・フォームラベル等の1行 UI テキスト。",
  code: 'const token = "ui-monospace"; // 等幅',
};
const SHADOW_USE = { sm: "面の分離", md: "浮いた要素", lg: "モーダル" };

const remToPx = (v) => { const m = String(v).match(/^([\d.]+)rem$/); return m ? `${Number(m[1]) * 16}px` : v; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const version = (fm[1].match(/^version:\s*(.+)$/m) || [])[1] || "";
const dsName = (fm[1].match(/^name:\s*(.+)$/m) || [])[1] || "Design System";

// スケール strip を描く（primitive と roles で共用）
const strip = (s) => `      <div class="steps">
${s.steps.map((st) => `        <div class="step"><div class="chip" style="background:${st.value}" title="${st.key}  ${st.value}"></div><div class="lbl">${st.step}</div></div>`).join("\n")}
      </div>`;

// ── HTML 生成 ─────────────────────────────────────────────────────────
const html = `<title>Design Token Catalog — ${esc(dsName)}</title>
<style>
  :root {
${componentVars("light")}
${staticVars}
${chromeVars}
    --space-xs: ${spacing.xs}; --space-sm: ${spacing.sm}; --space-md: ${spacing.md};
    --space-lg: ${spacing.lg}; --space-xl: ${spacing.xl}; --space-2xl: ${spacing["2xl"]}; --space-3xl: ${spacing["3xl"]};
    --radius-sm: ${rounded.sm}; --radius-md: ${rounded.md}; --radius-lg: ${rounded.lg}; --radius-full: ${rounded.full};
${shadowVars(false)}
    --font-sans: system-ui, sans-serif;
    --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
${componentVars("dark")}
${shadowVars(true)}
    }
  }
  :root[data-theme="light"] {
${componentVars("light")}
${shadowVars(false)}
  }
  :root[data-theme="dark"] {
${componentVars("dark")}
${shadowVars(true)}
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--color-background); color: var(--color-text); font-family: var(--font-sans); line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: var(--space-2xl) var(--space-lg) var(--space-3xl); }
  header.masthead { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-md); padding-bottom: var(--space-lg); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-2xl); }
  .masthead h1 { font-size: ${typography.h1.fontSize}; font-weight: ${typography.h1.fontWeight}; line-height: ${typography.h1.lineHeight}; letter-spacing: ${typography.h1.letterSpacing}; margin: 0; text-wrap: balance; }
  .masthead .sub { color: var(--color-text-muted); font-size: 0.875rem; margin-top: var(--space-xs); }
  .eyebrow { font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-primary); margin: 0 0 var(--space-xs); }
  section { margin-bottom: var(--space-3xl); scroll-margin-top: var(--space-lg); }
  h2.section-title { font-size: ${typography.h2.fontSize}; font-weight: ${typography.h2.fontWeight}; line-height: ${typography.h2.lineHeight}; letter-spacing: ${typography.h2.letterSpacing}; margin: 0 0 var(--space-xs); }
  .section-note { color: var(--color-text-muted); font-size: 0.875rem; max-width: 62ch; margin: 0 0 var(--space-lg); }
  code, .mono { font-family: var(--font-mono); font-size: 0.8125rem; }
  nav.toc { display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-bottom: var(--space-2xl); }
  nav.toc a { font-family: var(--font-mono); font-size: 0.75rem; text-decoration: none; color: var(--color-text-muted); border: 1px solid var(--color-border); border-radius: var(--radius-full); padding: var(--space-xs) var(--space-md); transition: color .12s, border-color .12s; }
  nav.toc a:hover { color: var(--color-primary); border-color: var(--color-primary); }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; border-radius: var(--radius-sm); }
  .scale { margin-bottom: var(--space-lg); }
  .scale-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--space-sm); }
  .scale-head .name { font-weight: 700; font-size: 0.9375rem; }
  .scale-head .hue { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-text-muted); }
  .steps { display: grid; grid-template-columns: repeat(11, 1fr); gap: 3px; }
  .step { display: flex; flex-direction: column; }
  .step .chip { aspect-ratio: 1 / 1.15; border-radius: var(--radius-sm); border: 1px solid rgb(0 0 0 / 0.06); }
  .step .lbl { font-family: var(--font-mono); font-size: 0.625rem; color: var(--color-text-muted); text-align: center; margin-top: 4px; }
  .type-row { display: grid; gap: var(--space-xs); padding: var(--space-md) 0; border-top: 1px solid var(--color-border); }
  .type-row .meta { font-family: var(--font-mono); font-size: 0.6875rem; color: var(--color-text-muted); }
  .type-row .specimen { margin: 0; }
  .space-row { display: grid; grid-template-columns: 4rem 7rem 1fr; align-items: center; gap: var(--space-md); padding: var(--space-xs) 0; }
  .space-row .k { font-family: var(--font-mono); font-weight: 700; font-size: 0.8125rem; }
  .space-row .v { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
  .space-bar { height: 16px; background: var(--color-primary); border-radius: var(--radius-sm); }
  .radius-grid, .shadow-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-lg); }
  .radius-card, .shadow-card { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); }
  .radius-demo { width: 96px; height: 96px; background: var(--color-primary); border: 1px solid var(--color-border); }
  .shadow-demo { width: 100%; height: 96px; background: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
  .radius-card .cap, .shadow-card .cap { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-text-muted); text-align: center; }
  .radius-card .cap b, .shadow-card .cap b { color: var(--color-text); }
  .snap-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-sm); margin-bottom: var(--space-md); }
  .snap { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-md); display: grid; gap: var(--space-sm); justify-items: start; align-content: start; }
  .snap-cap { font-family: var(--font-mono); font-size: 0.625rem; opacity: 0.7; }
  .ph-light::placeholder { color: ${cval("input-placeholder-color", "light")}; opacity: 1; }
  .ph-dark::placeholder { color: ${cval("input-placeholder-color", "dark")}; opacity: 1; }
  .comp-name { font-size: ${typography.h3.fontSize}; font-weight: ${typography.h3.fontWeight}; line-height: ${typography.h3.lineHeight}; margin: var(--space-xl) 0 var(--space-xs); }
  .uses { font-family: var(--font-mono); font-size: 0.625rem; width: 100%; margin-top: var(--space-xs); }
  .uses div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 var(--space-md); align-items: baseline; padding: 2px 0; border-top: 1px solid rgb(128 128 128 / 0.2); }
  .uses code { word-break: break-word; }
  .uses span { white-space: nowrap; }
  .theme-toggle { font-family: var(--font-mono); font-size: 0.75rem; cursor: pointer; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-full); padding: var(--space-xs) var(--space-md); }
  .theme-toggle:hover { border-color: var(--color-primary); color: var(--color-primary); }
  @media (max-width: 720px) { .masthead h1 { font-size: ${typography.h2.fontSize}; } }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<div class="wrap">
  <header class="masthead">
    <div>
      <p class="eyebrow">Token Catalog · version ${esc(version)}</p>
      <h1>${esc(dsName)}</h1>
      <p class="sub">DESIGN.md から自動生成。層は primitive → 役割 → component（意味の完成点）。共有結合（semantic）層は共有される行が現れるまで作らない。このページの chrome は screen component トークンの消費。</p>
    </div>
    <button class="theme-toggle" id="themeToggle" aria-label="テーマ切替">◐ theme</button>
  </header>

  <nav class="toc" aria-label="目次">
    <a href="#primitives">colors</a><a href="#typography">typography</a><a href="#spacing">spacing</a>
    <a href="#radius">radius</a><a href="#elevation">elevation</a><a href="#roles">roles</a><a href="#components">components</a>
  </nav>

  <section id="primitives">
    <h2 class="section-title">Color — Primitive</h2>
    <p class="section-note">トーナルスケール（値の尺度）。OKLCH で色相ごとに H を固定し、明度 L を全色相共通の段で刻む。<b>このシステムが持つ唯一の「色」。</b>段は component×部位×役割が揃って初めて一意になる。</p>
${Object.entries(scales).map(([name, s]) => `    <div class="scale">
      <div class="scale-head"><span class="name">${name}</span><span class="hue">H ${hueOf(s.steps[0].value)}°${scaleRole[name] ? ` · role: ${scaleRole[name]}` : ""}</span></div>
${strip(s)}
    </div>`).join("\n")}
  </section>

  <section id="typography">
    <h2 class="section-title">Typography</h2>
    <p class="section-note">見出しは 1.25 (Major Third) スケール。フォントは <code>system-ui</code> / <code>ui-monospace</code> 既定で OS ネイティブに委ねる。</p>
${Object.entries(typography).map(([name, t]) => {
  const mono = /mono/.test(t.fontFamily);
  const ls = t.letterSpacing && t.letterSpacing !== "normal" ? ` · ls ${t.letterSpacing}` : "";
  const style = `font-size:${t.fontSize};font-weight:${t.fontWeight};line-height:${t.lineHeight};${t.letterSpacing ? `letter-spacing:${t.letterSpacing};` : ""}font-family:${mono ? "var(--font-mono)" : "var(--font-sans)"}`;
  return `    <div class="type-row"><div class="meta">${name} · ${t.fontSize} · ${t.fontWeight} · lh ${t.lineHeight}${ls} · ${t.fontFamily}</div><p class="specimen" style="${style}">${esc(TYPE_SAMPLE[name] || name)}</p></div>`;
}).join("\n")}
  </section>

  <section id="spacing">
    <h2 class="section-title">Spacing</h2>
    <p class="section-note">4px ベースの名前付きスケール。余白はここからのみ選ぶ。</p>
${Object.entries(spacing).map(([k, v]) => `    <div class="space-row"><span class="k">${k}</span><span class="v">${v} / ${remToPx(v)}</span><div class="space-bar" style="width:${v}"></div></div>`).join("\n")}
  </section>

  <section id="radius">
    <h2 class="section-title">Radius</h2>
    <p class="section-note">角丸4段。sm=小要素、md=カード・ボタン、lg=大きな面、full=円/ピル。</p>
    <div class="radius-grid">
${Object.entries(rounded).map(([k, v]) => `      <div class="radius-card"><div class="radius-demo" style="border-radius:${v}"></div><div class="cap"><b>${k}</b> · ${v}</div></div>`).join("\n")}
    </div>
  </section>

  <section id="elevation">
    <h2 class="section-title">Elevation</h2>
    <p class="section-note">影3段。sm=面の分離、md=浮いた要素、lg=モーダル。ダークでは neutral の淡い段で縁を補う。</p>
    <div class="shadow-grid">
${Object.entries(shadows).map(([k, v]) => `      <div class="shadow-card"><div class="shadow-demo" style="box-shadow:${v}"></div><div class="cap"><b>${k}</b> · ${SHADOW_USE[k] || ""}</div></div>`).join("\n")}
    </div>
  </section>
  <section id="roles">
    <h2 class="section-title">Roles（役割層）</h2>
    <p class="section-note">意味の発生源。役割→色相族の対応だけを決め、トークン <code>&lt;役割&gt;-color-&lt;段&gt;</code> は roles から機械的に導出される。component はこの名前だけを参照し、色相族を知らない（族の付け替えは roles の1行）。役割が定義されているのは現在色だけ。</p>
${roleScales.map(({ role, family, steps }) => `    <div class="scale">
      <div class="scale-head"><span class="name">${role}</span><span class="hue">→ ${family}</span></div>
${strip({ steps })}
    </div>`).join("\n")}
  </section>

  <section id="components">
    <h2 class="section-title">Components（意味の完成点）</h2>
    <p class="section-note">component×部位（×variant）で値が一意に決まる行を明示定義する。色は役割層トークンへの参照、非色（typography / rounded / spacing / shadow）は尺度のキーを直接参照。theme / state（hover / focus）は名前へ焼き付けない分岐キーで、以下は全分岐（variant × theme × state）の静的スナップショット。</p>
${Object.keys(compGroups).map((g) => `    <h3 class="comp-name">${g}</h3>
${SNAPSHOTS[g] ? SNAPSHOTS[g]() : ""}`).join("\n")}
  </section>

</div>

<script>
  const root = document.documentElement;
  document.getElementById("themeToggle").addEventListener("click", () => {
    const cur = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    root.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  });
</script>
`;

writeFileSync(OUT, html);
const primitiveCount = Object.values(scales).reduce((a, s) => a + s.steps.length, 0);
console.log(`✓ ${OUT}`);
console.log(`  primitive: ${primitiveCount} · roles: ${Object.keys(rolesMap).length} · components: ${Object.keys(components).length} · type: ${Object.keys(typography).length} · spacing: ${Object.keys(spacing).length} · radius: ${Object.keys(rounded).length} · shadow: ${Object.keys(shadows).length}`);
