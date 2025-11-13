/**
 * Stub File Upload Service - Placeholder for proper implementation
 */

import { createContextLogger } from "@/modules/logger"
import { useMutation } from "@tanstack/react-query"

const log = createContextLogger("UploadService")

export interface UploadOptions {
	file: File
	onProgress?: (progress: number) => void
}

export interface UploadResult {
	url: string
	filename: string
}

/**
 * File upload hook - Stub implementation
 */
export function useFileUpload() {
	const uploadMutation = useMutation({
		mutationFn: async (options: UploadOptions): Promise<UploadResult> => {
			log.info("Upload requested (stub)", { filename: options.file.name })

			// TODO: Implement actual file upload via tRPC
			return {
				url: URL.createObjectURL(options.file),
				filename: options.file.name,
			}
		},
	})

	return {
		upload: uploadMutation.mutateAsync,
		isUploading: uploadMutation.isPending,
		error: uploadMutation.error,
	}
}
