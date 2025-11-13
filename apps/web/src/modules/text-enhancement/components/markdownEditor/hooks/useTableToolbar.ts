import { useCallback, useEffect, useState } from "react"

import type { Editor } from "@tiptap/react"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("useTableToolbar")

interface ITableToolbarState {
	visible: boolean
	position: { x: number; y: number }
	tableElement: HTMLTableElement | null
}

export const useTableToolbar = (editor: Editor | null) => {
	const [toolbarState, setToolbarState] = useState<ITableToolbarState>({
		visible: false,
		position: { x: 0, y: 0 },
		tableElement: null,
	})

	const updateToolbarPosition = useCallback((tableElement: HTMLTableElement) => {
		const rect = tableElement.getBoundingClientRect()
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

		setToolbarState(prev => ({
			...prev,
			position: {
				x: rect.left + scrollLeft,
				y: rect.top + scrollTop,
			},
		}))
	}, [])

	const showToolbar = useCallback(
		(tableElement: HTMLTableElement) => {
			updateToolbarPosition(tableElement)
			setToolbarState(prev => ({
				...prev,
				visible: true,
				tableElement,
			}))
		},
		[updateToolbarPosition]
	)

	const hideToolbar = useCallback(() => {
		setToolbarState(prev => ({
			...prev,
			visible: false,
			tableElement: null,
		}))
	}, [])

	// 🔧 useEffect依存配列から除外するため、useCallbackを削除
	const checkTableSelection = () => {
		if (!editor) return

		log.debug("[TableToolbar] checkTableSelection called - レンダリング遅延チェック")
		const { state } = editor
		const { selection } = state

		// テーブルノードが選択されているかチェック
		let tableNode = null
		let tablePos: number | null = null

		state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
			if (node.type.name === "table") {
				tableNode = node
				tablePos = pos
				return false
			}
			return true
		})

		// カーソルが含まれるテーブルを検索
		if (!tableNode) {
			state.doc.nodesBetween(selection.from, selection.from, (node, pos) => {
				if (node.type.name === "table") {
					tableNode = node
					tablePos = pos
					return false
				}
				return true
			})
		}

		if (tableNode && tablePos !== null) {
			// DOMからテーブル要素を取得
			const view = editor.view
			const tableElement = view.dom.querySelector(
				"table.tiptap-table-resizable"
			) as HTMLTableElement

			if (tableElement) {
				// 🔧 直接state更新（無限ループ回避）
				setToolbarState(prev => {
					if (prev.visible && prev.tableElement === tableElement) return prev
					const rect = tableElement.getBoundingClientRect()
					const scrollTop = window.pageYOffset || document.documentElement.scrollTop
					const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

					return {
						visible: true,
						position: {
							x: rect.left + scrollLeft,
							y: rect.top + scrollTop,
						},
						tableElement,
					}
				})
				return
			}
		}

		// 🔧 直接state更新（無限ループ回避）
		setToolbarState(prev =>
			prev.visible ? { visible: false, position: prev.position, tableElement: null } : prev
		)
	}

	// 🔧 CLAUDE.mdルール準拠: 無限ループリスク完全排除
	useEffect(() => {
		if (!editor) return

		const handleSelectionUpdate = () => {
			checkTableSelection()
		}

		editor.on("selectionUpdate", handleSelectionUpdate)

		return () => {
			editor.off("selectionUpdate", handleSelectionUpdate)
		}
	}, [editor]) // 🔧 依存配列からcheckTableSelectionを完全除外

	// クリック外しでツールバーを非表示
	useEffect(() => {
		if (!toolbarState.visible) return

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element

			// ツールバー自体がクリックされた場合は何もしない
			if (target.closest(".table-toolbar")) {
				return
			}

			// テーブル外がクリックされた場合はツールバーを非表示
			if (!target.closest("table.tiptap-table-resizable")) {
				// 🔧 直接state更新（無限ループ回避）
				setToolbarState(prev => ({
					...prev,
					visible: false,
					tableElement: null,
				}))
			}
		}

		const handleScroll = () => {
			if (toolbarState.tableElement) {
				// 🔧 直接position更新（無限ループ回避）
				const rect = toolbarState.tableElement.getBoundingClientRect()
				const scrollTop = window.pageYOffset || document.documentElement.scrollTop
				const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

				setToolbarState(prev => ({
					...prev,
					position: {
						x: rect.left + scrollLeft,
						y: rect.top + scrollTop,
					},
				}))
			}
		}

		const handleResize = () => {
			if (toolbarState.tableElement) {
				// 🔧 直接position更新（無限ループ回避）
				const rect = toolbarState.tableElement.getBoundingClientRect()
				const scrollTop = window.pageYOffset || document.documentElement.scrollTop
				const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

				setToolbarState(prev => ({
					...prev,
					position: {
						x: rect.left + scrollLeft,
						y: rect.top + scrollTop,
					},
				}))
			}
		}

		document.addEventListener("click", handleClickOutside)
		window.addEventListener("scroll", handleScroll)
		window.addEventListener("resize", handleResize)

		return () => {
			document.removeEventListener("click", handleClickOutside)
			window.removeEventListener("scroll", handleScroll)
			window.removeEventListener("resize", handleResize)
		}
	}, [toolbarState.visible, toolbarState.tableElement]) // 🔧 関数を依存配列から完全除外

	return {
		visible: toolbarState.visible,
		position: toolbarState.position,
		tableElement: toolbarState.tableElement,
		showToolbar,
		hideToolbar,
		checkTableSelection,
	}
}
