/**
 * Badge UI Component - Simple implementation for presentations
 */

import type React from "react"

export interface BadgeProps {
	children: React.ReactNode
	variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger"
	size?: "sm" | "md" | "lg"
	className?: string
}

export const Badge: React.FC<BadgeProps> = ({
	children,
	variant = "default",
	size = "md",
	className = "",
}) => {
	const variantClasses = {
		default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
		primary: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
		secondary: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
		success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
		warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
		danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
	}

	const sizeClasses = {
		sm: "px-2 py-0.5 text-xs",
		md: "px-2.5 py-1 text-sm",
		lg: "px-3 py-1.5 text-base",
	}

	return (
		<span
			className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
		>
			{children}
		</span>
	)
}

export default Badge
