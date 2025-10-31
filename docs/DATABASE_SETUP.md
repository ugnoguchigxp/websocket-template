# データベースセットアップガイド

このドキュメントでは、WebSocket BBSプロジェクトでSQLiteまたはPostgreSQLを使用するためのセットアップ手順を説明します。

## 目次
- [データベースの選択](#データベースの選択)
- [SQLiteセットアップ（開発用・シンプル）](#sqliteセットアップ開発用シンプル)
- [PostgreSQLセットアップ（本番推奨）](#postgresqlセットアップ本番推奨)
  - [Docker を使用](#1-docker-を使用推奨)
  - [ローカルPostgreSQLを使用](#2-ローカルpostgresqlを使用)
- [データベースの切り替え](#データベースの切り替え)
- [トラブルシューティング](#トラブルシューティング)

---

## データベースの選択

### SQLite
**メリット:**
- セットアップが簡単（追加のインストール不要）
- ファイルベースで管理が容易
- 小規模開発・プロトタイピングに最適

**デメリット:**
- 同時接続数に制限
- 本番環境での大規模運用には不向き
- 一部の高度な機能が制限される

**推奨用途:** 個人開発、プロトタイピング、小規模アプリケーション

### PostgreSQL
**メリット:**
- 本番環境向けの高い信頼性
- 高度な機能（JSON型、全文検索、トランザクション等）
- 大規模データ・高トラフィックに対応
- 水平スケーリングが容易

**デメリット:**
- セットアップがやや複雑
- リソース消費がやや多い

**推奨用途:** 本番環境、チーム開発、大規模アプリケーション

---

## SQLiteセットアップ（開発用・シンプル）

### 前提条件
- Node.js 20+
- pnpm 9+

### 手順

#### 1. Prismaスキーマの設定

`apps/api/prisma/schema.prisma` を編集：

```prisma
generator client {
  provider = "prisma-client-js"
}

// SQLiteを使用する場合:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// PostgreSQLを使用する場合（コメントアウト）:
// datasource db {
//   provider = "postgresql"
//   url      = env("DATABASE_URL")
// }
```

#### 2. 環境変数の設定

`.env` ファイルを作成または編集：

```bash
cp .env.example .env
```

`.env` の `DATABASE_URL` を設定：

```env
DATABASE_URL="file:./dev.db"
```

#### 3. データベースの初期化

```bash
# Prisma クライアント生成
pnpm db:generate

# データベーススキーマの作成
pnpm db:push
```

SQLiteデータベースファイル `apps/api/prisma/dev.db` が作成されます。

#### 4. サーバー起動

```bash
pnpm dev:api
```

デモユーザー（`demo` / `demo1234`）が自動作成されます。

#### 5. データベースの確認

SQLiteファイルを直接確認する場合：

```bash
# sqlite3 がインストールされている場合
sqlite3 apps/api/prisma/dev.db

# SQLiteコマンド例
.tables           # テーブル一覧
.schema User      # Userテーブルのスキーマ表示
SELECT * FROM User;  # ユーザー一覧
.quit             # 終了
```

または、[DB Browser for SQLite](https://sqlitebrowser.org/) などのGUIツールを使用。

---

## PostgreSQLセットアップ（本番推奨）

### 前提条件
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose（Dockerを使用する場合）

### 1. Docker を使用（推奨）

#### 1-1. PostgreSQLコンテナの起動

プロジェクトルートで以下のコマンドを実行：

```bash
docker compose up -d postgres
```

PostgreSQLが起動したことを確認：

```bash
docker compose ps

# または詳細ログを確認
docker compose logs postgres
```

#### 1-2. Prismaスキーマの設定

`apps/api/prisma/schema.prisma` を編集：

```prisma
generator client {
  provider = "prisma-client-js"
}

// PostgreSQLを使用する場合（推奨）:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// SQLiteを使用する場合（コメントアウト）:
// datasource db {
//   provider = "sqlite"
//   url      = env("DATABASE_URL")
// }
```

#### 1-3. 環境変数の設定

`.env` ファイルを作成または編集：

```bash
cp .env.example .env
```

`.env` の `DATABASE_URL` を設定：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/websocket_bbs?schema=public"
```

#### 1-4. データベースの初期化

```bash
# Prisma クライアント生成
pnpm db:generate

# データベーススキーマの反映
pnpm db:push
```

#### 1-5. サーバー起動

```bash
pnpm dev:api
```

デモユーザー（`demo` / `demo1234`）が自動作成されます。

#### 1-6. pgAdmin（オプション）

データベースをGUIで管理したい場合は、pgAdminを起動：

```bash
docker compose up -d pgadmin
```

ブラウザで `http://localhost:5050` を開く：
- Email: `admin@example.com`
- Password: `admin`

**pgAdminでPostgreSQLに接続:**
1. 左メニューで「Add New Server」をクリック
2. **General タブ**:
   - Name: `websocket-bbs`
3. **Connection タブ**:
   - Host: `postgres`（Docker内部ネットワーク）またはホストから接続する場合は `localhost`
   - Port: `5432`
   - Maintenance database: `websocket_bbs`
   - Username: `postgres`
   - Password: `postgres`
4. 「Save」をクリック

### 2. ローカルPostgreSQLを使用

すでにPostgreSQLがインストールされている場合。

#### 2-1. データベースの作成

```bash
# PostgreSQLに接続（macOS/Linuxの場合）
psql -U postgres

# またはWindowsの場合は psql を検索して起動
```

PostgreSQLコマンドラインで：

```sql
-- データベース作成
CREATE DATABASE websocket_bbs;

-- 接続確認
\c websocket_bbs

-- テーブル一覧（初期状態では空）
\dt

-- 終了
\q
```

#### 2-2. Prismaスキーマと環境変数の設定

[1-2. Prismaスキーマの設定](#1-2-prismaスキーマの設定) と同じ手順。

`.env` ファイルの `DATABASE_URL`:

```env
# ローカルPostgreSQLの場合（パスワードを適宜変更）
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/websocket_bbs?schema=public"
```

#### 2-3. データベースの初期化とサーバー起動

[1-4. データベースの初期化](#1-4-データベースの初期化) と同じ手順。

---

## データベースの切り替え

### SQLite → PostgreSQL へ切り替え

#### 1. 既存データのバックアップ（必要に応じて）

SQLiteから必要なデータをエクスポートしておく。

#### 2. PostgreSQLのセットアップ

[PostgreSQLセットアップ](#postgresqlセットアップ本番推奨) の手順に従う。

#### 3. Prismaスキーマを変更

`apps/api/prisma/schema.prisma`:

```prisma
// 変更前
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 変更後
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 4. 環境変数を変更

`.env`:

```env
# 変更前
DATABASE_URL="file:./dev.db"

# 変更後
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/websocket_bbs?schema=public"
```

#### 5. データベースを再生成

```bash
# Prisma クライアント再生成
pnpm db:generate

# スキーマを反映
pnpm db:push
```

#### 6. サーバー再起動

```bash
pnpm dev:api
```

### PostgreSQL → SQLite へ切り替え

上記の逆手順で実行。

---

## トラブルシューティング

### 共通エラー

#### エラー: "Prisma schema not found"

**原因**: Prismaクライアントが古い、またはスキーマのパスが間違っている。

**解決策**:
```bash
pnpm db:generate
```

#### エラー: "Cannot find module '@prisma/client'"

**原因**: 依存関係がインストールされていない。

**解決策**:
```bash
pnpm install
pnpm db:generate
```

### SQLite 固有のエラー

#### エラー: "SQLITE_CANTOPEN: unable to open database file"

**原因**: ディレクトリが存在しないか、権限がない。

**解決策**:
```bash
# ディレクトリを確認
ls -la apps/api/prisma/

# 権限を確認
chmod 755 apps/api/prisma/
```

#### データベースのリセット

```bash
# SQLiteファイルを削除
rm apps/api/prisma/dev.db

# 再作成
pnpm db:push
```

### PostgreSQL 固有のエラー

#### エラー: "Can't reach database server"

**原因**: PostgreSQLが起動していないか、接続情報が間違っている。

**解決策**:
```bash
# Dockerの場合、コンテナが起動しているか確認
docker compose ps

# ログを確認
docker compose logs postgres

# コンテナを再起動
docker compose restart postgres

# ローカルPostgreSQLの場合
# macOS
brew services list
brew services restart postgresql

# Linux (systemd)
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

#### エラー: "Database does not exist"

**原因**: データベースが作成されていない。

**解決策**:
```bash
# Dockerの場合
docker compose exec postgres psql -U postgres -c "CREATE DATABASE websocket_bbs;"

# ローカルの場合
psql -U postgres -c "CREATE DATABASE websocket_bbs;"
```

#### エラー: "password authentication failed"

**原因**: パスワードが間違っている。

**解決策**:
- `.env` の `DATABASE_URL` のパスワードを確認
- Dockerの場合は `docker-compose.yml` の `POSTGRES_PASSWORD` と一致しているか確認

#### ポート衝突（5432が使用中）

**原因**: 既にPostgreSQLが起動している。

**解決策**:

```bash
# 既存のPostgreSQLを確認
lsof -iTCP:5432 -sTCP:LISTEN

# docker-compose.yml のポート番号を変更
# 例: '5433:5432'
```

変更後、`.env` の `DATABASE_URL` も変更:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/websocket_bbs?schema=public"
```

#### データベースのリセット

開発中にデータベースをクリーンアップしたい場合：

```bash
# Docker volume を削除（全データ削除）
docker compose down -v

# コンテナを再起動
docker compose up -d postgres

# マイグレーション再実行
pnpm db:push
```

---

## 本番環境での推奨設定

### PostgreSQL（本番）

#### 環境変数

```env
DATABASE_URL="postgresql://username:password@hostname:5432/dbname?schema=public&sslmode=require"
NODE_ENV="production"
```

#### 接続プール

大規模な本番環境では、接続プールの設定を調整：

```env
DATABASE_URL="postgresql://username:password@hostname:5432/dbname?schema=public&sslmode=require&connection_limit=20&pool_timeout=30"
```

#### SSL/TLS

本番環境では必ずSSL/TLS接続を使用：

```env
DATABASE_URL="postgresql://username:password@hostname:5432/dbname?schema=public&sslmode=require"
```

#### バックアップ

定期的なバックアップを設定：

```bash
# 手動バックアップ（Docker）
docker compose exec postgres pg_dump -U postgres websocket_bbs > backup_$(date +%Y%m%d).sql

# 手動バックアップ（ローカル）
pg_dump -U postgres websocket_bbs > backup_$(date +%Y%m%d).sql

# リストア（Docker）
docker compose exec -T postgres psql -U postgres websocket_bbs < backup_20250131.sql

# リストア（ローカル）
psql -U postgres websocket_bbs < backup_20250131.sql
```

#### マネージドPostgreSQLサービス

本番環境では、以下のようなマネージドサービスの利用を推奨：

- **AWS RDS for PostgreSQL**
- **Google Cloud SQL for PostgreSQL**
- **Azure Database for PostgreSQL**
- **Supabase** (無料プランあり)
- **Neon** (サーバーレスPostgreSQL)
- **Railway** (簡単デプロイ)

これらのサービスでは、バックアップ・高可用性・スケーリングが自動化されています。

---

## データベース管理ツール

### SQLite
- [DB Browser for SQLite](https://sqlitebrowser.org/) - GUI管理ツール（無料）
- [SQLite Viewer (VSCode Extension)](https://marketplace.visualstudio.com/items?itemName=alexcvzz.vscode-sqlite) - VSCode拡張機能

### PostgreSQL
- **pgAdmin** - 本プロジェクトに同梱（`docker compose up -d pgadmin`）
- [DBeaver](https://dbeaver.io/) - 多機能DBクライアント（無料）
- [TablePlus](https://tableplus.com/) - モダンなDBクライアント
- [Postico](https://eggerapps.at/postico/) - macOS専用（有料）

---

## まとめ

### 使い分けの目安

| 用途 | データベース | セットアップ方法 |
|------|-------------|------------------|
| 個人開発・プロトタイピング | SQLite | ファイルベース |
| チーム開発・ステージング | PostgreSQL | Docker Compose |
| 本番環境 | PostgreSQL | マネージドサービス |

### 推奨フロー

1. **開発開始**: SQLiteで素早くスタート
2. **チーム開発**: PostgreSQL（Docker）に切り替え
3. **本番デプロイ**: マネージドPostgreSQLサービスを使用

両方のデータベースをサポートしているため、開発段階に応じて柔軟に切り替え可能です。
