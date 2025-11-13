/**
 * Enhanced Monitoring and Metrics Collection
 * Production-ready monitoring for all services
 */

export interface ServiceMetrics {
	name: string;
	status: "healthy" | "degraded" | "unhealthy";
	uptime: number;
	memoryUsage: number;
	cpuUsage?: number;
	requestCount: number;
	errorCount: number;
	averageResponseTime: number;
	lastError?: string;
	lastErrorTime?: Date;
	customMetrics?: Record<string, unknown>;
}

export interface HealthCheckResult {
	status: "healthy" | "degraded" | "unhealthy";
	services: ServiceMetrics[];
	timestamp: Date;
	uptime: number;
	version: string;
	environment: string;
}

export class MonitoringService {
	private metrics = new Map<string, ServiceMetrics>();
	private requestCounts = new Map<string, number>();
	private responseTimes = new Map<string, number[]>();
	private errorCounts = new Map<string, number>();
	private startTime = Date.now();

	// Configuration
	private readonly maxResponseTimeSamples = 1000;
	private readonly healthCheckInterval = 30 * 1000; // 30 seconds
	private healthCheckIntervalId?: NodeJS.Timeout;

	constructor() {
		this.startPeriodicHealthChecks();
	}

	/**
	 * Register a service for monitoring
	 */
	registerService(name: string): void {
		this.metrics.set(name, {
			name,
			status: "healthy",
			uptime: 0,
			memoryUsage: 0,
			requestCount: 0,
			errorCount: 0,
			averageResponseTime: 0,
			customMetrics: {},
		});

		this.requestCounts.set(name, 0);
		this.responseTimes.set(name, []);
		this.errorCounts.set(name, 0);

		console.log(`[Monitoring] Service registered: ${name}`);
	}

	/**
	 * Record a request for a service
	 */
	recordRequest(serviceName: string, responseTime: number, error?: Error): void {
		// Update request count
		const currentCount = this.requestCounts.get(serviceName) || 0;
		this.requestCounts.set(serviceName, currentCount + 1);

		// Update response times
		const times = this.responseTimes.get(serviceName) || [];
		times.push(responseTime);

		// Keep only recent samples
		if (times.length > this.maxResponseTimeSamples) {
			times.shift();
		}
		this.responseTimes.set(serviceName, times);

		// Update error count if applicable
		if (error) {
			const currentErrors = this.errorCounts.get(serviceName) || 0;
			this.errorCounts.set(serviceName, currentErrors + 1);
		}

		// Update service metrics
		this.updateServiceMetrics(serviceName);
	}

	/**
	 * Update service metrics
	 */
	private updateServiceMetrics(serviceName: string): void {
		const metrics = this.metrics.get(serviceName);
		if (!metrics) return;

		const requestCount = this.requestCounts.get(serviceName) || 0;
		const errorCount = this.errorCounts.get(serviceName) || 0;
		const responseTimes = this.responseTimes.get(serviceName) || [];

		// Calculate average response time
		const averageResponseTime =
			responseTimes.length > 0
				? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
				: 0;

		// Determine status based on error rate and response time
		const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
		let status: "healthy" | "degraded" | "unhealthy" = "healthy";

		if (errorRate > 0.1 || averageResponseTime > 5000) {
			status = "unhealthy";
		} else if (errorRate > 0.05 || averageResponseTime > 2000) {
			status = "degraded";
		}

		// Update metrics
		metrics.uptime = Date.now() - this.startTime;
		metrics.requestCount = requestCount;
		metrics.errorCount = errorCount;
		metrics.averageResponseTime = averageResponseTime;
		metrics.status = status;
		metrics.memoryUsage = this.getMemoryUsage();
		metrics.cpuUsage = this.getCPUUsage();

		this.metrics.set(serviceName, metrics);
	}

	/**
	 * Get service metrics
	 */
	getServiceMetrics(serviceName: string): ServiceMetrics | null {
		return this.metrics.get(serviceName) || null;
	}

	/**
	 * Get all service metrics
	 */
	getAllMetrics(): ServiceMetrics[] {
		return Array.from(this.metrics.values());
	}

	/**
	 * Perform comprehensive health check
	 */
	async performHealthCheck(): Promise<HealthCheckResult> {
		const services = this.getAllMetrics();

		// Update all metrics before health check
		for (const service of services) {
			this.updateServiceMetrics(service.name);
		}

		// Determine overall status
		const hasUnhealthy = services.some((s) => s.status === "unhealthy");
		const hasDegraded = services.some((s) => s.status === "degraded");

		const overallStatus = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";

		return {
			status: overallStatus,
			services,
			timestamp: new Date(),
			uptime: Date.now() - this.startTime,
			version: process.env.npm_package_version || "1.0.0",
			environment: process.env.NODE_ENV || "development",
		};
	}

	/**
	 * Get memory usage
	 */
	private getMemoryUsage(): number {
		const usage = process.memoryUsage();
		return usage.heapUsed;
	}

	/**
	 * Get CPU usage (simplified)
	 */
	private getCPUUsage(): number {
		const usage = process.cpuUsage();
		return (usage.user + usage.system) / 1000000; // Convert to milliseconds
	}

	/**
	 * Start periodic health checks
	 */
	private startPeriodicHealthChecks(): void {
		this.healthCheckIntervalId = setInterval(async () => {
			try {
				const healthCheck = await this.performHealthCheck();

				if (healthCheck.status !== "healthy") {
					console.warn("[Monitoring] Health check warning:", {
						status: healthCheck.status,
						services: healthCheck.services.filter((s) => s.status !== "healthy").length,
					});
				}
			} catch (error) {
				console.error("[Monitoring] Health check failed:", error);
			}
		}, this.healthCheckInterval);
	}

	/**
	 * Get performance statistics
	 */
	getPerformanceStats(): {
		totalRequests: number;
		totalErrors: number;
		overallErrorRate: number;
		averageResponseTime: number;
		servicesCount: number;
		uptime: number;
	} {
		const services = this.getAllMetrics();
		const totalRequests = services.reduce((sum, s) => sum + s.requestCount, 0);
		const totalErrors = services.reduce((sum, s) => sum + s.errorCount, 0);
		const overallErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

		const allResponseTimes = Array.from(this.responseTimes.values()).flat();
		const averageResponseTime =
			allResponseTimes.length > 0
				? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
				: 0;

		return {
			totalRequests,
			totalErrors,
			overallErrorRate,
			averageResponseTime,
			servicesCount: services.length,
			uptime: Date.now() - this.startTime,
		};
	}

	/**
	 * Reset metrics for a service
	 */
	resetServiceMetrics(serviceName: string): void {
		this.requestCounts.set(serviceName, 0);
		this.responseTimes.set(serviceName, []);
		this.errorCounts.set(serviceName, 0);

		const metrics = this.metrics.get(serviceName);
		if (metrics) {
			metrics.requestCount = 0;
			metrics.errorCount = 0;
			metrics.averageResponseTime = 0;
			metrics.status = "healthy";
			metrics.lastError = undefined;
			metrics.lastErrorTime = undefined;
		}
	}

	/**
	 * Reset all metrics
	 */
	resetAllMetrics(): void {
		for (const serviceName of this.metrics.keys()) {
			this.resetServiceMetrics(serviceName);
		}
		this.startTime = Date.now();
	}

	/**
	 * Export metrics in Prometheus format
	 */
	exportPrometheusMetrics(): string {
		const metrics: string[] = [];
		const timestamp = Date.now();

		// Service metrics
		for (const service of this.getAllMetrics()) {
			metrics.push("# HELP service_requests_total Total number of requests for service");
			metrics.push("# TYPE service_requests_total counter");
			metrics.push(
				`service_requests_total{service="${service.name}"} ${service.requestCount} ${timestamp}`
			);

			metrics.push("# HELP service_errors_total Total number of errors for service");
			metrics.push("# TYPE service_errors_total counter");
			metrics.push(
				`service_errors_total{service="${service.name}"} ${service.errorCount} ${timestamp}`
			);

			metrics.push("# HELP service_response_time_ms Average response time for service");
			metrics.push("# TYPE service_response_time_ms gauge");
			metrics.push(
				`service_response_time_ms{service="${service.name}"} ${service.averageResponseTime} ${timestamp}`
			);

			metrics.push("# HELP service_memory_bytes Memory usage for service");
			metrics.push("# TYPE service_memory_bytes gauge");
			metrics.push(
				`service_memory_bytes{service="${service.name}"} ${service.memoryUsage} ${timestamp}`
			);

			metrics.push(
				"# HELP service_status Status of service (1=healthy, 0.5=degraded, 0=unhealthy)"
			);
			metrics.push("# TYPE service_status gauge");
			const statusValue =
				service.status === "healthy" ? 1 : service.status === "degraded" ? 0.5 : 0;
			metrics.push(`service_status{service="${service.name}"} ${statusValue} ${timestamp}`);
		}

		// System metrics
		const perfStats = this.getPerformanceStats();
		metrics.push("# HELP system_uptime_seconds System uptime in seconds");
		metrics.push("# TYPE system_uptime_seconds gauge");
		metrics.push(`system_uptime_seconds ${perfStats.uptime / 1000} ${timestamp}`);

		return `${metrics.join("\n")}\n`;
	}

	/**
	 * Shutdown monitoring service
	 */
	shutdown(): void {
		if (this.healthCheckIntervalId) {
			clearInterval(this.healthCheckIntervalId);
		}
		console.log("[Monitoring] Service shutdown complete");
	}
}

/**
 * Global monitoring instance
 */
export const monitoring = new MonitoringService();

/**
 * Middleware for monitoring tRPC procedures
 */
export function createMonitoringMiddleware(serviceName: string) {
	return async (next: () => Promise<unknown>) => {
		const startTime = Date.now();
		let error: Error | undefined;

		try {
			const result = await next();
			return result;
		} catch (err) {
			error = err instanceof Error ? err : new Error(String(err));
			throw error;
		} finally {
			const responseTime = Date.now() - startTime;
			monitoring.recordRequest(serviceName, responseTime, error);
		}
	};
}

/**
 * Health check endpoint handler
 */
export async function handleHealthCheck(): Promise<HealthCheckResult> {
	return await monitoring.performHealthCheck();
}

/**
 * Metrics endpoint handler (Prometheus format)
 */
export async function handleMetrics(): Promise<string> {
	return monitoring.exportPrometheusMetrics();
}
