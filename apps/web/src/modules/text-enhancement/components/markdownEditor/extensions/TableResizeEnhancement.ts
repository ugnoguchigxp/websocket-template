import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "prosemirror-state"

/**
 * TableResizeEnhancement - TipTap純正リサイズ機能の体験向上
 * スムーズアニメーションとビジュアルフィードバックを提供
 */
export const TableResizeEnhancement = Extension.create({
	name: "tableResizeEnhancement",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("tableResizeEnhancement"),
				props: {
					attributes: {
						class: "table-resize-enhanced",
					},
				},
				filterTransaction: (transaction, _) => {
					// テーブルリサイズ時のスムーズアニメーション
					if (transaction.getMeta("resizeTable")) {
						// CSS transition を一時的に有効化
						document.documentElement.style.setProperty("--table-resize-transition", "0.2s ease")
						setTimeout(() => {
							document.documentElement.style.removeProperty("--table-resize-transition")
						}, 200)
					}
					return true
				},
			}),
		]
	},
})
