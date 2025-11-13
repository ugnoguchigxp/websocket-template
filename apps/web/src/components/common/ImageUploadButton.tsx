/**
 * ImageUploadButton - 画像アップロード機能付きボタンコンポーネント
 *
 * ファイルアップロードページと同様の機能を持つ再利用可能なコンポーネント
 */

import type React from "react"
import { useCallback, useRef, useState } from "react"

import { FiUpload, FiX } from "react-icons/fi"

import { createContextLogger } from "@/modules/logger"

import { Button } from "@/components/ui/Button"
import { useMessage } from "@/contexts/MessageContext"
import { useFileUpload } from "@/services/upload"
import type { UploadOptions } from "@/types/upload"

const log = createContextLogger("ImageUploadButton")

interface ImageUploadButtonProps {
	onUploadComplete?: (markdownImageUrl: string) => void
	className?: string
	disabled?: boolean
	title?: string
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
	onUploadComplete,
	className = "",
	disabled = false,
	title = "画像アップロード",
}) => {
	const { showToast } = useMessage()
	const [isUploading, setIsUploading] = useState(false)
	const [showModal, setShowModal] = useState(false)
	const [selectedFiles, setSelectedFiles] = useState<File[]>([])
	const fileInputRef = useRef<HTMLInputElement>(null)

	// Upload hooks
	const uploadMutation = useFileUpload()

	// アップロードオプション（画像のみ許可）
	const uploadOptions: UploadOptions = {
		allowedTypes: ["no_documents", "no_videos"], // 画像のみ許可
		filenameFormat: "base62_with_extension",
		maxFileSize: 20 * 1024 * 1024, // 20MB
		imageResize: {
			enabled: true,
			quality: 85,
		},
	}

	// ファイル選択ハンドラー
	const handleFilesSelected = useCallback(
		(files: File[]) => {
			// 画像ファイルのみフィルタリング
			const imageFiles = files.filter(file => file.type.startsWith("image/"))

			if (imageFiles.length === 0) {
				showToast({
					message: "画像ファイルを選択してください",
					type: "error",
					duration: 3000,
				})
				return
			}

			if (imageFiles.length !== files.length) {
				showToast({
					message: `${files.length - imageFiles.length}個の非画像ファイルがスキップされました`,
					type: "warning",
					duration: 3000,
				})
			}

			setSelectedFiles(imageFiles)
		},
		[showToast]
	)

	// ファイル選択トリガー
	const triggerFileSelect = useCallback(() => {
		if (fileInputRef.current) {
			fileInputRef.current.click()
		}
	}, [])

	// アップロード処理
	const handleUpload = useCallback(async () => {
		if (selectedFiles.length === 0) {
			showToast({
				message: "アップロードする画像を選択してください",
				type: "error",
				duration: 3000,
			})
			return
		}

		setIsUploading(true)

		try {
			const result = await uploadMutation.mutateAsync({
				files: selectedFiles,
				options: uploadOptions,
			})

			if (result.success && result.files.length > 0) {
				// 最初にアップロードされた画像の調整済みMarkdown URLを取得
				const firstFile = result.files[0]

				if (firstFile?.markdownImage) {
					const markdownImageUrl = firstFile.markdownImage

					log.info("Upload successful", {
						filename: firstFile.filename,
						markdownImageUrl,
						url: firstFile.url,
					})

					// 親コンポーネントにMarkdown画像URLを通知
					if (onUploadComplete) {
						onUploadComplete(markdownImageUrl)
					}
				}

				showToast({
					message: `${result.files.length}個の画像をアップロードしました`,
					type: "success",
					duration: 3000,
				})

				// リセット
				setSelectedFiles([])
				setShowModal(false)
			} else {
				showToast({
					message: "アップロードに失敗しました",
					type: "error",
					duration: 5000,
				})
			}
		} catch (error) {
			log.error("Upload error", { error })
			showToast({
				message: `アップロードエラー: ${error instanceof Error ? error.message : "Unknown error"}`,
				type: "error",
				duration: 5000,
			})
		} finally {
			setIsUploading(false)
		}
	}, [selectedFiles, uploadMutation, onUploadComplete, showToast])

	// ドラッグ&ドロップハンドラー
	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			const files = Array.from(e.dataTransfer.files)
			handleFilesSelected(files)
		},
		[handleFilesSelected]
	)

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
	}, [])

	return (
		<>
			{/* メインボタン */}
			<div className="relative group">
				<button
					type="button"
					onClick={() => setShowModal(true)}
					disabled={disabled || isUploading}
					className={`w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
				>
					<FiUpload className="w-4 h-4" />
				</button>
				{/* カスタムtooltip */}
				<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
					{title}
					<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800" />
				</div>
			</div>

			{/* 隠しファイル入力 */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept="image/*"
				onChange={e => {
					const files = Array.from(e.target.files || [])
					handleFilesSelected(files)
					// 同じファイルを再選択可能にするためリセット
					e.target.value = ""
				}}
				className="hidden"
			/>

			{/* アップロードモーダル */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 border">
						<div className="p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-lg font-semibold">画像アップロード</h2>
								<Button
									onClick={() => {
										setShowModal(false)
										setSelectedFiles([])
									}}
									className="p-1 text-gray-400 hover:text-gray-600"
									aria-label="閉じる"
								>
									<FiX size={20} />
								</Button>
							</div>

							{/* ドロップゾーン */}
							<div
								className="relative p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer"
								onClick={triggerFileSelect}
								onDrop={handleDrop}
								onDragOver={handleDragOver}
								onDragEnter={handleDragOver}
							>
								<div className="text-center">
									<FiUpload className="mx-auto mb-3 text-gray-400" size={32} />
									<p className="text-sm text-gray-600 mb-1">画像をドラッグ&ドロップ</p>
									<p className="text-xs text-gray-500">またはクリックして画像を選択</p>
									<p className="text-xs text-gray-400 mt-2">JPG, PNG, GIF, WebP (最大20MB)</p>
								</div>
							</div>

							{/* 選択されたファイル一覧 */}
							{selectedFiles.length > 0 && (
								<div className="mt-4">
									<p className="text-sm font-medium text-gray-700 mb-2">選択された画像:</p>
									<div className="space-y-1">
										{selectedFiles.map((file, index) => (
											<div
												key={index}
												className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded flex items-center justify-between"
											>
												<span>{file.name}</span>
												<span className="text-gray-400">
													{(file.size / 1024 / 1024).toFixed(1)}MB
												</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* アクションボタン */}
							{selectedFiles.length > 0 && (
								<div className="mt-4 flex justify-end space-x-3">
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
										{isUploading ? (
											<>
												<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
												<span>アップロード中...</span>
											</>
										) : (
											<>
												<FiUpload size={14} />
												<span>アップロード</span>
											</>
										)}
									</Button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	)
}
