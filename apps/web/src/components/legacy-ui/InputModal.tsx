import type React from "react"
import { useEffect, useState } from "react"

import { useTranslation } from "react-i18next"
import { FaCheck, FaEdit, FaTimes } from "react-icons/fa"

import Modal from "./Modal"

interface InputModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: (value: string) => void
	title: string
	placeholder?: string
	initialValue?: string
	confirmText?: string
	cancelText?: string
	maxLength?: number
	required?: boolean
	type?: "text" | "email" | "password"
	validation?: (value: string) => string | null // Returns error message or null
}

export const InputModal: React.FC<InputModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	placeholder = "",
	initialValue = "",
	confirmText,
	cancelText,
	maxLength = 255,
	required = true,
	type = "text",
	validation,
}) => {
	const { t } = useTranslation()
	const [value, setValue] = useState(initialValue)
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	// Reset form when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setValue(initialValue)
			setError(null)
			setIsLoading(false)
		}
	}, [isOpen, initialValue])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		// Reset error
		setError(null)

		// Required validation
		if (required && !value.trim()) {
			setError(t("fieldIsRequired"))
			return
		}

		// Custom validation
		if (validation) {
			const validationError = validation(value.trim())
			if (validationError) {
				setError(validationError)
				return
			}
		}

		setIsLoading(true)
		try {
			await onConfirm(value.trim())
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
					<div className="p-2 bg-blue-50 rounded-lg">
						<FaEdit className="w-5 h-5 text-blue-600" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					{/* Input Field */}
					<div className="space-y-2">
						<input
							type={type}
							value={value}
							onChange={e => setValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={placeholder}
							maxLength={maxLength}
							className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
								error
									? "border-red-300 focus:ring-red-500 focus:border-red-500"
									: "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
							}`}
							disabled={isLoading}
						/>

						{/* Character count */}
						{maxLength && (
							<div className="text-right text-xs text-gray-500">
								{value.length}/{maxLength}
							</div>
						)}

						{/* Error message */}
						{error && (
							<div className="text-sm text-red-600 flex items-center space-x-1">
								<FaTimes className="w-3 h-3" />
								<span>{error}</span>
							</div>
						)}
					</div>

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
							disabled={isLoading || (required && !value.trim())}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
						>
							{isLoading ? (
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<FaCheck className="w-4 h-4" />
							)}
							<span>{confirmText || t("confirm")}</span>
						</button>
					</div>
				</form>
			</div>
		</Modal>
	)
}

export default InputModal
