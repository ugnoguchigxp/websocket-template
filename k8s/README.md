# Kubernetes デプロイメント構成

このディレクトリには、WebSocket FrameworkをAKS（Azure Kubernetes Service）にデプロイするための設定ファイルが含まれています。

## ディレクトリ構成

```
k8s/
├── README.md                          # このファイル
├── ARCHITECTURE-COMPARISON.md         # Docker ComposeとKubernetesのアーキテクチャ比較
├── AKS-DEPLOYMENT-GUIDE.md           # 包括的なAKSデプロイメントガイド
└── manifests/                        # Kubernetesマニフェストファイル
    ├── README.md                     # マニフェスト詳細ガイド
    ├── kustomization.yaml            # Kustomize設定
    ├── namespace.yaml                # Namespace定義
    ├── configmap.yaml                # 設定情報（非機密）
    ├── secrets.yaml.template         # シークレット情報のテンプレート
    ├── postgres-statefulset.yaml     # PostgreSQL StatefulSet（オプション）
    ├── api-deployment.yaml           # APIサーバーのDeployment
    ├── api-service.yaml              # APIサーバーのService
    ├── web-deployment.yaml           # WebフロントエンドのDeployment
    ├── web-service.yaml              # WebフロントエンドのService
    ├── ingress.yaml                  # nginx-ingress設定
    ├── ingress-agic.yaml             # Application Gateway Ingress Controller設定
    └── hpa.yaml                      # Horizontal Pod Autoscaler設定
```

## クイックスタート

### 前提条件

1. AKSクラスタが作成済み
2. Azure Container Registry (ACR) が作成済み
3. kubectl が設定済み
4. Ingress Controller がインストール済み

### デプロイ手順

```bash
cd k8s/manifests

# 1. Secretsファイルの作成
cp secrets.yaml.template secrets.yaml
vi secrets.yaml  # 実際の値を設定

# 2. イメージ名の更新
vi api-deployment.yaml  # <YOUR_CONTAINER_REGISTRY> を実際のACR名に変更
vi web-deployment.yaml

# 3. ドメイン名の設定
vi ingress.yaml  # yourdomain.com を実際のドメインに変更

# 4. デプロイ
kubectl apply -k .

# 5. 確認
kubectl get pods -n wsfw
kubectl get ingress -n wsfw
```

## ドキュメント

### 1. AKS-DEPLOYMENT-GUIDE.md

**最も重要なドキュメント** - AKSへの完全なデプロイメント手順

内容：
- AKSクラスタのセットアップ
- Azure Container Registry (ACR) の設定
- コンテナイメージのビルドとプッシュ
- Ingress Controllerの選択とインストール
- cert-managerによるSSL証明書の自動管理
- 監視とロギングの設定
- CI/CDパイプラインの構築
- トラブルシューティング
- セキュリティベストプラクティス
- コスト最適化

**最初にこのドキュメントを読んでください。**

### 2. ARCHITECTURE-COMPARISON.md

Docker ComposeとKubernetesのアーキテクチャの違いを説明

重要なポイント：
- nginxリバースプロキシはIngressが代替するため**不要**
- Webコンテナ内のnginxは引き続き**必要**（React SPAのサーブ）
- 内部SSL通信のオプション（Service Mesh、手動設定、Network Policy）
- PostgreSQLの選択肢（Azure Database vs StatefulSet）

### 3. manifests/README.md

マニフェストファイルの詳細な説明とデプロイ手順

内容：
- 各マニフェストファイルの説明
- ステップバイステップのデプロイ手順
- cert-managerのセットアップ
- スケーリング設定
- トラブルシューティング

## Ingress Controllerの選択

AKSでは2つのIngress Controllerオプションがあります：

### オプションA: nginx-ingress（推奨）

**使用ファイル:** `manifests/ingress.yaml`

**メリット:**
- コミュニティで広く使用
- 豊富なカスタマイズオプション
- Docker Compose構成からの移行が容易
- WebSocketサポートが充実

**インストール:**
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --create-namespace \
  --namespace ingress-nginx
```

### オプションB: Application Gateway Ingress Controller (AGIC)

**使用ファイル:** `manifests/ingress-agic.yaml`

**メリット:**
- Azure Application Gatewayとのネイティブ統合
- WAF（Web Application Firewall）サポート
- Azureの監視・ログとの統合

**注意:** AGICを使用する場合は、`kustomization.yaml`で以下を変更：
```yaml
- ingress.yaml          # この行をコメントアウト
- ingress-agic.yaml     # この行を追加
```

詳細は`AKS-DEPLOYMENT-GUIDE.md`の「Ingressコントローラーの選択」セクションを参照。

## 自動スケーリング

Horizontal Pod Autoscaler (HPA) を使用すると、CPU/メモリ使用率に応じて自動的にPod数を調整できます。

**使用ファイル:** `manifests/hpa.yaml`

**有効化:**
```bash
# kustomization.yamlで以下をアンコメント
- hpa.yaml

# デプロイ
kubectl apply -f manifests/hpa.yaml

# 確認
kubectl get hpa -n wsfw
```

**設定:**
- API: 2〜10 pods、CPU 70%、メモリ 80%
- Web: 2〜8 pods、CPU 70%、メモリ 80%

## データベースの選択

### オプションA: Azure Database for PostgreSQL（推奨）

**メリット:**
- マネージドサービス（保守不要）
- 自動バックアップ
- 高可用性オプション
- 自動スケーリング

**設定:**
1. Azure Database for PostgreSQLを作成
2. `manifests/secrets.yaml`でDATABASE_URLを設定
3. `manifests/kustomization.yaml`で`postgres-statefulset.yaml`をコメントアウト

### オプションB: StatefulSet

**使用ファイル:** `manifests/postgres-statefulset.yaml`

**メリット:**
- クラスタ内で完結
- 追加コストなし

**デメリット:**
- バックアップ・復旧を自分で管理
- 高可用性設定が複雑

詳細は`AKS-DEPLOYMENT-GUIDE.md`の該当セクションを参照。

## SSL/TLS証明書

### cert-manager（推奨）

cert-managerを使用すると、Let's Encryptから自動的にSSL証明書を取得・更新できます。

```bash
# cert-managerのインストール
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# ClusterIssuerの作成（詳細はAKS-DEPLOYMENT-GUIDE.mdを参照）
```

`manifests/ingress.yaml`と`manifests/ingress-agic.yaml`には既にcert-managerのアノテーションが含まれています：
```yaml
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

### 手動証明書

既存の証明書を使用する場合：

```bash
kubectl create secret tls tls-secret \
  --cert=path/to/cert.crt \
  --key=path/to/cert.key \
  -n wsfw
```

## 監視とロギング

### Azure Monitor

AKS作成時に`--enable-addons monitoring`を指定すると、Container Insightsが有効になります。

Azure Portalでログを確認：
1. AKSクラスタ → 監視 → ログ
2. Kusto Query Language (KQL) でクエリ

### アプリケーションログ

```bash
# リアルタイムログ
kubectl logs -n wsfw -l app=api -f
kubectl logs -n wsfw -l app=web -f

# 過去のログ
kubectl logs -n wsfw <pod-name> --previous
```

詳細は`AKS-DEPLOYMENT-GUIDE.md`の「監視とロギング」セクションを参照。

## CI/CD

### GitHub Actions

サンプルワークフローは`AKS-DEPLOYMENT-GUIDE.md`の「CI/CD統合」セクションに含まれています。

基本的な流れ：
1. コードのpush
2. コンテナイメージのビルド
3. ACRへのプッシュ
4. AKSへのデプロイ
5. ロールアウト確認

### Azure DevOps

Azure Pipelinesのサンプルも`AKS-DEPLOYMENT-GUIDE.md`に含まれています。

## トラブルシューティング

よくある問題と解決方法：

### Podが起動しない
```bash
kubectl describe pod -n wsfw <pod-name>
kubectl logs -n wsfw <pod-name>
```

### ImagePullBackOffエラー
```bash
az aks update --attach-acr <acr-name>
```

### Ingressが機能しない
```bash
kubectl describe ingress -n wsfw
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

詳細なトラブルシューティングは`AKS-DEPLOYMENT-GUIDE.md`および`manifests/README.md`を参照。

## セキュリティ

### ベストプラクティス

1. **Network Policy**: Pod間通信の制限
2. **Pod Security Standards**: セキュアなPod設定（✅ 適用済み）
3. **Secrets管理**: Azure Key Vaultとの統合
4. **RBAC**: 適切なアクセス制御
5. **イメージスキャン**: 脆弱性チェック

詳細は`AKS-DEPLOYMENT-GUIDE.md`の「セキュリティベストプラクティス」セクションを参照。

## コスト最適化

1. 適切なノードタイプの選択
2. Spot Instancesの活用
3. Autoscalerの適切な設定
4. リソースリクエスト/リミットの最適化

詳細は`AKS-DEPLOYMENT-GUIDE.md`の「コスト最適化」セクションを参照。

## 次のステップ

1. **`AKS-DEPLOYMENT-GUIDE.md`を読む** - 最も重要
2. AKSクラスタとACRをセットアップ
3. コンテナイメージをビルド・プッシュ
4. Ingress Controllerをインストール
5. `manifests/`配下のファイルを環境に合わせて編集
6. デプロイを実行
7. 監視とロギングを設定
8. CI/CDパイプラインを構築

## サポート

問題が発生した場合：
1. 各ドキュメントのトラブルシューティングセクションを確認
2. `kubectl describe`と`kubectl logs`でデバッグ
3. Azureサポートまたはコミュニティに問い合わせ

## 重要なドキュメント

| ドキュメント | 用途 | 優先度 |
|------------|------|-------|
| [AKS-DEPLOYMENT-GUIDE.md](./AKS-DEPLOYMENT-GUIDE.md) | 完全なデプロイ手順 | 🔴 必読 |
| [ARCHITECTURE-COMPARISON.md](./ARCHITECTURE-COMPARISON.md) | Docker vs K8s比較 | 🟡 推奨 |
| [manifests/README.md](./manifests/README.md) | マニフェスト詳細 | 🟡 推奨 |

## 参考資料

- [AKS公式ドキュメント](https://docs.microsoft.com/azure/aks/)
- [Kubernetes公式ドキュメント](https://kubernetes.io/docs/)
- [nginx-ingress](https://kubernetes.github.io/ingress-nginx/)
- [AGIC](https://azure.github.io/application-gateway-kubernetes-ingress/)
- [cert-manager](https://cert-manager.io/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Docker vs Kubernetes Architecture](./ARCHITECTURE-COMPARISON.md)
