export interface IEnvironmentService {
	loadEnvironment(): Record<string, string>;
	validateEnvironment(): void;
	getPort(): number;
}

export interface IAppService {
	start(): Promise<void>;
}
