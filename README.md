# WebSocket RPC BBS モノレポ（WS-only tRPC / React / Prisma / PostgreSQL）

このリポジトリは、WebSocket のみで動作する tRPC（JSON RPC）を用いて、認証・投稿・コメント機能を持つシンプルな BBS（掲示板）を実装した TypeScript モノレポです。フロントエンドは React（Vite）+ Tailwind + shadcn/ui を使用します。HTTP の REST API は使いません（ログイン含め、すべて WS + tRPC）。

## 技術スタック
- 言語: TypeScript（Node 20+ / React 18）
- モノレポ: pnpm workspaces
- RPC: tRPC v10 over WebSocket（RESTライクな JSON RPC、HTTP は不使用）
- サーバ: `ws` + `@trpc/server`
- 認証: OIDC アクセストークン（WS 接続 Subprotocol `['bearer', token]` 経由、フォールバックとして URL クエリパラメータ対応）
- DB: Prisma 5 + PostgreSQL（開発環境ではSQLiteも選択可能）
- フロント: React + Vite + @tanstack/react-query + Tailwind + shadcn/ui（Radix）
- 多言語化: i18next + react-i18next
- DI/IoC: tsyringe
- ロギング: 構造化ログ（@logger カスタムパッケージ）
- OpenAPI: trpc-openapi
- コンテナ: Docker Compose（PostgreSQL + pgAdmin）

## ディレクトリ構成
```
websocketFramework/
├── apps/
│   ├── api/               # tRPC WebSocketサーバ、Prisma、OIDCトークン検証
│   │   ├── prisma/        # Prisma schema と dev.db
│   │   ├── src/
│   │   │   ├── routers/   # tRPC ルーター定義
│   │   │   ├── server.ts  # WebSocket サーバ実装
│   │   │   ├── index.ts   # エントリポイント
│   │   │   └── openapi.ts # OpenAPI仕様生成
│   │   └── Dockerfile     # APIコンテナイメージ
│   └── web/               # React Vite アプリ
│       ├── src/
│       │   ├── components/ # shadcn/ui コンポーネント
│       │   ├── pages/     # ページコンポーネント
│       │   ├── lib/       # tRPC クライアント等
│       │   └── modules/   # logger等の共通モジュール
│       └── Dockerfile     # Webコンテナイメージ
├── docker/                # Docker Compose構成
│   ├── nginx/            # nginxリバースプロキシ設定
│   ├── postgres/         # PostgreSQL設定
│   └── docker-compose.*.yml
├── k8s/                   # Kubernetes/AKS デプロイメント
│   ├── manifests/        # Kubernetesマニフェストファイル
│   ├── ARCHITECTURE-COMPARISON.md
│   ├── AKS-DEPLOYMENT-GUIDE.md
│   └── README.md
├── .env.example           # API 用環境変数テンプレート
└── package.json           # pnpm workspace ルート
```

## 主要機能
- **認証**: OIDC アクセストークンによるユーザー認証（WebSocket Subprotocol経由）
- **投稿管理**: 記事の一覧・詳細表示・作成
- **コメント**: 各記事へのコメント追加・一覧表示
- **多言語対応**: i18next による日本語/英語切り替え
- **セキュリティ**: Origin検証、レート制限、入力サニタイズ、OIDCトークン検証
- **監視**: 構造化ログによる監査ログ、エラートラッキング
- **OpenAPI**: 自動生成されたAPI仕様書

## サーバの詳細（`apps/api`）
### エントリポイント: `src/index.ts`
- `.env` から環境変数をロード（dotenv）
- `WebSocketServer` を `PORT`（既定 3001）で起動
- tRPC の `appRouter` を WS ハンドラに適用
- WS 接続時、Subprotocol `['bearer', accessToken]` から OIDC アクセストークンを検証し `ctx.user` を構築
- フォールバック: URL クエリパラメータ `?token=<accessToken>` も対応（互換用）
- 起動時に `ensureDemoUser()` でデモユーザ `demo / demo1234` を作成（移行期間の互換用）

### 環境変数
必須：
- `OIDC_ISSUER`: IdP の Issuer URL（例: `https://tenant.auth0.com/`）
- `OIDC_CLIENT_ID`: 対話用クライアント ID
- `OIDC_CLIENT_SECRET`: 機密クライアント用シークレット（PKCE + サーバ仲介方式で使用）
- `OIDC_REDIRECT_URI`: 認可コード受け取り用のリダイレクト URI（例: `http://localhost:8000/`）
- `ALLOWED_WS_ORIGIN`: WebSocket 接続を許可する Origin（例: `http://localhost:8000`）
- `ALLOWED_HTTP_ORIGIN`: `/auth/*` REST エンドポイントを許可する Origin

オプション：
- `PORT`: リッスンポート（デフォルト: 3001）
- `DATABASE_URL`: Prisma Database URL（デフォルト: `file:./dev.db`）
- `OIDC_AUDIENCE`: アクセストークンの Audience チェックに使用
- `OIDC_SCOPE`: 認可リクエストに付与するスコープ（デフォルト: `openid profile email offline_access`）
- `OIDC_REFRESH_COOKIE_NAME`, `OIDC_REFRESH_COOKIE_SAMESITE`, `OIDC_REFRESH_TOKEN_TTL_SECONDS` など Cookie/TLL 調整
- `NODE_ENV`: 環境設定（`development` / `production`）
- `MAX_WS_CONNECTIONS`: 最大WebSocket接続数（デフォルト: 1000）

### Prisma/Database
- **デフォルト**: PostgreSQL（Docker Composeで簡単セットアップ）
- **開発用**: SQLite（`apps/api/prisma/dev.db`）も選択可能
- **モデル**: `User`, `Post`, `Comment`
- **スキーマ**: `apps/api/prisma/schema.prisma`
- **詳細**: [データベースセットアップガイド](./docs/DATABASE_SETUP.md) - SQLite/PostgreSQL両対応

### API ルーター（`apps/api/src/routers/index.ts`）
- **SuperJSON**: サーバ/クライアント双方で有効化（Date型等の自動シリアライズ）
- **Context**: `{ user: ContextUser | null, prisma: PrismaClient, accessToken: string | null }`
- **Middleware**: レート制限、監査ログ、認証チェック

#### エンドポイント一覧
**認証（`auth`）:**
- `auth.me() -> { id, username, role, email?, sub, roles[] }` - 現在の認証済みユーザー情報
- REST `/auth/exchange`: Authorization Code + PKCE をアクセストークンに交換（HttpOnly Cookie で refresh session 発行）
- REST `/auth/refresh`: Cookie 送信でアクセストークン再発行
- REST `/auth/logout`: refresh session 破棄・IdP revocation（可能であれば）

**ユーザー（`users`）:** （全て認証必須）
- `users.list() -> User[]` - ユーザー一覧
- `users.get({ id }) -> User` - ユーザー詳細

**投稿（`posts`）:** （全て認証必須）
- `posts.list({ limit?, cursor? }) -> { items, nextCursor }` - 投稿一覧（ページネーション）
- `posts.get({ id }) -> Post` - 投稿詳細
- `posts.create({ title, body }) -> Post` - 投稿作成
- `posts.comments.list({ postId }) -> Comment[]` - コメント一覧
- `posts.comments.add({ postId, body }) -> Comment` - コメント追加

ログイン以外の手続きはすべて認証必須（`authed` ミドルウェア）。

## フロント（`apps/web`）
### 技術構成
- **tRPC クライアント**: WebSocket のみ（HTTP は不使用）
- **状態管理**: React Context + @tanstack/react-query
- **ルーティング**: react-router-dom
- **スタイリング**: Tailwind CSS + shadcn/ui (Radix UI)
- **多言語**: i18next (日本語/英語)
- **開発サーバ**: Vite (ポート 5173)

### ログインフロー
1. ログインボタン押下で PKCE ペア（code_verifier / code_challenge）を生成し、IdP の `/authorize` へリダイレクト
2. ブラウザが `?code=...&state=...` 付きで `VITE_OIDC_REDIRECT_URI` に戻る
3. React 側で `sessionStorage` に保存した `code_verifier` / `state` を取り出し、バックエンドの `POST /auth/exchange` に送信
4. サーバが IdP とトークン交換し、アクセストークンを返却 + refresh session を HttpOnly Cookie で発行
5. アクセストークンは `sessionStorage` に保存し、Subprotocol `['bearer', token]` 付きで WS クライアントを再生成
6. 有効期限が近づくと自動で `POST /auth/refresh` を呼び出し、トークンをローテーション

### BBS UI
- **左サイドバー**: Post 一覧（選択可能）
- **メインエリア**: 選択した Post の詳細 + コメント一覧 + コメント追加フォーム
- **ヘッダー**: 新規投稿ボタン、ログアウト、言語切り替え
- **新規投稿**: モーダルダイアログでタイトル/本文入力
- **トースト**: 成功/失敗時にフィードバック表示

### UI コンポーネント
- shadcn/ui: Button, Input, Label, Card, Dialog, Textarea, Skeleton, Toast, Select
- react-icons: アイコン表示

## セキュリティポリシー
### 伝送路セキュリティ
- **TLS必須**: 本番環境では必ず `wss://`（WebSocket over TLS）を使用
- **パスワード保護**:
  - ネットワーク上: TLS により保護
  - 保存: argon2id でハッシュ化（メモリコスト: 32MB、タイムコスト: 3、並列度: 1）
  - クライアント側可逆暗号は不採用（鍵配布の課題と実効安全性向上が限定的なため）

### WebSocket セキュリティ
- **OIDCトークン検証**:
  - JWKS の `kid` を参照して公開鍵を取得（キャッシュ・ローテーション対応）
  - `iss` / `aud` / `exp` クレームの検証 + 5秒のクロックトレランス
  - 検証失敗は WARN ログを残して接続を拒否
- **Origin検証**:
  - `ALLOWED_WS_ORIGIN` 環境変数必須
  - Origin ヘッダーが一致しない接続は拒否（1008: Policy Violation）
- **接続制限**:
  - 最大同時接続数: `MAX_WS_CONNECTIONS`（デフォルト: 1000）
  - 上限超過時は新規接続を拒否
- **ペイロード制限**:
  - `maxPayload: 1MB`（巨大メッセージによるDoS防止）
  - `maxBackpressure: 1MB`（バックプレッシャー制限）
  - `perMessageDeflate: false`（圧縮攻撃防止）
- **ハートビート**:
  - 30秒間隔で `ping`、`pong` 未応答は terminate
- **アイドル切断**:
  - 未認証接続: 5分
  - 認証済み接続: 30分
  - メッセージ受信または pong で自動リセット
- **本番環境制約**:
  - `NODE_ENV=production` で OIDC 関連の必須環境変数が未設定の場合は起動エラー

### API セキュリティ
- **レート制限**:
  - 全RPCエンドポイント: 60 req/min/ユーザー（匿名は `anon` キー）
  - 環境変数で設定可能
  - メモリリーク対策: 5分毎の自動クリーンアップ
- **監査ログ**:
  - 記録内容: userId/anon, path, type, 処理時間（ms）、エラーコード
  - PII（個人識別情報）は記録しない
- **入力検証**:
  - Zod による厳格な型検証
  - 長さ制限: title ≤ 200文字、body ≤ 5000文字
  - username: 英数字・ハイフン・アンダースコアのみ、1-50文字
- **入力サニタイズ**:
  - 制御文字の除去（タブ・改行を除く）
  - 空白の正規化
  - XSS防止: script/iframe タグ、イベントハンドラ、javascript: プロトコルを除去

### フロントエンド セキュリティ
- **HTTP セキュリティヘッダ**（Vite dev server）:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### 本番環境推奨事項
- **リバースプロキシ/Ingress** で以下を設定:
  - HSTS（Strict-Transport-Security）
  - CSP（Content-Security-Policy）
  - その他セキュリティヘッダ
- **Origin検証**: `ALLOWED_WS_ORIGIN` を本番URLに固定（複数ドメインの場合は配列対応を実装）
- **永続化**: Redis等でレート制限・監査ログを永続化
- **HTMLサニタイズ**: DOMPurify 等でXSS対策を強化
- **シークレット管理**: 環境変数管理ツール（AWS Secrets Manager、HashiCorp Vault等）の使用

## デプロイメント

このプロジェクトは複数のデプロイメント方法をサポートしています。

### オプション1: 開発環境（ローカル）

上記のセットアップ手順に従って、ローカル環境で起動します。

```bash
pnpm dev
```

### オプション2: Docker Compose（本番対応）

**詳細**: [DEPLOYMENT.md](./DEPLOYMENT.md)

完全なSSL/TLS暗号化を備えたDocker Compose構成。

**特徴**:
- nginxリバースプロキシによるSSL終端
- 内部通信もSSL/TLS暗号化（Zero Trust）
- PostgreSQL（SSL対応）
- 自動証明書生成スクリプト

**クイックスタート**:
```bash
# 証明書生成
cd docker && ./generate-internal-certs.sh

# 起動
docker-compose -f docker-compose.prod.yml up -d
```

**アーキテクチャ**:
```
Internet (HTTPS/WSS)
   ↓
nginx (SSL終端、リバースプロキシ)
   ↓
├─ Web Container (nginx + React SPA) - 内部SSL
└─ API Container (Node.js + tRPC) - 内部SSL
       ↓
   PostgreSQL (SSL接続)
```

### オプション3: Kubernetes / AKS（本番推奨）

**詳細**: [k8s/AKS-DEPLOYMENT-GUIDE.md](./k8s/AKS-DEPLOYMENT-GUIDE.md)

Azure Kubernetes Service (AKS) への完全なデプロイメント構成。

**特徴**:
- Ingress Controller（nginx-ingress または AGIC）
- 自動スケーリング（HPA）
- SSL証明書自動管理（cert-manager + Let's Encrypt）
- Pod Security Standards
- Azure Database for PostgreSQL統合
- 監視・ロギング統合（Azure Monitor）

**クイックスタート**:
```bash
# マニフェスト準備
cd k8s/manifests
cp secrets.yaml.template secrets.yaml
vi secrets.yaml  # 実際の値を設定

# デプロイ
kubectl apply -k .
```

**アーキテクチャ比較**:
| 項目 | Docker Compose | Kubernetes (AKS) |
|-----|---------------|------------------|
| nginxリバースプロキシ | ✅ 必要 | ❌ 不要（Ingress） |
| スケーリング | 手動 | 自動（HPA） |
| SSL管理 | 手動 | 自動（cert-manager） |
| ロードバランシング | なし | 自動（Service） |
| 高可用性 | 限定的 | ✅ |

**ドキュメント**:
- [k8s/README.md](./k8s/README.md) - 概要とクイックスタート
- [k8s/AKS-DEPLOYMENT-GUIDE.md](./k8s/AKS-DEPLOYMENT-GUIDE.md) - 完全なデプロイガイド
- [k8s/ARCHITECTURE-COMPARISON.md](./k8s/ARCHITECTURE-COMPARISON.md) - アーキテクチャ詳細比較

**主要リソース**:
- Ingress: nginx-ingress または Application Gateway
- Deployment: API（2-10レプリカ）、Web（2-8レプリカ）
- Database: Azure Database for PostgreSQL または StatefulSet
- Monitoring: Azure Monitor / Container Insights
- CI/CD: GitHub Actions / Azure DevOps

## セットアップ手順

このセットアップ手順はSQLiteを使用した開発環境の構築方法です（最もシンプル）。

**PostgreSQLまたは詳細な手順**: [データベースセットアップガイド](./docs/DATABASE_SETUP.md) を参照してください。

### 前提条件
- Node.js 20+
- pnpm 9+（`npm install -g pnpm` でインストール）
- SQLiteを使用する場合: apps/api/prisma/schema.prisma で provider を "sqlite" に変更

### 1. 依存関係のインストール
```bash
pnpm install
```

### 2. 環境変数の設定
```bash
# .env.example をコピーして .env を作成
cp .env.example .env

# OIDC 設定を環境に合わせて更新
cp apps/web/.env.example apps/web/.env
vim .env apps/web/.env  # Issuer / Client ID / Redirect URI などを設定
```

`.env` の例:
`.env` の例（API）:
```env
DATABASE_URL="file:./dev.db"
PORT=3001
ALLOWED_WS_ORIGIN="http://localhost:8000"
ALLOWED_HTTP_ORIGIN="http://localhost:8000"
OIDC_ISSUER="https://tenant.example.com/"
OIDC_CLIENT_ID="your-client-id"
OIDC_CLIENT_SECRET="your-client-secret"
OIDC_REDIRECT_URI="http://localhost:8000/"
OIDC_SCOPE="openid profile email offline_access"
NODE_ENV="development"
```

`apps/web/.env` の例:
```env
VITE_OIDC_AUTHORIZATION_URL="https://tenant.example.com/authorize"
VITE_OIDC_CLIENT_ID="your-client-id"
VITE_OIDC_REDIRECT_URI="http://localhost:8000/"
VITE_OIDC_SCOPE="openid profile email offline_access"
VITE_OIDC_AUDIENCE="api://default"
```

### 3. データベースのセットアップ
```bash
# Prisma クライアント生成
pnpm db:generate

# データベースマイグレーション（dev.db 作成）
pnpm db:push
```

### 4. サーバ起動（開発モード）
```bash
pnpm dev:api
# ws://0.0.0.0:3001 で待受
```

### 5. フロント起動（開発モード）
別のターミナルで:
```bash
pnpm dev:web
# http://localhost:5173 を開く
```

### 6. 両方同時起動
```bash
pnpm dev
# api と web を並列起動
```

### デモログイン
- ユーザー名: `demo`
- パスワード: `demo1234`

## 主要コマンド

### ルートディレクトリ
```bash
# 全体ビルド
pnpm build

# 開発モード（api + web 同時起動）
pnpm dev

# API のみ起動
pnpm dev:api

# Web のみ起動
pnpm dev:web

# 本番起動（ビルド済み）
pnpm start

# データベース
pnpm db:generate  # Prisma クライアント生成
pnpm db:push      # スキーマをデータベースに反映
```

### API（apps/api）
```bash
# API ワークスペースで実行
pnpm --filter @wsfw/api <command>

# 例:
pnpm --filter @wsfw/api dev        # 開発起動
pnpm --filter @wsfw/api build      # ビルド
pnpm --filter @wsfw/api test       # テスト実行
pnpm --filter @wsfw/api openapi:gen # OpenAPI仕様生成
```

### Web（apps/web）
```bash
# Web ワークスペースで実行
pnpm --filter @wsfw/web <command>

# 例:
pnpm --filter @wsfw/web dev        # 開発起動
pnpm --filter @wsfw/web build      # ビルド
pnpm --filter @wsfw/web preview    # ビルド結果のプレビュー
```

## OpenAPI 仕様書の生成
```bash
pnpm --filter @wsfw/api openapi:gen
# ルートディレクトリに openapi.json が生成される
```

## トラブルシューティング

### ポート衝突（3001 が使用中）
```bash
# 使用中のプロセスを確認
lsof -iTCP:3001 -sTCP:LISTEN -n -P

# プロセスを終了
kill <PID>
# または強制終了
kill -9 <PID>
```

### ルーター型不整合エラー
```bash
# 例: No "query"-procedure on path "posts.list"
# 原因: API パッケージのビルドが古い

# 解決策:
pnpm --filter @wsfw/api build  # API を再ビルド
pnpm dev:api                   # サーバー再起動
```

### Vite キャッシュエラー
```bash
# キャッシュクリア
rm -rf apps/web/node_modules/.vite

# 依存関係の再インストール
pnpm install

# Web 再起動
pnpm dev:web
```

### WebSocket 接続エラー
1. **Origin エラー**: `.env` の `ALLOWED_WS_ORIGIN` がフロントのURLと一致しているか確認
2. **OIDC 設定エラー**: `.env` の `OIDC_ISSUER` / `OIDC_CLIENT_ID` / `OIDC_REDIRECT_URI` が正しいか確認
3. **接続拒否**: サーバが起動しているか確認（`pnpm dev:api`）

### データベースエラー
```bash
# データベースのリセット（全データ削除）
rm apps/api/prisma/dev.db

# 再作成
pnpm db:push
```

## アーキテクチャのポイント
- **WS-only tRPC**: フロントは REST ライクに `query/mutation` を呼ぶが、実体は持続的な WebSocket 接続
- **OIDC認証**: WebSocket Subprotocol `['bearer', token]` でアクセストークンを送信（再接続時も自明）
- **依存性注入**: tsyringe による DI/IoC で疎結合な設計
- **構造化ログ**: JSON形式のログで監視・分析を容易化
- **型安全性**: tRPC により API の型情報をフロント・バックエンドで共有
- **スケール設計**: Sticky-Sessions + 外部 PubSub（未実装）で水平スケール可能
- **多言語対応**: i18next による国際化（日本語/英語）
- **OpenAPI**: trpc-openapi による自動ドキュメント生成

## セキュリティベストプラクティス
- ✅ 本番では OIDC クライアント設定・シークレットを安全に管理（Secrets Manager 等を利用）
- ✅ 本番運用は TLS 終端 + `wss://` を利用
- ✅ 入力は Zod で検証、テキストは保存前にサニタイズ
- ✅ Origin検証を必ず有効化（`ALLOWED_WS_ORIGIN`）
- ✅ レート制限を適切に設定
- ✅ 監査ログで不正アクセスを監視
- ✅ 定期的な依存関係の更新（`pnpm update`）
- ✅ 環境変数の適切な管理（シークレット管理ツール使用）

## パフォーマンス最適化
- **バンドルサイズ**: 現在約924KB（gzip: 264KB）
  - Code Splitting 導入検討（React.lazy + Suspense）
  - Tree-shaking の最適化
- **WebSocket**:
  - 圧縮無効（セキュリティ優先）
  - ハートビートによる早期切断検知
- **データベース**:
  - Prisma のインデックス最適化
  - PostgreSQL / SQLite の選択可能（環境に応じて）

## 今後の拡張案
- [x] PostgreSQL 対応（完了）
- [x] Docker コンテナ化（完了 - SSL/TLS対応）
- [x] Kubernetes/AKS デプロイメント構成（完了）
- [x] セキュリティレビューと強化（完了）
- [ ] テストコード整備（Vitest + Testing Library）
- [ ] CI/CD パイプライン（GitHub Actions / Azure DevOps）
- [ ] Redis によるレート制限の永続化
- [ ] WebSocket クラスタリング（Sticky Sessions + PubSub）
- [ ] Service Mesh（Istio/Linkerd）による内部mTLS
- [ ] 管理画面の実装
- [ ] ファイルアップロード機能
- [ ] リアルタイム通知（Subscription）
- [ ] E2E テスト（Playwright）

## ライセンス
MIT（必要に応じて変更してください）

## 貢献
Issue や Pull Request を歓迎します。

## サポート
問題が発生した場合は、以下を確認してください:
1. `.env` ファイルが正しく設定されているか
2. 依存関係がインストールされているか（`pnpm install`）
3. データベースが初期化されているか（`pnpm db:push`）
4. サーバとクライアントが両方起動しているか

詳細は本 README のトラブルシューティングセクションを参照してください。
