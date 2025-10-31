/**
 * Backend Logger実装
 * シンプルなコンソールロガー
 */

import { LogLevel, type ILogger } from '../types';

// 環境変数によるログレベル制御（ブラウザ対応）
const getEnv = (key: string, defaultValue: string): string => {
  // ブラウザ環境の場合（Vite）
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env[key] as string) || defaultValue;
  }
  // Node.js環境の場合
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

const NODE_ENV = getEnv('NODE_ENV', 'development');
const LOG_LEVEL = getEnv('LOG_LEVEL', NODE_ENV === 'development' ? 'debug' : 'info');
const IS_DEV = NODE_ENV === 'development';

const getLogLevel = (level: string): LogLevel => {
  switch (level.toLowerCase()) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
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
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') {
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
    }, 2);
  } catch (error) {
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

    const formattedMessage = formatMessage('debug', message);
    if (meta !== undefined && Object.keys(meta).length > 0) {
      // eslint-disable-next-line no-console
      console.debug(formattedMessage, '\n', safeStringify(meta));
    } else {
      // eslint-disable-next-line no-console
      console.debug(formattedMessage);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const formattedMessage = formatMessage('info', message);
    if (meta !== undefined && Object.keys(meta).length > 0) {
      // eslint-disable-next-line no-console
      console.info(formattedMessage, '\n', safeStringify(meta));
    } else {
      // eslint-disable-next-line no-console
      console.info(formattedMessage);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const formattedMessage = formatMessage('warn', message);
    if (meta !== undefined && Object.keys(meta).length > 0) {
      // eslint-disable-next-line no-console
      console.warn(formattedMessage, '\n', safeStringify(meta));
    } else {
      // eslint-disable-next-line no-console
      console.warn(formattedMessage);
    }
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const formattedMessage = formatMessage('error', message);
    if (error !== undefined) {
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error(formattedMessage, '\n', error.stack || error.message);
      } else {
        // eslint-disable-next-line no-console
        console.error(formattedMessage, '\n', safeStringify(error));
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
  logger.debug('Logger initialized in development mode');
} else {
  logger.info('Logger initialized in production mode');
}
