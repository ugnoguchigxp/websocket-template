import React, { useState, useRef, useLayoutEffect } from "react"
const Tooltip = ({ text, children, position }) => {
	const [visible, setVisible] = useState(false)
	const [calculatedPosition, setCalculatedPosition] = useState("top")
	const wrapperRef = useRef(null)
	const tooltipRef = useRef(null)
	const timeoutRef = useRef(null)
	const showTooltip = () => {
		timeoutRef.current = setTimeout(() => setVisible(true), 300)
	}
	const hideTooltip = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		setVisible(false)
	}
	useLayoutEffect(() => {
		if (visible && !position && wrapperRef.current && tooltipRef.current) {
			const wrapperRect = wrapperRef.current.getBoundingClientRect()
			const tooltipRect = tooltipRef.current.getBoundingClientRect()
			const spaceAbove = wrapperRect.top
			const spaceBelow = window.innerHeight - wrapperRect.bottom
			if (spaceAbove < tooltipRect.height + 8 && spaceBelow > spaceAbove) {
				setCalculatedPosition("bottom")
			} else {
				setCalculatedPosition("top")
			}
		}
	}, [visible, position])
	const tooltipPosition = position || calculatedPosition
	return (
		<span
			className="relative inline-block"
			onMouseEnter={showTooltip}
			onMouseLeave={hideTooltip}
			onFocus={showTooltip}
			onBlur={hideTooltip}
			ref={wrapperRef}
		>
			{children}
			{visible && (
				<span
					ref={tooltipRef}
					className={`absolute left-1/2 -translate-x-1/2 z-50 shadow-md whitespace-nowrap pointer-events-none bg-black text-white text-xs rounded py-1 px-2 ${tooltipPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
				>
					{text}
				</span>
			)}
		</span>
	)
}
export { Tooltip }
export default Tooltip
