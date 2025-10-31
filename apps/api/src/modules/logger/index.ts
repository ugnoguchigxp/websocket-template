/**
 * Backend Logger - メインエクスポート
 * @logger エイリアスで使用可能
 */

import { logger } from "./core/logger.js";
import type { IContextLogger } from "./types/index.js";

/**
 * コンテキスト付きロガー作成
 * 使い方: const log = createContextLogger('ServiceName');
 *         log.debug('message', { data });
 */
export const createContextLogger = (context: string): IContextLogger => ({
	debug: (message: string, meta?: Record<string, unknown>) =>
		logger.debug(`[${context}] ${message}`, meta),
	info: (message: string, meta?: Record<string, unknown>) =>
		logger.info(`[${context}] ${message}`, meta),
	warn: (message: string, meta?: Record<string, unknown>) =>
		logger.warn(`[${context}] ${message}`, meta),
	error: (message: string, error?: Error | Record<string, unknown>) =>
		logger.error(`[${context}] ${message}`, error),
});

// loggerインスタンスもエクスポート
export { logger };

// 型定義のエクスポート
export * from "./types/index.js";
