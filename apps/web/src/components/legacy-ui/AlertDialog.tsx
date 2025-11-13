import { type ReactNode, useEffect } from "react"

interface AlertDialogProps {
	title: string
	message: ReactNode
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void
	onCancel?: () => void
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
}

export function AlertDialog({
	title,
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	onCancel,
	isOpen,
	setIsOpen,
}: AlertDialogProps) {
	useEffect(() => {
		if (!isOpen) return
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false)
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [isOpen, setIsOpen])

	if (!isOpen) return null
	return (
		<div
			className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50"
			role="alertdialog"
			aria-modal="true"
			tabIndex={-1}
			onClick={() => setIsOpen(false)}
		>
			<div
				className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md border-2 border-gray-400"
				onClick={e => e.stopPropagation()}
				role="document"
			>
				<div className="text-xl font-semibold mb-4">{title}</div>
				<div className="text-gray-700 mb-6">{message}</div>
				<div className="flex justify-end gap-3">
					{onCancel && (
						<button
							onClick={() => {
								setIsOpen(false)
								onCancel()
							}}
							className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-800"
							type="button"
						>
							{cancelLabel}
						</button>
					)}
					<button
						onClick={() => {
							setIsOpen(false)
							onConfirm()
						}}
						className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
						type="button"
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	)
}
