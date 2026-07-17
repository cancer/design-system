#!/usr/bin/env node
// DESIGN.md を単一の真実の源として catalog.html を生成する。
// トークンの「値」はこのファイルに一切書かない。すべて DESIGN.md から読む。
// 依存パッケージ無し（怠惰: 新規 npm install を避ける）。
//
// foundation は primitive スケール ＋ role→スケールの薄い参照だけを持つ（semantic は無い）。
// このカタログ自身の chrome 色は「1 消費者としての resolve」——primitive から段を選んで引く。
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
// トップキー: colors / roles / typography / rounded / spacing。
// colors|roles|rounded|spacing はフラット、typography のみ 2 階層。
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

// ── カタログ自身の chrome を primitive から resolve ───────────────────
// このページ＝1 消費者。role×subject×theme を「自分用に」解決した結果。foundation の正ではない。
const chrome = {
  light: { background: "neutral-100", surface: "neutral-50", border: "neutral-200", text: "neutral-900", "text-muted": "neutral-700", primary: "blue-700" },
  dark: { background: "neutral-950", surface: "neutral-900", border: "neutral-700", text: "neutral-50", "text-muted": "neutral-400", primary: "blue-500" },
};
const chromeVars = (mode) => Object.entries(chrome[mode])
  .map(([role, step]) => `    --color-${role}: ${colors[step]};`).join("\n");
const shadowVars = (dark) => Object.entries(shadows).map(([k, v]) =>
  dark ? `    --shadow-${k}: ${v.replace(/rgb\(0 0 0 \/ [\d.]+\)/, (mm) => mm.replace(/[\d.]+\)$/, "0.5)"))};`
       : `    --shadow-${k}: ${v};`).join("\n");

// ── typography サンプル文（役割ごと。値ではなく体裁確認用の文言）─────────
const TYPE_SAMPLE = {
  h1: "見出しレベル1 · Aa 亜", h2: "見出しレベル2 · Aa 亜", h3: "見出しレベル3 · Aa 亜",
  "body-md": "本文。行長が伸びるほど行間を広げる。読みやすさは行長と行間で作る。",
  "body-sm": "補助本文。注釈やメタ情報など、主たる本文の一段下の情報に。",
  caption: "キャプション。図表の説明やタイムスタンプなど最小の補助テキスト。",
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
${chromeVars("light")}
    --space-xs: ${spacing.xs}; --space-sm: ${spacing.sm}; --space-md: ${spacing.md};
    --space-lg: ${spacing.lg}; --space-xl: ${spacing.xl}; --space-2xl: ${spacing["2xl"]}; --space-3xl: ${spacing["3xl"]};
    --radius-sm: ${rounded.sm}; --radius-md: ${rounded.md}; --radius-lg: ${rounded.lg}; --radius-full: ${rounded.full};
${shadowVars(false)}
    --font-sans: system-ui, sans-serif;
    --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
${chromeVars("dark")}
${shadowVars(true)}
    }
  }
  :root[data-theme="light"] {
${chromeVars("light")}
${shadowVars(false)}
  }
  :root[data-theme="dark"] {
${chromeVars("dark")}
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
      <p class="sub">DESIGN.md から自動生成。foundation は primitive ＋ role→スケール参照だけを持つ（semantic は無い）。このページの chrome 色は 1 消費者としての resolve。</p>
    </div>
    <button class="theme-toggle" id="themeToggle" aria-label="テーマ切替">◐ theme</button>
  </header>

  <nav class="toc" aria-label="目次">
    <a href="#primitives">primitives</a><a href="#typography">typography</a>
    <a href="#spacing">spacing</a><a href="#radius">radius</a><a href="#elevation">elevation</a>
  </nav>

  <section id="primitives">
    <h2 class="section-title">Color — Primitive</h2>
    <p class="section-note">トーナルスケール。OKLCH で色相ごとに H を固定し、明度 L を全色相共通の段で刻む。<b>このシステムが持つ唯一の「色」。</b>role がこのスケールを指し、段は消費側で resolve される。</p>
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
console.log(`  primitive: ${primitiveCount} · roles: ${Object.keys(rolesMap).length} · type: ${Object.keys(typography).length} · spacing: ${Object.keys(spacing).length} · radius: ${Object.keys(rounded).length} · shadow: ${Object.keys(shadows).length}`);
