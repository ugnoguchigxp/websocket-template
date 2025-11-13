import type React from "react"

import type { Editor } from "@tiptap/react"
import { FaBars, FaColumns, FaMinus, FaPlus, FaTh, FaThLarge, FaTrash } from "react-icons/fa"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("TableToolbar")

interface ITableToolbarProps {
	editor: Editor
	visible: boolean
	position: { x: number; y: number }
}

export const TableToolbar: React.FC<ITableToolbarProps> = ({ editor, visible, position }) => {
	if (!visible || !editor) return null

	const insertRowAbove = () => {
		log.debug("🔧 TableToolbar: insertRowAbove command")
		try {
			editor.chain().focus().addRowBefore().run()
		} catch (error) {
			log.error("TableToolbar: insertRowAbove failed", error)
		}
	}

	const insertRowBelow = () => {
		log.debug("🔧 TableToolbar: insertRowBelow command")
		editor.chain().focus().addRowAfter().run()
	}

	const deleteRow = () => {
		log.debug("🔧 TableToolbar: deleteRow command")
		editor.chain().focus().deleteRow().run()
	}

	const insertColumnLeft = () => {
		log.debug("🔧 TableToolbar: insertColumnLeft command")
		editor.chain().focus().addColumnBefore().run()
	}

	const insertColumnRight = () => {
		log.debug("🔧 TableToolbar: insertColumnRight command")
		editor.chain().focus().addColumnAfter().run()
	}

	const deleteColumn = () => {
		log.debug("🔧 TableToolbar: deleteColumn command")
		editor.chain().focus().deleteColumn().run()
	}

	const mergeCells = () => {
		log.debug("🔧 TableToolbar: mergeCells command")
		editor.chain().focus().mergeCells().run()
	}

	const splitCell = () => {
		log.debug("🔧 TableToolbar: splitCell command")
		editor.chain().focus().splitCell().run()
	}

	const toggleHeaderRow = () => {
		log.debug("🔧 TableToolbar: toggleHeaderRow command")
		editor.chain().focus().toggleHeaderRow().run()
	}

	const toggleHeaderColumn = () => {
		log.debug("🔧 TableToolbar: toggleHeaderColumn command")
		editor.chain().focus().toggleHeaderColumn().run()
	}

	const deleteTable = () => {
		log.debug("🔧 TableToolbar: deleteTable command")
		if (
			typeof window !== "undefined" &&
			window.confirm &&
			window.confirm("テーブルを削除しますか？")
		) {
			editor.chain().focus().deleteTable().run()
		}
	}

	const toolbarStyle: React.CSSProperties = {
		position: "absolute",
		left: position.x,
		top: position.y - 60,
		zIndex: 1000,
		backgroundColor: "white",
		border: "1px solid #e5e7eb",
		borderRadius: "8px",
		padding: "8px",
		boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
		display: "flex",
		gap: "4px",
		alignItems: "center",
		minWidth: "400px",
	}

	const buttonStyle: React.CSSProperties = {
		padding: "6px 8px",
		border: "1px solid #d1d5db",
		borderRadius: "4px",
		backgroundColor: "white",
		cursor: "pointer",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "12px",
		color: "#374151",
		transition: "all 0.2s ease",
	}

	const separatorStyle: React.CSSProperties = {
		width: "1px",
		height: "24px",
		backgroundColor: "#d1d5db",
		margin: "0 4px",
	}

	return (
		<div style={toolbarStyle} className="table-toolbar">
			{/* Row operations */}
			<button
				style={buttonStyle}
				onClick={insertRowAbove}
				title="上に行を挿入"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#f3f4f6"
					e.currentTarget.style.borderColor = "#9ca3af"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
				}}
			>
				<FaBars style={{ marginRight: "4px", fontSize: "10px" }} />
				<FaPlus style={{ fontSize: "8px" }} />↑
			</button>

			<button
				style={buttonStyle}
				onClick={insertRowBelow}
				title="下に行を挿入"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#f3f4f6"
					e.currentTarget.style.borderColor = "#9ca3af"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
				}}
			>
				<FaBars style={{ marginRight: "4px", fontSize: "10px" }} />
				<FaPlus style={{ fontSize: "8px" }} />↓
			</button>

			<button
				style={buttonStyle}
				onClick={deleteRow}
				title="行を削除"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#fef2f2"
					e.currentTarget.style.borderColor = "#fca5a5"
					e.currentTarget.style.color = "#dc2626"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
					e.currentTarget.style.color = "#374151"
				}}
			>
				<FaBars style={{ marginRight: "4px", fontSize: "10px" }} />
				<FaMinus style={{ fontSize: "8px" }} />
			</button>

			<div style={separatorStyle} />

			{/* Column operations */}
			<button
				style={buttonStyle}
				onClick={insertColumnLeft}
				title="左に列を挿入"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#f3f4f6"
					e.currentTarget.style.borderColor = "#9ca3af"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
				}}
			>
				←
				<FaPlus style={{ fontSize: "8px" }} />
				<FaColumns style={{ marginLeft: "4px", fontSize: "10px" }} />
			</button>

			<button
				style={buttonStyle}
				onClick={insertColumnRight}
				title="右に列を挿入"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#f3f4f6"
					e.currentTarget.style.borderColor = "#9ca3af"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
				}}
			>
				<FaColumns style={{ marginRight: "4px", fontSize: "10px" }} />
				<FaPlus style={{ fontSize: "8px" }} />→
			</button>

			<button
				style={buttonStyle}
				onClick={deleteColumn}
				title="列を削除"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#fef2f2"
					e.currentTarget.style.borderColor = "#fca5a5"
					e.currentTarget.style.color = "#dc2626"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
					e.currentTarget.style.color = "#374151"
				}}
			>
				<FaColumns style={{ marginRight: "4px", fontSize: "10px" }} />
				<FaMinus style={{ fontSize: "8px" }} />
			</button>

			<div style={separatorStyle} />

			{/* Cell operations */}
			<button
				style={buttonStyle}
				onClick={mergeCells}
				title="セルを結合"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#f0f9ff"
					e.currentTarget.style.borderColor = "#7dd3fc"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
				}}
			>
				<FaThLarge style={{ fontSize: "10px" }} />
			</button>

			<button
				style={buttonStyle}
				onClick={splitCell}
				title="セルを分割"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#f0f9ff"
					e.currentTarget.style.borderColor = "#7dd3fc"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
				}}
			>
				<FaTh style={{ fontSize: "10px" }} />
			</button>

			<div style={separatorStyle} />

			{/* Header toggle operations */}
			<button
				style={buttonStyle}
				onClick={toggleHeaderRow}
				title="ヘッダー行を切り替え"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#fefce8"
					e.currentTarget.style.borderColor = "#fde047"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
				}}
			>
				H行
			</button>

			<button
				style={buttonStyle}
				onClick={toggleHeaderColumn}
				title="ヘッダー列を切り替え"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#fefce8"
					e.currentTarget.style.borderColor = "#fde047"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
				}}
			>
				H列
			</button>

			<div style={separatorStyle} />

			{/* Delete table */}
			<button
				style={buttonStyle}
				onClick={deleteTable}
				title="テーブルを削除"
				onMouseEnter={e => {
					e.currentTarget.style.backgroundColor = "#fef2f2"
					e.currentTarget.style.borderColor = "#fca5a5"
					e.currentTarget.style.color = "#dc2626"
				}}
				onMouseLeave={e => {
					e.currentTarget.style.backgroundColor = "white"
					e.currentTarget.style.borderColor = "#d1d5db"
					e.currentTarget.style.color = "#374151"
				}}
			>
				<FaTrash style={{ fontSize: "10px" }} />
			</button>
		</div>
	)
}

export default TableToolbar
