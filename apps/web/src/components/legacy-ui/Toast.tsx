import { useEffect, useState } from "react"

interface ToastProps {
	message: string
	visible: boolean
	onClose: () => void
}

const Toast: React.FC<ToastProps> = ({ message, visible, onClose }) => {
	const [show, setShow] = useState(visible)

	useEffect(() => {
		if (visible) {
			setShow(true)
			const timer = setTimeout(() => {
				setShow(false)
				setTimeout(onClose, 500) // 透過アニメーション後に完全非表示
			}, 3000)
			return () => clearTimeout(timer)
		}
		return undefined
	}, [visible, onClose])

	return (
		<div
			className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded shadow-lg transition-all duration-500 bg-black bg-opacity-80 text-white text-center pointer-events-none min-w-[240px] ${
				show ? "opacity-100" : "opacity-0"
			}`}
			aria-live="polite"
		>
			{message}
		</div>
	)
}

export default Toast
