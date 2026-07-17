---
name: update-design-system
description: このリポジトリの DESIGN.md（デザイントークンの正）を変更したとき、派生物の catalog.html を再生成し乖離を防ぐ。「トークンを足して/変えて」「色を調整して」「DESIGN.md を更新して」「カタログを更新して」と頼まれた場面で使う。トークン値の追加・変更が対象。カタログを見るだけ・DESIGN.md を読むだけなら発火しない（catalog.html は派生物であり手で編集しない）。
argument-hint: [変更したいトークンや意図。例: primary を blue-600 に / spacing に 2xs を追加]
---

# update-design-system

DESIGN.md はトークンの**単一の真実の源**。`catalog.html` はそこから機械生成される**派生物**。
この2つが乖離すると、カタログが嘘をつく。乖離を原理的に防ぐのがこのスキルの役割。

## 鉄則

- **値を書くのは DESIGN.md のフロントマターだけ。** `catalog.html` と生成スクリプトのテンプレートには値を書かない
- **`catalog.html` を手で編集しない。** 必ず生成し直す（手編集は次回生成で消える）
- DESIGN.md はプロジェクト横断でコピーされる正ファイル。1プロジェクトの都合で変えない（`DESIGN.md:246`）

## 手順

1. **変更を DESIGN.md に入れる。** トークンはフロントマター（`colors` / `roles` / `typography` / `rounded` / `spacing`）へ書く。shadow だけは本文の CSS フェンスへ書く（フロントマター仕様に elevation 型が無いため）
   - primitive を足すときは OKLCH で、色相 H 固定・明度 L を既存の段に合わせる（`DESIGN.md:169`）
   - role は `roles` に「役割: スケール名」で書く。段（具体値）は書かない（Colors 節参照）
   - トークンを足す基準は「抽象的な役割を名指すか」。使用箇所の数ではない（`DESIGN.md:243`）
2. **カタログを再生成する。** `npm run build:catalog`（= `node scripts/build-catalog.mjs`）
3. **生成ログを確認する。** primitive / roles / type / spacing / radius / shadow の件数が意図と合うか。欠落や未解決は `undefined` として出るので `grep undefined catalog.html` が空であること
4. **Markdown lint を通す。** DESIGN.md を触ったら `npm run lint:md` と `npm run lint`（textlint）
5. **カタログを claude.ai Artifact に明示更新する。** `catalog.html` を Artifact ツールで publish する。**既存 URL を必ず `url` に渡して同一 artifact を上書きする**（渡さないと新規 URL が切られ、カタログ artifact が散らばる）
   - 現在の公開先: `https://claude.ai/code/artifact/0932c55d-e69a-4b0b-8e5f-1f893a453e47`
   - この URL を見失ったら Artifact の `action:"list"` でタイトル「Design Token Catalog」から拾う。拾えたらこの行を最新 URL に直す
   - 対話セッション（claude.ai 認証あり）でのみ実行できる。headless/cron 実行ではこの手順を飛ばし、ローカルの `catalog.html` 再生成までで完了とする

## 成果物

- 更新された `DESIGN.md`（値の変更点）
- 再生成された `catalog.html`（`npm run build:catalog` の出力そのまま。手編集なし）
- 同一 URL に更新された Artifact
- ユーザーへの報告: 変更したトークン、生成ログの件数、公開 URL

## 完了前チェックリスト

- [ ] 値の変更は DESIGN.md のみに入れた（catalog.html / スクリプトに値を書いていない）
- [ ] `npm run build:catalog` を実行し、件数が意図と一致した
- [ ] `grep undefined catalog.html` が空（欠落・未解決なし）
- [ ] `npm run lint:md` / `npm run lint` が通った
- [ ] 対話セッションなら Artifact を既存 URL（手順5 記載）に `url` 指定で上書きした（新規 URL を切っていない）／headless なら意図的に飛ばした

## Red Flags — 手が止まったら疑う

- catalog.html を直接開いて値を書き換えようとしている → DESIGN.md に戻る
- 「便利だから」と特定用途の具体値をトークン化しようとしている → 抽象的な役割でなければローカル CSS へ（`DESIGN.md:243`・`244`）
- 生成スクリプトのテンプized文字列に oklch 値や rem 値を直書きしようとしている → その値は DESIGN.md から読ませる

## 仕組み（参照）

- 生成器: `scripts/build-catalog.mjs`。DESIGN.md のフロントマターから依存パッケージ無しで `catalog.html` を生成する。カタログ自身の chrome 色は primitive から解決する。トークン値は一切ハードコードしない
- 生成器のテンプレートを直す必要が出た場合（新しいトークン「型」を足す等）は、値ではなく構造だけを足す
