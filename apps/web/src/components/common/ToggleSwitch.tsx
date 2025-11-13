import type React from "react"

interface ToggleSwitchProps {
	checked: boolean
	onChange: (checked: boolean) => void
	disabled?: boolean
	size?: "sm" | "md" | "lg"
	label?: string
	className?: string
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
	checked,
	onChange,
	disabled = false,
	size = "md",
	label,
	className = "",
}) => {
	const sizeClasses = {
		sm: {
			switch: "w-10 h-5",
			thumb: "w-4 h-4",
			translate: checked ? "translate-x-5" : "translate-x-0",
		},
		md: {
			switch: "w-12 h-6",
			thumb: "w-5 h-5",
			translate: checked ? "translate-x-6" : "translate-x-0",
		},
		lg: {
			switch: "w-14 h-7",
			thumb: "w-6 h-6",
			translate: checked ? "translate-x-7" : "translate-x-0",
		},
	}

	const currentSize = sizeClasses[size]

	return (
		<label
			className={`flex items-center cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
		>
			<div className="relative">
				<input
					type="checkbox"
					checked={checked}
					onChange={e => !disabled && onChange(e.target.checked)}
					className="sr-only"
					disabled={disabled}
				/>
				<div
					className={`
            ${currentSize.switch}
            ${checked ? "bg-blue-500" : "bg-gray-300"}
            rounded-full
            transition-colors duration-200 ease-in-out
            ${disabled ? "" : "hover:bg-opacity-80"}
          `}
				>
					<div
						className={`
              ${currentSize.thumb}
              bg-white
              rounded-full
              shadow-lg
              transform
              transition-transform duration-200 ease-in-out
              ${currentSize.translate}
              flex items-center justify-center
              mt-0.5 ml-0.5
            `}
					/>
				</div>
			</div>
			{label && (
				<span
					className={`ml-3 text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-900"}`}
				>
					{label}
				</span>
			)}
		</label>
	)
}

export default ToggleSwitch
