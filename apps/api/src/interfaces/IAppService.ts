export interface IEnvironmentService {
	loadEnvironment(): Record<string, string>;
	validateEnvironment(): void;
	getPort(): number;
	getJwtSecret(): string;
}

export interface IAppService {
	start(): Promise<void>;
}
