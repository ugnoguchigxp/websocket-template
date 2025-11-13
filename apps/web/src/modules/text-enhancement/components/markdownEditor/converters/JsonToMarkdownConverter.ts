/**
 * JsonToMarkdownConverter - JSON構造からMarkdown形式への変換
 * TipTapエディターのJSON形式をMarkdownテキストに変換
 */

import type { JSONContent } from "@tiptap/react"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("JsonToMarkdownConverter")

export class JsonToMarkdownConverter {
	/**
	 * TipTap JSON構造をMarkdownテキストに変換
	 */
	static convertToMarkdown(json: JSONContent): string {
		if (!json || !json.content) {
			return ""
		}

		return JsonToMarkdownConverter.processNodes(json.content)
	}

	/**
	 * ノード配列を処理してMarkdownテキストを生成
	 */
	private static processNodes(nodes: JSONContent[]): string {
		return nodes.map(node => JsonToMarkdownConverter.processNode(node)).join("")
	}

	/**
	 * 単一ノードを処理してMarkdownテキストを生成
	 */
	private static processNode(node: JSONContent): string {
		if (!node.type) {
			return ""
		}

		switch (node.type) {
			case "paragraph":
				return JsonToMarkdownConverter.processParagraph(node)

			case "heading":
				return JsonToMarkdownConverter.processHeading(node)

			case "bulletList":
				return JsonToMarkdownConverter.processBulletList(node)

			case "orderedList":
				return JsonToMarkdownConverter.processOrderedList(node)

			case "listItem":
				return JsonToMarkdownConverter.processListItem(node)

			case "blockquote":
				return JsonToMarkdownConverter.processBlockquote(node)

			case "codeBlock":
				return JsonToMarkdownConverter.processCodeBlock(node)

			case "table":
				return JsonToMarkdownConverter.processTable(node)

			case "tableRow":
				return JsonToMarkdownConverter.processTableRow(node)

			case "tableHeader":
			case "tableCell":
				return JsonToMarkdownConverter.processTableCell(node)

			case "horizontalRule":
				return "\n---\n\n"

			case "hardBreak":
				return "\n"

			case "text":
				return JsonToMarkdownConverter.processText(node)

			default:
				log.warn(`[JsonToMarkdownConverter] Unsupported node type: ${node.type}`)
				return node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
		}
	}

	/**
	 * 段落の処理
	 */
	private static processParagraph(node: JSONContent): string {
		const content = node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
		return `${content}\n\n`
	}

	/**
	 * 見出しの処理
	 */
	private static processHeading(node: JSONContent): string {
		const level = node.attrs?.level || 1
		const content = node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
		const hashes = "#".repeat(Math.min(Math.max(level, 1), 6))
		return `${hashes} ${content}\n\n`
	}

	/**
	 * 箇条書きリストの処理
	 */
	private static processBulletList(node: JSONContent): string {
		const content = node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
		return `${content}\n`
	}

	/**
	 * 番号付きリストの処理
	 */
	private static processOrderedList(node: JSONContent): string {
		const content = node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
		return `${content}\n`
	}

	/**
	 * リストアイテムの処理
	 */
	private static processListItem(node: JSONContent): string {
		const content = node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
		// リストの種類を判定（親ノードの情報が必要だが、簡略化のため箇条書きとして扱う）
		return `- ${content.trim()}\n`
	}

	/**
	 * 引用の処理
	 */
	private static processBlockquote(node: JSONContent): string {
		const content = node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
		return `${content
			.split("\n")
			.filter(line => line.trim())
			.map(line => `> ${line}`)
			.join("\n")}\n\n`
	}

	/**
	 * コードブロックの処理
	 */
	private static processCodeBlock(node: JSONContent): string {
		const language = node.attrs?.language || ""
		const content = node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
		return `\`\`\`${language}\n${content.trim()}\n\`\`\`\n\n`
	}

	/**
	 * テーブルの処理
	 */
	private static processTable(node: JSONContent): string {
		if (!node.content || node.content.length === 0) {
			return ""
		}

		const rows = node.content.map(row => JsonToMarkdownConverter.processTableRow(row))
		let markdown = rows.join("")

		// ヘッダー行の区切り線を追加（2行目に）
		const lines = markdown.trim().split("\n")
		if (lines.length >= 2 && lines[0]) {
			const headerSeparator = lines[0]
				.split("|")
				.map(() => "---")
				.join("|")
			lines.splice(1, 0, headerSeparator)
			markdown = `${lines.join("\n")}\n\n`
		}

		return markdown
	}

	/**
	 * テーブル行の処理
	 */
	private static processTableRow(node: JSONContent): string {
		if (!node.content) {
			return ""
		}

		const cells = node.content.map(cell => {
			const content = JsonToMarkdownConverter.processTableCell(cell)
			return content.trim().replace(/\n/g, " ") // セル内改行を除去
		})

		return `|${cells.join("|")}|\n`
	}

	/**
	 * テーブルセルの処理
	 */
	private static processTableCell(node: JSONContent): string {
		return node.content ? JsonToMarkdownConverter.processNodes(node.content) : ""
	}

	/**
	 * テキストの処理（マークアップ適用）
	 */
	private static processText(node: JSONContent): string {
		let text = node.text || ""

		if (node.marks) {
			node.marks.forEach(mark => {
				switch (mark.type) {
					case "bold":
						text = `**${text}**`
						break
					case "italic":
						text = `*${text}*`
						break
					case "code":
						text = `\`${text}\``
						break
					case "strike":
						text = `~~${text}~~`
						break
					case "link": {
						const href = mark.attrs?.href || "#"
						const title = mark.attrs?.title ? ` "${mark.attrs.title}"` : ""
						text = `[${text}](${href}${title})`
						break
					}
				}
			})
		}

		return text
	}

	/**
	 * Markdownファイルとしてダウンロード
	 */
	static downloadAsMarkdown(json: JSONContent, filename = "document.md"): void {
		try {
			const markdownContent = JsonToMarkdownConverter.convertToMarkdown(json)

			if (!markdownContent.trim()) {
				log.warn("[JsonToMarkdownConverter] Empty content, skipping download")
				return
			}

			const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" })
			const url = URL.createObjectURL(blob)

			const link = document.createElement("a")
			link.href = url
			const downloadFilename = filename.endsWith(".md") ? filename : `${filename}.md`
			link.download = downloadFilename
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)

			URL.revokeObjectURL(url)

			log.debug(`[JsonToMarkdownConverter] Downloaded: ${downloadFilename}`)
		} catch (error) {
			log.error("[JsonToMarkdownConverter] Download failed:", error)
			throw new Error("Markdownファイルのダウンロードに失敗しました")
		}
	}
}

export default JsonToMarkdownConverter
