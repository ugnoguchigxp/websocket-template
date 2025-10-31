# API ユニットテスト

このディレクトリには、WebSocket BBS APIのユニットテストが含まれています。

## テスト構成

```
Test/
├── README.md                 # このファイル
├── helpers/
│   └── test-utils.ts        # テストユーティリティ関数
├── auth.test.ts             # 認証テスト
├── routers.test.ts          # APIルーターテスト
└── validation.test.ts       # 入力検証・サニタイゼーションテスト
```

## テストカバレッジ

### 1. 認証テスト (`auth.test.ts`)

#### auth.login
- ✅ 有効な認証情報でのログイン成功
- ✅ 無効なユーザー名の拒否
- ✅ 無効なパスワードの拒否
- ✅ JWT トークン生成
- ✅ ユーザー名のバリデーション（英数字のみ）
- ✅ ユーザー名の長さ制限（1-50文字）
- ✅ パスワードの長さ制限（1-200文字）

#### auth.me
- ✅ 認証済みユーザーの情報取得
- ✅ 未認証ユーザーの拒否
- ✅ 存在しないユーザーの処理

#### JWT トークン検証
- ✅ 有効なトークンの検証
- ✅ 無効な署名の拒否
- ✅ 期限切れトークンの拒否
- ✅ 誤った issuer の拒否
- ✅ 誤った audience の拒否
- ✅ クロックトレランスの動作確認

#### パスワードハッシュ化
- ✅ argon2id によるハッシュ化
- ✅ 正しいパスワードの検証
- ✅ 誤ったパスワードの拒否
- ✅ 同じパスワードでも異なるハッシュ生成（ソルト）

### 2. APIルーターテスト (`routers.test.ts`)

#### users.list
- ✅ 認証済みユーザーの一覧取得
- ✅ 未認証ユーザーの拒否

#### users.get
- ✅ 特定ユーザーの取得
- ✅ 存在しないユーザーの処理
- ✅ 無効なユーザーIDの拒否

#### posts.list
- ✅ ページネーション付き投稿一覧
- ✅ カーソルベースページネーション
- ✅ limit パラメータの範囲制限（1-100）

#### posts.get
- ✅ 特定投稿の取得
- ✅ 存在しない投稿の処理

#### posts.create
- ✅ 有効なデータでの投稿作成
- ✅ タイトルの長さ制限（1-200文字）
- ✅ 本文の長さ制限（1-5000文字）

#### posts.comments.list
- ✅ 投稿のコメント一覧取得
- ✅ コメントがない投稿の処理

#### posts.comments.add
- ✅ コメントの追加
- ✅ コメント本文の長さ制限（1-5000文字）
- ✅ 無効な postId の拒否

### 3. バリデーション・サニタイゼーションテスト (`validation.test.ts`)

#### テキストサニタイゼーション
- ✅ 制御文字の除去（タブ・改行以外）
- ✅ タブ・改行の保持
- ✅ 連続空白の圧縮
- ✅ script タグの除去
- ✅ iframe タグの除去
- ✅ イベントハンドラの除去
- ✅ javascript: プロトコルの除去
- ✅ 前後の空白トリム
- ✅ 複雑なXSS攻撃の無害化

#### 入力バリデーション
- ✅ ユーザー名の形式チェック
- ✅ 特殊文字を含むユーザー名の拒否
- ✅ XSS攻撃を含むユーザー名の拒否
- ✅ 投稿タイトルの長さ制限
- ✅ 投稿本文の長さ制限
- ✅ 正の整数IDの検証
- ✅ ページネーションlimitの範囲制限
- ✅ パスワードの長さ制限

#### セキュリティテスト
- ✅ SQLインジェクションパターンの識別
- ✅ XSSパターンの識別
- ✅ 制御文字攻撃の識別

## テスト実行方法

### 全テスト実行

```bash
# プロジェクトルートから
pnpm --filter @wsfw/api test

# または apps/api ディレクトリで
cd apps/api
pnpm test
```

### 特定のテストファイルのみ実行

```bash
# 認証テストのみ
pnpm test Test/auth.test.ts

# ルーターテストのみ
pnpm test Test/routers.test.ts

# バリデーションテストのみ
pnpm test Test/validation.test.ts
```

### ウォッチモード

```bash
pnpm test --watch
```

### カバレッジレポート

```bash
pnpm test:coverage
```

## テストの設計方針

### 1. モックの使用

実際のデータベースへの接続は避け、モックPrismaクライアントを使用します：

```typescript
import { createMockPrisma, createMockContext } from './helpers/test-utils.js';

const mockPrisma = createMockPrisma();
mockPrisma.user.findUnique.mockResolvedValue(testUser);

const ctx = createMockContext('1', mockPrisma);
```

### 2. テストデータ

`test-utils.ts` で定義された標準テストデータを使用：

- `testUsers`: デモユーザーとテストユーザー
- `testPosts`: サンプル投稿データ
- `testComments`: サンプルコメントデータ

### 3. 環境変数のモック

テスト実行時は独立した環境変数を使用：

```typescript
import { mockEnv } from './helpers/test-utils.js';

beforeAll(() => {
  mockEnv({
    JWT_SECRET: 'test-secret',
    JWT_ISSUER: 'test-issuer',
    // ...
  });
});
```

### 4. セキュリティテストの重点

- 入力検証の厳格性
- XSS攻撃の防止
- SQLインジェクションの防止
- 認証・認可の適切性

## テストユーティリティ

### createMockPrisma()

モックPrismaクライアントを作成します。

```typescript
const mockPrisma = createMockPrisma();
mockPrisma.user.findUnique.mockResolvedValue({ id: 1, username: 'demo' });
```

### createMockContext(userId, prisma, jwtSecret)

モックContextを作成します。

```typescript
const ctx = createMockContext('1', mockPrisma);
```

### initTestUsers()

テスト用ユーザーのパスワードハッシュを生成します。

```typescript
await initTestUsers();
```

### mockEnv(overrides)

環境変数をモックします。

```typescript
mockEnv({
  JWT_SECRET: 'custom-secret',
});
```

### createTestJWT(userId, secret)

テスト用JWTトークンを生成します。

```typescript
const token = createTestJWT('1');
```

## 新しいテストの追加

### 1. テストファイルの作成

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createMockPrisma, createMockContext, mockEnv } from './helpers/test-utils.js';

describe('新機能のテスト', () => {
  beforeAll(() => {
    mockEnv();
  });

  it('should perform expected behavior', async () => {
    const mockPrisma = createMockPrisma();
    const ctx = createMockContext('1', mockPrisma);

    // テストロジック
    expect(result).toBe(expected);
  });
});
```

### 2. テストユーティリティの拡張

新しいモックやヘルパー関数が必要な場合は `helpers/test-utils.ts` に追加します。

## ベストプラクティス

### ✅ DO

- モックを使用して外部依存を排除
- 各テストは独立して実行可能に
- エッジケースとエラーケースをテスト
- セキュリティ関連のテストを優先
- 明確で説明的なテスト名を使用

### ❌ DON'T

- 実際のデータベースに接続しない
- テスト間で状態を共有しない
- 外部APIを呼び出さない
- タイミングに依存するテストを書かない
- 過度にモックを使用しない（ユニットテストの範囲を守る）

## トラブルシューティング

### テストが失敗する

1. 依存関係を確認: `pnpm install`
2. Prismaクライアントを再生成: `pnpm db:generate`
3. 環境変数が正しく設定されているか確認

### モックが動作しない

1. `vi.fn()` が正しく使用されているか確認
2. `mockResolvedValue` / `mockRejectedValue` を使用
3. 各テスト前にモックをリセット

### 型エラーが出る

1. `@types/*` パッケージがインストールされているか確認
2. `tsconfig.json` の設定を確認
3. Prismaクライアントを再生成

## 参考資料

- [Vitest ドキュメント](https://vitest.dev/)
- [tRPC Testing Guide](https://trpc.io/docs/server/testing)
- [Prisma Mocking Guide](https://www.prisma.io/docs/guides/testing/unit-testing)

## 今後の拡張予定

- [ ] WebSocketサーバーの統合テスト
- [ ] レート制限の実際の動作テスト（タイマーモック使用）
- [ ] エンドツーエンドテスト
- [ ] パフォーマンステスト
- [ ] セキュリティスキャン自動化
