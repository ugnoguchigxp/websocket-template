import React, { useState, type ReactNode } from "react"

import Button from "./Button"

interface AccordionProps {
	title: ReactNode
	children: ReactNode
	defaultOpen?: boolean
	className?: string
}

/**
 * シンプルなアコーディオンコンポーネント
 * - タイトルクリックで開閉
 * - 子要素を折りたたみ表示
 */
export const Accordion: React.FC<AccordionProps> = ({
	title,
	children,
	defaultOpen = false,
	className = "",
}) => {
	const [open, setOpen] = useState(defaultOpen)

	// アコーディオンの内容部分にIDを付与し、buttonのaria-controlsと連携
	const contentId = React.useId()
	return (
		<div className={`border rounded bg-white ${className}`}>
			<Button
				type="button"
				className="w-full flex items-center justify-between px-4 text-left text-white font-semibold focus:outline-none focus:ring"
				onClick={() => setOpen(prev => !prev)}
				aria-expanded={open}
				aria-controls={contentId}
				label={
					<>
						<span>{title}</span>
						<span className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
							▶
						</span>
					</>
				}
			/>
			<div id={contentId} className={open ? "px-4 py-2 border-t bg-gray-50" : "hidden"}>
				{children}
			</div>
		</div>
	)
}

export default Accordion
