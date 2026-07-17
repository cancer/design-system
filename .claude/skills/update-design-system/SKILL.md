---
name: update-design-system
description: このリポジトリの DESIGN.md（デザイントークンの正）を変更したら、派生物 catalog.html を build-catalog.mjs で必ず再生成して乖離を防ぐ。`colors` の primitive スケール・`roles` の役割→スケール参照・typography・spacing・rounded・shadow を足す/変える、色を調整する、「DESIGN.md を更新」「トークンを追加」「カタログを更新/作り直して」と言われたら必ず使う。catalog.html は派生物なので手編集しない。DESIGN.md を読むだけ・カタログを眺めるだけなら発火しない。
argument-hint: [変更したいトークンや意図。例: spacing に 2xs を追加 / warning の色相をオレンジ寄りに]
allowed-tools: Read, Write, Edit, Bash
user-invocable: true
---

# update-design-system

`DESIGN.md` はトークンの**単一の真実の源（SoT）**。`catalog.html` はそこから機械生成される**派生物**。
両者が乖離するとカタログが嘘をつくため、DESIGN.md を触ったら必ずこの手順で catalog を作り直す。

## 前提（このデザインシステムの形）

foundation は**意味を持たない**。持つのは2つだけ。

- **primitive スケール**（`colors`。`blue-500` のように色相＋段）。OKLCH で生成し、値の源はここだけ
- **role → スケールの薄い参照**（`roles`。`primary: blue` のように役割へ色相族を割り当てる。段＝具体値は決めない）

段・theme・state・component といった具体は消費側で resolve する範囲であり、DESIGN.md には持ち込まない。詳細は `DESIGN.md` の Colors / Maintenance 節を正とする。

## 鉄則（なぜ守るか）

- **値を書くのは DESIGN.md のフロントマターだけ。** `catalog.html` と生成スクリプトのテンプレートに値を直書きすると SoT が二重化し、乖離の温床になる
- **`catalog.html` を手編集しない。** 次回生成で必ず上書きされ、手の変更は消える。直したいなら DESIGN.md か生成器を直す
- **トークンを足す基準は「抽象的な役割を名指すか」**（`DESIGN.md:243`）。使用箇所の数ではない。特定用途の具体値はローカル CSS へ

## 手順

1. **変更を DESIGN.md に入れる。** トークンはフロントマター（`colors` / `roles` / `typography` / `rounded` / `spacing`）へ書く。shadow だけは本文の CSS フェンスへ書く（フロントマター仕様に elevation 型が無いため）
   - primitive を足すときは OKLCH で、色相 H 固定・明度 L を既存の段に合わせる（`DESIGN.md:169`）
   - role は `roles` に「役割: スケール名」で書く。段は書かない
2. **カタログを再生成する。** リポジトリルートで `npm run build:catalog`（= `node scripts/build-catalog.mjs`）
3. **整合を検証する。** 次がすべて満たされること
   - 生成ログの件数（primitive / roles / type / spacing / radius / shadow）が意図と一致
   - `grep undefined catalog.html` が空（欠落・未解決の参照が無い）
   - `grep '{colors' catalog.html` が空（未解決の参照が残っていない）
4. **lint を通す。** DESIGN.md を触ったら `npm run lint:md`（rumdl）と `npm run lint`（textlint）
5. **カタログを claude.ai Artifact に上書き公開する（対話セッションのみ）。** `catalog.html` を Artifact ツールで publish する。**既存 URL を必ず `url` に渡して同一 artifact を上書き**する（渡さないと URL が散らばる）
   - 現在の公開先: `https://claude.ai/code/artifact/0932c55d-e69a-4b0b-8e5f-1f893a453e47`
   - URL を見失ったら Artifact の `action:"list"` でタイトル「Design Token Catalog」から拾い、この行を最新 URL に直す
   - headless/cron ではこの手順を飛ばし、ローカルの `catalog.html` 再生成までで完了とする

## 成果物

- 更新された `DESIGN.md`（変更点）
- 再生成された `catalog.html`（`npm run build:catalog` の出力そのまま。手編集なし）
- 対話セッションなら同一 URL に更新された Artifact
- ユーザーへの報告: 変更したトークン、生成ログの件数、lint 結果、（公開したなら）URL

## 完了前チェックリスト

- [ ] 値の変更は DESIGN.md のみに入れた（catalog.html / スクリプトに値を書いていない）
- [ ] `npm run build:catalog` を実行し、件数が意図と一致した
- [ ] `grep undefined catalog.html` と `grep '{colors' catalog.html` が両方とも空
- [ ] `npm run lint:md` / `npm run lint` が通った
- [ ] 対話セッションなら Artifact を既存 URL に `url` 指定で上書きした／headless なら意図的に飛ばした

## Red Flags — 手が止まったら疑う

- catalog.html を直接開いて値を書き換えようとしている → DESIGN.md に戻る
- 「便利だから」と特定用途の具体値をトークン化しようとしている → 抽象的な役割でなければローカル CSS へ（`DESIGN.md:243`・`244`）
- 生成器のテンプレート文字列に oklch 値や rem 値を直書きしようとしている → その値は DESIGN.md から読ませる
- 段（例: `primary` を「blue-700」に固定）を foundation に足そうとしている → 段は消費側 resolve の範囲。foundation は role→スケールまで

## 仕組み（参照）

- 生成器: `scripts/build-catalog.mjs`。DESIGN.md のフロントマターから依存パッケージ無しで `catalog.html` を生成する。カタログ自身の chrome 色は primitive から解決する。トークン値は一切ハードコードしない
- 生成器のテンプレートを直す必要が出た場合（新しいトークン「型」を足す等）は、値ではなく構造だけを足す
