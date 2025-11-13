/**
 * Storage Factory
 * Creates appropriate storage provider based on configuration
 */
import { container } from "tsyringe";
import { DatabaseStorageProvider } from "./DatabaseStorageProvider.js";
import { LocalFileSystemProvider } from "./LocalFileSystemProvider.js";
import type { StorageConfig, StorageProvider } from "./StorageProvider.js";

export class StorageFactory {
	static createProvider(config?: StorageConfig): StorageProvider {
		const storageType = config?.type || process.env.STORAGE_TYPE || "local";

		switch (storageType) {
			case "local": {
				const basePath = config?.basePath || process.env.LOCAL_STORAGE_PATH || "./storage";
				return new LocalFileSystemProvider(basePath);
			}

			case "database":
				// Use dependency injection for PrismaClient
				return container.resolve(DatabaseStorageProvider);

			case "s3":
				// TODO: Implement S3 provider
				throw new Error("S3 storage provider not yet implemented");

			case "azure":
				// TODO: Implement Azure Blob Storage provider
				throw new Error("Azure storage provider not yet implemented");

			default:
				throw new Error(`Unsupported storage type: ${storageType}`);
		}
	}

	static registerDefaultProvider(): void {
		const provider = StorageFactory.createProvider();
		container.registerInstance<StorageProvider>("StorageProvider", provider);
	}
}
