# 移植計画

## 1. 背景と目的
- **依頼内容**: `/Users/y.noguchi/Code/sampleProject` の `mind-map`、`socket-chat`、および `frontend/src/components/ui` 配下の UI コンポーネント群を `websocketFramework` モノレポへ移植し、WebSocket/tRPC ベースのアーキテクチャで再稼働させる。
- **制約**: sampleProject は REST + Express + MSAL/REST 認証を前提にしており、`websocketFramework` は WS-only tRPC + OIDC トークン (Subprotocol/Query) が前提。API/状態管理/依存関係をそのままコピーしても動作しない。
- **目的**: WS-only でも MindMap・SocketChat を提供できる統合フロント/バックエンドを構築し、既存 BBS 機能と共存させる。

## 2. 現状整理
### 2.1 sampleProject 側
- **AI MindMap モジュール** (`frontend/src/modules/ai-mindmap`, `backend/src/modules/ai-mindmap`):
  - ReactFlow + ElkJS レイアウト (`MindMapCanvas.tsx`) と React Query (`useMindMapNodes`, `useMindMapQueries`) により REST API (`/api/mindmaps/*`) と同期。
  - バックエンドは Express ルータ (`routes.ts`) に MSAL 認証、監査 (`enhancedSecurity`)、レート制限 (`aiServiceRateLimit`)、Azure Blob Storage (markdown 保存)、Azure OpenAI 呼び出し (`EnhancedMindMapService`) を抱える。
- **Socket Chat** (`frontend/src/modules/socket-chat` + `backend/src/websocket/*`):
  - フロントは `SecureWebSocketClient` + `useWebSocketManager` でトークン付き WS 接続、マルチモーダル表示 (`components/multimodal/*`) や音声/Speech hooks を組み合わせ。
  - バックエンドは `WebSocketRouter` で `/ws/socket-chat` などにルーティングし、MCP 互換のセッション／ストリーミングメッセージ (`response_chunk`, `response_complete` 等) を配信。
- **UI Components** (`frontend/src/components/ui`):
  - 汎用 UI (Drawer, Tooltip, ConfirmDialog 等) と `MultimodalErrorBoundary` などの共通系が MindMap / SocketChat 双方から参照。

### 2.2 websocketFramework 側
- **アーキテクチャ**: pnpm モノレポ、`apps/api` は tRPC over WebSocket (`appRouter`)、`apps/web` は React 18 + Tailwind + TanStack Query + `createTRPCReact`.
- **認証**: WebSocket サブプロトコル or クエリ文字列で OIDC アクセストークンを受け取り、サーバ側 `ctx.user` を構成。フロントは簡易 `AuthProvider` でログイン状態を保持。
- **ドメイン機能**: Prisma スキーマ (`apps/api/prisma/schema.prisma`) には既に MindMap/KnowledgeNode/NodeConnection/StoredContent/QueueJob/ChatSession が揃い、tRPC ルータやサービスも `apps/api/src/modules/mindmap` / `ai` / `queue` / `chat` に実装済み。`apps/api/src/core/server/server.ts` では tRPC とは別に `/chat` WebSocket を `ChatDispatcher` が処理している。一方で `apps/web` 側は BBS/デモ UI のみで MindMap/SocketChat の画面は未実装。

### 2.3 local_knowledge 側（参照元）
- **アーキテクチャ**: websocketFramework と同じく tRPC over WS + Prisma。バックエンドは `mindmap` モジュールが既に CRUD を提供。
- **強み**: Prisma スキーマに MindMap/KnowledgeNode/NodeConnection が実装済みで、tRPC ルータ (`mindmapRouter`) も整備されているため、REST からの移行コストを削減できる。
- **弱み**: フロントは Tauri ベースで ReactFlow UI が存在しない。AI 拡張や Socket Chat は未実装/簡易モック。
- **活用方針**: local_knowledge 由来の MindMap/Queue/Chat バックエンドは既に `websocketFramework` 側へ取り込み済みなので、挙動確認や欠損機能の参照元として扱い、UI や AI 拡張・Socket Chat フロントは sampleProject ベースで実装するハイブリッド構成とする。

## 3. ギャップ分析
| 項目 | sampleProject | local_knowledge | websocketFramework | 課題 |
| --- | --- | --- | --- | --- |
| API スタイル | REST (axios) | tRPC | tRPC (`apps/api/src/modules/mindmap`/`ai`/`queue`/`chat`) | 既存ルータを apps/web から呼ぶ hooks/API 層を整備し、REST ベースの UI を tRPC 呼び出しへ置換 |
| 認証 | MSAL + REST ヘッダー/WS token | JWT | OIDC トークン (WS Subprotocol/Query) | `AuthContext` にアクセストークン管理を追加し、`createTrpcClientWithToken`/Chat WS へ確実に供給 |
| ストレージ | Prisma + Azure Blob + FS | Prisma (MindMapモデルあり) | Prisma + StoredContent + Queue/Chat モデル | StoredContent/外部 Blob を扱う StorageAdapter を実装し、Markdown/Binary の保存先を統一 |
| WebSocket プロトコル | カスタム Router + MCP メッセージ | なし (tRPC のみ) | tRPC + ChatDispatcher (`/chat`) | ChatDispatcher のメッセージスキーマを sampleProject MCP 仕様へ合わせ、フロント用 WS クライアントを実装 |
| UI ライブラリ | 独自 + Mantine 風 + react-icons | 無し | Tailwind + shadcn/ui | sample UI を `legacy-ui` として導入し、段階的に shadcn へ統合 |
| 多言語/I18n | i18next (9言語) | 英語のみ | i18next（簡易） | sampleProject の辞書を縮約して取り込み |
| ロギング/DI | `createContextLogger`, tsyringe | winston + DI | logger module, tsyringe | logger ラッパーを共通化、local_knowledge の tsyringe 依存を最小限移植 |

## 4. 移植方針
### 4.1 バックエンド (apps/api)
1. **データモデル整備**
   - `apps/api/prisma/schema.prisma` 上に MindMap/KnowledgeNode/NodeConnection/StoredContent/QueueJob/ChatSession が既に存在するため、`pnpm db:push`/`prisma migrate` で実データを確認し、SampleProject の期待に沿ったインデックスや Seed データを整備する。
   - Blob/FS 保存だった Markdown/音声は `StoredContent` + 将来の `StorageProvider` (S3/Azure Blob) で扱う方針を固め、`apps/api/src/modules/mindmap/service.ts` から呼べるリポジトリを用意する。
2. **tRPC ルータ設計**
   - MindMap CRUD/構造/AI Search は `apps/api/src/modules/mindmap/router.ts` と `service.ts` に実装済みなので、ReactFlow/ElkJS が要求する `MindMapStructure`/`ReactFlowNodeData` 型を `apps/api/src/types/mindmap.ts` で整理し、生成系 procedure や DocumentLink API の欠損を補う。
   - SampleProject の `generate-root-document`/`generate-keyword-nodes` 相当は `apps/api/src/modules/ai/router.ts` の `generateContent`/`batchGenerateContent` に寄せ、Queue (`apps/api/src/modules/queue`) 経由の実行・ステータス確認を同一 surface で扱う。
3. **Socket Chat**
   - `/chat` WebSocket を処理する `ChatDispatcher` (`apps/api/src/modules/chat/dispatcher.ts`) と `apps/api/src/core/server/server.ts` の分岐を拡張し、MCP 互換の `response_chunk`/`response_complete`/`error` などを `ChatMessage` 型に定義、`repository.ts` での永続化や再接続ハンドシェイクも SampleProject に合わせる。
   - `RateLimitPresets` で実装済みの制御値を見直し、セッションメタデータやハートビートの頻度といった運用パラメータを dispatcher 起動時に注入できるようにする。
4. **DI/サービス層**
   - `tsyringe` 登録（例: `apps/api/src/modules/ai/di.ts`）へ MindMap/AI/Queue/Chat/Storage をまとめ、OpenAI クライアントや StorageProvider の差し替えポイントを明確化。Queue ワーカーやバックグラウンド処理のエントリも `QueueService` から起動できるよう整備する。
   - ロギングは `apps/api/src/modules/logger` を共通窓口とし、SampleProject の `createContextLogger` が要求するコンテキスト情報をここで解決する。

### 4.2 フロント (apps/web)
1. **依存パッケージ導入**
   - `reactflow`, `elkjs`, `react-icons`, `usehooks-ts`, `msw` (テスト用) など sample モジュールが利用するパッケージを `apps/web` ワークスペースへ追加済み。ReactFlow 用の CSS も各ページで import する。
2. **API クライアント層**
   - REST クライアントは廃止し、`apps/web/src/trpc.ts` + `apps/web/src/client.ts` の `createTrpcClientWithToken`／`createPublicTrpcClient` を介して `api.mindmap.*` / `api.ai.*` を呼び出す。Socket Chat 用の WebSocket も、トークンをクエリ (`token=`) で渡す実装に統一。
3. **UI/ページ構成**
   - `apps/web/src/pages/MindMapPage.tsx` は ReactFlow + MiniMap/Controls 付きのビューワを実装し、`api.mindmap.getMindmapStructure` から返る `reactFlowData` をそのまま描画する。Socket Chat も `apps/web/src/pages/SocketChatPage.tsx` で `ChatDispatcher` と 1:1 に通信する管理ツールを作成。
   - sampleProject の `frontend/src/components/ui` を段階的に移植する計画は継続中（未着手）。現状は Tailwind/既存 layout で最低限の UI を提供し、後続フェーズで `legacy-ui` ディレクトリへ配置する。
4. **Auth 連携**
   - 現状の `AuthContext` (`apps/web/src/contexts/AuthContext.tsx`) は `user/isAdmin/logout` のみを expose しているため、OIDC/JWT を取得・更新する仕組みと `getAccessToken`（もしくは `session` オブジェクト）を追加し、tRPC クライアントと Chat WS の両方へトークンを供給できるようにする。

### 4.3 共通/DevOps
- **テレメトリ/ログ**: `@logger` パッケージを共通化し、フロントでも `createContextLogger` ラッパーを導入して差分を最小化。
- **テスト**: sampleProject の Vitest/React Testing Library テスト (`frontend/Test/modules/...`) を apps/web 用に移植。バックエンドは tRPC handler 用に Vitest + Supertest をセットアップ。
- **ビルド/CI**: pnpm workspace scripts に MindMap/Chat の build/test を追加し、Dockerfile も multi-stage copy を更新。

## 5. フェーズ別アクション
| Phase | 目標 | 主タスク | 成果物/完了基準 |
| --- | --- | --- | --- |
| 0. 事前準備 (0.5w) | 依存関係/設計確定 | `apps/api/src/modules/mindmap`/`ai`/`queue`/`chat` の現状棚卸し、sampleProject/ local_knowledge との差分整理、Auth/Storage/WS プロトコル仕様書化 | 設計レビュー、チケット分割、合意済み仕様 |
| 1. データ層整備 (1w) | MindMap/Chat用 DB/Storage 基盤 | 既存 Prisma スキーマのマイグレーション/Seed、StoredContent + StorageAdapter 実装、Queue/Chat テーブルの健全性確認 | `pnpm db:push` 成功 + サンプルデータ挿入 |
| 2. API 実装 (1.5w) | tRPC で MindMap CRUD + AI 呼び出し + Chat session を提供 | mindmapRouter/AI router/QueueService/ChatDispatcher のギャップ埋め、MCP メッセージ仕様対応、WebSocket dispatcher の PoC | `pnpm --filter @wsfw/api test` パス、WebSocket 健全性確認 |
| 3. フロントモジュール移植 (1.5w) | MindMap UI/SocketChat UI を apps/web で描画 | ReactFlow ベース UI 移植、tRPC hook 置換、UI コンポーネント段階導入、ルーティング追加 | ローカルで UI 動作、主要操作 (作成/編集/チャット送信) が通る |
| 4. 統合・UX 調整 (1w) | WS-only BBS + 新機能の統合 | i18n 文言統合、Tailwind 調整、アクセシビリティ確認、パフォーマンス調整 (コード分割) | デモシナリオ完走、LightHouse/BundleAnalyze で閾値内 |
| 5. 品質保証/ドキュメント (0.5w) | リグレッション防止と引き継ぎ | Vitest/E2E 追加、運用 Runbook、README/DEPLOYMENT 更新 | QA チェックリスト完了、Docs PR 承認 |

※ 工数は仮。Azure OpenAI や Blob Storage 連携の可用性によって変動。

## 6. リスクと対策
- **認証/トークン互換性**: WS-only 環境で AccessToken をどこで取得するか未確定。→ Phase0 で Auth 要件を確定し、暫定でデモ用 JWT をサーバが発行する fallback を用意。
- **ReactFlow/ElkJS のバンドルサイズ増**: 300KB 以上増える見込み。→ Code splitting（`React.lazy` + route-level chunk）を Phase4 で実施し、`pnpm analyze:web` で監視。
- **AI 依存の外部サービス**: Azure OpenAI/Blob Storage 資格情報が `websocketFramework` には未設定。→ Secrets 管理手順を README に追記し、開発時はモックサービスを用意。
- **非同期/ストリーミングの差異**: tRPC で `response_chunk` をどう表現するかが未確定。→ 選択肢A/B を早期に PoC、必要なら純粋 WS エンドポイントを追加して hybrid 化。
- **UI スタイル不整合**: 既存 BBS + 新UI の見た目差。→ 一旦 `legacy-*` namespace で隔離し、後続で shadcn へ寄せるロードマップを別紙化。
- **複数ソースからの移植**: local_knowledge + sampleProject のコードパスが並存し複雑化する恐れ。→ Phase0 で責務境界 (backend/frontend/UI) を文書化し、ディレクトリ/命名規約で起源を明示。

## 7. 検証計画
1. **ユニット/サービス**: Prisma サービスと tRPC ルータ用に Vitest を整備 (`apps/api/src/modules/ai-mindmap/tests/*` 相当)。
2. **フロント統合**: Testing Library で MindMap 操作/SocketChat 送受信の主要ケースを再現 (`frontend/Test/modules/...` のシナリオ流用)。
3. **WebSocket 負荷テスト**: `ws-bench` 等で 100+ 同時接続を検証、心拍・再接続ロジックを観察。
4. **E2E**: Playwright で「ログイン→MindMap CRUD→SocketChat 応答」シナリオを自動化。

## 8. 次アクション
1. Phase0 の着手: 技術要件レビュー、Auth/Storage の最小構成を確定し、local_knowledge のマイグレーション差分を一覧化。
2. Prisma スキーマ試作と MindMap/Chat 用テーブル設計レビュー。
3. WebSocket プロトコル (tRPC vs 生WS) の PoC を 1 スプリント内に実施し、以降の実装戦略をロックする。
4. sampleProject 由来の AI/SocketChat サービスを切り出し、tRPC から呼べる API 面をラフに定義する。

---
本計画により、REST 依存の機能群を WS-only tRPC モノレポへ段階的に移管できる。認証/ストレージ/プロトコルのギャップを先に潰し、フェーズごとに検証とドキュメントを並走させる方針で進行する。

## 9. 現状の成果と残課題
- ✅ **WS 認証の一本化**: `auth.login` / `auth.refresh` を tRPC で実装し、`/auth/session` 経由で HttpOnly Cookie を確立できる。`loginWithPassword` も WebSocket トンネル経由に変更済み。
- ✅ **MindMap ReactFlow ビュー**: `apps/web/src/pages/MindMapPage.tsx` が `reactflow` + `api.mindmap.getMindmapStructure` を組み合わせた読み取り専用ビューを提供。今後はノード編集・操作系の導入が必要。
- ✅ **Socket Chat PoC**: `apps/web/src/pages/SocketChatPage.tsx` が `ChatDispatcher` とそのまま WebSocket 通信するデバッグ UI を実装。MCP 互換メッセージ (`response_chunk` など) の可視化が可能になった。
- ✅ **Legacy UI +通知基盤**: sampleProject の UI を `apps/web/src/components/legacy-ui/*` へ段階移植し、`MessageProvider`/`ToastArea` で共通通知を供給。MindMap/SocketChat も `legacy-ui` コンポーネントを積極利用し、FileUploadModal などが `useMessage` を使ってトーストを出せるようになった。
- ⏳ **Legacy UI / ReactFlow 操作**: sampleProject 由来のレガシー UI コンポーネント群を `apps/web/src/components/legacy-ui/*` に移植し、MindMap/SocketChat で活用中。ReactFlow 上でノードのドラッグ・追加/保存/AI トリガーが動作し、編集系 REST→tRPC 移行準備が整った。
- ⏳ **AI/Queue/Storage の統合**: StorageProvider/Queue モジュールは置いているが、MindMap UI から Markdown/Blob 保存、AIジョブの QueueService 起動、Azure Blob などとのルートは未完成。次フェーズで `StorageFactory` を味方につけ、AI/Queue 呼び出しのハンドオフを明確にします。

## 9. 移植進捗状況（2025-11-13更新）

### ✅ 完了した作業

#### 9.1 text-enhancement モジュール（Tiptap Markdown Editor）
**状態**: ✅ 完了

**実施内容**:
- sampleProject の `frontend/src/modules/text-enhancement` を完全移植（41ファイル）
- Tiptap v3.3.0 ベースのマークダウンエディタ実装
- 必要な依存関係を追加:
  - @tiptap/* パッケージ一式
  - lowlight (シンタックスハイライト)
  - prosemirror-state
  - dompurify (XSS対策)
  - marked (Markdown解析)
- デモページ作成: `/markdown-editor`
- Vite設定最適化（optimizeDeps）

**成果物**:
- `apps/web/src/modules/text-enhancement/` - 完全移植
- `apps/web/src/pages/MarkdownEditorPage.tsx` - デモページ
- エディタ機能: リッチテキスト編集、テーブル、コードブロック、画像・リンク、リアルタイムプレビュー

#### 9.2 Socket-Chat tRPC統合
**状態**: ✅ 完了

**実施内容**:
- **アーキテクチャ変更**: 独自WebSocket接続 → tRPC subscription
- HTTP+REST を完全排除、WebSocket+tRPCのみで実装
- セキュリティ改善: URLトークン認証 → tRPC組み込み認証

**バックエンド**:
- `apps/api/src/modules/chat/router.ts` - tRPC chatルーター作成
- subscription: `chat.onMessage` - リアルタイムメッセージ受信
- mutation: `chat.send` - メッセージ送信
- query: `chat.getSession` - セッション情報取得

**フロントエンド**:
- `apps/web/src/modules/socket-chat/hooks/useTrpcChat.ts` - 新実装
- tRPC subscription使用、既存WebSocket接続を活用
- 自動接続・認証、手動接続ロジック削除
- `useWebSocketChat` を `useTrpcChat` へのエイリアスに変更（後方互換性維持）

**削除・非推奨化**:
- ❌ `useWebSocketManager.ts` - `.deprecated/` へ移動
- ❌ `lib/websocket/client.ts` (SecureWebSocketClient) - `.deprecated/` へ移動
- ❌ URLトークン認証方式
- ❌ `/chat` パス用の独自WebSocket接続

**成果**:
- 単一WebSocket接続（tRPCのみ）
- 型安全な通信（end-to-end）
- セキュアな認証（tRPC組み込み）
- ビルド成功確認済み

#### 9.3 認証機能強化
**状態**: ✅ 完了

**実施内容**:
- `AuthContext` に `isAuthenticated` プロパティ追加
- ユーザー状態ベースの認証判定実装

### 🔄 進行中の作業

なし

### 📋 未着手の作業

#### フロントエンド (apps/web) - セクション3
- sampleProject の `frontend/src/components/ui` を段階的に移植
- legacy-ui としての配置と shadcn/ui への統合計画

#### テスト・品質保証
- Vitest/React Testing Library テストの移植
- E2E テスト (Playwright) のセットアップ
- WebSocket負荷テスト

#### ドキュメント
- 運用Runbook作成
- APIドキュメント整備

### 📊 進捗サマリー

| カテゴリ | 完了 | 進行中 | 未着手 |
|---------|------|--------|--------|
| バックエンド | Mindmap, AI, Queue, Chat (tRPC) | - | - |
| フロントエンド | text-enhancement, Socket-Chat | - | UI components |
| 認証 | AuthContext強化 | - | - |
| アーキテクチャ | WebSocket+tRPC完全統合 | - | - |
| テスト | - | - | 全般 |

### 🎯 次のマイルストーン

1. UI components 移植開始
2. テストスイート整備
3. パフォーマンス最適化（コード分割）
4. 運用ドキュメント作成

