import { useMessage } from "@/contexts/MessageContext"
import type React from "react"

const ToastArea: React.FC = () => {
	const { toasts, removeToast } = useMessage()

	return (
		<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
			{toasts.map(toast => (
				<div
					key={toast.id}
					className={`bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center gap-2 ${
						toast.type === "error" ? "border-red-300 bg-red-50" : ""
					}`}
					role="status"
					aria-live="polite"
				>
					{toast.message}
					<button
						onClick={() => removeToast(toast.id)}
						className="ml-auto text-gray-500 hover:text-gray-700"
						aria-label="Close notification"
					>
						&times;
					</button>
				</div>
			))}
		</div>
	)
}

export default ToastArea
