# design-system

個人プロジェクト横断で使う自分用デザインシステムの**正（source of truth）リポジトリ**。

`DESIGN.md` がデザイントークンの単一の正。各プロジェクトはこの `DESIGN.md` をルートへコピーして使う（コピー先はプロジェクト都合で書き換えてよい）。`DESIGN.md` 自体はツール非依存・machine 非依存の可搬な仕様として保つ ── 運用コマンドやローカルパスは書かない。それらはこの CLAUDE.md が持つ。

## ツール

`DESIGN.md` はトークンの正、`catalog.html` はそこから機械生成される派生物。値を書くのはフロントマターだけで、`catalog.html` は手編集しない。

- `npm run build:catalog` — `DESIGN.md` から `catalog.html` を再生成する。DESIGN.md のトークンを触ったら必ず実行する
- `npm run check:contrast` — `components` の文字色×地色ペアを WCAG AA（4.5:1）で機械検証する。色のペアを足す・変えたら実行する（`disabled` は WCAG inactive 例外で対象外）
- `npm run lint:md` / `npm run lint` — Markdown（rumdl）と文章（textlint）の lint
- `npm run lint:md:fix` / `npm run lint:fix` — 自動修正

DESIGN.md のトークンを変更する作業は `update-design-system` スキルの手順に従う（再生成・整合検証・lint・Artifact 公開まで）。

## 配布

配布物は `DESIGN.md` 1 枚。生成器（`scripts/`）・`catalog.html`・スキルはこの正リポジトリに属し、配らない。配布先はコピーした `DESIGN.md` を仕様として読む。
