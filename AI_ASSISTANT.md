# AIアシスタントガイドライン - WebSocket Framework

## プロジェクト概要
ReactフロントエンドとtRPCバックエンドを使用するWebSocket Frameworkプロジェクト

## 基本ルール

### 📁 ファイル構成
- フロントエンド: `apps/web/src/`、テスト: `apps/web/Test/`
- バックエンド: `apps/api/src/`、テスト: `apps/api/Test/`
- JavaScriptファイルは`dist/`ディレクトリのみ許可
- テストファイルは必ず`Test/`ディレクトリに配置

### 🔧 技術スタック
- フロントエンド: React + TypeScript + Vite + Tailwind CSS
- バックエンド: tRPC + Prisma + SQLite/PostgreSQL
- UIコンポーネント: shadcn/uiのみ使用
- スタイリング: Tailwind CSSユーティリティクラス
- 国際化: react-i18next（日本語・英語対応）

### 🎨 デザイン方針
- B2B向けエンタープライズデザイン
- 派手なデザイン禁止、プロフェッショナルな外観
- カラー: グレー、ブルー基調の落ち着いた色
- フォント: 技術コンテンツはfont-mono
- アニメーション: 機能的なトランジションのみ

### 📝 コーディング規約
- TypeScript必須、any型は避ける
- JSXあり: .tsx、なし: .ts
- インポートはファイル先頭に整理
- ログ: createContextLogger("コンポーネント名")を使用

### 🌐 国際化
- 文字列のハードコード禁止
- 翻訳キー必須: `t("translation_key")`
- 日本語と英語の両方に翻訳を追加

### 🔐 セキュリティ
- adminユーザーは削除・変更不可
- 認証: JWTフローに従う
- API: 保護されたエンドポイントは認証必須

### 🗄️ データベース
- スキーマ変更: `prisma/schema.prisma`更新後`pnpm db:generate`
- タイムスタンプ: createdAtを適切に追加

### 🧪 テスト
- 位置: `Test/`ディレクトリのみ
- 命名: `ComponentName.test.tsx`
- カバレッジ: 重要機能のテストを維持
- E2Eテスト: Playwrightを使用
- E2Eファイル: `e2e/`ディレクトリに配置、`.spec.ts`拡張子

### 🔄 APIパターン
- tRPCルート: 既存パターンに従う
- エラーハンドリング: 適切なtry-catch
- バリデーション: Zodスキーマ使用

## 開発原則

### 🎯 DRY (繰り返しを避ける)
### 🎯 YAGNI (必要になるまで作らない)
### 🎯 KISS (シンプルに保つ)
### 🔌 依存性注入 (DI)
### 🛠️ 汎用的な実装（特定要件のみのコーディング禁止）
### 🔢 定数と設定
### 📏 コード整理

## 禁止事項

- ❌ `.gitignore`の変更
- ❌ サーバー起動コマンドの実行
- ❌ 機密データやAPIキーのコミット
- ❌ `src/`ディレクトリ内のJavaScriptファイル
- ❌ 文字列のハードコード
- ❌ adminユーザーの削除・変更
- ❌ 異なるUIコンポーネントライブラリ
- ❌ プロジェクト構造の根本的な変更
- ❌ 特定要件のみのワンオフソリューション
- ❌ マジックナンバーの使用
- ❌ 派手なコンシューマースタイルデザイン
- ❌ 環境変数の過剰な使用
- ❌ 600行を超えるファイルの作成
- ❌ 過度に大きな関数の作成

## 開発ワークフロー

### 変更前
1. 既存コードを読んで理解する
2. 既存の実装を確認
3. 翻訳キーの存在を確認
4. 影響を考慮する

### 変更時
1. TypeScriptを使用
2. 既存パターンに従う
3. 翻訳を追加
4. エラーハンドリングを実装

### 変更後
1. 十分にテストする
2. 翻訳を確認
3. アクセシビリティを確認
4. 再利用性を見直す

## 一般的なパターン

### コンポーネント構造
```tsx
import { createContextLogger } from "@logger"
import React from "react"
import { useTranslation } from "react-i18next"

const log = createContextLogger("ComponentName")

export function ComponentName() {
  const { t } = useTranslation()
  
  return (
    <div className="font-mono">
      {/* コンテンツ */}
    </div>
  )
}
```

### APIミューテーションパターン
```tsx
const mutation = api.service.action.useMutation({
  onSuccess: () => {
    showSuccess(t("成功タイトル"), t("成功メッセージ"))
    log.info("操作成功")
  },
  onError: (e) => {
    showError(t("エラータイトル"), e.message ?? String(e))
    log.error("操作失敗", e)
  },
})

// 使用例
const handleSubmit = () => {
  mutation.mutate({ data: "example" })
}
```

## ファイル構成
```
websocketFramework/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── locales/
│   │   │   └── constants/
│   │   └── Test/
│   └── api/
│       ├── src/
│       │   ├── routers/
│       │   ├── services/
│       │   └── constants/
│       │   └── ...
│       └── Test/
├── docs/
├── k8s/
└── docker/
```

## 重要事項
一貫性が重要です。常に既存のパターンに従い、確立されたアーキテクチャと設計原則を維持してください。
