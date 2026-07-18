# Primitive Components

DESIGN.md の primitive スケールと role を、消費側で具体段へ resolve して組んだ素の UI コンポーネント集である。`DESIGN.md` の思想（foundation は意味を持たず、段は消費側で決める）に沿って、このディレクトリを **1 消費者** として実装する。フレームワーク非依存・ゼロ依存・`system-ui` 既定。

## 位置づけ

`DESIGN.md` は foundation で、持つのは **primitive スケール** と **role→スケールの薄い参照** だけ。段（具体値）・theme・state・component は foundation の外で resolve する。ここはその resolve を担う消費側であり、foundation ではない。

- `DESIGN.md`（正）→ `scripts/build-components.mjs`（resolve）→ `components/tokens.css`（生成物）
- `tokens.css` を **手編集しない。** 次の生成で上書きされる。値を変えるなら `DESIGN.md`、段の選び方を変えるなら生成器の `STEP` 表を直す
- `components.css` は構造だけを持ち、色・余白・角丸・影・字は `tokens.css` の CSS 変数だけを引く（oklch や hex を直書きしない）

## 生成

```sh
npm run build:components   # DESIGN.md から tokens.css を再生成する
```

DESIGN.md の primitive / role を変えたら再生成する。`catalog.html` と同じく `tokens.css` は派生物である。

## 使い方

2枚の CSS を読み込み、ルート要素に `ds-root` を付けるだけである。

```html
<link rel="stylesheet" href="tokens.css" />
<link rel="stylesheet" href="components.css" />

<body class="ds-root">
  <button class="ds-btn ds-btn-primary">保存</button>
</body>
```

`index.html` をブラウザで開くと全コンポーネントを確認できる。OS の外観に追従し、右上のトグルでも light / dark を切り替えられる。

## コンポーネント

| 種別 | クラス |
| --- | --- |
| Typography | `ds-h1` `ds-h2` `ds-h3` `ds-text` `ds-text-sm` `ds-caption` `ds-muted` `ds-code` |
| Layout | `ds-stack` `ds-stack-sm` `ds-stack-lg` `ds-cluster` |
| Button | `ds-btn` + `ds-btn-primary` / `-secondary` / `-ghost` / `-danger` / `-sm` |
| Form | `ds-field` `ds-label` `ds-input` `ds-textarea` `ds-select` `ds-help` |
| Choice | `ds-check` `ds-check-label` `ds-switch` |
| Card | `ds-card` `ds-card-header` `ds-card-body` `ds-card-footer` |
| Badge | `ds-badge` + `-primary` / `-success` / `-warning` / `-danger` |
| Alert | `ds-alert` + `-info` / `-success` / `-warning` / `-danger` |

## resolve の約束

- role をスケール名で直に参照しない。`roles`（`primary→blue` など）を介してのみ色相族へ辿る。段の選択は消費側（生成器の `STEP` 表）の判断
- theme（light/dark）は modifier。`-dark` を名前に焼き付けず、`@media` と `[data-theme]` で同じ変数を切り替える
- `primary` は主要アクション1つに集中させる。`success` / `warning` / `danger` は状態表示専用で、装飾に流用しない
- 余白・角丸・文字サイズはトークンのスケールからのみ引く。フォーカスは `:focus-visible` の共通リングで示し、状態を色だけに頼らない

## エラー状態のフォーム

`ds-field` に `data-invalid="true"` を付けると、入力枠とヘルプ文言が `danger` に変わる。

```html
<label class="ds-field" data-invalid="true">
  <span class="ds-label">パスワード</span>
  <input class="ds-input" type="password" aria-invalid="true" />
  <span class="ds-help">8 文字以上にする</span>
</label>
```
