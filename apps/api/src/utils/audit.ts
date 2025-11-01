/**
 * Audit and logging utilities
 */

import { logger } from "../modules/logger/core/logger.js";

export function redactInput(path: string, input: unknown) {
	if (!input) return undefined;
	try {
		if (
			path === "auth.login" &&
			typeof input === "object" &&
			input !== null &&
			"username" in input
		) {
			const { username } = input as { username: string; password: string };
			return { username, password: "***" };
		}
		return input;
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
				userId: ctx.userId ?? "anon",
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
				userId: ctx.userId ?? "anon",
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
