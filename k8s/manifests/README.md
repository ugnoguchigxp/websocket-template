# Kubernetes Manifests for WebSocket Framework

このディレクトリには、AKS（Azure Kubernetes Service）へのデプロイに必要なKubernetes manifestファイルが含まれています。

## ファイル構成

```
manifests/
├── README.md                      # このファイル
├── kustomization.yaml            # Kustomize設定
├── namespace.yaml                 # Namespace定義
├── configmap.yaml                 # 設定情報（非機密）
├── secrets.yaml.template          # シークレット情報のテンプレート
├── postgres-statefulset.yaml     # PostgreSQL（オプション）
├── api-deployment.yaml            # APIサーバーのDeployment
├── api-service.yaml               # APIサーバーのService
├── web-deployment.yaml            # WebフロントエンドのDeployment
├── web-service.yaml               # WebフロントエンドのService
└── ingress.yaml                   # Ingress設定（nginxリバースプロキシの代替）
```

## Docker Composeとの主な違い

| 項目 | Docker Compose | Kubernetes (AKS) |
|-----|---------------|------------------|
| **nginxリバースプロキシ** | ✅ 必要（docker/nginx/） | ❌ 不要（Ingressが代替） |
| **Webコンテナ内のnginx** | ✅ 必要 | ✅ 必要（変更なし） |
| **ロードバランシング** | ❌ なし | ✅ Serviceで自動 |
| **スケーリング** | ❌ 手動 | ✅ 自動（HPA可能） |
| **SSL終端** | nginx | Ingress Controller |
| **シークレット管理** | .envファイル | Kubernetes Secrets |

## 前提条件

1. **AKSクラスタ**
   ```bash
   az aks create --resource-group myResourceGroup \
     --name myAKSCluster \
     --node-count 3 \
     --enable-managed-identity \
     --network-plugin azure
   ```

2. **nginx-ingress controller**
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm repo update
   helm install ingress-nginx ingress-nginx/ingress-nginx \
     --create-namespace \
     --namespace ingress-nginx \
     --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
   ```

3. **cert-manager（オプション、SSL証明書自動管理）**
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

4. **Azure Container Registry（ACR）**
   ```bash
   az acr create --resource-group myResourceGroup \
     --name myRegistry --sku Basic

   # AKSからACRへのアクセス許可
   az aks update --resource-group myResourceGroup \
     --name myAKSCluster \
     --attach-acr myRegistry
   ```

## デプロイ手順

### 1. コンテナイメージのビルドとプッシュ

```bash
# ACRにログイン
az acr login --name myRegistry

# イメージのビルド
docker build -t myregistry.azurecr.io/wsfw-api:v1.0.0 -f apps/api/Dockerfile .
docker build -t myregistry.azurecr.io/wsfw-web:v1.0.0 -f apps/web/Dockerfile .

# イメージのプッシュ
docker push myregistry.azurecr.io/wsfw-api:v1.0.0
docker push myregistry.azurecr.io/wsfw-web:v1.0.0
```

### 2. Secretsの作成

```bash
# secrets.yaml.templateをコピー
cp secrets.yaml.template secrets.yaml

# 必要な値をbase64エンコード
echo -n "postgres" | base64
echo -n "your-strong-password" | base64
openssl rand -base64 32 | tr -d '\n' | base64

# secrets.yamlを編集して実際の値を設定
vi secrets.yaml

# Secretsを適用
kubectl apply -f secrets.yaml
```

### 3. ConfigMapの編集

```bash
# configmap.yamlを編集してドメイン名などを設定
vi configmap.yaml
# ALLOWED_WS_ORIGIN: "https://yourdomain.com" を実際のドメインに変更
```

### 4. Ingressの編集

```bash
# ingress.yamlを編集して実際のドメイン名を設定
vi ingress.yaml
# yourdomain.com を実際のドメインに変更
```

### 5. Image名の更新

```bash
# すべてのDeploymentファイル内のイメージ名を更新
vi api-deployment.yaml
vi web-deployment.yaml
# <YOUR_CONTAINER_REGISTRY> を myregistry.azurecr.io に置き換え
```

### 6. PostgreSQLの選択

#### オプションA: Azure Database for PostgreSQL（推奨）

```bash
# postgres-statefulset.yamlをコメントアウト
# secrets.yamlのdatabase-urlをAzure Databaseのものに変更
```

#### オプションB: StatefulSet

```bash
# そのままデプロイ（postgres-statefulset.yamlを使用）
```

### 7. デプロイ実行

```bash
# Kustomizeを使用してデプロイ
kubectl apply -k .

# または個別にデプロイ
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres-statefulset.yaml  # オプション
kubectl apply -f api-deployment.yaml
kubectl apply -f api-service.yaml
kubectl apply -f web-deployment.yaml
kubectl apply -f web-service.yaml
kubectl apply -f ingress.yaml
```

### 8. デプロイの確認

```bash
# Podの状態確認
kubectl get pods -n wsfw

# Serviceの確認
kubectl get svc -n wsfw

# Ingressの確認
kubectl get ingress -n wsfw

# ログの確認
kubectl logs -n wsfw -l app=api --tail=100
kubectl logs -n wsfw -l app=web --tail=100
```

## cert-managerを使用したSSL証明書の自動取得

### 1. ClusterIssuerの作成

```yaml
# cert-manager-clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

```bash
kubectl apply -f cert-manager-clusterissuer.yaml
```

### 2. Certificate確認

```bash
# Certificateリソースの確認（cert-managerが自動作成）
kubectl get certificate -n wsfw

# TLS Secretの確認
kubectl get secret tls-secret -n wsfw
```

## スケーリング

### 手動スケーリング

```bash
# APIを3レプリカに拡張
kubectl scale deployment api -n wsfw --replicas=3

# Webを4レプリカに拡張
kubectl scale deployment web -n wsfw --replicas=4
```

### 自動スケーリング（HPA）

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: wsfw
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

```bash
kubectl apply -f hpa.yaml
```

## トラブルシューティング

### Podが起動しない

```bash
# Pod詳細を確認
kubectl describe pod -n wsfw <pod-name>

# ログを確認
kubectl logs -n wsfw <pod-name>
```

### Ingressが機能しない

```bash
# Ingress Controllerのログ確認
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Ingress詳細確認
kubectl describe ingress wsfw-ingress -n wsfw
```

### データベース接続エラー

```bash
# データベースPodの確認
kubectl exec -it -n wsfw postgres-0 -- psql -U postgres

# 接続文字列の確認
kubectl get secret wsfw-database-url -n wsfw -o jsonpath='{.data.database-url}' | base64 -d
```

## クリーンアップ

```bash
# すべてのリソースを削除
kubectl delete namespace wsfw

# または個別に削除
kubectl delete -k .
```

## 次のステップ

1. **監視設定**: Prometheus + Grafanaのセットアップ
2. **ログ集約**: Fluent BitまたはFluentdの設定
3. **CI/CD**: Azure DevOps Pipeline または GitHub Actionsの設定
4. **バックアップ**: Veleroによるクラスタバックアップ

詳細は`../AKS-DEPLOYMENT-GUIDE.md`を参照してください。
