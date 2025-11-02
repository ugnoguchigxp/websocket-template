/**
 * Backend Application Constants
 *
 * This file contains all numeric values and configuration constants for the API.
 * Do not use magic numbers in the codebase - define them here instead.
 */

// Re-export organized constants
export * from "./timeouts.js";
export * from "./limits.js";

export const AUTH = {
	MAX_LOGIN_ATTEMPTS: 3,
	PASSWORD_MIN_LENGTH: 8,
	PASSWORD_MAX_LENGTH: 128,
	SESSION_DURATION: 3600000, // 1 hour in milliseconds
	TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes
	ACCOUNT_LOCKOUT_DURATION: 900000, // 15 minutes
	JWT_ACCESS_TOKEN_EXPIRY: 900, // 15 minutes in seconds (short-lived)
	JWT_REFRESH_TOKEN_EXPIRY: 86400, // 1 day in seconds (as requested)
} as const;

export const RATE_LIMITING = {
	LOGIN_ATTEMPTS_WINDOW: 900000, // 15 minutes in milliseconds
	MAX_LOGIN_ATTEMPTS_PER_IP: 10,
	MAX_REQUESTS_PER_MINUTE: 60,
	MAX_UPLOADS_PER_HOUR: 20,
	CLEANUP_INTERVAL: 300000, // 5 minutes
} as const;

export const DATABASE = {
	CONNECTION_TIMEOUT: 10000,
	QUERY_TIMEOUT: 30000,
	MAX_CONNECTIONS: 20,
	CONNECTION_RETRY_DELAY: 2000,
	MAX_RETRY_ATTEMPTS: 3,
} as const;

export const VALIDATION = {
	MAX_USERNAME_LENGTH: 50,
	MIN_USERNAME_LENGTH: 3,
	MAX_TITLE_LENGTH: 200,
	MAX_CONTENT_LENGTH: 5000,
	MAX_COMMENT_LENGTH: 1000,
	MAX_EMAIL_LENGTH: 255,
} as const;

export const PAGINATION = {
	DEFAULT_PAGE_SIZE: 20,
	MAX_PAGE_SIZE: 100,
	MIN_PAGE_SIZE: 5,
	DEFAULT_PAGE: 1,
} as const;

export const BUSINESS_RULES = {
	MAX_POSTS_PER_DAY: 50,
	MAX_COMMENTS_PER_POST: 100,
	INACTIVE_DAYS_THRESHOLD: 90,
	BULK_OPERATION_LIMIT: 1000,
	MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

export const LOGGING = {
	MAX_LOG_SIZE: 1000, // characters
	LOG_RETENTION_DAYS: 30,
	ERROR_RATE_THRESHOLD: 0.05, // 5%
	PERFORMANCE_THRESHOLD_MS: 1000, // 1 second
} as const;

export const WEBSOCKET = {
	HEARTBEAT_INTERVAL: 30000, // 30 seconds
	CONNECTION_TIMEOUT: 10000, // 10 seconds
	MAX_CONNECTIONS_PER_USER: 5,
	RECONNECT_DELAY: 2000,
	MAX_RECONNECT_ATTEMPTS: 10,
} as const;

export const SECURITY = {
	BCRYPT_ROUNDS: 12,
	CSRF_TOKEN_LENGTH: 32,
	SESSION_ID_LENGTH: 64,
	API_KEY_LENGTH: 32,
	MAX_LOGIN_ATTEMPTS_PER_ACCOUNT: 5,
} as const;

export const CACHE = {
	DEFAULT_TTL: 300, // 5 minutes
	USER_CACHE_TTL: 600, // 10 minutes
	POST_CACHE_TTL: 1800, // 30 minutes
	MAX_CACHE_SIZE: 1000, // entries
	CLEANUP_INTERVAL: 60000, // 1 minute
} as const;

export const NOTIFICATIONS = {
	MAX_NOTIFICATIONS_PER_USER: 100,
	NOTIFICATION_RETENTION_DAYS: 30,
	BATCH_SIZE: 50,
	SEND_TIMEOUT: 5000, // 5 seconds
} as const;

export const ENVIRONMENT = {
	DEFAULT_PORT: 3001,
	DEFAULT_HOST: "0.0.0.0",
	NODE_ENV: process.env.NODE_ENV || "development",
} as const;
