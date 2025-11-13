import type React from "react"
import { useEffect, useState } from "react"

import type { Editor } from "@tiptap/react"
import { createPortal } from "react-dom"

export interface ITableEdgeControlsProps {
	editor: Editor | null
}

/**
 * TableEdgeControls - テーブル周辺にPortalで表示される操作コントロール
 * React Portalを使用してテーブルの外側に行列追加ボタンを表示
 */
export const TableEdgeControls: React.FC<ITableEdgeControlsProps> = ({ editor }) => {
	const [hoveredTable, setHoveredTable] = useState<HTMLElement | null>(null)
	const [controlPosition, setControlPosition] = useState<{ x: number; y: number } | null>(null)

	useEffect(() => {
		if (!editor) return

		const handleTableHover = (e: MouseEvent) => {
			const table = (e.target as HTMLElement).closest("table")
			if (table && table !== hoveredTable) {
				// TipTap enhanced tableのみを対象とする
				const wrapper = table.closest(".tiptap-table-enhanced")
				if (wrapper) {
					setHoveredTable(table)
					const rect = table.getBoundingClientRect()
					setControlPosition({
						x: rect.right + 8,
						y: rect.top + window.scrollY,
					})
				}
			} else if (!table) {
				setHoveredTable(null)
				setControlPosition(null)
			}
		}

		const handleTableLeave = (e: MouseEvent) => {
			const relatedTarget = e.relatedTarget as HTMLElement
			if (
				!relatedTarget ||
				(!relatedTarget.closest("table") && !relatedTarget.closest(".table-edge-controls"))
			) {
				setHoveredTable(null)
				setControlPosition(null)
			}
		}

		document.addEventListener("mouseover", handleTableHover)
		document.addEventListener("mouseout", handleTableLeave)

		return () => {
			document.removeEventListener("mouseover", handleTableHover)
			document.removeEventListener("mouseout", handleTableLeave)
		}
	}, [editor, hoveredTable])

	if (!editor || !controlPosition || !hoveredTable) return null

	const handleAddRowAbove = () => {
		editor.chain().focus().addRowBefore().run()
	}

	const handleAddRowBelow = () => {
		editor.chain().focus().addRowAfter().run()
	}

	const handleAddColumnLeft = () => {
		editor.chain().focus().addColumnBefore().run()
	}

	const handleAddColumnRight = () => {
		editor.chain().focus().addColumnAfter().run()
	}

	return createPortal(
		<div
			className="table-edge-controls bg-white shadow-lg border border-gray-200 rounded-lg p-2 flex flex-col gap-1"
			style={{
				position: "fixed",
				left: controlPosition.x,
				top: controlPosition.y,
				zIndex: 50,
				minWidth: "140px",
			}}
			onMouseEnter={() => {
				// Portalがホバーされたときはテーブルのホバー状態を維持
			}}
			onMouseLeave={() => {
				setHoveredTable(null)
				setControlPosition(null)
			}}
		>
			<button
				className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors duration-150 text-left"
				onClick={handleAddRowAbove}
				title="Add row above"
			>
				↑ Row Above
			</button>
			<button
				className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors duration-150 text-left"
				onClick={handleAddRowBelow}
				title="Add row below"
			>
				↓ Row Below
			</button>
			<button
				className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors duration-150 text-left"
				onClick={handleAddColumnLeft}
				title="Add column left"
			>
				← Column Left
			</button>
			<button
				className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors duration-150 text-left"
				onClick={handleAddColumnRight}
				title="Add column right"
			>
				→ Column Right
			</button>
		</div>,
		document.body
	)
}
