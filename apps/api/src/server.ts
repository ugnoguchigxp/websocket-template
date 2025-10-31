import "reflect-metadata";
import type { IncomingMessage } from "http";
import { parse } from "url";
import { logger } from "./modules/logger/core/logger.js";
import type { PrismaClient } from "@prisma/client";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { inject, injectable } from "tsyringe";
import { type WebSocket, WebSocketServer } from "ws";
import { JwtService } from "./JwtService.js";
import type { Context } from "./routers/index.js";

// Extend WebSocket type to include isAlive property
interface ExtendedWebSocket extends WebSocket {
	isAlive?: boolean;
}

// WebSocket configuration constants
const IDLE_TIMEOUT_AUTHENTICATED_MS = 30 * 60 * 1000; // 30 minutes
const IDLE_TIMEOUT_UNAUTHENTICATED_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

@injectable()
export class ServerApp {
	constructor(
		@inject("Prisma") private readonly prisma: PrismaClient,
		@inject("JWT_SECRET") private readonly jwtSecret: string,
		@inject(JwtService) private readonly jwtService: JwtService
	) {}

	/**
	 * Extract JWT token from WebSocket request headers or URL query parameter
	 */
	private extractToken(req: IncomingMessage): string {
		// Extract from subprotocol header (preferred method)
		const protocols = req.headers["sec-websocket-protocol"];
		if (protocols) {
			const parts = protocols.split(",").map((p: string) => p.trim());
			if (parts[0] === "bearer" && parts[1]) {
				return parts[1];
			}
		}

		// Fallback: check URL query parameter (for backwards compatibility)
		const url = parse(req.url || "", true);
		return (url.query?.token as string) || "";
	}

	public async start(port: number) {
		const ALLOWED_ORIGIN = process.env.ALLOWED_WS_ORIGIN;
		if (!ALLOWED_ORIGIN) {
			throw new Error("ALLOWED_WS_ORIGIN must be set. See .env.example");
		}
		const JWT_ISSUER = process.env.JWT_ISSUER;
		const JWT_AUDIENCE = process.env.JWT_AUDIENCE;
		const MAX_CONNECTIONS = Number.parseInt(process.env.MAX_WS_CONNECTIONS || "1000", 10);

		// Import appRouter dynamically to ensure environment variables are loaded first
		logger.debug("Importing routers module");
		const { appRouter } = await import("./routers/index.js");
		logger.debug("Routers module imported successfully");

		const wss = new WebSocketServer({
			host: "0.0.0.0",
			port,
			maxPayload: 1_000_000, // 1MB max message size
			perMessageDeflate: false, // Disable compression to prevent DoS
			clientTracking: true,
		});
		const handler = applyWSSHandler({
			wss,
			router: appRouter,
			createContext: ({ req }) => this.createContextFromReq(req),
		});

		wss.on("connection", (socket, req) => {
			// Limit total connections
			if (wss.clients.size > MAX_CONNECTIONS) {
				try {
					socket.close(1008, "Server at capacity");
				} catch (error) {
					logger.warn("Failed to close socket at capacity", {
						error: error instanceof Error ? error.message : String(error),
					});
				}
				return;
			}

			// Origin allowlist (close early if not allowed)
			const origin = req.headers.origin as string | undefined;
			if (origin && origin !== ALLOWED_ORIGIN) {
				try {
					socket.close(1008, "Origin not allowed");
				} catch (error) {
					logger.warn("Failed to close socket with invalid origin", {
						origin,
						error: error instanceof Error ? error.message : String(error),
					});
				}
				return;
			}

			// Extract token using shared method
			const token = this.extractToken(req);

			// Idle timeout: different for authenticated vs unauthenticated
			const idleMs = token ? IDLE_TIMEOUT_AUTHENTICATED_MS : IDLE_TIMEOUT_UNAUTHENTICATED_MS;
			let idleTimer: NodeJS.Timeout | null = null;

			const resetIdle = () => {
				if (idleTimer) clearTimeout(idleTimer);
				idleTimer = setTimeout(() => {
					try {
						socket.close(1000, "Idle timeout");
					} catch (error) {
						logger.debug("Failed to close idle socket", {
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}, idleMs);
			};

			resetIdle();
			socket.on("message", resetIdle);

			// Heartbeat ping/pong
			const ws = socket as ExtendedWebSocket;
			ws.isAlive = true;
			socket.on("pong", () => {
				ws.isAlive = true;
				resetIdle();
			});

			socket.on("close", () => {
				if (idleTimer) {
					clearTimeout(idleTimer);
					idleTimer = null;
				}
			});

			socket.on("error", (err) => {
				logger.error("WebSocket error", err);
				if (idleTimer) {
					clearTimeout(idleTimer);
					idleTimer = null;
				}
			});
		});

		// Periodic ping to detect broken connections
		const interval = setInterval(() => {
			for (const client of wss.clients) {
				const ws = client as ExtendedWebSocket;
				if (ws.isAlive === false) {
					try {
						ws.terminate();
					} catch (error) {
						logger.debug("Failed to terminate dead connection", {
							error: error instanceof Error ? error.message : String(error),
						});
					}
					continue;
				}
				ws.isAlive = false;
				try {
					ws.ping();
				} catch (error) {
					logger.debug("Failed to ping connection", {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}, HEARTBEAT_INTERVAL_MS);

		wss.on("close", () => clearInterval(interval));

		wss.on("listening", () => {
			logger.info("WebSocket server listening", { port, host: "0.0.0.0" });
		});
		process.on("SIGTERM", () => {
			handler.broadcastReconnectNotification();
			wss.close();
		});
	}

	private createContextFromReq(req: IncomingMessage): Context {
		// Extract token using shared method
		const token = this.extractToken(req);

		let userId: string | null = null;
		if (token) {
			// Use JwtService for verification
			userId = this.jwtService.verify(token);
		} else {
			logger.debug("No JWT token provided");
		}
		return { userId, prisma: this.prisma, jwtSecret: this.jwtSecret };
	}
}
