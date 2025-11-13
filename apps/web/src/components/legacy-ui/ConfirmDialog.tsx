/**
 * ConfirmDialog Component
 * window.confirm() の代替となるモダンな確認ダイアログ
 */

import type React from "react"

import Modal from "./Modal"

export interface IConfirmDialogProps {
	isOpen: boolean
	title: string
	message: string
	confirmText?: string
	cancelText?: string
	onConfirm: () => void
	onCancel: () => void
	variant?: "default" | "danger"
}

/**
 * ConfirmDialog
 * 既存のModalコンポーネントを使用した確認ダイアログ
 */
export const ConfirmDialog: React.FC<IConfirmDialogProps> = ({
	isOpen,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
	variant = "default",
}) => {
	const handleConfirm = () => {
		onConfirm()
	}

	const handleCancel = () => {
		onCancel()
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleCancel}
			size="sm"
			closeOnBackdrop={false}
			closeOnEscape={true}
			showCloseButton={false}
		>
			<div className="p-6">
				{/* タイトル */}
				<h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>

				{/* メッセージ */}
				<p className="text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>

				{/* ボタン */}
				<div className="flex items-center justify-end gap-3">
					<button
						onClick={handleCancel}
						className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
					>
						{cancelText}
					</button>

					<button
						onClick={handleConfirm}
						className={`
              px-4 py-2 text-white rounded transition-colors
              ${
								variant === "danger"
									? "bg-red-600 hover:bg-red-700"
									: "bg-primary hover:bg-primary-dark"
							}
            `}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</Modal>
	)
}

export default ConfirmDialog
