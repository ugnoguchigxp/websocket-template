import * as path from "path";
/**
 * Local File System Storage Provider
 * Development and testing storage implementation
 */
import * as fs from "fs/promises";
import { injectable } from "tsyringe";
import type { StorageFile, StorageProvider } from "./StorageProvider.js";

@injectable()
export class LocalFileSystemProvider implements StorageProvider {
	private basePath: string;

	constructor(basePath = "./storage") {
		this.basePath = path.resolve(basePath);
		this.ensureDirectoryExists(this.basePath);
	}

	private async ensureDirectoryExists(dirPath: string): Promise<void> {
		try {
			await fs.access(dirPath);
		} catch {
			await fs.mkdir(dirPath, { recursive: true });
		}
	}

	private getFullPath(key: string): string {
		// Sanitize key to prevent directory traversal
		const sanitizedKey = key.replace(/\.\./g, "").replace(/\\/g, "/");
		return path.join(this.basePath, sanitizedKey);
	}

	async uploadFile(key: string, content: Buffer | string, metadata?: any): Promise<string> {
		const filePath = this.getFullPath(key);
		const dirPath = path.dirname(filePath);

		await this.ensureDirectoryExists(dirPath);

		const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
		await fs.writeFile(filePath, buffer);

		// Store metadata in a separate file
		if (metadata) {
			const metadataPath = `${filePath}.meta`;
			await fs.writeFile(metadataPath, JSON.stringify(metadata));
		}

		return filePath;
	}

	async downloadFile(key: string): Promise<Buffer> {
		const filePath = this.getFullPath(key);

		try {
			return await fs.readFile(filePath);
		} catch (_error) {
			throw new Error(`File not found: ${key}`);
		}
	}

	async deleteFile(key: string): Promise<void> {
		const filePath = this.getFullPath(key);
		const metadataPath = `${filePath}.meta`;

		try {
			await fs.unlink(filePath);
		} catch {
			// Ignore if file doesn't exist
		}

		try {
			await fs.unlink(metadataPath);
		} catch {
			// Ignore if metadata file doesn't exist
		}
	}

	async listFiles(prefix?: string): Promise<StorageFile[]> {
		const searchPath = prefix ? this.getFullPath(prefix) : this.basePath;

		try {
			const files: StorageFile[] = [];
			const entries = await fs.readdir(searchPath, { withFileTypes: true });

			for (const entry of entries) {
				if (entry.isFile() && !entry.name.endsWith(".meta")) {
					const fullPath = path.join(searchPath, entry.name);
					const stats = await fs.stat(fullPath);

					// Try to read metadata
					let metadata;
					try {
						const metadataPath = `${fullPath}.meta`;
						const metadataContent = await fs.readFile(metadataPath, "utf-8");
						metadata = JSON.parse(metadataContent);
					} catch {
						// No metadata available
					}

					files.push({
						key: path.relative(this.basePath, fullPath),
						size: stats.size,
						lastModified: stats.mtime,
						metadata,
					});
				}
			}

			return files;
		} catch (_error) {
			throw new Error(`Failed to list files: ${prefix || "root"}`);
		}
	}

	async uploadMarkdown(key: string, content: string, metadata?: any): Promise<string> {
		return await this.uploadFile(key, content, metadata);
	}

	async downloadMarkdown(key: string): Promise<string> {
		const buffer = await this.downloadFile(key);
		return buffer.toString("utf-8");
	}

	async uploadBinary(key: string, content: Buffer, metadata?: any): Promise<string> {
		return await this.uploadFile(key, content, metadata);
	}

	async downloadBinary(key: string): Promise<Buffer> {
		return await this.downloadFile(key);
	}
}
