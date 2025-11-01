/**
 * Application Constants
 *
 * This file contains all numeric values and configuration constants.
 * Do not use magic numbers in the codebase - define them here instead.
 */

export const AUTH = {
	MAX_LOGIN_ATTEMPTS: 3,
	PASSWORD_MIN_LENGTH: 8,
	PASSWORD_MAX_LENGTH: 128,
	SESSION_DURATION: 3600000, // 1 hour in milliseconds
	TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes
	ACCOUNT_LOCKOUT_DURATION: 900000, // 15 minutes
} as const

export const TIMEOUTS = {
	NOTIFICATION_DURATION: 5000,
	DEBOUNCE_DELAY: 300,
	API_REQUEST_TIMEOUT: 10000,
	WEBSOCKET_RECONNECT_DELAY: 2000,
	AUTO_SAVE_INTERVAL: 30000, // 30 seconds
	SESSION_WARNING: 300000, // 5 minutes before expiry
} as const

export const SPACING = {
	XS: 4, // 0.25rem
	SM: 8, // 0.5rem
	MD: 16, // 1rem
	LG: 24, // 1.5rem
	XL: 32, // 2rem
	XXL: 48, // 3rem
} as const

export const PAGINATION = {
	DEFAULT_PAGE_SIZE: 20,
	MAX_PAGE_SIZE: 100,
	MIN_PAGE_SIZE: 5,
} as const

export const VALIDATION = {
	MAX_USERNAME_LENGTH: 50,
	MIN_USERNAME_LENGTH: 3,
	MAX_TITLE_LENGTH: 200,
	MAX_CONTENT_LENGTH: 5000,
	MAX_COMMENT_LENGTH: 1000,
} as const

export const UI = {
	SIDEBAR_WIDTH: 280,
	HEADER_HEIGHT: 64,
	FOOTER_HEIGHT: 48,
	CONTAINER_MAX_WIDTH: 1200,
	MODAL_MIN_WIDTH: 400,
	MODAL_MAX_WIDTH: 800,
} as const

export const BREAKPOINTS = {
	SM: 640, // small screens
	MD: 768, // medium screens
	LG: 1024, // large screens
	XL: 1280, // extra large screens
} as const

export const BUSINESS_RULES = {
	MAX_POSTS_PER_DAY: 50,
	MAX_COMMENTS_PER_POST: 100,
	INACTIVE_DAYS_THRESHOLD: 90,
	BULK_OPERATION_LIMIT: 1000,
} as const

export const ANIMATION = {
	DURATION_FAST: 150,
	DURATION_NORMAL: 300,
	DURATION_SLOW: 500,
	EASE_IN_OUT: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const

export const COLORS = {
	// Enterprise color palette
	PRIMARY: "#1e40af", // Blue 800
	PRIMARY_LIGHT: "#3b82f6", // Blue 500
	SECONDARY: "#6b7280", // Gray 500
	SUCCESS: "#059669", // Emerald 600
	WARNING: "#d97706", // Amber 600
	ERROR: "#dc2626", // Red 600
	NEUTRAL: {
		50: "#f9fafb",
		100: "#f3f4f6",
		200: "#e5e7eb",
		300: "#d1d5db",
		400: "#9ca3af",
		500: "#6b7280",
		600: "#4b5563",
		700: "#374151",
		800: "#1f2937",
		900: "#111827",
	},
} as const

export const FILE_LIMITS = {
	MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
	MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
	ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
	ALLOWED_DOCUMENT_TYPES: ["application/pdf", "text/plain"],
} as const
