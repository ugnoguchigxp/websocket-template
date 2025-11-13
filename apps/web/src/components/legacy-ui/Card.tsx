/**
 * Card UI Component - Simple implementation for presentations
 */

import type React from "react"

export interface CardProps {
	children: React.ReactNode
	className?: string
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => {
	return (
		<div
			className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}
		>
			{children}
		</div>
	)
}

export interface CardHeaderProps {
	children: React.ReactNode
	className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = "" }) => {
	return <div className={`p-6 pb-4 ${className}`}>{children}</div>
}

export interface CardTitleProps {
	children: React.ReactNode
	className?: string
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = "" }) => {
	return (
		<h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
			{children}
		</h3>
	)
}

export interface CardDescriptionProps {
	children: React.ReactNode
	className?: string
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = "" }) => {
	return <p className={`text-sm text-gray-600 dark:text-gray-300 mt-1 ${className}`}>{children}</p>
}

export interface CardContentProps {
	children: React.ReactNode
	className?: string
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = "" }) => {
	return <div className={`px-6 pb-6 ${className}`}>{children}</div>
}

export default Card
