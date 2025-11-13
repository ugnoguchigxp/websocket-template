import type React from "react"
import { useEffect, useState } from "react"

import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { FaCheck, FaFolder, FaTimes } from "react-icons/fa"

import Modal from "./Modal"

interface DirectoryInputModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: (physicalName: string, displayName: string) => void
	title: string
	confirmText?: string
	cancelText?: string
	maxLength?: number
}

export const DirectoryInputModal: React.FC<DirectoryInputModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	confirmText,
	cancelText,
	maxLength = 255,
}) => {
	const { t } = useTranslation()
	const [physicalName, setPhysicalName] = useState("")
	const [displayName, setDisplayName] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	// Reset form when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setPhysicalName("")
			setDisplayName("")
			setError(null)
			setIsLoading(false)
		}
	}, [isOpen])

	const validatePhysicalName = (name: string): string | null => {
		if (!name.trim()) {
			return "Physical name is required"
		}

		// Only allow English letters, numbers, and hyphens
		const validPattern = /^[a-zA-Z0-9\-]+$/
		if (!validPattern.test(name)) {
			return "Physical name can only contain English letters, numbers, and hyphens"
		}

		return null
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		// Reset error
		setError(null)

		// Validate physical name
		const physicalError = validatePhysicalName(physicalName)
		if (physicalError) {
			setError(physicalError)
			return
		}

		// Display name is required
		if (!displayName.trim()) {
			setError("Display name is required")
			return
		}

		setIsLoading(true)
		try {
			await onConfirm(physicalName.trim(), displayName.trim())
			onClose()
		} catch (error) {
			setError(error instanceof Error ? error.message : t("unexpectedError"))
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancel = () => {
		if (!isLoading) {
			onClose()
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleCancel}
			draggable={true}
			size="auto"
			className="max-w-md w-96"
		>
			<div className="p-4 space-y-3">
				{/* Header with Icon and Title */}
				<div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
					<div className="p-2 bg-green-50 rounded-lg">
						<FaFolder className="w-5 h-5 text-green-600" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					{/* Physical Name Field */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700">
							Physical Name (英語のみ)
						</label>
						<input
							type="text"
							value={physicalName}
							onChange={e => setPhysicalName(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="my-directory"
							maxLength={maxLength}
							className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
								error && validatePhysicalName(physicalName)
									? "border-red-300 focus:ring-red-500 focus:border-red-500"
									: "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
							}`}
							disabled={isLoading}
						/>
						<div className="text-xs text-gray-500">英語、数字、ハイフンのみ使用可能</div>
					</div>

					{/* Display Name Field */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700">Display Name (表示名)</label>
						<input
							type="text"
							value={displayName}
							onChange={e => setDisplayName(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="マイディレクトリ"
							maxLength={maxLength}
							className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
								error && !displayName.trim() && physicalName.trim()
									? "border-red-300 focus:ring-red-500 focus:border-red-500"
									: "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
							}`}
							disabled={isLoading}
						/>
						<div className="text-xs text-gray-500">日本語や任意の文字が使用可能</div>
					</div>

					{/* Character count */}
					<div className="text-right text-xs text-gray-500">
						物理名: {physicalName.length}/{maxLength} | 表示名: {displayName.length}/{maxLength}
					</div>

					{/* Error message */}
					{error && (
						<div className="text-sm text-red-600 flex items-center space-x-1">
							<FaTimes className="w-3 h-3" />
							<span>{error}</span>
						</div>
					)}

					{/* Buttons */}
					<div className="flex justify-end space-x-2">
						<button
							type="button"
							onClick={handleCancel}
							disabled={isLoading}
							className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{cancelText || t("cancel")}
						</button>

						<button
							type="submit"
							disabled={isLoading || !physicalName.trim() || !displayName.trim()}
							className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
						>
							{isLoading ? (
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<FaCheck className="w-4 h-4" />
							)}
							<span>{confirmText || t("create")}</span>
						</button>
					</div>
				</form>
			</div>
		</Modal>
	)
}

export default DirectoryInputModal
