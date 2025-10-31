import React, { useEffect } from "react"

interface DrawerProps {
	isOpen: boolean
	onClose: () => void
	children: React.ReactNode
	position?: "left" | "right"
	width?: string
	noPadding?: boolean
}

const Drawer = ({
	isOpen,
	onClose,
	children,
	position = "right",
	width = "w-64",
	noPadding = false,
}: DrawerProps) => {
	const drawerPositionClass = position === "left" ? "-translate-x-full" : "translate-x-full"
	
	// ESC key handling
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose()
			}
		}
		if (isOpen) {
			document.addEventListener("keydown", handleEsc)
			return () => document.removeEventListener("keydown", handleEsc)
		}
	}, [isOpen, onClose])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onClose()
		}
	}

	return (
		<>
			<div
				className={`fixed inset-0 bg-gray-800 bg-opacity-50 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
				onClick={onClose}
				onKeyDown={handleKeyDown}
			/>
			<div
				role="dialog"
				aria-modal="true"
				className={`fixed top-0 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ${width} ${isOpen ? "translate-x-0" : drawerPositionClass} ${position === "left" ? "left-0" : "right-0"} flex flex-col`}
				style={width.includes("%") ? { width } : {}}
			>
				<div className={`flex-1 min-h-0 ${noPadding ? "overflow-auto" : "p-4 overflow-auto"}`}>
					{children}
				</div>
			</div>
		</>
	)
}

export default Drawer
