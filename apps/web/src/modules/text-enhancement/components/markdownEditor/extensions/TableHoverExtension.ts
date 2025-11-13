import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "prosemirror-state"

/**
 * TableHoverExtension - テーブルセルのホバー効果を統一管理
 * TipTapと協調動作し、既存機能を妨げないように設計
 */
export const TableHoverExtension = Extension.create({
	name: "tableHover",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("tableHover"),
				props: {
					handleDOMEvents: {
						mouseover: (view, event) => {
							const target = event.target as HTMLElement
							const cell = target.closest("th, td")

							if (cell) {
								// 既存のホバークラスを削除
								const allCells = view.dom.querySelectorAll("th, td")
								allCells.forEach(c => c.classList.remove("table-cell-hover"))

								// 現在のセルにホバー効果を追加
								cell.classList.add("table-cell-hover")

								// TipTapの処理を継続
								return false
							}
							return false
						},

						mouseout: (_, event) => {
							const target = event.target as HTMLElement
							const cell = target.closest("th, td")

							if (cell) {
								// セルからマウスが離れた場合のみクラスを削除
								const relatedTarget = event.relatedTarget as HTMLElement
								if (!cell.contains(relatedTarget)) {
									cell.classList.remove("table-cell-hover")
								}
								return false
							}
							return false
						},
					},
				},
			}),
		]
	},
})
