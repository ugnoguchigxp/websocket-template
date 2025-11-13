import type React from "react"

interface DrawerProps {
	isOpen: boolean
	onClose: () => void
	children?: React.ReactNode
	position?: "left" | "right"
	width?: string
	noPadding?: boolean
}

const Drawer: React.FC<DrawerProps> = ({
	isOpen,
	onClose,
	children,
	position = "right",
	width = "w-64",
	noPadding = false,
}) => {
	const drawerPositionClass = position === "left" ? "-translate-x-full" : "translate-x-full"

	return (
		<>
			{isOpen && <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40" onClick={onClose} />}
			<div
				id="drawer"
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
