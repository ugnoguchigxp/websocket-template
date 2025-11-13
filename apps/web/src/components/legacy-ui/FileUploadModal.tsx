import type React from "react"
import { useCallback, useState } from "react"

import { FiUpload, FiX } from "react-icons/fi"

import { useMessage } from "@/contexts/MessageContext"
import Button from "./Button"

interface FileUploadModalProps {
	isOpen: boolean
	onClose: () => void
	onUpload: (files: File[]) => Promise<boolean>
	title?: string
	acceptedFileTypes?: string
	multiple?: boolean
	isUploading?: boolean
	description?: string
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
	isOpen,
	onClose,
	onUpload,
	title = "ファイルアップロード",
	acceptedFileTypes,
	multiple = true,
	isUploading = false,
	description = "ファイルをドラッグ&ドロップ",
}) => {
	const { showToast } = useMessage()
	const [selectedFiles, setSelectedFiles] = useState<File[]>([])

	// ファイル選択ハンドラー
	const handleFilesAccepted = useCallback((files: File[]) => {
		setSelectedFiles(files)
	}, [])

	// アップロード処理
	const handleUpload = async () => {
		if (selectedFiles.length === 0) {
			showToast({
				id: crypto.randomUUID(),
				message: "アップロードするファイルを選択してください",
				type: "error",
				duration: 3000,
			})
			return
		}

		try {
			const success = await onUpload(selectedFiles)
			if (success) {
				setSelectedFiles([])
				onClose()
			}
		} catch (error) {
			showToast({
				id: crypto.randomUUID(),
				message: `アップロードエラー: ${error instanceof Error ? error.message : "Unknown error"}`,
				type: "error",
				duration: 5000,
			})
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-6">
			<div className="bg-white rounded-lg shadow-lg max-w-sm w-full border max-h-[500px] flex flex-col overflow-hidden">
				<div className="flex-1 flex flex-col min-h-0">
					<div className="px-6 py-4 border-b">
						<div className="flex justify-between items-center">
							<h2 className="text-lg font-semibold">{title}</h2>
							<Button
								onClick={() => {
									setSelectedFiles([])
									onClose()
								}}
								className="p-1 text-gray-400 hover:text-gray-600"
								aria-label="閉じる"
							>
								<FiX size={20} />
							</Button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto px-6 py-4">
						{/* 統合されたドロップゾーン */}
						<div
							className="relative p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer"
							onClick={() => {
								const input = document.createElement("input")
								input.type = "file"
								input.multiple = multiple
								if (acceptedFileTypes) {
									input.accept = acceptedFileTypes
								}
								input.onchange = e => {
									const files = Array.from((e.target as HTMLInputElement).files || [])
									handleFilesAccepted(files)
								}
								input.click()
							}}
							onDrop={e => {
								e.preventDefault()
								const files = Array.from(e.dataTransfer.files)
								handleFilesAccepted(files)
							}}
							onDragOver={e => {
								e.preventDefault()
							}}
							onDragEnter={e => {
								e.preventDefault()
							}}
						>
							<div className="text-center">
								<FiUpload className="mx-auto mb-3 text-gray-400" size={32} />
								<p className="text-sm text-gray-600 mb-1">{description}</p>
								<p className="text-xs text-gray-500">またはクリックしてファイルを選択</p>
							</div>
						</div>

						{/* 選択されたファイル一覧 */}
						{selectedFiles.length > 0 && (
							<div className="mt-4">
								<p className="text-sm font-medium text-gray-700 mb-2">選択されたファイル:</p>
								<div className="max-h-32 overflow-y-auto space-y-1">
									{selectedFiles.map((file, index) => (
										<div
											key={index}
											className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
										>
											{file.name}
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{selectedFiles.length > 0 && (
						<div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
							<Button
								onClick={() => setSelectedFiles([])}
								className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
								disabled={isUploading}
							>
								クリア
							</Button>
							<Button
								onClick={handleUpload}
								disabled={isUploading || selectedFiles.length === 0}
								className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
							>
								<FiUpload size={14} />
								<span>{isUploading ? "アップロード中..." : "アップロード"}</span>
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default FileUploadModal
