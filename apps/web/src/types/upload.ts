/**
 * Upload types - Stub for proper implementation
 */

export interface UploadOptions {
	file: File
	onProgress?: (progress: number) => void
}

export interface UploadResult {
	url: string
	filename: string
}
