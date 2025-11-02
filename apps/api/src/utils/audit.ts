/**
 * Audit and logging utilities
 */

import { logger } from "../modules/logger/core/logger.js";

const SENSITIVE_KEYS = new Set([
	"password",
	"passphrase",
	"code",
	"codeVerifier",
	"refreshToken",
	"token",
	"clientSecret",
]);

function redactValue(value: unknown): unknown {
	if (!value || typeof value !== "object") {
		return value;
	}

	if (value instanceof Date) {
		return value.toISOString();
}

	if (Array.isArray(value)) {
		return value.map((item) => redactValue(item));
	}

	const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => {
		if (SENSITIVE_KEYS.has(key)) {
			return [key, "***"];
		}
		return [key, redactValue(val)];
	});

	return Object.fromEntries(entries);
}

export function redactInput(_path: string, input: unknown) {
	if (input === undefined || input === null) {
		return undefined;
	}
	try {
		return redactValue(input);
	} catch {
		return undefined;
	}
}

export function createAuditMiddleware() {
	return async ({ ctx, path, type, next, rawInput }: any) => {
		const start = Date.now();
		const redacted = redactInput(path, rawInput);
		try {
			const res = await next();
			logger.info("RPC call succeeded", {
				userId: ctx.user?.sub ?? "anon",
				path,
				type,
				input: redacted,
				duration: Date.now() - start,
			});
			return res;
		} catch (e: unknown) {
			// Log full error details for debugging
			const errorCode = e && typeof e === "object" && "code" in e ? String(e.code) : "ERROR";
			const message =
				e && typeof e === "object" && "message" in e ? String(e.message) : "Unknown error";
			logger.error("RPC call failed", {
				userId: ctx.user?.sub ?? "anon",
				path,
				type,
				input: redacted,
				duration: Date.now() - start,
				errorCode,
				message,
			});

			// Don't leak internal error details to client
			if (e && typeof e === "object" && "constructor" in e && e.constructor.name === "TRPCError") {
				throw e;
			}
			// Wrap unknown errors
			const { TRPCError } = await import("@trpc/server");
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "An unexpected error occurred",
			});
		}
	};
}
