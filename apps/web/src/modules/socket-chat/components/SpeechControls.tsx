/**
 * Speech Controls Component - DISABLED
 * Audio functionality has been disabled per requirements
 */

import type React from "react"

interface SpeechControlsProps {
	onSpeechRecognized?: (text: string) => void
	onContinuousTextUpdate?: (text: string) => void
	onSpeechStart?: () => void
	onSpeechEnd?: () => void
	disabled?: boolean
	className?: string
	lastAssistantMessage?: string
	onSendViaHandleSend?: (text?: string) => Promise<void>
	setMessage?: (message: string) => void
	hideSpeaker?: boolean
}

/**
 * Placeholder component - Speech functionality has been removed
 */
export const SpeechControls: React.FC<SpeechControlsProps> = () => {
	return null // Component disabled
}

export default SpeechControls
