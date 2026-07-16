---
version: alpha
name: Personal Design System
description: 個人プロジェクト横断で使う自分用デザインシステム。各プロジェクトのルートにこのファイルをコピーして使う。
colors:
  # === Primitive（トーナルスケール。直接使わず semantic から参照する）===
  # OKLCH で生成。色相ごとに H を固定し、L を全色相共通の段で刻む。
  # C は各 (L,H) で sRGB gamut に収まる範囲でタペール（中間で最大）。
  neutral-50: "oklch(0.985 0.004 270)"
  neutral-100: "oklch(0.965 0.004 270)"
  neutral-200: "oklch(0.925 0.004 270)"
  neutral-300: "oklch(0.87 0.004 270)"
  neutral-400: "oklch(0.79 0.004 270)"
  neutral-500: "oklch(0.68 0.004 270)"
  neutral-600: "oklch(0.585 0.004 270)"
  neutral-700: "oklch(0.49 0.004 270)"
  neutral-800: "oklch(0.395 0.004 270)"
  neutral-900: "oklch(0.3 0.004 270)"
  neutral-950: "oklch(0.21 0.004 270)"
  blue-50: "oklch(0.985 0.0069 264)"
  blue-100: "oklch(0.965 0.0161 264)"
  blue-200: "oklch(0.925 0.0351 264)"
  blue-300: "oklch(0.87 0.0621 264)"
  blue-400: "oklch(0.79 0.1036 264)"
  blue-500: "oklch(0.68 0.1648 264)"
  blue-600: "oklch(0.585 0.17 264)"
  blue-700: "oklch(0.49 0.1496 264)"
  blue-800: "oklch(0.395 0.119 264)"
  blue-900: "oklch(0.3 0.0884 264)"
  blue-950: "oklch(0.21 0.0612 264)"
  green-50: "oklch(0.985 0.018 150)"
  green-100: "oklch(0.965 0.033 150)"
  green-200: "oklch(0.925 0.063 150)"
  green-300: "oklch(0.87 0.099 150)"
  green-400: "oklch(0.79 0.135 150)"
  green-500: "oklch(0.68 0.15 150)"
  green-600: "oklch(0.585 0.15 150)"
  green-700: "oklch(0.49 0.132 150)"
  green-800: "oklch(0.395 0.105 150)"
  green-900: "oklch(0.3 0.078 150)"
  green-950: "oklch(0.21 0.054 150)"
  amber-50: "oklch(0.985 0.0117 75)"
  amber-100: "oklch(0.965 0.0276 75)"
  amber-200: "oklch(0.925 0.0604 75)"
  amber-300: "oklch(0.87 0.099 75)"
  amber-400: "oklch(0.79 0.135 75)"
  amber-500: "oklch(0.68 0.1406 75)"
  amber-600: "oklch(0.585 0.1209 75)"
  amber-700: "oklch(0.49 0.1013 75)"
  amber-800: "oklch(0.395 0.0817 75)"
  amber-900: "oklch(0.3 0.062 75)"
  amber-950: "oklch(0.21 0.0434 75)"
  red-50: "oklch(0.985 0.0071 25)"
  red-100: "oklch(0.965 0.0168 25)"
  red-200: "oklch(0.925 0.0373 25)"
  red-300: "oklch(0.87 0.068 25)"
  red-400: "oklch(0.79 0.1188 25)"
  red-500: "oklch(0.68 0.19 25)"
  red-600: "oklch(0.585 0.19 25)"
  red-700: "oklch(0.49 0.1672 25)"
  red-800: "oklch(0.395 0.133 25)"
  red-900: "oklch(0.3 0.0988 25)"
  red-950: "oklch(0.21 0.0684 25)"
  # === Semantic — Light（default。primitive の段を参照。段は AA 4.5:1 で検証済み）===
  background: "{colors.neutral-100}"
  surface: "{colors.neutral-50}"
  border: "{colors.neutral-200}"
  text: "{colors.neutral-900}"
  text-muted: "{colors.neutral-700}"
  primary: "{colors.blue-700}"
  primary-hover: "{colors.blue-800}"
  on-primary: "{colors.neutral-50}"
  success: "{colors.green-700}"
  warning: "{colors.amber-700}"
  danger: "{colors.red-700}"
  # === Semantic — Dark ===
  background-dark: "{colors.neutral-950}"
  surface-dark: "{colors.neutral-900}"
  border-dark: "{colors.neutral-700}"
  text-dark: "{colors.neutral-50}"
  text-muted-dark: "{colors.neutral-400}"
  primary-dark: "{colors.blue-500}"
  primary-hover-dark: "{colors.blue-400}"
  on-primary-dark: "{colors.neutral-950}"
  success-dark: "{colors.green-400}"
  warning-dark: "{colors.amber-400}"
  danger-dark: "{colors.red-400}"
typography:
  h1:
    fontFamily: system-ui
    fontSize: 2.441rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  h2:
    fontFamily: system-ui
    fontSize: 1.953rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.01em
  h3:
    fontFamily: system-ui
    fontSize: 1.563rem
    fontWeight: 500
    lineHeight: 1.3
  body-md:
    fontFamily: system-ui
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: system-ui
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: system-ui
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: ui-monospace
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
  3xl: 4rem
---

# Personal Design System

個人プロジェクト横断で使う自分用デザインシステム。形式は [google-labs-code/design.md](https://github.com/google-labs-code/design.md)（alpha）に準拠する。上部の YAML フロントマターが機械可読なトークン、以下の本文が人間向けの原則。運用は**各プロジェクトのルートへこのファイルをコピー**する（正は `~/repos/design-system/DESIGN.md`）。

## Overview

このシステムが従うデザイン原則は、造形の原則（principles of design）。特定製品のローカルルールではなく、人間の知覚に接地した一般法則であり、発明せず適用する。トークンは、これらの原則を一貫して適用するための道具として下位に置く。

### 4大原則

- 近接（Proximity）は、関係の近い要素を近づけ、関係のない要素を離す。グループの区切りは線や色より余白で示す（支えるトークン: `spacing`）
- 整列（Alignment）は、すべての要素に共通の見えない基準線を通し、無意識に伝わる秩序をつくる（支えるトークン: `spacing` の 4px グリッド・統一した単位）
- 反復（Repetition）は、同じ視覚特徴を繰り返し、一貫性と読み方・使い方の学習可能性を生む（支えるトークン: 同じ `colors` / `typography` / `rounded` の使い回し）
- コントラスト（Contrast）は、差を中途半端にせずはっきりつける。似て非なる状態をつくらない（支えるトークン: `typography` のサイズ差・`colors`）

### 発展

- 階層（Hierarchy）は、情報の重要度を視覚的な強さの順序に対応させる（支えるトークン: `typography`・`colors`）
- 余白（Whitespace）は「空き」ではなく能動的な要素で、詰め込まず余白そのもので意味を持たせる（支えるトークン: `spacing`）
- リズム（Rhythm）は、繰り返しの間隔に規則を持たせ、視線の流れを導く（支えるトークン: `spacing` スケール）
- 強調（Emphasis）は、注目点を1つに絞る。すべてを強調することは何も強調しないことと同じ（支えるトークン: `colors` の `primary`）

以下の Do's and Don'ts は、これらの原則をこのシステムで適用した具体形。

## Colors

色は2層で持つ。**primitive**（トーナルスケール。`blue-500` のように色相＋段で名付ける）と、それを参照する **semantic**（`primary` のように役割で名付ける）。UI コードが使うのは semantic だけで、primitive は直接使わない。役割はそのままに、参照先の段を差し替えれば見た目を変えられる。

primitive は個別に hex を決めず、**カラースケール（トーナルパレット）方式**で生成する。OKLCH（知覚的に均一な色空間）で、色相ごとに H を固定し、明度 L を全色相共通の段（`50`〜`950`）で刻む。彩度 C は各段が sRGB gamut に収まる範囲で、中間段を最大にタペールする。これにより段が視覚的に均一になり、色相間で明度が揃う。

`primary` を強調色（主要アクション）とし、それ以外は無彩色（`neutral`）に寄せて主張を抑える。semantic が参照する段は、本文・アクション色が背景に対し WCAG AA（4.5:1）以上になるよう選んである。ダークモードは `-dark` サフィックスの対トークンで持つ（フロントマター仕様にダーク切替の機構は無いため、命名で対応させる）。実装側では下記のように束ねる。

```css
:root {
  --color-background: oklch(0.965 0.004 270); --color-surface: oklch(0.985 0.004 270);
  --color-border: oklch(0.925 0.004 270);
  --color-text: oklch(0.3 0.004 270); --color-text-muted: oklch(0.49 0.004 270);
  --color-primary: oklch(0.49 0.1496 264); --color-primary-hover: oklch(0.395 0.119 264);
  --color-on-primary: oklch(0.985 0.004 270);
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: oklch(0.21 0.004 270); --color-surface: oklch(0.3 0.004 270);
    --color-border: oklch(0.49 0.004 270);
    --color-text: oklch(0.985 0.004 270); --color-text-muted: oklch(0.79 0.004 270);
    --color-primary: oklch(0.68 0.1648 264); --color-primary-hover: oklch(0.79 0.1036 264);
    --color-on-primary: oklch(0.21 0.004 270);
  }
}
```

`success` / `warning` / `danger` は状態表示専用。装飾に流用しない。ダーク面では明度を上げた `-dark` 対トークン（`success-dark` 等）を使う。

## Typography

見出し（`body-md` から上）は 1.25（Major Third）のスケール比で刻む。`body-sm` / `caption` は本文より小さい補助サイズで、この比には乗せていない。フォントは `system-ui` / `ui-monospace` を既定にし、OS ネイティブの見た目に委ねる（読み込みコスト0・怠惰）。特定フォントに寄せたいプロジェクトは `fontFamily` だけ上書きする。

- 見出しは `h1`–`h3`、本文は `body-md`、補助は `body-sm` / `caption`、等幅は `code`
- `lineHeight` は本文 1.6・見出し 1.25–1.3。行長が伸びるほど行間を広げる

## Layout & Spacing

`spacing` は 4px ベースの名前付きスケール（`xs`=4 … `3xl`=64）。要素間の余白はこのスケールからのみ選ぶ。中間値が必要になったら、まず隣の段で足りるか疑う。

## Elevation & Depth

影は3段。フロントマター仕様に elevation 型が無いため、値はここで定義する。

```css
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.06);
--shadow-md: 0 4px 12px rgb(0 0 0 / 0.10);
--shadow-lg: 0 12px 32px rgb(0 0 0 / 0.14);
```

高さは意味に対応させる: `sm`=面の分離、`md`=浮いた要素（ドロップダウン）、`lg`=モーダル。ダークモードでは影が弱く見えるため、必要なら `border` で縁を足して補う。

## Shapes

角丸は `rounded` の4段（`sm` / `md` / `lg` / `full`）。`sm`=小要素（バッジ・入力）、`md`=カード・ボタン、`lg`=大きな面・モーダル、`full`=円/ピル。境界線は原則 1px・`border` 色。

## Do's and Don'ts

この見た目をどう当てるか。視覚と用法のガードレール。

### Do

- `primary`（強調色）は主要アクション1つに集中させる。画面内で多用すると主張が薄まる
- 余白を惜しまず取る。要素を詰め込むより、`spacing` の一段上を選ぶ
- 書体は sans + mono の2種に留める。強調は太さ（`fontWeight`）と大きさで作る
- 角丸は `rounded` スケールに揃える。近い要素で半径を変えない

### Don't

- 純黒 `#000` をテキストに直接使わない。`text`（最暗ではない `neutral` 段）を使う
- `primary` のボタンを隣り合わせに2つ置かない。主要アクションは画面に1つ
- `success` / `warning` / `danger` を装飾目的に使わない。状態表示専用
- スケール外の中間サイズ（余白・文字・角丸）を持ち込まない。まず隣の段で足りるか疑う

## Maintenance

このファイル自体の運用ルール（デザインの見た目ではなく、システムの保守方針）。

- トークンを**足す**のは、同じ値が2箇所以上で必要になったとき。1箇所なら足さない
- プロジェクト固有の微調整は、そのプロジェクトのローカルCSSで吸収する。ここには持ち込まない
- 生の16進カラーや px 値をコンポーネントに直書きしない。トークン経由で引く
- この正ファイルを1プロジェクトの都合で書き換えない。横断でコピーされる正のため、変更は全プロジェクトへ波及する前提で扱う
