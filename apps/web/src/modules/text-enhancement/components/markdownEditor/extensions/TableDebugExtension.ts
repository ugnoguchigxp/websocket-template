import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "prosemirror-state"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("TableDebugExtension")

/**
 * TableDebugExtension - テーブルリサイズハンドルのデバッグ用
 * リサイズハンドルの存在とDOM構造を確認
 */
export const TableDebugExtension = Extension.create({
	name: "tableDebug",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("tableDebug"),
				view: editorView => {
					log.debug("🔍 TableDebugExtension initialized")

					const checkResizeHandles = () => {
						const tables = editorView.dom.querySelectorAll("table")
						const handles = editorView.dom.querySelectorAll(".column-resize-handle")
						const wrappers = editorView.dom.querySelectorAll(".tableWrapper")

						log.debug("📊 Table Debug Info:", {
							tables: tables.length,
							resizeHandles: handles.length,
							tableWrappers: wrappers.length,
							proseMirrorEnabled: !!editorView.dom.querySelector(".ProseMirror"),
							tableClasses: Array.from(tables).map(table => table.className),
							wrapperClasses: Array.from(wrappers).map(wrapper => wrapper.className),
						})

						// テーブル構造の詳細
						tables.forEach((table, index) => {
							const parent = table.parentElement
							const computedStyle = window.getComputedStyle(table)
							log.debug(`📋 Table ${index} Structure:`, {
								parentTag: parent?.tagName,
								parentClass: parent?.className,
								tableLayout: computedStyle.tableLayout,
								position: computedStyle.position,
								borderCollapse: computedStyle.borderCollapse,
							})
						})

						// リサイズハンドルの詳細情報
						handles.forEach((handle, index) => {
							const rect = handle.getBoundingClientRect()
							log.debug(`🎯 Resize Handle ${index}:`, {
								visible: rect.width > 0 && rect.height > 0,
								position: { x: rect.x, y: rect.y },
								size: { width: rect.width, height: rect.height },
							})
						})
					}

					// 初期チェック
					setTimeout(checkResizeHandles, 100)

					// テーブル追加時のチェック
					const observer = new MutationObserver(() => {
						setTimeout(checkResizeHandles, 50)
					})

					observer.observe(editorView.dom, {
						childList: true,
						subtree: true,
						attributes: true,
						attributeFilter: ["class"],
					})

					return {
						destroy() {
							observer.disconnect()
							log.debug("🔍 TableDebugExtension destroyed")
						},
					}
				},
			}),
		]
	},
})
