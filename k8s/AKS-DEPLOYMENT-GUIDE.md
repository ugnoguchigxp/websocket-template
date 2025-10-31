# AKS (Azure Kubernetes Service) デプロイメントガイド

このドキュメントでは、WebSocket FrameworkをAKS環境にデプロイする手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [アーキテクチャ概要](#アーキテクチャ概要)
3. [AKSクラスタのセットアップ](#aksクラスタのセットアップ)
4. [コンテナイメージの準備](#コンテナイメージの準備)
5. [Ingressコントローラーの選択](#ingressコントローラーの選択)
6. [デプロイメント実行](#デプロイメント実行)
7. [監視とロギング](#監視とロギング)
8. [CI/CD統合](#cicd統合)
9. [トラブルシューティング](#トラブルシューティング)

## 前提条件

### 必要なツール

```bash
# Azure CLI
az --version  # 2.50.0以上

# kubectl
kubectl version --client  # 1.27以上

# Helm (オプション)
helm version  # 3.12以上
```

### Azureリソース

- Azureサブスクリプション
- 十分な権限（Contributor以上）
- Azure Container Registry (ACR)
- Azure Database for PostgreSQL（推奨）またはStatefulSetでの自己管理

## アーキテクチャ概要

### Docker ComposeとKubernetesの違い

| コンポーネント | Docker Compose | Kubernetes (AKS) |
|--------------|---------------|------------------|
| **nginxリバースプロキシ** | ✅ 必要 | ❌ 不要（Ingressが代替） |
| **Webコンテナ内nginx** | ✅ 必要 | ✅ 必要（変更なし） |
| **ロードバランシング** | ❌ なし | ✅ Serviceで自動 |
| **スケーリング** | ❌ 手動 | ✅ 自動（HPA） |
| **SSL終端** | nginx | Ingress Controller |
| **内部SSL** | 手動設定 | Service Mesh（オプション） |

詳細は`ARCHITECTURE-COMPARISON.md`を参照してください。

### 推奨構成

```
Internet
   ↓
Azure Load Balancer
   ↓
Ingress Controller (nginx-ingress または AGIC)
   ↓
┌─────────────────────────────────────────┐
│ AKS Cluster (wsfw namespace)            │
│                                         │
│  ┌──────────┐         ┌──────────┐    │
│  │ Web Pods │         │ API Pods │    │
│  │(2-8 pods)│ ←────→ │(2-10 pods)│    │
│  └──────────┘         └──────────┘    │
│                            ↓           │
│                   ┌─────────────────┐  │
│                   │ PostgreSQL      │  │
│                   │ (Azure Database)│  │
│                   └─────────────────┘  │
└─────────────────────────────────────────┘
```

## AKSクラスタのセットアップ

### 1. リソースグループの作成

```bash
# 変数設定
RESOURCE_GROUP="wsfw-rg"
LOCATION="japaneast"
CLUSTER_NAME="wsfw-aks"
ACR_NAME="wsfwacr"  # グローバルでユニークな名前に変更

# リソースグループ作成
az group create \
  --name ${RESOURCE_GROUP} \
  --location ${LOCATION}
```

### 2. Azure Container Registry (ACR) の作成

```bash
# ACR作成
az acr create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${ACR_NAME} \
  --sku Standard \
  --location ${LOCATION}

# ACRにログイン
az acr login --name ${ACR_NAME}
```

### 3. AKSクラスタの作成

#### 基本構成（開発・検証環境）

```bash
az aks create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --location ${LOCATION} \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-managed-identity \
  --network-plugin azure \
  --network-policy azure \
  --attach-acr ${ACR_NAME} \
  --enable-addons monitoring \
  --generate-ssh-keys
```

#### 本番環境推奨構成

```bash
az aks create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --location ${LOCATION} \
  --node-count 3 \
  --min-count 3 \
  --max-count 10 \
  --enable-cluster-autoscaler \
  --node-vm-size Standard_D4s_v3 \
  --node-osdisk-size 100 \
  --enable-managed-identity \
  --network-plugin azure \
  --network-policy azure \
  --attach-acr ${ACR_NAME} \
  --enable-addons monitoring \
  --zones 1 2 3 \
  --uptime-sla \
  --generate-ssh-keys
```

### 4. kubectlの設定

```bash
# AKS認証情報の取得
az aks get-credentials \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --overwrite-existing

# 接続確認
kubectl get nodes
```

### 5. Azure Database for PostgreSQL の作成（推奨）

```bash
# 変数設定
POSTGRES_SERVER="wsfw-postgres"
POSTGRES_ADMIN="pgadmin"
POSTGRES_PASSWORD="$(openssl rand -base64 32)"

# PostgreSQL Flexible Serverの作成
az postgres flexible-server create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${POSTGRES_SERVER} \
  --location ${LOCATION} \
  --admin-user ${POSTGRES_ADMIN} \
  --admin-password "${POSTGRES_PASSWORD}" \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --high-availability Disabled \
  --public-access 0.0.0.0

# データベース作成
az postgres flexible-server db create \
  --resource-group ${RESOURCE_GROUP} \
  --server-name ${POSTGRES_SERVER} \
  --database-name wsfw

# AKSからの接続を許可
az postgres flexible-server firewall-rule create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${POSTGRES_SERVER} \
  --rule-name AllowAKS \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255

# 接続文字列を保存
echo "DATABASE_URL=postgresql://${POSTGRES_ADMIN}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}.postgres.database.azure.com:5432/wsfw?sslmode=require"
```

> **注意**: 本番環境では、VNet統合とPrivate Endpointの使用を推奨します。

## コンテナイメージの準備

### 1. イメージのビルド

プロジェクトルートで実行：

```bash
# ACRログインURL取得
ACR_LOGIN_SERVER=$(az acr show \
  --name ${ACR_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --query loginServer \
  --output tsv)

# バージョンタグの設定
VERSION="v1.0.0"

# APIイメージのビルドとプッシュ
docker build \
  -t ${ACR_LOGIN_SERVER}/wsfw-api:${VERSION} \
  -t ${ACR_LOGIN_SERVER}/wsfw-api:latest \
  -f apps/api/Dockerfile \
  .

docker push ${ACR_LOGIN_SERVER}/wsfw-api:${VERSION}
docker push ${ACR_LOGIN_SERVER}/wsfw-api:latest

# Webイメージのビルドとプッシュ
docker build \
  -t ${ACR_LOGIN_SERVER}/wsfw-web:${VERSION} \
  -t ${ACR_LOGIN_SERVER}/wsfw-web:latest \
  -f apps/web/Dockerfile \
  .

docker push ${ACR_LOGIN_SERVER}/wsfw-web:${VERSION}
docker push ${ACR_LOGIN_SERVER}/wsfw-web:latest
```

### 2. イメージの確認

```bash
# ACR内のイメージ一覧
az acr repository list --name ${ACR_NAME} --output table

# 特定イメージのタグ確認
az acr repository show-tags \
  --name ${ACR_NAME} \
  --repository wsfw-api \
  --output table
```

## Ingressコントローラーの選択

AKSでは2つのIngress Controllerオプションがあります：

### オプションA: nginx-ingress（推奨）

**メリット:**
- コミュニティで広く使用
- 豊富なアノテーションとカスタマイズ
- Docker Compose構成からの移行が容易
- 詳細なトラフィック制御

**インストール:**

```bash
# Helm repoの追加
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# nginx-ingress controllerのインストール
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --create-namespace \
  --namespace ingress-nginx \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.admissionWebhooks.patch.nodeSelector."kubernetes\.io/os"=linux

# Ingress Controllerの確認
kubectl get svc -n ingress-nginx
kubectl get pods -n ingress-nginx
```

**使用するIngress manifest:**
- `k8s/manifests/ingress.yaml`

### オプションB: Application Gateway Ingress Controller (AGIC)

**メリット:**
- Azure Application Gatewayとのネイティブ統合
- WAF（Web Application Firewall）サポート
- Azureの監視・ログとの統合
- 追加のロードバランサー料金不要

**前提条件:**

```bash
# Application Gatewayの作成
az network application-gateway create \
  --resource-group ${RESOURCE_GROUP} \
  --name wsfw-appgw \
  --location ${LOCATION} \
  --sku Standard_v2 \
  --capacity 2 \
  --vnet-name wsfw-vnet \
  --subnet appgw-subnet \
  --public-ip-address wsfw-appgw-pip \
  --http-settings-cookie-based-affinity Disabled \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --frontend-port 80
```

**AGICのインストール:**

```bash
# AGIC Helmチャートの追加
helm repo add application-gateway-kubernetes-ingress https://appgwingress.blob.core.windows.net/ingress-azure-helm-package/
helm repo update

# Application Gateway情報の取得
APP_GATEWAY_ID=$(az network application-gateway show \
  --resource-group ${RESOURCE_GROUP} \
  --name wsfw-appgw \
  --query id \
  --output tsv)

# AGICのインストール
helm install agic application-gateway-kubernetes-ingress/ingress-azure \
  --namespace kube-system \
  --set appgw.applicationGatewayID=${APP_GATEWAY_ID} \
  --set armAuth.type=workloadIdentity \
  --set rbac.enabled=true
```

**使用するIngress manifest:**
- `k8s/manifests/ingress-agic.yaml`

## デプロイメント実行

### 1. Secretsの準備

```bash
cd k8s/manifests

# Secretsファイルのコピー
cp secrets.yaml.template secrets.yaml

# 必要な値をbase64エンコード
echo -n "postgres" | base64
echo -n "${POSTGRES_PASSWORD}" | base64
openssl rand -base64 32 | tr -d '\n' | base64

# Azure Database for PostgreSQLを使用する場合
DATABASE_URL="postgresql://${POSTGRES_ADMIN}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}.postgres.database.azure.com:5432/wsfw?sslmode=require"
echo -n "${DATABASE_URL}" | base64

# secrets.yamlを編集して実際の値を設定
vi secrets.yaml
```

### 2. ConfigMapの編集

```bash
# ドメイン名などを設定
vi configmap.yaml
# ALLOWED_WS_ORIGIN: "https://yourdomain.com" を実際のドメインに変更
```

### 3. Image名の更新

```bash
# Deploymentファイル内のイメージ名を更新
sed -i '' "s|<YOUR_CONTAINER_REGISTRY>|${ACR_LOGIN_SERVER}|g" api-deployment.yaml
sed -i '' "s|<YOUR_CONTAINER_REGISTRY>|${ACR_LOGIN_SERVER}|g" web-deployment.yaml

# Kustomizationファイルも更新
sed -i '' "s|<YOUR_CONTAINER_REGISTRY>|${ACR_LOGIN_SERVER}|g" kustomization.yaml
```

### 4. Ingressの編集

nginx-ingressを使用する場合：

```bash
# ドメイン名を設定
vi ingress.yaml
# yourdomain.com を実際のドメインに置き換え
```

AGICを使用する場合：

```bash
# ドメイン名を設定
vi ingress-agic.yaml
# yourdomain.com を実際のドメインに置き換え

# kustomization.yamlでingress-agic.yamlを使用するように変更
vi kustomization.yaml
# - ingress.yaml を - ingress-agic.yaml に変更
```

### 5. PostgreSQLの選択

#### Azure Database for PostgreSQLを使用する場合（推奨）

```bash
# kustomization.yamlでpostgres-statefulset.yamlをコメントアウト
vi kustomization.yaml
# - postgres-statefulset.yaml の行をコメントアウト
```

#### StatefulSetを使用する場合

```bash
# そのままデプロイ（postgres-statefulset.yamlが含まれている）
```

### 6. cert-managerのインストール（SSL証明書自動管理）

```bash
# cert-managerのインストール
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# インストール確認
kubectl get pods -n cert-manager

# ClusterIssuerの作成
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com  # 実際のメールアドレスに変更
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx  # AGICの場合は "azure/application-gateway"
EOF
```

### 7. デプロイの実行

```bash
# Kustomizeを使用してデプロイ
kubectl apply -k .

# または個別にデプロイ
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
# kubectl apply -f postgres-statefulset.yaml  # Azure Databaseを使用する場合は不要
kubectl apply -f api-deployment.yaml
kubectl apply -f api-service.yaml
kubectl apply -f web-deployment.yaml
kubectl apply -f web-service.yaml
kubectl apply -f ingress.yaml  # または ingress-agic.yaml
```

### 8. Horizontal Pod Autoscaler（HPA）のデプロイ

```bash
# HPAの適用
kubectl apply -f hpa.yaml

# HPA確認
kubectl get hpa -n wsfw
```

### 9. デプロイの確認

```bash
# Podの状態確認
kubectl get pods -n wsfw -w

# すべてのリソース確認
kubectl get all -n wsfw

# Ingressの確認とExternal IPの取得
kubectl get ingress -n wsfw

# サービスエンドポイント確認
kubectl get svc -n wsfw
```

### 10. DNSの設定

```bash
# Ingress ControllerのExternal IPを取得
EXTERNAL_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "External IP: ${EXTERNAL_IP}"
echo "DNSにAレコードを追加してください: yourdomain.com -> ${EXTERNAL_IP}"
```

DNSプロバイダーでAレコードを設定：
```
yourdomain.com  A  <EXTERNAL_IP>
```

### 11. SSL証明書の確認

```bash
# Certificate確認（cert-managerが自動作成）
kubectl get certificate -n wsfw

# 証明書の詳細確認
kubectl describe certificate tls-secret -n wsfw

# Secretの確認
kubectl get secret tls-secret -n wsfw
```

## 監視とロギング

### Azure Monitorとの統合

AKS作成時に`--enable-addons monitoring`を指定した場合、自動的に統合されます。

```bash
# Container Insightsの確認
az aks show \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --query addonProfiles.omsagent
```

Azure Portalでログを確認：
1. AKSクラスタを開く
2. 「監視」→「ログ」
3. Kusto Query Language (KQL) でログをクエリ

**便利なKQLクエリ例:**

```kql
// Podのログ
ContainerLog
| where Namespace == "wsfw"
| where ContainerName == "api" or ContainerName == "web"
| order by TimeGenerated desc
| limit 100

// エラーログのみ
ContainerLog
| where Namespace == "wsfw"
| where LogEntry contains "ERROR" or LogEntry contains "error"
| order by TimeGenerated desc

// Pod再起動の監視
KubePodInventory
| where Namespace == "wsfw"
| where PodStatus == "Failed" or ContainerRestartCount > 0
| summarize RestartCount = sum(ContainerRestartCount) by PodName
```

### Prometheusとの統合（オプション）

```bash
# Prometheus Operatorのインストール
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### アプリケーションログの確認

```bash
# APIログ
kubectl logs -n wsfw -l app=api --tail=100 -f

# Webログ
kubectl logs -n wsfw -l app=web --tail=100 -f

# 特定Podのログ
kubectl logs -n wsfw <pod-name> -f

# 過去のPodのログ
kubectl logs -n wsfw <pod-name> --previous
```

## CI/CD統合

### GitHub Actions

`.github/workflows/deploy-aks.yaml`を作成：

```yaml
name: Deploy to AKS

on:
  push:
    branches:
      - main
    paths:
      - 'apps/**'
      - 'k8s/manifests/**'
      - '.github/workflows/deploy-aks.yaml'

env:
  AZURE_RESOURCE_GROUP: wsfw-rg
  AZURE_AKS_CLUSTER: wsfw-aks
  AZURE_ACR_NAME: wsfwacr

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: ACR Login
        run: az acr login --name ${{ env.AZURE_ACR_NAME }}

      - name: Build and push API image
        run: |
          VERSION=${{ github.sha }}
          docker build -t ${{ env.AZURE_ACR_NAME }}.azurecr.io/wsfw-api:${VERSION} \
            -t ${{ env.AZURE_ACR_NAME }}.azurecr.io/wsfw-api:latest \
            -f apps/api/Dockerfile .
          docker push ${{ env.AZURE_ACR_NAME }}.azurecr.io/wsfw-api:${VERSION}
          docker push ${{ env.AZURE_ACR_NAME }}.azurecr.io/wsfw-api:latest

      - name: Build and push Web image
        run: |
          VERSION=${{ github.sha }}
          docker build -t ${{ env.AZURE_ACR_NAME }}.azurecr.io/wsfw-web:${VERSION} \
            -t ${{ env.AZURE_ACR_NAME }}.azurecr.io/wsfw-web:${VERSION} \
            -f apps/web/Dockerfile .
          docker push ${{ env.AZURE_ACR_NAME }}.azurecr.io/wsfw-web:${VERSION}
          docker push ${{ env.AZURE_ACR_NAME }}.azurecr.io/wsfw-web:latest

      - name: Set AKS context
        uses: azure/aks-set-context@v3
        with:
          resource-group: ${{ env.AZURE_RESOURCE_GROUP }}
          cluster-name: ${{ env.AZURE_AKS_CLUSTER }}

      - name: Deploy to AKS
        run: |
          kubectl apply -k k8s/manifests/
          kubectl rollout status deployment/api -n wsfw --timeout=5m
          kubectl rollout status deployment/web -n wsfw --timeout=5m
```

**GitHub Secretsの設定:**

```bash
# Azureサービスプリンシパルの作成
az ad sp create-for-rbac \
  --name "github-actions-wsfw" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/${RESOURCE_GROUP} \
  --sdk-auth

# 出力されたJSONをGitHub SecretsのAZURE_CREDENTIALSに設定
```

### Azure DevOps Pipeline

`azure-pipelines.yml`を作成：

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - apps/*
      - k8s/manifests/*

variables:
  azureSubscription: 'your-service-connection'
  resourceGroup: 'wsfw-rg'
  aksCluster: 'wsfw-aks'
  acrName: 'wsfwacr'
  acrLoginServer: 'wsfwacr.azurecr.io'

stages:
- stage: Build
  jobs:
  - job: BuildImages
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: Docker@2
      displayName: 'Build and Push API Image'
      inputs:
        containerRegistry: '$(acrName)'
        repository: 'wsfw-api'
        command: 'buildAndPush'
        Dockerfile: 'apps/api/Dockerfile'
        tags: |
          $(Build.BuildId)
          latest

    - task: Docker@2
      displayName: 'Build and Push Web Image'
      inputs:
        containerRegistry: '$(acrName)'
        repository: 'wsfw-web'
        command: 'buildAndPush'
        Dockerfile: 'apps/web/Dockerfile'
        tags: |
          $(Build.BuildId)
          latest

- stage: Deploy
  dependsOn: Build
  jobs:
  - deployment: DeployToAKS
    pool:
      vmImage: 'ubuntu-latest'
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: KubernetesManifest@0
            displayName: 'Deploy to AKS'
            inputs:
              action: 'deploy'
              kubernetesServiceConnection: '$(azureSubscription)'
              namespace: 'wsfw'
              manifests: |
                k8s/manifests/*.yaml
```

## トラブルシューティング

### Podが起動しない

```bash
# Pod詳細確認
kubectl describe pod -n wsfw <pod-name>

# ログ確認
kubectl logs -n wsfw <pod-name>

# イベント確認
kubectl get events -n wsfw --sort-by='.lastTimestamp'

# よくある原因:
# 1. イメージPullエラー → ACR統合確認
# 2. ConfigMap/Secret未設定 → 設定ファイル確認
# 3. リソース不足 → ノードリソース確認
```

### ImagePullBackOffエラー

```bash
# AKSとACRの統合確認
az aks show \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --query "identityProfile"

# ACRへのアクセス権限付与
az aks update \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --attach-acr ${ACR_NAME}
```

### Ingressが機能しない

```bash
# Ingress Controller確認
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Ingress詳細確認
kubectl describe ingress wsfw-ingress -n wsfw

# External IP確認
kubectl get svc -n ingress-nginx

# よくある原因:
# 1. DNS未設定
# 2. cert-manager未設定
# 3. アノテーションの誤り
```

### データベース接続エラー

```bash
# Azure Database接続確認
psql "host=${POSTGRES_SERVER}.postgres.database.azure.com \
      port=5432 \
      dbname=wsfw \
      user=${POSTGRES_ADMIN} \
      sslmode=require"

# Secretの確認
kubectl get secret wsfw-secrets -n wsfw -o yaml

# DATABASE_URLのデコード
kubectl get secret wsfw-secrets -n wsfw \
  -o jsonpath='{.data.database-url}' | base64 -d

# StatefulSetの場合
kubectl exec -it -n wsfw postgres-0 -- psql -U postgres
```

### SSL証明書が発行されない

```bash
# cert-manager確認
kubectl get pods -n cert-manager

# Certificate詳細確認
kubectl describe certificate tls-secret -n wsfw

# CertificateRequestの確認
kubectl get certificaterequest -n wsfw
kubectl describe certificaterequest -n wsfw

# Orderの確認
kubectl get order -n wsfw
kubectl describe order -n wsfw

# Challengeの確認
kubectl get challenge -n wsfw
kubectl describe challenge -n wsfw

# cert-managerログ確認
kubectl logs -n cert-manager -l app=cert-manager

# よくある原因:
# 1. DNS未伝播
# 2. HTTP-01チャレンジがIngressに到達できない
# 3. レート制限（Let's Encrypt）
```

### HPAが動作しない

```bash
# metrics-server確認
kubectl get deployment metrics-server -n kube-system

# HPAの詳細確認
kubectl describe hpa api-hpa -n wsfw

# メトリクス確認
kubectl top pods -n wsfw
kubectl top nodes

# metrics-serverが未インストールの場合
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### ノードリソース不足

```bash
# ノード確認
kubectl get nodes
kubectl top nodes

# Pod配置確認
kubectl describe nodes

# クラスタスケーリング（autoscaler有効の場合は自動）
az aks scale \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --node-count 5
```

## スケーリング

### 手動スケーリング

```bash
# Podのスケーリング
kubectl scale deployment api -n wsfw --replicas=5
kubectl scale deployment web -n wsfw --replicas=4

# ノードのスケーリング
az aks scale \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --node-count 5
```

### 自動スケーリング

既にHPA（`hpa.yaml`）をデプロイしている場合、CPU/メモリ使用率に応じて自動的にスケールします。

```bash
# HPA確認
kubectl get hpa -n wsfw -w

# 負荷テスト（別ターミナル）
kubectl run -n wsfw load-test --image=busybox --rm -it -- \
  /bin/sh -c "while true; do wget -q -O- http://api-service:3001/api/health; done"
```

## バックアップ

### Veleroによるクラスタバックアップ

```bash
# Veleroのインストール
velero install \
  --provider azure \
  --plugins velero/velero-plugin-for-microsoft-azure:v1.8.0 \
  --bucket velero \
  --secret-file ./credentials-velero \
  --backup-location-config resourceGroup=${RESOURCE_GROUP},storageAccount=wsfwvelero,subscriptionId=<subscription-id>

# バックアップ作成
velero backup create wsfw-backup --include-namespaces wsfw

# バックアップ確認
velero backup get

# リストア
velero restore create --from-backup wsfw-backup
```

### Azure Databaseバックアップ

Azure Database for PostgreSQLは自動的にバックアップされます（7-35日保持）。

```bash
# バックアップ確認
az postgres flexible-server backup list \
  --resource-group ${RESOURCE_GROUP} \
  --server-name ${POSTGRES_SERVER}

# ポイントインタイムリストア
az postgres flexible-server restore \
  --resource-group ${RESOURCE_GROUP} \
  --name ${POSTGRES_SERVER}-restored \
  --source-server ${POSTGRES_SERVER} \
  --restore-time "2024-01-01T00:00:00Z"
```

## クリーンアップ

### リソースの削除

```bash
# アプリケーションのみ削除
kubectl delete namespace wsfw

# クラスタ全体の削除
az aks delete \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CLUSTER_NAME} \
  --yes --no-wait

# リソースグループ全体の削除（注意）
az group delete \
  --name ${RESOURCE_GROUP} \
  --yes --no-wait
```

## セキュリティベストプラクティス

### 1. Network Policyの適用

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: wsfw
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: web
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

### 2. Pod Security Standards

```yaml
# pod-security.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: wsfw
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 3. Azure Key Vaultとの統合

```bash
# Secrets Store CSI Driverのインストール
helm repo add csi-secrets-store-provider-azure https://azure.github.io/secrets-store-csi-driver-provider-azure/charts
helm install csi csi-secrets-store-provider-azure/csi-secrets-store-provider-azure

# Key Vaultの作成と設定は別途必要
```

## コスト最適化

### 推奨事項

1. **ノードタイプの選択**
   - 開発環境: Standard_B2s, Standard_D2s_v3
   - 本番環境: Standard_D4s_v3以上

2. **Spot Instancesの活用**
   ```bash
   az aks nodepool add \
     --resource-group ${RESOURCE_GROUP} \
     --cluster-name ${CLUSTER_NAME} \
     --name spotpool \
     --priority Spot \
     --eviction-policy Delete \
     --spot-max-price -1 \
     --enable-cluster-autoscaler \
     --min-count 1 \
     --max-count 5
   ```

3. **Autoscalerの適切な設定**
   - min/maxを適切に設定
   - scaleDownDelayAfterAddなどのパラメータ調整

4. **リソースリクエスト/リミットの最適化**
   - 実際の使用量を監視
   - 過剰なリクエスト/リミットを避ける

## 参考資料

- [AKS公式ドキュメント](https://docs.microsoft.com/azure/aks/)
- [nginx-ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Application Gateway Ingress Controller](https://azure.github.io/application-gateway-kubernetes-ingress/)
- [cert-manager](https://cert-manager.io/)
- [Kubernetes公式ドキュメント](https://kubernetes.io/docs/)
- [Azure Container Registry](https://docs.microsoft.com/azure/container-registry/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)

## サポート

問題が発生した場合：
1. このガイドのトラブルシューティングセクションを確認
2. `k8s/manifests/README.md`の詳細なデプロイ手順を確認
3. Azureサポートまたはコミュニティフォーラムに問い合わせ
