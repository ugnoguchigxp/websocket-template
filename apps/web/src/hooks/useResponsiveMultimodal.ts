/**
 * Responsive Multimodal Hook
 * Handles responsive behavior for multimodal panel display
 */

import { useCallback, useEffect, useState } from "react"

interface ResponsiveMultimodalConfig {
	mobileBreakpoint?: number
	tabletBreakpoint?: number
	debounceMs?: number
}

interface ResponsiveMultimodalState {
	isMobile: boolean
	isTablet: boolean
	isDesktop: boolean
	breakpoint: "mobile" | "tablet" | "desktop"
	screenWidth: number
	screenHeight: number
	orientation: "portrait" | "landscape"
	isTouch: boolean
}

/**
 * Hook for responsive multimodal behavior
 * @param config - Configuration options
 * @returns Responsive state and utilities
 */
export const useResponsiveMultimodal = (
	config: ResponsiveMultimodalConfig = {}
): ResponsiveMultimodalState => {
	const { mobileBreakpoint = 640, tabletBreakpoint = 1024, debounceMs = 100 } = config

	const [state, setState] = useState<ResponsiveMultimodalState>(() => {
		// Initialize with server-safe defaults
		if (typeof window === "undefined") {
			return {
				isMobile: false,
				isTablet: false,
				isDesktop: true,
				breakpoint: "desktop",
				screenWidth: 1920,
				screenHeight: 1080,
				orientation: "landscape",
				isTouch: false,
			}
		}

		// Client-side initialization
		const width = window.innerWidth
		const height = window.innerHeight
		const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0

		return {
			isMobile: width < mobileBreakpoint,
			isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
			isDesktop: width >= tabletBreakpoint,
			breakpoint:
				width < mobileBreakpoint ? "mobile" : width < tabletBreakpoint ? "tablet" : "desktop",
			screenWidth: width,
			screenHeight: height,
			orientation: width > height ? "landscape" : "portrait",
			isTouch,
		}
	})

	const checkBreakpoint = useCallback(() => {
		if (typeof window === "undefined") return

		const width = window.innerWidth
		const height = window.innerHeight
		const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0

		const newState: ResponsiveMultimodalState = {
			isMobile: width < mobileBreakpoint,
			isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
			isDesktop: width >= tabletBreakpoint,
			breakpoint:
				width < mobileBreakpoint ? "mobile" : width < tabletBreakpoint ? "tablet" : "desktop",
			screenWidth: width,
			screenHeight: height,
			orientation: width > height ? "landscape" : "portrait",
			isTouch,
		}

		setState(newState)
	}, [mobileBreakpoint, tabletBreakpoint])

	useEffect(() => {
		if (typeof window === "undefined") return

		// Debounced resize handler
		let timeoutId: NodeJS.Timeout
		const debouncedCheck = () => {
			clearTimeout(timeoutId)
			timeoutId = setTimeout(checkBreakpoint, debounceMs)
		}

		// Initial check
		checkBreakpoint()

		// Add event listeners
		window.addEventListener("resize", debouncedCheck)
		window.addEventListener("orientationchange", debouncedCheck)

		// Cleanup
		return () => {
			clearTimeout(timeoutId)
			window.removeEventListener("resize", debouncedCheck)
			window.removeEventListener("orientationchange", debouncedCheck)
		}
	}, [checkBreakpoint, debounceMs])

	return state
}
