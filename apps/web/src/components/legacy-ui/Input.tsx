/**
 * Input UI Component - Simple implementation for presentations
 */

import type React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	className?: string
}

export const Input: React.FC<InputProps> = ({ className = "", ...props }) => {
	return (
		<input
			className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
			{...props}
		/>
	)
}

export default Input
