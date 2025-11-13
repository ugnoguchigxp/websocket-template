import type { Editor } from "@tiptap/react"

interface ISelectionInfo {
	selectedText: string
	markdownSyntax: string
	nodeType: string
	marks: string[]
}

export class SelectionUtils {
	/**
	 * 現在の選択範囲からMarkdown構文情報を抽出
	 */
	static getSelectionMarkdownSyntax(editor: Editor | null): ISelectionInfo | null {
		if (!editor) {
			return null
		}

		const { selection } = editor.state
		const { from, to, empty } = selection

		// 選択範囲のテキストを取得
		const selectedText = editor.state.doc.textBetween(from, to, " ")

		if (empty && !selectedText.trim()) {
			// カーソル位置のみで選択なし - ノード情報だけ表示
			const $from = selection.$from
			const node = $from.parent
			const nodeInfo = SelectionUtils.getNodeMarkdownInfo(node, "", [...$from.marks()])
			return nodeInfo
		}

		if (!selectedText.trim()) {
			return null
		}

		// 選択範囲の開始位置のノード情報を取得
		const $from = selection.$from
		const node = $from.parent

		return SelectionUtils.getNodeMarkdownInfo(node, selectedText, [...$from.marks()])
	}

	/**
	 * ノード情報からMarkdown構文を生成
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static getNodeMarkdownInfo(
		node: any,
		selectedText: string,
		marks: any[]
	): ISelectionInfo {
		let markdownSyntax = selectedText || "カーソル位置"
		const nodeType = node.type.name
		const markNames: string[] = []

		// ノードタイプに基づく構文
		switch (nodeType) {
			case "heading": {
				const level = node.attrs?.level || 1
				const prefix = "#".repeat(level)
				if (selectedText) {
					markdownSyntax = `${prefix} ${selectedText}`
				} else {
					markdownSyntax = `${prefix} (ヘッダー${level})`
				}
				markNames.push(`H${level}`)
				break
			}
			case "codeBlock": {
				const language = node.attrs?.language || ""
				if (selectedText) {
					markdownSyntax = `\`\`\`${language}\n${selectedText}\n\`\`\``
				} else {
					markdownSyntax = `\`\`\`${language}\n(コードブロック)\n\`\`\``
				}
				markNames.push("Code Block")
				break
			}
			case "blockquote": {
				if (selectedText) {
					markdownSyntax = `> ${selectedText}`
				} else {
					markdownSyntax = "> (引用)"
				}
				markNames.push("Blockquote")
				break
			}
			case "listItem": {
				if (selectedText) {
					markdownSyntax = `- ${selectedText}`
				} else {
					markdownSyntax = "- (リスト項目)"
				}
				markNames.push("List Item")
				break
			}
			case "paragraph": {
				if (!selectedText) {
					markdownSyntax = "(段落)"
				}
				markNames.push("Paragraph")
				break
			}
		}

		// マーク（太字、イタリック等）に基づく構文
		marks.forEach(mark => {
			if (!mark.type) return

			switch (mark.type.name) {
				case "bold":
				case "strong":
					if (selectedText) {
						markdownSyntax = `**${markdownSyntax}**`
					} else {
						markdownSyntax = "**太字**"
					}
					markNames.push("Bold")
					break
				case "italic":
				case "em":
					if (selectedText) {
						markdownSyntax = `*${markdownSyntax}*`
					} else {
						markdownSyntax = "*斜体*"
					}
					markNames.push("Italic")
					break
				case "code":
					if (selectedText) {
						markdownSyntax = `\`${markdownSyntax}\``
					} else {
						markdownSyntax = "`インラインコード`"
					}
					markNames.push("Inline Code")
					break
				case "link": {
					const href = mark.attrs?.href || ""
					if (selectedText) {
						markdownSyntax = `[${markdownSyntax}](${href})`
					} else {
						markdownSyntax = `[リンク](${href})`
					}
					markNames.push("Link")
					break
				}
				case "strike":
					if (selectedText) {
						markdownSyntax = `~~${markdownSyntax}~~`
					} else {
						markdownSyntax = "~~取り消し線~~"
					}
					markNames.push("Strikethrough")
					break
			}
		})

		const result = {
			selectedText: selectedText || "",
			markdownSyntax,
			nodeType,
			marks: markNames,
		}

		return result
	}

	/**
	 * カーソル位置の親ノードの情報を取得
	 */
	static getCurrentNodeInfo(editor: Editor | null): { nodeType: string; level?: number } | null {
		if (!editor) return null

		const { selection } = editor.state
		const $from = selection.$from
		const node = $from.parent

		return {
			nodeType: node.type.name,
			level: node.attrs?.level,
		}
	}
}

export type { ISelectionInfo }
