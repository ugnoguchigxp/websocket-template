import { createContextLogger } from "@logger"
import type React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FaCheck, FaExclamationTriangle, FaQuestionCircle, FaTrash } from "react-icons/fa"
import Modal from "./Modal"

const log = createContextLogger("ConfirmModal")

interface ConfirmModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void | Promise<void>
	title: string
	message: string
	confirmText?: string
	cancelText?: string
	confirmButtonStyle?: "primary" | "danger" | "warning"
	icon?: "warning" | "danger" | "question"
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText,
	cancelText,
	confirmButtonStyle = "primary",
	icon = "question",
}) => {
	const { t } = useTranslation()
	const [isLoading, setIsLoading] = useState(false)

	const handleConfirm = async () => {
		setIsLoading(true)
		try {
			await onConfirm()
			onClose()
		} catch (error) {
			log.error("Confirm action failed", { error })
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancel = () => {
		if (!isLoading) {
			onClose()
		}
	}

	const getIcon = () => {
		switch (icon) {
			case "warning":
				return {
					icon: <FaExclamationTriangle className="w-8 h-8 text-yellow-600" />,
					bgColor: "bg-yellow-100",
					borderColor: "border-yellow-200",
				}
			case "danger":
				return {
					icon: <FaTrash className="w-8 h-8 text-red-600" />,
					bgColor: "bg-red-100",
					borderColor: "border-red-200",
				}
			default:
				return {
					icon: <FaQuestionCircle className="w-8 h-8 text-blue-600" />,
					bgColor: "bg-blue-100",
					borderColor: "border-blue-200",
				}
		}
	}

	const getConfirmButtonClasses = () => {
		const baseClasses =
			"px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"

		switch (confirmButtonStyle) {
			case "danger":
				return `${baseClasses} bg-red-600 text-white hover:bg-red-700`
			case "warning":
				return `${baseClasses} bg-yellow-600 text-white hover:bg-yellow-700`
			default:
				return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`
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
					<div className={`p-2 rounded-lg ${getIcon().bgColor}`}>{getIcon().icon}</div>
					<div className="flex-1">
						<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
					</div>
				</div>

				{/* Message */}
				<div className="text-gray-700 leading-relaxed">{message}</div>

				{/* Additional Warning for Danger Actions */}
				{confirmButtonStyle === "danger" && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-3">
						<div className="flex items-start space-x-2">
							<FaExclamationTriangle className="w-4 h-4 text-red-600 mt-0.5" />
							<div className="text-sm text-red-800">
								<p className="font-medium">この操作は取り消すことができません</p>
							</div>
						</div>
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
						type="button"
						onClick={handleConfirm}
						disabled={isLoading}
						className={getConfirmButtonClasses()}
					>
						{isLoading ? (
							<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
						) : (
							<FaCheck className="w-4 h-4" />
						)}
						<span>{confirmText || t("confirm")}</span>
					</button>
				</div>
			</div>
		</Modal>
	)
}

export default ConfirmModal
