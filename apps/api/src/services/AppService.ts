import { inject, injectable } from "tsyringe";
import type { IEnvironmentService } from "../interfaces/IAppService.js";
import type { IDbInitializer } from "../interfaces/IDbService.js";
import { logger } from "../modules/logger/core/logger.js";

@injectable()
export class AppService {
	constructor(
		@inject("EnvironmentService") private environmentService: IEnvironmentService,
		@inject("DbInitializer") private dbInitializer: IDbInitializer
	) {}

	async start(): Promise<void> {
		try {
			// Load and validate environment
			this.environmentService.loadEnvironment();
			this.environmentService.validateEnvironment();

			// Initialize database
			await this.dbInitializer.initialize();

			// Import and start server after environment is ready
			const { ServerApp } = await import("../core/server/index.js");
			const { container } = await import("tsyringe");
			const app = container.resolve(ServerApp);
			await app.start(this.environmentService.getPort());
		} catch (e) {
			logger.error("Fatal error during startup", e as Error);
			process.exit(1);
		}
	}
}
