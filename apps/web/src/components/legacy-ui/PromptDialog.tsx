/**
 * PromptDialog Component
 * window.prompt() の代替となるモダンな入力ダイアログ
 */

import type React from "react"
import { useEffect, useRef, useState } from "react"

import Modal from "./Modal"

export interface IPromptDialogProps {
	isOpen: boolean
	title: string
	message: string
	defaultValue?: string
	placeholder?: string
	confirmText?: string
	cancelText?: string
	onConfirm: (value: string) => void
	onCancel: () => void
}

/**
 * PromptDialog
 * 既存のModalコンポーネントを使用した入力ダイアログ
 */
export const PromptDialog: React.FC<IPromptDialogProps> = ({
	isOpen,
	title,
	message,
	defaultValue = "",
	placeholder = "",
	confirmText = "OK",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
}) => {
	const [value, setValue] = useState(defaultValue)
	const inputRef = useRef<HTMLInputElement>(null)

	// ダイアログが開かれたときにinputにフォーカス
	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isOpen])

	// defaultValueが変更されたら値をリセット
	useEffect(() => {
		setValue(defaultValue)
	}, [defaultValue])

	const handleConfirm = () => {
		onConfirm(value.trim())
	}

	const handleCancel = () => {
		onCancel()
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault()
			handleConfirm()
		}
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
				<p className="text-gray-600 mb-4">{message}</p>

				{/* 入力フィールド */}
				<input
					ref={inputRef}
					type="text"
					value={value}
					onChange={e => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary mb-6"
				/>

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
						disabled={!value.trim()}
						className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{confirmText}
					</button>
				</div>
			</div>
		</Modal>
	)
}

export default PromptDialog
