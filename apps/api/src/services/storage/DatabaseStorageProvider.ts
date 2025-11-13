import type { PrismaClient } from "@prisma/client";
/**
 * Database Storage Provider
 * Fallback storage implementation using Prisma database
 */
import { inject, injectable } from "tsyringe";
import type { StorageFile, StorageProvider } from "./StorageProvider.js";

@injectable()
export class DatabaseStorageProvider implements StorageProvider {
	constructor(@inject("PrismaClient") private prisma: PrismaClient) {}

	async uploadFile(key: string, content: Buffer | string, metadata?: any): Promise<string> {
		const contentString = Buffer.isBuffer(content) ? content.toString("base64") : content;

		await this.prisma.storedContent.create({
			data: {
				key,
				content: contentString,
				metadata: JSON.stringify(metadata || {}),
				contentType: "application/octet-stream",
				size: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content),
			},
		});

		return key;
	}

	async downloadFile(key: string): Promise<Buffer> {
		const stored = await this.prisma.storedContent.findUnique({
			where: { key },
		});

		if (!stored) {
			throw new Error(`File not found: ${key}`);
		}

		// Try to detect if content is base64 encoded
		if (stored.contentType === "application/octet-stream") {
			try {
				return Buffer.from(stored.content, "base64");
			} catch {
				// If not base64, treat as regular string
				return Buffer.from(stored.content);
			}
		}

		return Buffer.from(stored.content);
	}

	async deleteFile(key: string): Promise<void> {
		await this.prisma.storedContent.deleteMany({
			where: { key },
		});
	}

	async listFiles(prefix?: string): Promise<StorageFile[]> {
		const files = await this.prisma.storedContent.findMany({
			where: prefix
				? {
						key: {
							startsWith: prefix,
						},
					}
				: undefined,
			orderBy: { createdAt: "desc" },
		});

		return files.map((file) => ({
			key: file.key,
			size: file.size,
			lastModified: file.updatedAt,
			metadata: JSON.parse(file.metadata),
		}));
	}

	async uploadMarkdown(key: string, content: string, metadata?: any): Promise<string> {
		await this.prisma.storedContent.create({
			data: {
				key,
				content,
				metadata: JSON.stringify(metadata || {}),
				contentType: "text/markdown",
				size: Buffer.byteLength(content),
			},
		});

		return key;
	}

	async downloadMarkdown(key: string): Promise<string> {
		const stored = await this.prisma.storedContent.findUnique({
			where: { key },
		});

		if (!stored) {
			throw new Error(`Markdown file not found: ${key}`);
		}

		return stored.content;
	}

	async uploadBinary(key: string, content: Buffer, metadata?: any): Promise<string> {
		return await this.uploadFile(key, content, metadata);
	}

	async downloadBinary(key: string): Promise<Buffer> {
		return await this.downloadFile(key);
	}
}
