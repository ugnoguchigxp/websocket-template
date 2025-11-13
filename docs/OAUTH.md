# OIDC/OAuth2 への移行計画

## 現状の整理

- バックエンドは独自 JWT を発行・検証しており、共有シークレット `HS256` を使用（apps/api/src/JwtService.ts:24）。
- tRPC ルータで `auth.login` がユーザー名・パスワードを受け取り、JWT を発行（apps/api/src/routers/index.ts:120）。
- フロントエンドは `Login` コンポーネントで WebSocket 経由の認証を実施し、`sessionStorage` にアクセストークンのみ保持（apps/web/src/ui/Login.tsx:12）。
- 認証済み WebSocket 接続は `Sec-WebSocket-Protocol` に `bearer <token>` を指定して確立（apps/web/src/client.ts:26）。
- アクセストークンの期限は 7 日で、リフレッシュ機構は未実装（apps/api/src/JwtService.ts:24）。

## ゴール

1. 認証・トークン管理を外部 IdP (Auth0, Okta, Azure AD など) の OIDC/OAuth2 に委譲する。
2. フロントエンドは Authorization Code + PKCE フローでログインし、短命アクセストークンとリフレッシュトークンを取得する。
3. バックエンドは自前でトークンを発行せず、IdP が配布するトークン（署名付き JWT）を検証して利用者を特定する。
4. WebSocket/ tRPC 接続はアクセストークンを使って確立し、期限切れ時はフロントから更新したトークンで再接続する。
5. 既存の認証フロー（`auth.login`）は最終的に停止し、OIDC/OAuth2 ベースのフローへ完全移行する。

## サーバー側の対応事項

### 1. 設定・環境変数の見直し

- 既存の `JWT_SECRET` での署名は不要になるため、IdP から提供される以下の値を新たに扱う：
  - `OIDC_ISSUER` … `.well-known/openid-configuration` の発行者 URL
  - `OIDC_AUDIENCE` … API の想定クライアント ID
  - `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` … サーバー側でトークンを検証・交換する際に使用（必要に応じて）
  - `OIDC_JWKS_URI` … 公開鍵セットの取得先

### 2. トークン検証ロジックの差し替え

- `JwtService` を以下のように改修：

```
apps/api/src/JwtService.ts
┌───────────────────────────────┐
│ 現状: HS256 で署名・検証       │
│  └─ verify() で秘密鍵を使用   │
├───────────────────────────────┤
│ 変更: JWKS ベースの検証        │
│  └─ jwks-rsa などで kid を確認 │
│  └─ iss/aud/exp を OIDC 標準で │
│      検証 (nonce 不要)         │
└───────────────────────────────┘
```

  - 具体的には `jwks-rsa` や `oidc-provider` などのライブラリを利用し、`verify()` で公開鍵をフェッチ。キャッシュとキーローテーションに備える。
  - `sign()` は最終的に不要になるため、当面は「旧フロー用」のコードを残しつつ、新しいメソッド `verifyExternalToken()` を実装する形が移行しやすい。

### 3. tRPC コンテキストの更新

- `ServerApp.createContextFromReq`（apps/api/src/server.ts:269）で `Sec-WebSocket-Protocol` から取り出したトークンを新ロジックで検証し、`sub` だけでなく OIDC クレーム（`email`, `preferred_username`, `roles` など）を `ctx.user` に保存する。
- サーバー側で参照するユーザー情報をローカル DB と同期するか、IdP を唯一のユーザーストアとして扱うかを決める。同期型にする場合は：
  - 初回ログインで `sub` をキーにローカルユーザーを自動作成/更新。
  - `auth.me` はローカル DB ではなくトークンのクレームを返す実装へ移行する。

### 4. 旧フローとの並行運用

- 旧 `auth.login` は移行期間中のみ残し、動作確認が完了次第廃止する（本ドキュメントは完全移行を前提とする）。
- Authorization Code をどこで交換するかは２パターン考えられるが、採用するのは **バックエンド仲介方式**：
  - ~~クライアント→IdP 直接交換方式~~（採用しない）
  - **バックエンド仲介方式（採用）**  
    - 新規 `POST /auth/exchange`（仮）で `code` と `code_verifier` を受け取り、サーバーから IdP へトークン交換。  
    - サーバー側で `OIDC_CLIENT_SECRET` を安全に保持でき、React アプリはシークレットを扱わずに済む。  
    - エンドポイント自体は `state` / `code_verifier` 検証で CSRF / リプレイを防ぐ。
- 今後の設計・実装はサーバー仲介方式かつ完全移行（旧エンドポイント廃止）を前提とする。

## フロントエンド側の対応事項

### 1. `Login` コンポーネントのリプレイス

- 現状は `createUnauthedTrpcClient()` で WebSocket を張って `auth.login` を呼ぶ構成（apps/web/src/ui/Login.tsx:16）。
- これを Authorization Code + PKCE フローに変更：
  1. ログインボタン押下 → `/oauth/authorize` にリダイレクト（`code_challenge` 付き）。
  2. コールバックで `code` を受け取り、フロント or バックエンドからトークンエンドポイントへ交換リクエスト。
  3. `access_token`（短期）と `refresh_token`（安全な保存が必要）を取得。
- `sessionStorage` はタブクローズで消えるため、**アクセストークンのみ** 短期間保持。リフレッシュトークンは HttpOnly Cookie やバックエンド管理を推奨。

### 2. トークン管理フロー

- `AppRoot`（apps/web/src/main.tsx:36）でアクセストークンを保持しているが、OIDC では以下が必要：

```
┌──────────────┬────────────────────────────────────────┐
│ アクセストークン │ 5〜15分程度で失効。sessionStorage で保持 │
│ リフレッシュ    │ 期限は長め。クライアント JS から参照しない │
└──────────────┴────────────────────────────────────────┘
```

- リフレッシュトークンは **サーバー側仲介方式** に合わせ、以下のように運用する：
  - `POST /auth/exchange` / `POST /auth/refresh` で受け取ったリフレッシュトークンはサーバー側で Secure + HttpOnly Cookie（`SameSite=Strict` または `Lax`、`Max-Age=86400`）として発行し、ブラウザは自動的に送信する。React から Cookie の値を読む必要はない。
- `/auth/exchange` のリクエスト例（PKCE を利用）
  ```http
  POST /auth/exchange
  Content-Type: application/json

  {
    "code": "<authorization_code>",
    "codeVerifier": "<original_code_verifier>",
    "state": "<state>"
  }
  ```

- `/auth/refresh` のリクエスト例
  ```http
  POST /auth/refresh
  Content-Type: application/json

  {
    "prompt": "none"
  }
  ```
  ※リクエストボディは任意（CSRF トークンを置きたい場合など）。リフレッシュトークンは Cookie で送信される。

- `/auth/exchange` / `/auth/refresh` のレスポンス例
  ```json
  {
    "accessToken": "<jwt>",
    "accessTokenExpiresAt": "2025-01-01T12:34:56.000Z"  // サーバー時刻（UTC）
  }
  ```
  - `accessTokenExpiresAt` はサーバー時刻（UTC）で返却する。クライアントは受信後に `new Date(expiresAt).getTime()` を利用して期限を判定する。
  - アクセストークンの期限が近づいたら `fetch('/auth/refresh', { credentials: 'include' })` などでリフレッシュを行い、レスポンスで受け取った新しいアクセストークンを使って `createTrpcClientWithToken` を再生成する。ブラウザは Cookie を自動送信するため、React 側でリフレッシュトークンを管理する必要がない。
  - ログアウト時はバックエンドで Cookie を削除し、React でもアクセストークンを破棄する。
- ユーザーはリフレッシュトークンが有効な限りログイン状態を維持できるようにする。アクセストークンが失効しても自動的に `/auth/refresh` が呼ばれ、新しいアクセストークンが返される限りセッションは継続し、リフレッシュトークンの有効期限（1 日）を迎えるか、ユーザーが明示的にログアウトした場合のみセッションを終了する。
- アクセストークン更新後は `createTrpcClientWithToken` を新しいトークンで再生成し、古い WebSocket 接続を閉じて差し替える。
- `auth.me` はローカル DB の値ではなく、アクセストークンのクレームや `userinfo` エンドポイントの結果を返す形に徐々に移行する。

- 現状の `AppRoot` は `setTokenState` で WebSocket クライアントを再生成している。リフレッシュ対応では「旧クライアントを確実に閉じる → 新しいアクセストークンで `createTrpcClientWithToken` 再生成 → `api.Provider` に渡す」という手順を徹底する。

### 4. ログアウト

- IdP 側のセッションも明示的に破棄する必要がある。`AuthProvider.logout`（apps/web/src/contexts/AuthContext.tsx:34）から IdP の `end_session_endpoint` を叩くか、バックエンド経由で行う。

## 実装の主な作業項目

1. **準備**
   - IdP のテナント作成、クライアント登録、リダイレクト URI (`https://app.example.com/callback`) を設定。
   - `OIDC_*` 環境変数を `.env` に追加し、実行時設定を整える。

2. **サーバー対応**
   - `JwtService` に JWKS 検証機構を実装する。
   - `ServerApp.createContextFromReq` でクレームを `ctx.user` に格納し、必要に応じてローカル DB を更新。
   - `POST /auth/exchange`, `POST /auth/refresh`, `POST /auth/logout`（IdP の End Session を呼ぶ）など、バックエンド仲介用の API を追加する。
   - 旧 `auth.login` と新フローを切り替えるフラグを用意し、移行後に旧エンドポイントを廃止する。

3. **フロントエンド対応**
   - PKCE 生成ロジック・認可リダイレクト・コールバック処理を導入し、新しい `/auth/exchange` / `/auth/refresh` を呼び出す。
   - 取得したアクセストークン・失効時刻を state / `sessionStorage` に保存し、期限前に `credentials: "include"` でリフレッシュを呼び出す。
   - `createTrpcClientWithToken` 再生成のタイミングを整理し、ログアウト時に Cookie とアクセストークンを破棄する。

4. **完全移行**
   - 旧 `auth.login` エンドポイントとパスワードストアを廃止し、新フローのみを提供する。
   - `JwtService.sign` を削除し、`verify` は外部 IdP 用の実装のみ残す。
   - ドキュメントとテストを OIDC 前提に更新し、メンテナンス体制を整える。

6. **運用・監視**
   - 監査ログに IdP の `sub`, `client_id` などを含め、トラブルシューティングを容易に。
   - トークンの期限切れやリフレッシュ失敗を Sentry 等に送る。

## テスト観点

- **ユニットテスト**: `JwtService` の検証メソッドに対して、署名が正しい/間違っている/JWKS が取得できないケースを網羅。
- **統合テスト**: ローカル IdP (Keycloak など) を docker-compose で立ち上げ、Code Flow を e2e で通す。
- **WebSocket テスト**: 有効トークンで接続 → 期限切れを模して再接続 → 無効トークンが来たときに拒否されるか確認。
- **UI テスト**: リダイレクトフローとコールバック処理、ログアウト時の IdP セッション破棄が正しく行われるか。

---

## まとめ

- 現在のコードベースは独自 JWT + WebSocket 認証で構成されており、OIDC/OAuth2 に移行するにはサーバー・クライアント双方の大幅な変更が必要。
- まずは IdP を決定し、トークン検証を JWKS ベースに差し替えるところから着手する。
- Authorization Code + PKCE フロー実装とトークンリフレッシュ戦略、WebSocket 再接続の仕組みを整備した上で、最終的に旧来の `auth.login` を廃止する段階的移行が現実的である。

```
      ┌────────────┐           ┌──────────────┐
      │  User      │  sign-in  │  OIDC IdP    │
      └────┬───────┘  ───────► │ (Auth0 等)   │
           │ ◄──────── tokens  └──────┬───────┘
           │                          │
           ▼                          ▼
   ┌────────────┐             ┌──────────────┐
   │ Web Client │─access─────►│ Server (tRPC)│
   └────┬───────┘             └──────┬───────┘
        │                            │
        ▼                            ▼
   ┌────────────┐             ┌──────────────┐
   │ WebSocket  │◄─bearer─────│ Context/Auth │
   └────────────┘             └──────────────┘
```

この計画に沿って順次実装すれば、OIDC/OAuth2 に準拠したトークン運用へスムーズに移行できます。
