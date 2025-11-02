/**
 * サイズ・数量制限の定数
 */

// リクエストサイズ
export const MAX_AUTH_BODY_BYTES = 1048576; // 1MB
export const MAX_WEBSOCKET_PAYLOAD_BYTES = 1_000_000; // 1MB

// 接続数
export const MAX_WEBSOCKET_CONNECTIONS = 1000;

// ページネーション
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// ユーザー名
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 50;
export const USERNAME_GENERATION_MAX_ATTEMPTS = 1000;
