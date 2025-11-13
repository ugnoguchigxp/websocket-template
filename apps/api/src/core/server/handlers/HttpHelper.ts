import type { IncomingMessage, ServerResponse } from "http";
import { logger } from "../../../modules/logger/core/logger.js";

/**
 * HTTP関連のヘルパー関数を提供するクラス
 */
export class HttpHelper {
	private readonly maxBodyBytes: number;

	constructor(maxBodyBytes?: number) {
		this.maxBodyBytes =
			maxBodyBytes || Number.parseInt(process.env.OIDC_MAX_AUTH_BODY_BYTES || "1048576", 10);
	}

	/**
	 * CORSヘッダーを適用する
	 * @returns CORSチェックが成功したかどうか
	 */
	applyCors(res: ServerResponse, origin: string | undefined, allowedOrigin: string): boolean {
		res.setHeader("Vary", "Origin");
		res.setHeader("Access-Control-Allow-Credentials", "true");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
		res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

		if (allowedOrigin === "*") {
			res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
			return true;
		}

		if (origin && origin !== allowedOrigin) {
			this.sendJson(res, 403, { error: "Origin not allowed" });
			return false;
		}

		res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
		return true;
	}

	/**
	 * OPTIONSリクエストを処理する
	 */
	handleOptions(res: ServerResponse): void {
		res.statusCode = 204;
		res.end();
	}

	/**
	 * JSONレスポンスを送信する
	 */
	sendJson(res: ServerResponse, status: number, payload: unknown): void {
		if (!res.headersSent) {
			res.statusCode = status;
			res.setHeader("Content-Type", "application/json");
		}
		res.end(JSON.stringify(payload));
	}

	/**
	 * リクエストボディからJSONを読み取る
	 */
	async readJsonBody<T>(req: IncomingMessage): Promise<T> {
		const chunks: Uint8Array[] = [];
		let received = 0;

		for await (const chunk of req) {
			const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			received += buffer.length;
			if (received > this.maxBodyBytes) {
				throw new Error("Request body too large");
			}
			chunks.push(buffer);
		}

		const raw = Buffer.concat(chunks).toString("utf8").trim();
		if (!raw) {
			return {} as T;
		}
		try {
			return JSON.parse(raw) as T;
		} catch (error) {
			logger.error("Invalid JSON payload", {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new Error("Invalid JSON payload");
		}
	}
}
