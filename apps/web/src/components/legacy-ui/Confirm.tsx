/**
 * Confirm Dialog Component
 *
 * A reusable confirmation dialog with:
 * - Custom title and message
 * - Customizable button labels
 * - Promise-based API for easy async/await usage
 * - Keyboard accessibility (Enter/Escape)
 * - Focus management
 */

import React, { useEffect, useRef } from "react"

import { createPortal } from "react-dom"

import Button from "./Button"

interface ConfirmProps {
	isOpen: boolean
	title: string
	message: string
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void
	onCancel: () => void
	variant?: "default" | "danger"
}

export const Confirm: React.FC<ConfirmProps> = ({
	isOpen,
	title,
	message,
	confirmLabel = "はい",
	cancelLabel = "キャンセル",
	onConfirm,
	onCancel,
	variant = "default",
}) => {
	const confirmButtonRef = useRef<HTMLButtonElement>(null)
	const cancelButtonRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (!isOpen) return

		// フォーカスを確認ボタンに設定
		if (variant === "danger") {
			cancelButtonRef.current?.focus()
		} else {
			confirmButtonRef.current?.focus()
		}

		// ESCキーでキャンセル
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onCancel()
			}
		}

		document.addEventListener("keydown", handleEscape)
		document.body.style.overflow = "hidden" // スクロールを無効化

		return () => {
			document.removeEventListener("keydown", handleEscape)
			document.body.style.overflow = "unset"
		}
	}, [isOpen, onCancel, variant])

	if (!isOpen) return null

	const confirmButtonClass =
		variant === "danger"
			? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
			: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"

	return createPortal(
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onCancel} />

			{/* Dialog */}
			<div className="flex min-h-screen items-center justify-center p-4">
				<div className="relative w-full max-w-md transform rounded-lg bg-white p-6 shadow-xl transition-all">
					{/* Title */}
					<div className="mb-4">
						<h3 className="text-lg font-medium text-gray-900">{title}</h3>
					</div>

					{/* Message */}
					<div className="mb-6">
						<p className="text-sm text-gray-600 leading-relaxed">{message}</p>
					</div>

					{/* Buttons */}
					<div className="flex justify-end space-x-3">
						<Button
							ref={cancelButtonRef}
							className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500"
							onClick={onCancel}
						>
							{cancelLabel}
						</Button>
						<Button
							ref={confirmButtonRef}
							className={`px-4 py-2 text-sm ${confirmButtonClass}`}
							onClick={onConfirm}
						>
							{confirmLabel}
						</Button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	)
}

// Hook for easier usage
export const useConfirm = () => {
	const [confirmState, setConfirmState] = React.useState<{
		isOpen: boolean
		title: string
		message: string
		confirmLabel?: string
		cancelLabel?: string
		variant?: "default" | "danger"
		resolve?: (value: boolean) => void
	}>({
		isOpen: false,
		title: "",
		message: "",
	})

	const confirm = React.useCallback(
		(
			title: string,
			message: string,
			options?: {
				confirmLabel?: string
				cancelLabel?: string
				variant?: "default" | "danger"
			}
		): Promise<boolean> => {
			return new Promise(resolve => {
				setConfirmState({
					isOpen: true,
					title,
					message,
					confirmLabel: options?.confirmLabel,
					cancelLabel: options?.cancelLabel,
					variant: options?.variant,
					resolve,
				})
			})
		},
		[]
	)

	const handleConfirm = React.useCallback(() => {
		confirmState.resolve?.(true)
		setConfirmState(prev => ({ ...prev, isOpen: false }))
	}, [confirmState.resolve])

	const handleCancel = React.useCallback(() => {
		confirmState.resolve?.(false)
		setConfirmState(prev => ({ ...prev, isOpen: false }))
	}, [confirmState.resolve])

	const ConfirmDialog = React.useCallback(
		() => (
			<Confirm
				isOpen={confirmState.isOpen}
				title={confirmState.title}
				message={confirmState.message}
				confirmLabel={confirmState.confirmLabel}
				cancelLabel={confirmState.cancelLabel}
				variant={confirmState.variant}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>
		),
		[confirmState, handleConfirm, handleCancel]
	)

	return { confirm, ConfirmDialog }
}

export default Confirm
