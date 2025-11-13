import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "prosemirror-state"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("TableForceExtension")

/**
 * TableForceExtension - 強制的にリサイズハンドルを生成・表示
 * TipTap Tableが正常に動作しない場合の緊急対応
 */
export const TableForceExtension = Extension.create({
	name: "tableForce",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("tableForce"),
				view: editorView => {
					log.debug("🚀 TableForceExtension: Force initializing table resize handles")

					const forceCreateResizeHandles = () => {
						const tables = editorView.dom.querySelectorAll("table")
						log.debug(`🔧 TableForceExtension: Found ${tables.length} tables`)

						tables.forEach((table, tableIndex) => {
							const cells = table.querySelectorAll("th, td")
							log.debug(`📊 Table ${tableIndex}: Found ${cells.length} cells`)

							cells.forEach((cell, cellIndex) => {
								// 既存のハンドルがあるかチェック
								const existingHandle = cell.querySelector(".column-resize-handle")
								if (!existingHandle) {
									// 強制的にリサイズハンドルを作成
									const handle = document.createElement("div")
									handle.className = "column-resize-handle"
									handle.style.cssText = `
                    position: absolute;
                    right: -2px;
                    top: 0;
                    bottom: 0;
                    width: 8px;
                    background: #3b82f6;
                    cursor: col-resize;
                    z-index: 10;
                    pointer-events: auto;
                  `

									// セルの位置を相対位置に設定
									;(cell as HTMLElement).style.position = "relative"
									cell.appendChild(handle)

									log.debug(
										`✅ TableForceExtension: Created handle for table ${tableIndex}, cell ${cellIndex}`
									)

									// ハンドルのドラッグイベントを手動で追加
									let isDragging = false
									let startX = 0
									let startWidth = 0

									handle.addEventListener("mousedown", (e: MouseEvent) => {
										isDragging = true
										startX = e.clientX
										startWidth = (cell as HTMLElement).offsetWidth
										document.body.style.cursor = "col-resize"
										log.debug("🖱️ TableForceExtension: Started dragging")
										e.preventDefault()
									})

									document.addEventListener("mousemove", (e: MouseEvent) => {
										if (isDragging) {
											const diffX = e.clientX - startX
											const newWidth = Math.max(50, startWidth + diffX)
											;(cell as HTMLElement).style.width = `${newWidth}px`
											log.debug(`📏 TableForceExtension: Resizing to ${newWidth}px`)
										}
									})

									document.addEventListener("mouseup", () => {
										if (isDragging) {
											isDragging = false
											document.body.style.cursor = ""
											log.debug("🖱️ TableForceExtension: Stopped dragging")
										}
									})
								}
							})
						})
					}

					// 初期処理
					setTimeout(forceCreateResizeHandles, 100)

					// DOM変更を監視して新しいテーブルにもハンドルを追加
					const observer = new MutationObserver(mutations => {
						mutations.forEach(mutation => {
							if (mutation.type === "childList") {
								mutation.addedNodes.forEach(node => {
									if (node.nodeType === Node.ELEMENT_NODE) {
										const element = node as Element
										if (element.tagName === "TABLE" || element.querySelector("table")) {
											log.debug("🆕 TableForceExtension: New table detected, creating handles")
											setTimeout(forceCreateResizeHandles, 50)
										}
									}
								})
							}
						})
					})

					observer.observe(editorView.dom, {
						childList: true,
						subtree: true,
					})

					return {
						destroy() {
							observer.disconnect()
							log.debug("🚀 TableForceExtension: Cleaned up")
						},
					}
				},
			}),
		]
	},
})
