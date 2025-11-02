/**
 * タイムアウトとインターバルの定数
 */

// WebSocket タイムアウト
export const WEBSOCKET_IDLE_TIMEOUT_AUTHENTICATED_MS = 30 * 60 * 1000; // 30分
export const WEBSOCKET_IDLE_TIMEOUT_UNAUTHENTICATED_MS = 5 * 60 * 1000; // 5分
export const WEBSOCKET_HEARTBEAT_INTERVAL_MS = 30_000; // 30秒

// JWT/トークン有効期限
export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 3600; // 1時間
export const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7日間
export const REFRESH_GRACE_PERIOD_MS = 60_000; // 1分

// クリーンアップ
export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1時間
