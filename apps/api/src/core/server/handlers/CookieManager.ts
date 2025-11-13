import type { IncomingMessage, ServerResponse } from "http";

/**
 * Cookie管理を担当するクラス
 * リフレッシュトークンのCookie操作を集約
 */
export class CookieManager {
	private readonly cookieName: string;
	private readonly cookiePath: string;
	private readonly cookieDomain?: string;
	private readonly secure: boolean;
	private readonly sameSite: "Strict" | "Lax" | "None";

	constructor(
		options: {
			cookieName?: string;
			cookiePath?: string;
			cookieDomain?: string;
			secure?: boolean;
			sameSite?: string;
		} = {}
	) {
		this.cookieName =
			options.cookieName || process.env.OIDC_REFRESH_COOKIE_NAME || "refresh_session";
		this.cookiePath = options.cookiePath || process.env.OIDC_REFRESH_COOKIE_PATH || "/";
		this.cookieDomain = options.cookieDomain || process.env.OIDC_REFRESH_COOKIE_DOMAIN;

		this.secure =
			options.secure !== undefined
				? options.secure
				: process.env.OIDC_REFRESH_COOKIE_SECURE?.toLowerCase() !== "false" ||
					process.env.NODE_ENV === "production";

		this.sameSite = this.resolveSameSite(
			options.sameSite || process.env.OIDC_REFRESH_COOKIE_SAMESITE
		);

		if (this.sameSite === "None" && !this.secure) {
			this.secure = true;
		}
	}

	private resolveSameSite(value?: string): "Strict" | "Lax" | "None" {
		const normalized = (value ?? "").toLowerCase();
		switch (normalized) {
			case "strict":
				return "Strict";
			case "none":
				return "None";
			default:
				return "Lax";
		}
	}

	/**
	 * Cookieヘッダーからクッキーをパースする
	 */
	parseCookies(req: IncomingMessage): Record<string, string> {
		const header = req.headers.cookie;
		if (!header) {
			return {};
		}
		const out: Record<string, string> = {};
		const cookies = header.split(";");
		for (const cookie of cookies) {
			const [rawName, ...rest] = cookie.trim().split("=");
			if (!rawName) continue;
			const value = rest.join("=") ?? "";
			out[rawName] = decodeURIComponent(value);
		}
		return out;
	}

	/**
	 * Set-Cookieヘッダーを追加する
	 */
	private appendSetCookie(res: ServerResponse, value: string): void {
		const existing = res.getHeader("Set-Cookie");
		if (!existing) {
			res.setHeader("Set-Cookie", value);
		} else if (Array.isArray(existing)) {
			res.setHeader("Set-Cookie", [...existing, value]);
		} else {
			res.setHeader("Set-Cookie", [existing.toString(), value]);
		}
	}

	/**
	 * リフレッシュトークンをCookieにセットする
	 */
	setRefreshCookie(res: ServerResponse, sessionId: string, expiresAt: Date): void {
		const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
		const parts = [
			`${this.cookieName}=${encodeURIComponent(sessionId)}`,
			`Path=${this.cookiePath}`,
			`Max-Age=${maxAgeSeconds}`,
			`Expires=${expiresAt.toUTCString()}`,
			`SameSite=${this.sameSite}`,
			"HttpOnly",
		];
		if (this.secure) {
			parts.push("Secure");
		}
		if (this.cookieDomain) {
			parts.push(`Domain=${this.cookieDomain}`);
		}
		this.appendSetCookie(res, parts.join("; "));
	}

	/**
	 * リフレッシュトークンのCookieをクリアする
	 */
	clearRefreshCookie(res: ServerResponse): void {
		const expires = new Date(0);
		const parts = [
			`${this.cookieName}=`,
			`Path=${this.cookiePath}`,
			"Max-Age=0",
			`Expires=${expires.toUTCString()}`,
			`SameSite=${this.sameSite}`,
			"HttpOnly",
		];
		if (this.secure) {
			parts.push("Secure");
		}
		if (this.cookieDomain) {
			parts.push(`Domain=${this.cookieDomain}`);
		}
		this.appendSetCookie(res, parts.join("; "));
	}

	/**
	 * リクエストからリフレッシュトークンのセッションIDを取得する
	 */
	getSessionId(req: IncomingMessage): string | null {
		const cookies = this.parseCookies(req);
		return cookies[this.cookieName] || null;
	}
}
