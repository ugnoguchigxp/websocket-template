/**
 * LoadingSpinner UI Component - Simple implementation for presentations
 */

import type React from "react"

export interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg"
	className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "md", className = "" }) => {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
	}

	return (
		<div
			className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${className}`}
			role="status"
		>
			<span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
				Loading...
			</span>
		</div>
	)
}

export default LoadingSpinner
