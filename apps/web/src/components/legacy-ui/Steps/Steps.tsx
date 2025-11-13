import type React from "react"

interface StepProps {
	children: React.ReactNode
}

export function Steps({ children }: StepProps) {
	return <div className="w-full h-full transition-all duration-300 ease-out">{children}</div>
}
