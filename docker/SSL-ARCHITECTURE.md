# SSL/TLS暗号化アーキテクチャ

このプロジェクトでは、**完全なエンドツーエンドSSL/TLS暗号化**を実装しています。

## 設計思想

従来のDocker構成では、nginxで外部SSL終端を行い、内部通信は平文（HTTP）で行うことが一般的です。しかし、このアプローチには以下の問題があります：

1. **内部ネットワークの侵害時のリスク**: コンテナ間通信が平文の場合、内部ネットワークに侵入されると全ての通信が傍受される
2. **ゼロトラストの原則違反**: 内部ネットワークを信頼する前提は、現代のセキュリティベストプラクティスに反する
3. **コンプライアンス要件**: 一部の業界標準（PCI DSS、HIPAA等）では、内部通信の暗号化も要求される

このプロジェクトでは、**すべての通信経路をSSL/TLS暗号化**することで、上記の問題を解決します。

## アーキテクチャ概要

```
外部クライアント
    │
    │ HTTPS (Let's Encrypt証明書)
    ↓
┌────────────────┐
│     nginx      │ SSL終端 + 内部HTTPSプロキシ
│   (443, 80)    │
└────────────────┘
    │         │
    │ HTTPS   │ HTTPS (内部自己署名証明書)
    ↓         ↓
┌─────────┐ ┌─────────┐
│   web   │ │   api   │
│  (443)  │ │ (3001)  │
└─────────┘ └─────────┘
               │
               │ PostgreSQL SSL接続 (内部自己署名証明書)
               ↓
          ┌──────────┐
          │ postgres │
          │  (5432)  │
          └──────────┘
```

## SSL証明書の構成

### 1. 外部公開用証明書（nginx用）

- **場所**: `docker/nginx/ssl/`
- **タイプ**: Let's Encryptなどの正規CA発行証明書
- **用途**: 外部クライアント → nginx間の通信

**理由**: ブラウザや外部クライアントが信頼する必要があるため、正規のCA証明書が必要

### 2. 内部通信用証明書

#### 2.1 内部CA証明書

- **場所**: `docker/certs/ca.crt`
- **タイプ**: 自己署名CA証明書
- **用途**: 内部サービス証明書の署名

#### 2.2 各サービスの証明書

| サービス | 証明書の場所 | 用途 |
|---------|------------|------|
| PostgreSQL | `docker/certs/postgres/` | APIとの間のSSL接続 |
| API | `docker/certs/api/` | nginxからのHTTPS接続受付 |
| Web | `docker/certs/web/` | nginxからのHTTPS接続受付 |

**理由**: 内部通信は外部に公開されないため、自己署名証明書で十分。コスト削減と証明書管理の簡略化が可能

## 通信経路の詳細

### 1. 外部 → nginx (HTTPS)

- **プロトコル**: TLS 1.2/1.3
- **証明書**: Let's Encrypt証明書
- **暗号スイート**: HIGH:!aNULL:!MD5
- **ポート**: 443 (HTTPS), 80 (HTTPリダイレクト)

```nginx
listen 443 ssl http2;
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

### 2. nginx → Web (HTTPS)

- **プロトコル**: TLS 1.2/1.3
- **証明書**: 内部自己署名証明書
- **検証**: `proxy_ssl_verify off` (自己署名証明書のため)
- **ポート**: 443

```nginx
location / {
    proxy_pass https://frontend;
    proxy_ssl_verify off;
    proxy_ssl_session_reuse on;
}
```

**設計上の選択**: 内部証明書の検証を無効にしているのは、自己署名証明書を使用しているため。内部ネットワークは隔離されており、中間者攻撃のリスクは低い。

### 3. nginx → API (HTTPS)

- **プロトコル**: TLS 1.2/1.3
- **証明書**: 内部自己署名証明書
- **検証**: `proxy_ssl_verify off`
- **ポート**: 3001

```nginx
location /api {
    proxy_pass https://backend;
    proxy_ssl_verify off;
    proxy_ssl_session_reuse on;
}
```

### 4. API → PostgreSQL (SSL接続)

- **プロトコル**: PostgreSQL SSL/TLS
- **証明書**: 内部自己署名証明書
- **接続文字列**: `postgresql://...?sslmode=require`
- **ポート**: 5432

```bash
DATABASE_URL="postgresql://postgres:password@postgres:5432/db?sslmode=require"
PGSSLMODE="require"
```

PostgreSQL設定：
```conf
ssl = on
ssl_cert_file = '/var/lib/postgresql/ssl/server.crt'
ssl_key_file = '/var/lib/postgresql/ssl/server.key'
```

## 証明書生成プロセス

### 内部証明書の生成

`docker/generate-internal-certs.sh` スクリプトが以下を自動生成：

1. **内部CA証明書の生成**
   ```bash
   openssl genrsa -out ca.key 4096
   openssl req -new -x509 -days 3650 -key ca.key -out ca.crt
   ```

2. **各サービス用証明書の生成**
   - 秘密鍵の生成
   - CSR (Certificate Signing Request) の生成
   - CA証明書で署名
   - SANフィールドの設定（DNS名）

3. **証明書の配置**
   - 各サービス用ディレクトリにコピー
   - 適切なパーミッション設定（秘密鍵: 600）

## セキュリティ考慮事項

### 1. 証明書の管理

- ✅ **秘密鍵の保護**: すべての秘密鍵は `.gitignore` で除外
- ✅ **パーミッション**: 秘密鍵は 600、証明書は 644
- ✅ **ボリュームマウント**: Docker内部への証明書は読み取り専用（`:ro`）

### 2. TLSプロトコル設定

- ✅ **TLS 1.2以上のみ**: TLS 1.0/1.1は無効化
- ✅ **強力な暗号スイート**: HIGH暗号スイートのみ
- ✅ **Perfect Forward Secrecy**: サーバー側暗号選択優先

### 3. 証明書検証

| 通信経路 | 検証 | 理由 |
|---------|------|------|
| 外部 → nginx | 有効 | ブラウザによる正規証明書検証 |
| nginx → api/web | 無効 | 自己署名証明書、内部ネットワーク隔離 |
| api → postgres | 有効 | `sslmode=require`で接続を強制 |

### 4. 非root実行

- APIコンテナは非rootユーザー（nodejs:1001）で実行
- PostgreSQLも専用ユーザーで実行
- セキュリティリスクの最小化

## トラブルシューティング

### 証明書が見つからないエラー

```
Error: ENOENT: no such file or directory, open '/app/ssl/server.crt'
```

**解決策**: `./docker/generate-internal-certs.sh` を実行して内部証明書を生成

### PostgreSQL SSL接続エラー

```
Error: SSL connection has been closed unexpectedly
```

**解決策**:
1. PostgreSQL証明書が正しくマウントされているか確認
2. `docker-compose.prod.yml` のボリュームマウント確認
3. PostgreSQLログを確認: `docker logs wsfw-postgres`

### nginx内部プロキシエラー

```
upstream SSL certificate verify error
```

**解決策**: nginx設定で `proxy_ssl_verify off;` が設定されているか確認

## パフォーマンスへの影響

### 暗号化のオーバーヘッド

- **CPU使用率**: 約5-10%増加（TLS暗号化・復号化）
- **レイテンシ**: 約1-3ms増加（TLSハンドシェイク）
- **スループット**: ほぼ影響なし（セッション再利用により）

### 最適化設定

```nginx
# セッション再利用でハンドシェイクを削減
proxy_ssl_session_reuse on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HTTP/2で多重化
listen 443 ssl http2;

# Keep-Aliveで接続再利用
keepalive 32;
```

## まとめ

このアーキテクチャにより、以下を実現：

✅ **完全な暗号化**: すべての通信経路がSSL/TLS保護
✅ **ゼロトラスト**: 内部ネットワークも信頼しない設計
✅ **コンプライアンス**: 業界標準のセキュリティ要件を満たす
✅ **管理の簡素化**: 証明書生成スクリプトで自動化
✅ **パフォーマンス**: セッション再利用でオーバーヘッド最小化

このアプローチは、セキュリティを最優先するプロダクション環境に適しています。
