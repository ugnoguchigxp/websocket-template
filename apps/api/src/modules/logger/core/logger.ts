/**
 * Backend Logger実装
 * シンプルなコンソールロガー
 */

import { type ILogger, LogLevel } from "../types/index.js";

// 環境変数によるログレベル制御
const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === "development" ? "debug" : "info");
const IS_DEV = NODE_ENV === "development";

const getLogLevel = (level: string): LogLevel => {
	switch (level.toLowerCase()) {
		case "debug":
			return LogLevel.DEBUG;
		case "info":
			return LogLevel.INFO;
		case "warn":
			return LogLevel.WARN;
		case "error":
			return LogLevel.ERROR;
		default:
			return LogLevel.INFO;
	}
};

const currentLogLevel = getLogLevel(LOG_LEVEL);

/**
 * ログメッセージにタイムスタンプを追加
 */
const formatMessage = (level: string, message: string): string => {
	const timestamp = new Date().toISOString();
	return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

/**
 * メタデータの安全な文字列化
 */
const safeStringify = (obj: unknown): string => {
	try {
		return JSON.stringify(
			obj,
			(_key, value) => {
				if (typeof value === "bigint") {
					return value.toString();
				}
				if (value instanceof Error) {
					return {
						name: value.name,
						message: value.message,
						stack: value.stack,
					};
				}
				return value;
			},
			2
		);
	} catch (_error) {
		return String(obj);
	}
};

/**
 * Backend Logger実装
 */
class BackendLogger implements ILogger {
	private shouldLog(level: LogLevel): boolean {
		return level >= currentLogLevel;
	}

	debug(message: string, meta?: Record<string, unknown>): void {
		if (!this.shouldLog(LogLevel.DEBUG)) return;

		const formattedMessage = formatMessage("debug", message);
		if (meta === undefined) {
			// eslint-disable-next-line no-console
			console.debug(formattedMessage);
		} else if (typeof meta === "object" && meta !== null) {
			if (Object.keys(meta).length > 0) {
				// eslint-disable-next-line no-console
				console.debug(formattedMessage, "\n", safeStringify(meta));
			} else {
				// eslint-disable-next-line no-console
				console.debug(formattedMessage, "{}");
			}
		} else {
			// null, primitive values
			// eslint-disable-next-line no-console
			console.debug(formattedMessage, meta);
		}
	}

	info(message: string, meta?: Record<string, unknown>): void {
		if (!this.shouldLog(LogLevel.INFO)) return;

		const formattedMessage = formatMessage("info", message);
		if (meta === undefined) {
			// eslint-disable-next-line no-console
			console.info(formattedMessage);
		} else if (typeof meta === "object" && meta !== null) {
			if (Object.keys(meta).length > 0) {
				// eslint-disable-next-line no-console
				console.info(formattedMessage, "\n", safeStringify(meta));
			} else {
				// eslint-disable-next-line no-console
				console.info(formattedMessage, "{}");
			}
		} else {
			// null, primitive values
			// eslint-disable-next-line no-console
			console.info(formattedMessage, meta);
		}
	}

	warn(message: string, meta?: Record<string, unknown>): void {
		if (!this.shouldLog(LogLevel.WARN)) return;

		const formattedMessage = formatMessage("warn", message);
		if (meta === undefined) {
			// eslint-disable-next-line no-console
			console.warn(formattedMessage);
		} else if (typeof meta === "object" && meta !== null) {
			if (Object.keys(meta).length > 0) {
				// eslint-disable-next-line no-console
				console.warn(formattedMessage, "\n", safeStringify(meta));
			} else {
				// eslint-disable-next-line no-console
				console.warn(formattedMessage, "{}");
			}
		} else {
			// null, primitive values
			// eslint-disable-next-line no-console
			console.warn(formattedMessage, meta);
		}
	}

	error(message: string, error?: Error | Record<string, unknown>): void {
		if (!this.shouldLog(LogLevel.ERROR)) return;

		const formattedMessage = formatMessage("error", message);
		if (error !== undefined) {
			if (error instanceof Error) {
				// eslint-disable-next-line no-console
				console.error(formattedMessage, "\n", error.stack || error.message);
			} else {
				// eslint-disable-next-line no-console
				console.error(formattedMessage, "\n", safeStringify(error));
			}
		} else {
			// eslint-disable-next-line no-console
			console.error(formattedMessage);
		}
	}
}

// シングルトンインスタンス
export const logger = new BackendLogger();

// 開発環境でのみ初期化ログ出力
if (IS_DEV) {
	logger.debug("Logger initialized in development mode");
} else {
	logger.info("Logger initialized in production mode");
}
