/**
 * Storage Provider Interface
 * Abstract storage operations for different backends (local, S3, Azure, etc.)
 */
export interface StorageProvider {
	// File operations
	uploadFile(key: string, content: Buffer | string, metadata?: any): Promise<string>;
	downloadFile(key: string): Promise<Buffer>;
	deleteFile(key: string): Promise<void>;
	listFiles(prefix?: string): Promise<StorageFile[]>;

	// Markdown operations
	uploadMarkdown(key: string, content: string, metadata?: any): Promise<string>;
	downloadMarkdown(key: string): Promise<string>;

	// Binary operations
	uploadBinary(key: string, content: Buffer, metadata?: any): Promise<string>;
	downloadBinary(key: string): Promise<Buffer>;
}

export interface StorageFile {
	key: string;
	size: number;
	lastModified: Date;
	metadata?: any;
}

export interface StorageConfig {
	type: "local" | "s3" | "azure" | "database";
	[key: string]: any;
}
