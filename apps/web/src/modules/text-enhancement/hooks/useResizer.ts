/**
 * パネルリサイザー機能を管理するカスタムフック
 */

import { useCallback, useEffect, useRef, useState } from "react"

interface ResizerHookOptions {
	initialWidth?: number
	minWidth?: number
	maxWidth?: number
}

interface ResizerHookResult {
	leftPanelWidth: number
	isResizing: boolean
	resizerRef: React.RefObject<HTMLDivElement | null>
	handleMouseDown: (e: React.MouseEvent) => void
}

export const useResizer = ({
	initialWidth = 50,
	minWidth = 20,
	maxWidth = 80,
}: ResizerHookOptions = {}): ResizerHookResult => {
	const [leftPanelWidth, setLeftPanelWidth] = useState<number>(initialWidth)
	const [isResizing, setIsResizing] = useState<boolean>(false)
	const resizerRef = useRef<HTMLDivElement | null>(null)

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setIsResizing(true)
	}, [])

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isResizing) return

			const container = resizerRef.current?.parentElement
			if (!container) return

			const containerRect = container.getBoundingClientRect()
			const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

			// パネル幅を制限
			const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newLeftWidth))
			setLeftPanelWidth(clampedWidth)
		},
		[isResizing, minWidth, maxWidth]
	)

	const handleMouseUp = useCallback(() => {
		setIsResizing(false)
	}, [])

	// リサイザーのマウスイベント管理
	useEffect(() => {
		if (isResizing) {
			document.addEventListener("mousemove", handleMouseMove)
			document.addEventListener("mouseup", handleMouseUp)
			document.body.style.cursor = "col-resize"
			document.body.style.userSelect = "none"
		} else {
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
			document.body.style.cursor = ""
			document.body.style.userSelect = ""
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
			document.body.style.cursor = ""
			document.body.style.userSelect = ""
		}
	}, [isResizing, handleMouseMove, handleMouseUp])

	return {
		leftPanelWidth,
		isResizing,
		resizerRef,
		handleMouseDown,
	}
}
