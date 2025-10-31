# Docker Compose vs Kubernetes (AKS) アーキテクチャ比較

## 質問: nginxは不要になるか？

### 回答: **部分的にYES、部分的にNO**

## 詳細な比較

### Docker Compose構成

```
Internet (443/80)
    ↓
nginx (リバースプロキシ + SSL終端)
    ↓ HTTPS
    ├→ web:443 (nginx + React SPA)
    └→ api:3001 (Node.js)
         ↓ PostgreSQL SSL
         postgres:5432
```

### Kubernetes (AKS) 構成

```
Internet (443/80)
    ↓
Azure Load Balancer / Application Gateway
    ↓
Ingress Controller (nginx-ingress / App Gateway Ingress)
    ↓ HTTP/HTTPS
    ├→ web Service → web Pod (nginx + React SPA)
    └→ api Service → api Pod (Node.js)
                      ↓ PostgreSQL SSL
                      postgres Service → PostgreSQL Pod
                      または
                      Azure Database for PostgreSQL
```

## nginxの役割分析

### Docker Compose版のnginx

| 役割 | 必要性 | 理由 |
|-----|-------|------|
| **外部SSL終端** | ✅ | 必須：外部からのHTTPS接続を処理 |
| **リバースプロキシ** | ✅ | 必須：web/apiへの振り分け |
| **ロードバランシング** | ❌ | 単一インスタンスのため不要 |
| **内部SSL再暗号化** | ✅ | セキュリティ要件として実装 |

### Kubernetes版の構成

| コンポーネント | 役割 | 必要性 |
|-------------|------|-------|
| **Ingress Controller** | 外部SSL終端 + ルーティング | ✅ 必須（nginxリバースプロキシの代替） |
| **web Pod内のnginx** | React SPA配信 | ✅ **必要** |
| **api Pod** | Node.js直接実行 | ✅ 必須 |
| **Service** | Pod間ロードバランシング | ✅ 必須 |

## 結論

### 不要になるもの

❌ **docker/nginxディレクトリのnginxコンテナ（リバースプロキシ）**
- Ingress Controllerが代替する
- docker-compose.prod.ymlのnginxサービスは不要

### 引き続き必要なもの

✅ **apps/web/Dockerfile内のnginx（React SPA配信用）**
- これは変更なし
- webコンテナはそのまま使用

## AKSデプロイの推奨アーキテクチャ

### オプション1: nginx-ingress（推奨）

**メリット**:
- 設定がシンプル
- nginx.confの知識を活用可能
- 細かいチューニングが可能

**構成**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wsfw-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - yourdomain.com
    secretName: tls-secret
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 3001
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### オプション2: Azure Application Gateway Ingress Controller (AGIC)

**メリット**:
- AzureネイティブなWAF機能
- Azure Load Balancerとの統合
- 自動スケーリング

**デメリット**:
- コストが高い
- 設定がやや複雑

### オプション3: Istio / Linkerd (Service Mesh)

**メリット**:
- **Pod間通信の自動TLS（mTLS）**
- トラフィック管理
- 可観測性

**デメリット**:
- 複雑性の増加
- リソースオーバーヘッド

## 内部SSL通信の扱い

### Docker Compose版

```
nginx → web:443 (HTTPS)
nginx → api:3001 (HTTPS)
api → postgres:5432 (PostgreSQL SSL)
```

すべて手動で設定したSSL通信

### Kubernetes版の選択肢

#### オプション1: Service Mesh（推奨）

```yaml
# Istioを使用した自動mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT
```

- **メリット**: 自動でPod間通信を暗号化
- **デメリット**: Service Meshの導入が必要

#### オプション2: 手動SSL設定（Docker Composeと同様）

- 内部証明書をSecretとして保存
- 各Podに証明書をマウント
- アプリケーションレベルでSSL設定

**推奨度**: Service Meshがなければこちら

#### オプション3: Network Policy + 信頼（簡易版）

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: web
```

- **メリット**: シンプル
- **デメリット**: 暗号化なし（Kubernetes内部ネットワークを信頼）

## PostgreSQLの選択肢

### オプション1: Azure Database for PostgreSQL（推奨）

**メリット**:
- マネージドサービス
- 自動バックアップ
- 高可用性
- SSL接続標準対応

**設定例**:
```yaml
env:
- name: DATABASE_URL
  value: "postgresql://user:pass@server.postgres.database.azure.com:5432/db?sslmode=require"
```

### オプション2: StatefulSet + Persistent Volume

**メリット**:
- 完全なコントロール
- コスト削減（小規模の場合）

**デメリット**:
- 運用負荷
- バックアップ管理が必要

## SSL証明書管理

### Docker Compose版

```
docker/nginx/ssl/cert.pem  (Let's Encryptなど)
docker/certs/*             (内部証明書)
```

### Kubernetes版

#### cert-manager（推奨）

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wsfw-tls
spec:
  secretName: tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - yourdomain.com
```

**メリット**:
- Let's Encrypt証明書の自動取得・更新
- Kubernetes Secret自動作成

#### Azure Key Vault（Enterprise）

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: Opaque
data:
  # Azure Key Vaultから取得
```

## リソース要件の比較

### Docker Compose版

```yaml
postgres: 512M RAM, 1 CPU
api:      1G RAM,   2 CPU
web:      256M RAM, 0.5 CPU
nginx:    512M RAM, 1 CPU
---------------------------------
合計:     2.25G RAM, 4.5 CPU
```

### Kubernetes版（最小構成）

```yaml
postgres:    512M RAM, 1 CPU    (または Azure Database)
api:         1G RAM,   2 CPU    (× レプリカ数)
web:         256M RAM, 0.5 CPU  (× レプリカ数)
ingress-ctrl: 512M RAM, 1 CPU    (AKS管理の場合は不要)
---------------------------------
合計（2レプリカ想定）:
             4G RAM,    8 CPU
```

## コスト比較（概算）

### Docker Compose版（単一VM）

- Azure VM (Standard_D4s_v3): 4 vCPU, 16GB RAM
- 月額: 約 $140

### AKS版（小規模）

- AKS管理費: 無料
- ノード: Standard_D4s_v3 × 2ノード
- Azure Database for PostgreSQL: Basic 1vCore
- 月額: 約 $350-400

### AKS版（本番推奨）

- ノード: Standard_D4s_v3 × 3ノード（HA構成）
- Azure Database for PostgreSQL: General Purpose 2vCore
- Application Gateway: Standard_v2
- 月額: 約 $600-800

## 推奨構成

### 開発・ステージング環境

- **Docker Compose版**を推奨
- シンプルで低コスト
- デバッグが容易

### 本番環境（小規模）

- **AKS + nginx-ingress + Azure Database**
- Service Meshは不要
- cert-managerで証明書管理

### 本番環境（大規模）

- **AKS + Application Gateway + Service Mesh**
- 完全なmTLS
- 可観測性・トラフィック管理

## 次のステップ

1. ✅ この分析を確認
2. ⬜ 要件に応じたアーキテクチャを選択
3. ⬜ Kubernetes manifestファイルの作成
4. ⬜ Helm Chart化の検討
5. ⬜ CI/CD パイプライン設定

どの構成を採用するか決定後、具体的なmanifestファイルを作成します。
