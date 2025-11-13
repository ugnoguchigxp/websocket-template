/**
 * Multimodal Context Provider
 * Manages state for multimodal panel display and content
 */

import React, {
	createContext,
	useContext,
	useState,
	type ReactNode,
	useCallback,
	useRef,
} from "react"

import { createContextLogger } from "@logger"

import type { MultiModalContentType, MultiModalContextType } from "../types/multimodal"

const log = createContextLogger("MultimodalContext")

// Create context
const MultimodalContext = createContext<MultiModalContextType | undefined>(undefined)

interface MultimodalProviderProps {
	children: ReactNode
	/** Custom animation duration in milliseconds */
	animationDuration?: number
}

/**
 * MultimodalProvider component
 * Provides state management for multimodal panel display
 */
export const MultimodalProvider: React.FC<MultimodalProviderProps> = ({
	children,
	animationDuration = 300,
}) => {
	const [isOpen, setIsOpen] = useState(false)
	const [content, setContent] = useState<ReactNode | null>(null)
	const [contentType, setContentType] = useState<MultiModalContentType | null>(null)
	const [isAnimating, setIsAnimating] = useState(false)
	const [fullscreenToggleRequested, setFullscreenToggleRequested] = useState(false)

	// Use ref to store cleanup timeout ID
	const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	/**
	 * Open multimodal panel with specified content and type
	 * @param content - React component to display
	 * @param type - Type of multimodal content
	 */
	const openMultimodal = useCallback(
		(content: ReactNode, type: MultiModalContentType) => {
			// Log multimodal opening
			log.debug(`[Multimodal] Opening panel with type: ${type}`, {
				timestamp: new Date().toISOString(),
				previousType: contentType,
				wasOpen: isOpen,
				contentExists: !!content,
			})

			// Cancel any pending cleanup
			if (cleanupTimeoutRef.current) {
				clearTimeout(cleanupTimeoutRef.current)
				cleanupTimeoutRef.current = null
			}

			// Set content immediately for smooth transition
			setContent(content)
			setContentType(type)
			setIsAnimating(true)
			setIsOpen(true)

			// Mark animation as complete
			const animationTimeout = setTimeout(() => {
				setIsAnimating(false)
				log.debug(`[Multimodal] Animation completed for type: ${type}`, {
					timestamp: new Date().toISOString(),
					animationDuration,
				})
			}, animationDuration)

			return () => clearTimeout(animationTimeout)
		},
		[animationDuration, contentType, isOpen]
	)

	/**
	 * Close multimodal panel with animation
	 * Content is cleared after animation completes
	 */
	const closeMultimodal = useCallback(() => {
		if (!isOpen) return // Prevent double-close

		// Log multimodal closing
		log.debug("[Multimodal] Closing panel", {
			timestamp: new Date().toISOString(),
			currentType: contentType,
			wasOpen: isOpen,
			animationDuration,
		})

		setIsAnimating(true)
		setIsOpen(false)

		// Clear content after animation completes
		cleanupTimeoutRef.current = setTimeout(() => {
			setContent(null)
			setContentType(null)
			setIsAnimating(false)
			cleanupTimeoutRef.current = null

			log.debug("[Multimodal] Panel closed and cleaned up", {
				timestamp: new Date().toISOString(),
			})
		}, animationDuration)
	}, [isOpen, animationDuration, contentType])

	/**
	 * Toggle multimodal panel open/close state
	 * Only closes if already open - opening requires content
	 */
	const toggleMultimodal = useCallback(() => {
		log.debug("[Multimodal] Toggle requested", {
			timestamp: new Date().toISOString(),
			currentState: isOpen ? "open" : "closed",
			contentType,
		})

		if (isOpen) {
			closeMultimodal()
		}
		// Note: Cannot toggle open without content - use openMultimodal instead
	}, [isOpen, closeMultimodal, contentType])

	/**
	 * Toggle fullscreen state
	 * This triggers a signal that SocketChatLayout can listen for
	 */
	const toggleFullscreen = useCallback(() => {
		log.debug("[Multimodal] Fullscreen toggle requested", {
			timestamp: new Date().toISOString(),
			contentType,
		})

		// Set a flag that SocketChatLayout can listen for
		setFullscreenToggleRequested(prev => !prev)
	}, [contentType])

	// Cleanup timeout on unmount
	React.useEffect(() => {
		return () => {
			if (cleanupTimeoutRef.current) {
				clearTimeout(cleanupTimeoutRef.current)
			}
		}
	}, [])

	const value: MultiModalContextType = {
		isOpen,
		content,
		contentType,
		isAnimating,
		fullscreenToggleRequested,
		openMultimodal,
		closeMultimodal,
		toggleMultimodal,
		toggleFullscreen,
	}

	return <MultimodalContext.Provider value={value}>{children}</MultimodalContext.Provider>
}

/**
 * Hook to use multimodal context
 * @returns Multimodal context value
 * @throws Error if used outside of MultimodalProvider
 */
export const useMultimodal = (): MultiModalContextType => {
	const context = useContext(MultimodalContext)
	if (context === undefined) {
		throw new Error("useMultimodal must be used within a MultimodalProvider")
	}
	return context
}
