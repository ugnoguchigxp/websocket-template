# デプロイメントガイド

本ドキュメントでは、**完全SSL/TLS暗号化対応**のDocker構成を使用した本番環境へのデプロイ方法を説明します。

**重要**: このプロジェクトでは、外部通信だけでなく**内部通信もすべてSSL/TLS暗号化**されています。

## 目次

1. [前提条件](#前提条件)
2. [環境構成](#環境構成)
3. [SSL証明書の準備](#ssl証明書の準備)
4. [環境変数の設定](#環境変数の設定)
5. [デプロイ手順](#デプロイ手順)
6. [動作確認](#動作確認)
7. [トラブルシューティング](#トラブルシューティング)

## 前提条件

デプロイを実行する前に、以下が準備されていることを確認してください：

- Docker 24.0以上
- Docker Compose 2.0以上
- Git
- 本番環境サーバー（Linux推奨）
- ドメイン名（SSL証明書取得用）

## 環境構成

本番環境のDocker構成は以下のコンテナで構成されています：

```
┌─────────────────────────────────────────┐
│          外部ネットワーク (Internet)       │
└──────────────┬──────────────────────────┘
               │ 443 (HTTPS) 🔒
               │ 80 (HTTP → HTTPSリダイレクト)
               ▼
        ┌─────────────┐
        │   nginx     │ ← 外部SSL終端
        │  (443, 80)  │
        └──────┬──────┘
               │ 🔒 HTTPS (内部通信も暗号化)
        ┌──────┴─────────┐
        │                │
        ▼ 🔒             ▼ 🔒
   ┌────────┐      ┌─────────┐
   │  web   │      │   api   │
   │ (443)  │      │  (3001) │
   └────────┘      └────┬────┘
                        │ 🔒 PostgreSQL SSL接続
                        ▼
                   ┌──────────┐
                   │ postgres │
                   │  (5432)  │
                   └──────────┘
```

**すべての通信がSSL/TLS暗号化されています：**

- **外部 → nginx**: HTTPS (Let's Encrypt等の正規証明書)
- **nginx → web**: HTTPS (内部自己署名証明書)
- **nginx → api**: HTTPS (内部自己署名証明書)
- **api → postgres**: PostgreSQL SSL接続 (内部自己署名証明書)

### コンテナ詳細

- **nginx**: 外部SSL終端、内部HTTPSリバースプロキシ（外部に443ポートのみ公開）
- **web**: Reactフロントエンド（HTTPS 443ポートで待ち受け）
- **api**: Node.js/tRPCバックエンド（HTTPS 3001ポートで待ち受け）
- **postgres**: PostgreSQLデータベース（SSL必須接続）

## SSL証明書の準備

このプロジェクトでは、**2種類のSSL証明書**が必要です：

1. **外部公開用証明書** (nginx用): Let's Encryptなどの正規の証明書
2. **内部通信用証明書** (web, api, postgres用): 自己署名証明書

### ステップ1: 内部通信用証明書の生成（必須）

まず、内部通信用の自己署名証明書を生成します：

```bash
cd /path/to/websocketFramework

# 内部証明書生成スクリプトを実行
./docker/generate-internal-certs.sh
```

このスクリプトは以下を生成します：
- `docker/certs/ca.crt` - 内部CA証明書
- `docker/certs/postgres/` - PostgreSQL用証明書
- `docker/certs/api/` - API用証明書
- `docker/certs/web/` - Web用証明書

⚠️ **重要**: これらの証明書はDockerコンテナ起動前に生成する必要があります。

### ステップ2: 外部公開用証明書の準備

#### 方法A: Let's Encryptを使用（本番環境推奨）

```bash
# Certbotのインストール（Ubuntu/Debian）
sudo apt-get update
sudo apt-get install certbot

# 証明書の取得
sudo certbot certonly --standalone -d yourdomain.com

# 証明書をプロジェクトディレクトリにコピー
cd /path/to/websocketFramework
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem
sudo chown $USER:$USER docker/nginx/ssl/*.pem
chmod 644 docker/nginx/ssl/cert.pem
chmod 600 docker/nginx/ssl/key.pem
```

#### 方法B: 自己署名証明書（開発・テスト用のみ）

```bash
cd docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Development/CN=localhost"
```

⚠️ **注意**: 自己署名証明書は本番環境では使用しないでください。

### 証明書の確認

すべての証明書が正しく配置されているか確認：

```bash
# 内部証明書の確認
ls -la docker/certs/postgres/
ls -la docker/certs/api/
ls -la docker/certs/web/

# 外部証明書の確認
ls -la docker/nginx/ssl/

# 期待される出力:
# docker/certs/postgres/server.crt, server.key, ca.crt
# docker/certs/api/server.crt, server.key, ca.crt
# docker/certs/web/server.crt, server.key, ca.crt
# docker/nginx/ssl/cert.pem, key.pem
```

詳細は `docker/nginx/ssl/README.md` を参照してください。

## 環境変数の設定

### 1. 環境変数ファイルの作成

```bash
# プロジェクトルートディレクトリで実行
cp .env.production.example .env
```

### 2. 環境変数の編集

`.env` ファイルを編集して、以下の値を設定してください：

```bash
# 必須: セキュアなJWTシークレットを生成
openssl rand -base64 32

# .envファイルを編集
nano .env
```

```env
# Node Environment
NODE_ENV="production"

# Database (SSL接続必須)
DATABASE_URL="postgresql://postgres:STRONG_PASSWORD@postgres:5432/websocket_bbs?schema=public&sslmode=require"

# PostgreSQL Configuration
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="STRONG_PASSWORD_HERE"  # 必ず変更
POSTGRES_DB="websocket_bbs"

# JWT Secret（openssl rand -base64 32 で生成した値）
JWT_SECRET="your-generated-secret-here"  # 必ず変更

# JWT Settings
JWT_ISSUER="websocket-framework"
JWT_AUDIENCE="websocket-framework-api"

# WebSocket Server
PORT=3001
ALLOWED_WS_ORIGIN="https://yourdomain.com"

# SSL Configuration (Docker内で自動設定)
SSL_CERT_PATH="/app/ssl/server.crt"
SSL_KEY_PATH="/app/ssl/server.key"
PGSSLMODE="require"
```

⚠️ **セキュリティ重要事項**:
- `JWT_SECRET`: 必ず32文字以上のランダム文字列に変更
- `POSTGRES_PASSWORD`: 強力なパスワードに変更
- `.env`ファイルをGitにコミットしないこと（.gitignoreで除外済み）

## デプロイ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd websocketFramework
```

### 2. 内部通信用SSL証明書の生成（必須）

**最初に実行する重要なステップです：**

```bash
# 内部証明書生成スクリプトに実行権限を付与
chmod +x docker/generate-internal-certs.sh

# 内部証明書を生成
./docker/generate-internal-certs.sh
```

生成が成功すると、以下のディレクトリに証明書が作成されます：
- `docker/certs/ca.crt`
- `docker/certs/postgres/`
- `docker/certs/api/`
- `docker/certs/web/`

### 3. 外部公開用SSL証明書の配置

前述の「SSL証明書の準備 - ステップ2」を参照して外部公開用の証明書を配置してください。

```bash
# Let's Encryptの場合の例
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem
sudo chown $USER:$USER docker/nginx/ssl/*.pem
chmod 644 docker/nginx/ssl/cert.pem
chmod 600 docker/nginx/ssl/key.pem
```

### 4. 環境変数の設定

前述の「環境変数の設定」を参照して `.env` ファイルを作成してください。

```bash
cp .env.production.example .env
nano .env  # 必要な値を設定
```

### 5. Dockerイメージのビルド

```bash
docker-compose -f docker-compose.prod.yml build
```

ビルドには数分かかる場合があります。全てのサービス（postgres, api, web, nginx）がビルドされます。

### 6. コンテナの起動

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 7. データベースのマイグレーション

初回デプロイ時のみ実行：

```bash
# APIコンテナ内でPrismaマイグレーションを実行
docker-compose -f docker-compose.prod.yml exec api sh -c "npx prisma migrate deploy"
```

### 8. ヘルスチェック

```bash
# 全コンテナの状態確認
docker-compose -f docker-compose.prod.yml ps

# ログの確認（全サービス）
docker-compose -f docker-compose.prod.yml logs -f

# SSL接続の確認（API）
docker-compose -f docker-compose.prod.yml logs api | grep -i ssl

# PostgreSQL SSL接続の確認
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT * FROM pg_stat_ssl;"
```

## 動作確認

### 1. ヘルスチェックエンドポイント

```bash
# nginxヘルスチェック
curl https://yourdomain.com/health

# 期待される応答: "healthy"
```

### 2. APIエンドポイント

```bash
# APIヘルスチェック
curl https://yourdomain.com/api/health

# 期待される応答: {"status":"ok"}
```

### 3. フロントエンド

ブラウザで `https://yourdomain.com` にアクセスして、アプリケーションが正常に表示されることを確認してください。

### 4. WebSocket接続

ブラウザの開発者ツールで、WebSocket接続が正常に確立されることを確認してください：

```
wss://yourdomain.com/ws
```

## トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker-compose -f docker-compose.prod.yml logs

# 特定のサービスのログを確認
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs web
docker-compose -f docker-compose.prod.yml logs nginx
```

### SSL証明書エラー

```bash
# 証明書が正しく配置されているか確認
ls -la docker/nginx/ssl/

# 証明書の内容を確認
openssl x509 -in docker/nginx/ssl/cert.pem -text -noout

# nginxの設定をテスト
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

### データベース接続エラー

```bash
# PostgreSQLコンテナの状態確認
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# データベース接続テスト
docker-compose -f docker-compose.prod.yml exec api sh -c "npx prisma db pull"
```

### ポートが既に使用されている

```bash
# 443ポートを使用しているプロセスを確認
sudo lsof -i :443

# 80ポートを使用しているプロセスを確認
sudo lsof -i :80

# 必要に応じて他のサービスを停止
sudo systemctl stop apache2  # Apacheが起動している場合
sudo systemctl stop nginx    # 別のnginxが起動している場合
```

## メンテナンス

### ログの確認

```bash
# リアルタイムでログを確認
docker-compose -f docker-compose.prod.yml logs -f

# 最新100行のログを確認
docker-compose -f docker-compose.prod.yml logs --tail=100

# 特定のサービスのログのみ確認
docker-compose -f docker-compose.prod.yml logs -f api
```

### コンテナの再起動

```bash
# 全コンテナを再起動
docker-compose -f docker-compose.prod.yml restart

# 特定のコンテナを再起動
docker-compose -f docker-compose.prod.yml restart api
```

### アプリケーションの更新

```bash
# 最新のコードを取得
git pull

# イメージを再ビルド
docker-compose -f docker-compose.prod.yml build

# コンテナを再起動
docker-compose -f docker-compose.prod.yml up -d

# データベースマイグレーション（必要に応じて）
docker-compose -f docker-compose.prod.yml exec api sh -c "npx prisma migrate deploy"
```

### データベースのバックアップ

```bash
# PostgreSQLデータベースのバックアップ
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres websocket_bbs > backup_$(date +%Y%m%d_%H%M%S).sql

# バックアップの復元
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres websocket_bbs < backup_YYYYMMDD_HHMMSS.sql
```

### SSL証明書の更新

Let's Encryptの証明書は90日で期限切れになるため、定期的な更新が必要です：

```bash
# 証明書の更新
sudo certbot renew

# 更新された証明書をコピー
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem
sudo chown $USER:$USER docker/nginx/ssl/*.pem
chmod 644 docker/nginx/ssl/cert.pem
chmod 600 docker/nginx/ssl/key.pem

# nginxコンテナを再起動
docker-compose -f docker-compose.prod.yml restart nginx
```

自動更新を設定することを推奨します：

```bash
# crontabを編集
sudo crontab -e

# 以下を追加（毎日午前3時に証明書の更新をチェック）
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /path/to/websocketFramework/docker/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /path/to/websocketFramework/docker/nginx/ssl/key.pem && docker-compose -f /path/to/websocketFramework/docker-compose.prod.yml restart nginx
```

## コンテナの停止

```bash
# コンテナの停止
docker-compose -f docker-compose.prod.yml down

# データも削除する場合（注意: データベースも削除されます）
docker-compose -f docker-compose.prod.yml down -v
```

## セキュリティ推奨事項

1. **ファイアウォールの設定**: 443と80ポート以外を閉じる
2. **定期的な更新**: Docker、OS、依存パッケージを定期的に更新
3. **証明書の更新**: SSL証明書を期限前に更新
4. **ログ監視**: 定期的にログを確認し、異常なアクセスを検出
5. **バックアップ**: データベースの定期バックアップを設定
6. **環境変数の保護**: `.env`ファイルのパーミッションを600に設定

```bash
chmod 600 .env
```

## その他のリソース

- [Docker公式ドキュメント](https://docs.docker.com/)
- [Let's Encrypt ドキュメント](https://letsencrypt.org/docs/)
- [nginx公式ドキュメント](https://nginx.org/en/docs/)
- [Prisma デプロイガイド](https://www.prisma.io/docs/guides/deployment)
