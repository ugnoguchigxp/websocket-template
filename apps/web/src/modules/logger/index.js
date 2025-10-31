/**
 * Backend Logger - メインエクスポート
 * @logger エイリアスで使用可能
 */
import { logger } from './core/logger';
/**
 * コンテキスト付きロガー作成
 * 使い方: const log = createContextLogger('ServiceName');
 *         log.debug('message', { data });
 */
export const createContextLogger = (context) => ({
    debug: (message, meta) => logger.debug(`[${context}] ${message}`, meta),
    info: (message, meta) => logger.info(`[${context}] ${message}`, meta),
    warn: (message, meta) => logger.warn(`[${context}] ${message}`, meta),
    error: (message, error) => logger.error(`[${context}] ${message}`, error),
});
// loggerインスタンスもエクスポート
export { logger };
// 型定義のエクスポート
export * from './types';
