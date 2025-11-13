import type React from "react"
import { useEffect, useRef, useState } from "react"

import { createPortal } from "react-dom"
import { FiMove, FiX } from "react-icons/fi"

import { createContextLogger } from "@logger"

const log = createContextLogger("Modal")

interface IModalProps {
	id?: string
	isOpen: boolean
	onClose: () => void
	children: React.ReactNode
	/** モーダルサイズ */
	size?: "sm" | "md" | "lg" | "xl" | "full" | "auto"
	/** 背景クリックで閉じるか */
	closeOnBackdrop?: boolean
	/** ESCキーで閉じるか */
	closeOnEscape?: boolean
	/** バツボタンを表示するか */
	showCloseButton?: boolean
	/** ドラッグ移動を有効にするか */
	draggable?: boolean
	/** カスタムクラス名 */
	className?: string
}

const Modal: React.FC<IModalProps> = ({
	id = "modal",
	isOpen,
	onClose,
	children,
	size = "auto",
	closeOnBackdrop = true,
	closeOnEscape = true,
	showCloseButton = true,
	draggable = false,
	className = "",
}) => {
	const modalRef = useRef<HTMLDivElement>(null)

	// ドラッグ状態管理
	const [isDragging, setIsDragging] = useState(false)
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
	const [position, setPosition] = useState({ x: 0, y: 0 })

	// モーダルが開かれるたびに位置をリセット
	useEffect(() => {
		if (isOpen) {
			setPosition({ x: 0, y: 0 })
		}
	}, [isOpen])

	// ドラッグ開始
	const handleMouseDown = (e: React.MouseEvent) => {
		log.debug("Modal handleMouseDown triggered", { draggable, size })
		if (!draggable || size === "full") return

		e.preventDefault()
		e.stopPropagation()

		log.debug("Setting dragging to true")
		setIsDragging(true)
		setDragStart({
			x: e.clientX - position.x,
			y: e.clientY - position.y,
		})
	}

	// ドラッグ中
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging) return

			const newX = e.clientX - dragStart.x
			const newY = e.clientY - dragStart.y

			// 画面境界の制約
			const modal = modalRef.current
			if (modal) {
				const rect = modal.getBoundingClientRect()
				const maxX = window.innerWidth - rect.width
				const maxY = window.innerHeight - rect.height

				setPosition({
					x: Math.max(-rect.width / 2, Math.min(maxX + rect.width / 2, newX)),
					y: Math.max(-rect.height / 2, Math.min(maxY + rect.height / 2, newY)),
				})
			}
		}

		const handleMouseUp = () => {
			setIsDragging(false)
		}

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove)
			document.addEventListener("mouseup", handleMouseUp)
			document.body.style.userSelect = "none"
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
			document.body.style.userSelect = "unset"
		}
	}, [isDragging, dragStart, position])

	// ESCキーでクローズ
	useEffect(() => {
		if (!closeOnEscape || !isOpen) return
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose()
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [isOpen, closeOnEscape, onClose])

	// スクロール制御
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden"
		} else {
			document.body.style.overflow = "unset"
		}

		return () => {
			document.body.style.overflow = "unset"
		}
	}, [isOpen])

	if (!isOpen) return null

	// モーダルサイズの計算
	const getModalSize = () => {
		switch (size) {
			case "sm":
				return "w-96 h-96"
			case "md":
				return "w-2/3 h-2/3 max-w-2xl"
			case "lg":
				return "w-4/5 h-4/5 max-w-4xl"
			case "xl":
				return "w-11/12 h-5/6 max-w-6xl"
			case "full":
				return "w-full h-full"
			default:
				return "w-11/12 max-w-2xl max-h-[90vh]"
		}
	}

	const handleBackdropClick = (event: React.MouseEvent) => {
		if (closeOnBackdrop && event.target === event.currentTarget) {
			onClose()
		}
	}

	if (!isOpen) return null

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
			data-testid="modal-backdrop"
			onClick={handleBackdropClick}
			aria-modal="true"
			role="dialog"
			tabIndex={-1}
		>
			<div
				ref={modalRef}
				className={`relative bg-white rounded-lg shadow-xl outline-none ${getModalSize()} ${className}`}
				onClick={e => e.stopPropagation()}
				role="document"
				style={{
					transform: `translate(${position.x}px, ${position.y}px)`,
				}}
			>
				{/* ドラッグハンドル - draggableがtrueの時のみ表示 */}
				{draggable && size !== "full" && (
					<div
						className="absolute top-0 left-0 right-0 h-12 bg-gray-50 flex items-center justify-center cursor-grab active:cursor-grabbing border-b border-gray-200 rounded-t-lg"
						onMouseDown={handleMouseDown}
						title="ドラッグして移動"
					>
						<FiMove className="w-5 h-5 text-gray-500" />
						<span className="ml-2 text-sm text-gray-600 select-none">ドラッグして移動</span>
					</div>
				)}

				{/* クローズボタン - showCloseButtonがtrueの時のみ表示 */}
				{showCloseButton && (
					<button
						id={`${id}-close-btn`}
						onClick={onClose}
						className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
						aria-label="Close modal"
					>
						<FiX className="w-5 h-5" />
					</button>
				)}

				{/* コンテンツ */}
				<div
					className={`${draggable && size !== "full" ? "pt-12" : ""} ${size === "auto" ? "p-2" : "w-full h-full"}`}
				>
					{children}
				</div>
			</div>
		</div>
	)

	return createPortal(modalContent, document.body)
}

export default Modal
