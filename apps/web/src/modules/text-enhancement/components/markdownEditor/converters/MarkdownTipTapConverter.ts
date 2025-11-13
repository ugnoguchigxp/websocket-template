import CharacterCount from "@tiptap/extension-character-count"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import Typography from "@tiptap/extension-typography"
import { generateHTML } from "@tiptap/html"
import type { JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { common, createLowlight } from "lowlight"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("MarkdownTipTapConverter")

export class MarkdownTipTapConverter {
	private static lowlight = createLowlight(common)

	private static extensions = [
		StarterKit.configure({
			// StarterKitのCodeBlockとLinkを無効化して重複を避ける
			codeBlock: false,
			link: false,
		}),
		CodeBlockLowlight.configure({
			lowlight: MarkdownTipTapConverter.lowlight,
		}),
		Table.configure({
			resizable: true,
			handleWidth: 5, // TipTap標準推奨値
			cellMinWidth: 25, // TipTap標準推奨値
			lastColumnResizable: true, // 最後の列もリサイズ可能に
			allowTableNodeSelection: true,
		}),
		TableRow,
		TableHeader,
		TableCell,
		Link.configure({
			openOnClick: false,
		}),
		Image.configure({
			inline: true,
			allowBase64: true,
			HTMLAttributes: {
				class: "max-w-full h-auto rounded-lg shadow-sm border border-gray-200 my-2",
			},
		}),
		CharacterCount,
		Typography,
		// 注意: MarkdownAdvanceEditorのカスタムExtension（MarkdownShortcuts, MarkdownPaste）は
		// generateJSON/generateHTMLでは不要なのでここには含めない
	]

	static isMarkdownText(text: string): boolean {
		if (!text || text.trim().length === 0) return false

		// 超軽量検出 - Link・Image・Table含む最低限のパターン
		// 🔧 修正: テーブル検出を追加 |\s*.*\s*| (パイプでテーブル形式を検出)
		return /^#{1,6}\s|```|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>\s|\*\*.*\*\*|\[.*\]\(.*\)|!\[.*\]\(.*\)|\|.*\|/.test(
			text
		)
	}

	static async markdownToTipTapJson(markdown: string): Promise<JSONContent> {
		log.debug("🔄 markdownToTipTapJson called - length:", markdown?.length || 0)
		// Always use chunked processing for consistency and performance
		const result = await MarkdownTipTapConverter.processMarkdownInChunks(markdown)
		log.debug("🔄 markdownToTipTapJson result - nodes:", result?.content?.length || 0)

		// 🔧 空のテキストノードを除去してTipTapエラーを防止
		const cleanedResult = MarkdownTipTapConverter.removeEmptyTextNodes(result)
		log.debug("🔄 After cleaning empty text nodes - nodes:", cleanedResult?.content?.length || 0)

		return cleanedResult
	}

	/**
	 * 🔧 空のテキストノードを再帰的に除去
	 */
	private static removeEmptyTextNodes(node: JSONContent): JSONContent {
		if (!node) return node

		const cleanedNode = { ...node }

		// 空のテキストノードを除去
		if (node.type === "text" && (!node.text || node.text.trim() === "")) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return null as any // nullを返してフィルタリング対象にする
		}

		// 子ノードがある場合は再帰的に処理
		if (node.content && Array.isArray(node.content)) {
			cleanedNode.content = node.content
				.map(child => MarkdownTipTapConverter.removeEmptyTextNodes(child))
				.filter(child => child !== null) // nullを除去

			// コンテンツが空になった場合の処理
			if (cleanedNode.content.length === 0 && node.type !== "doc") {
				// docノード以外で空の場合は削除
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return null as any
			}
		}

		return cleanedNode
	}

	/**
	 * HTML レンダリング監視付き順次処理 - 50行チャンクで無限ループ回避
	 */
	static async processMarkdownInSmallChunksWithRender(
		markdown: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		editor: any,
		onChunkProcessed?: (processed: number, total: number) => void
	): Promise<void> {
		const lines = markdown.split("\n")
		const chunkSize = 50
		const chunks: string[] = []

		let currentChunk: string[] = []
		let inCodeBlock = false
		let inTable = false

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i] || ""
			const trimmedLine = line.trim()

			// コードブロックの開始/終了を検出
			if (trimmedLine.startsWith("```")) {
				if (inCodeBlock) {
					currentChunk.push(line)
					inCodeBlock = false
					chunks.push(currentChunk.join("\n"))
					currentChunk = []
				} else {
					if (currentChunk.length > 0) {
						chunks.push(currentChunk.join("\n"))
						currentChunk = []
					}
					currentChunk.push(line)
					inCodeBlock = true
				}
			}
			// 🔧 修正: テーブル検出条件を改善（インデントされたテーブル対応）
			// 行に | が含まれ、かつ複数の | がある場合（最低2個以上）
			else if (trimmedLine.includes("|") && (trimmedLine.match(/\|/g) || []).length >= 2) {
				if (!inTable) {
					if (currentChunk.length > 0) {
						chunks.push(currentChunk.join("\n"))
						currentChunk = []
					}
					inTable = true
				}
				currentChunk.push(line)
			}
			// 🔧 修正: テーブル終了条件を正確に判定
			// テーブル中で | が含まれない行、または | が1個以下の行が来たらテーブル終了
			else if (
				inTable &&
				(!trimmedLine.includes("|") || (trimmedLine.match(/\|/g) || []).length < 2)
			) {
				inTable = false
				chunks.push(currentChunk.join("\n"))
				currentChunk = []
				currentChunk.push(line)
			} else {
				// 通常行の処理
				currentChunk.push(line)

				if (!inCodeBlock && !inTable && currentChunk.length >= chunkSize) {
					chunks.push(currentChunk.join("\n"))
					currentChunk = []
				}
			}
		}

		if (currentChunk.length > 0) {
			chunks.push(currentChunk.join("\n"))
		}

		// 各チャンクを順次処理（最初のチャンクはsetContent、以降はinsertContent）
		for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
			const chunkMarkdown = chunks[chunkIndex]

			if (chunkMarkdown?.trim()) {
				try {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					;(editor as any).__preventUpdate = true
					const chunkJson = MarkdownTipTapConverter.parseMarkdownToTipTapJSON(chunkMarkdown)

					// STEP 2: エディターに挿入（空ノード完全除去 + 最低限有効コンテンツ保証）
					if (chunkJson.content && Array.isArray(chunkJson.content)) {
						const processedContent = chunkJson.content
							.filter(node => {
								if (node.type === "paragraph" && (!node.content || node.content.length === 0)) {
									return false
								}
								if (node.type === "paragraph" && node.content && node.content.length === 1) {
									const textNode = node.content[0]
									if (
										textNode &&
										textNode.type === "text" &&
										(!textNode.text || textNode.text.trim() === "")
									) {
										return false
									}
								}
								if (node.type === "text" && (!node.text || node.text.trim() === "")) {
									return false
								}

								return true
							})
							.map(node => {
								if (node.type === "paragraph" && node.content && Array.isArray(node.content)) {
									const validContent = node.content.filter(textNode => {
										if (
											textNode.type === "text" &&
											(!textNode.text || textNode.text.trim() === "")
										) {
											return false
										}
										return true
									})

									if (validContent.length === 0) {
										return {
											...node,
											content: [{ type: "text", text: " " }],
										}
									}

									return {
										...node,
										content: validContent,
									}
								}

								return node
							})

						if (processedContent.length === 0) {
							const minimalContent = [
								{
									type: "paragraph",
									content: [{ type: "text", text: " " }],
								},
							]

							if (chunkIndex === 0) {
								editor.commands.setContent({ type: "doc", content: minimalContent })
							} else {
								editor.commands.insertContent(minimalContent)
							}
						} else {
							if (chunkIndex === 0) {
								editor.commands.setContent({ type: "doc", content: processedContent })
							} else {
								editor.commands.insertContent(processedContent)
							}
						}
					} else {
						// JSON構造にコンテンツがない場合も最低限のコンテンツを追加
						log.debug("📝 No chunk content - adding minimal paragraph")
						const minimalContent = [
							{
								type: "paragraph",
								content: [{ type: "text", text: " " }],
							},
						]

						// 最初のチャンクは setContent、以降は insertContent
						if (chunkIndex === 0) {
							editor.commands.setContent({ type: "doc", content: minimalContent })
							log.debug("📋 First chunk: Empty chunk with minimal content set")
						} else {
							editor.commands.insertContent(minimalContent)
							log.debug("📋 Subsequent chunk: Empty chunk with minimal content inserted")
						}
					}

					// 🚀 待機時間削除：テーブル問題解決により不要になった
				} finally {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					;(editor as any).__preventUpdate = false
				}
			}

			// 進捗コールバック（チャンク処理完了時）- 無限ループ防止のため頻度制限
			if (onChunkProcessed && (chunkIndex + 1) % 2 === 0) {
				// 2チャンクごとに進捗更新
				// 処理済みチャンクに基づいて進捗を計算
				const processedLines = Math.round(((chunkIndex + 1) * lines.length) / chunks.length)
				const actualProcessed = Math.min(processedLines, lines.length)
				onChunkProcessed(actualProcessed, lines.length)
			}
		}

		if (onChunkProcessed) {
			onChunkProcessed(lines.length, lines.length)
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(editor as any).__preventUpdate = false
	}

	static async processMarkdownInSmallChunks(
		markdown: string,
		onChunkProcessed?: (processed: number, total: number) => void
	): Promise<JSONContent> {
		const lines = markdown.split("\n")
		const chunkSize = 5 // 5行ずつ処理
		const allContent: JSONContent[] = []

		// 軽量化: 詳細ログを削除
		for (let i = 0; i < lines.length; i += chunkSize) {
			const chunkLines = lines.slice(i, i + chunkSize)
			const chunkMarkdown = chunkLines.join("\n")

			// 各チャンクを個別に処理（循環参照を避けてparseMarkdownToTipTapJSONを直接使用）
			if (chunkMarkdown.trim()) {
				const chunkJson = MarkdownTipTapConverter.parseMarkdownToTipTapJSON(chunkMarkdown)
				if (chunkJson.content && Array.isArray(chunkJson.content)) {
					allContent.push(...chunkJson.content)
				}
			}

			// 進捗コールバック（useEffectなし）
			if (onChunkProcessed) {
				onChunkProcessed(i + chunkSize, lines.length)
			}

			// メモリ解放とUIブロッキング防止のための短い待機（削除：不要な遅延）
			// await new Promise(resolve => setTimeout(resolve, 5));
		}

		return {
			type: "doc",
			content:
				allContent.length > 0
					? allContent
					: [{ type: "paragraph", content: [{ type: "text", text: markdown }] }],
		}
	}

	/**
	 * Process large markdown content in chunks to prevent browser crashes
	 */
	static async processMarkdownInChunks(markdown: string): Promise<JSONContent> {
		const lines = markdown.split("\n")
		const chunkSize = 50 // Process 50 lines at a time
		const chunks: string[] = []

		// コードブロックとテーブルを保護するためのインテリジェントなチャンク分割
		let currentChunk: string[] = []
		let inCodeBlock = false
		let inTable = false

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i] || ""
			const trimmedLine = line.trim()

			// コードブロックの開始/終了を検出
			if (trimmedLine.startsWith("```")) {
				if (inCodeBlock) {
					// コードブロックの終了
					currentChunk.push(line)
					inCodeBlock = false
					chunks.push(currentChunk.join("\n"))
					currentChunk = []
				} else {
					// コードブロックの開始
					if (currentChunk.length > 0) {
						chunks.push(currentChunk.join("\n"))
						currentChunk = []
					}
					currentChunk.push(line)
					inCodeBlock = true
				}
			}
			// 🔧 修正: テーブル検出条件を改善（インデントされたテーブル対応）
			// 行に | が含まれ、かつ複数の | がある場合（最低2個以上）
			else if (trimmedLine.includes("|") && (trimmedLine.match(/\|/g) || []).length >= 2) {
				if (!inTable) {
					if (currentChunk.length > 0) {
						chunks.push(currentChunk.join("\n"))
						currentChunk = []
					}
					inTable = true
				}
				currentChunk.push(line)
			}
			// 🔧 修正: テーブル終了条件を正確に判定
			// テーブル中で | が含まれない行、または | が1個以下の行が来たらテーブル終了
			else if (
				inTable &&
				(!trimmedLine.includes("|") || (trimmedLine.match(/\|/g) || []).length < 2)
			) {
				inTable = false
				chunks.push(currentChunk.join("\n"))
				currentChunk = []
				currentChunk.push(line)
			} else {
				// 通常行の処理
				currentChunk.push(line)

				// チャンクサイズに達した場合の処理
				if (!inCodeBlock && !inTable && currentChunk.length >= chunkSize) {
					// コードブロック外かつテーブル外の場合は安全にチャンクを確定
					chunks.push(currentChunk.join("\n"))
					currentChunk = []
				}
			}
		}

		// 残りの行を最終チャンクに追加
		if (currentChunk.length > 0) {
			chunks.push(currentChunk.join("\n"))
		}

		const processedChunks: JSONContent[] = []

		// Process each chunk with delay to prevent blocking UI
		for (let i = 0; i < chunks.length; i++) {
			try {
				// Add small delay between chunks to prevent browser blocking
				if (i > 0) {
					await new Promise(resolve => setTimeout(resolve, 10))
				}

				// 改行問題を解決するためのマークダウン前処理
				let preprocessedChunk = chunks[i] || ""

				// コードブロック検出と境界修正
				const codeBlockPattern = /```[\w]*\n[\s\S]*?\n```/g
				const codeBlocks: string[] = []
				let codeBlockIndex = 0

				// コードブロックを一時的に保護
				preprocessedChunk = preprocessedChunk.replace(codeBlockPattern, match => {
					const placeholder = `__PROTECTED_CODEBLOCK_${codeBlockIndex}__`
					codeBlocks.push(match.trim()) // 前後の余分な空白を除去
					codeBlockIndex++
					return placeholder
				})

				// 通常のMarkdown前処理（コードブロック保護後）
				// 注意: Link・Image構文に影響しないように慎重に処理
				preprocessedChunk = preprocessedChunk
					.replace(/\n\s*```(\w*)\n\n/g, "\n```$1\n")
					.replace(/\n\n```\s*\n/g, "\n```\n")
					.replace(/```(\w*)\n\n/g, "```$1\n")
					.replace(/\n\n```/g, "\n```")

				// 保護されたコードブロックを復元
				codeBlocks.forEach((codeBlock, index) => {
					const placeholder = `__PROTECTED_CODEBLOCK_${index}__`
					preprocessedChunk = preprocessedChunk.replace(placeholder, `\n${codeBlock}\n`)
				})

				// TipTap Nativeアプローチ: marked.jsを使わず直接JSON構造を構築
				const chunkJson = MarkdownTipTapConverter.parseMarkdownToTipTapJSON(preprocessedChunk)

				if (chunkJson.content && chunkJson.content.length > 0) {
					// Filter out empty text nodes and clean content
					const cleanedContent = MarkdownTipTapConverter.filterEmptyNodes(chunkJson.content)
					if (cleanedContent.length > 0) {
						// チャンク間での適切なスペーシング制御
						if (processedChunks.length > 0 && i > 0) {
							const lastChunk = processedChunks[processedChunks.length - 1]
							const firstNewChunk = cleanedContent[0]

							// より詳細なコードブロック関連要素の検出
							const isCodeBlockRelated = (chunk: JSONContent): boolean => {
								if (chunk.type === "codeBlock") return true
								if (chunk.type === "paragraph" && chunk.content) {
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									return chunk.content.some(
										(node: any) =>
											node.type === "text" &&
											(node.text?.includes("```") || node.text?.trim().startsWith("```"))
									)
								}
								return false
							}

							const isHeading = (chunk: JSONContent): boolean => chunk.type === "heading"

							// スペーシングルール
							const needsSpacing =
								lastChunk &&
								firstNewChunk &&
								!isCodeBlockRelated(lastChunk) &&
								!isCodeBlockRelated(firstNewChunk) &&
								lastChunk.type !== "hardBreak" &&
								firstNewChunk.type !== "hardBreak" &&
								!(isHeading(lastChunk) && isHeading(firstNewChunk)) // 連続する見出し間はスペース不要

							if (needsSpacing) {
								// 空の段落でスペーシング
								processedChunks.push({ type: "paragraph" })
							}
						}

						processedChunks.push(...cleanedContent)
					}
				}
			} catch {
				// If chunk processing fails, add as plain text
				processedChunks.push({
					type: "paragraph",
					content: [{ type: "text", text: chunks[i] }],
				})
			}
		}

		return {
			type: "doc",
			content:
				processedChunks.length > 0
					? processedChunks
					: [{ type: "paragraph", content: [{ type: "text", text: markdown }] }],
		}
	}

	/**
	 * Filter out empty nodes to comply with TipTap schema validation
	 */
	static filterEmptyNodes(content: JSONContent[]): JSONContent[] {
		log.debug("🔧 TEMPORARY: Filtering disabled for debugging - returning all content")
		return content // 一時的にフィルタリングを無効化
	}

	static tipTapJsonToMarkdown(json: JSONContent): string {
		return MarkdownTipTapConverter.convertJsonToMarkdown(json)
	}

	static tipTapJsonToHtml(json: JSONContent): string {
		return generateHTML(json, MarkdownTipTapConverter.extensions)
	}

	private static convertJsonToMarkdown(node: JSONContent): string {
		if (!node) return ""

		switch (node.type) {
			case "doc":
				return (
					node.content
						?.map(child => MarkdownTipTapConverter.convertJsonToMarkdown(child))
						.filter(text => text)
						.join("\n\n") || ""
				)
			case "heading": {
				const level = node.attrs?.level || 1
				const headingText = MarkdownTipTapConverter.extractTextContent(node)
				return `${"#".repeat(level)} ${headingText}`
			}
			case "paragraph":
				return MarkdownTipTapConverter.convertParagraphContent(node)
			case "bulletList":
				return (
					node.content
						?.map((item: JSONContent) => `- ${MarkdownTipTapConverter.convertJsonToMarkdown(item)}`)
						.join("\n") || ""
				)
			case "orderedList":
				return (
					node.content
						?.map(
							(item: JSONContent, index: number) =>
								`${index + 1}. ${MarkdownTipTapConverter.convertJsonToMarkdown(item)}`
						)
						.join("\n") || ""
				)
			case "listItem":
				return (
					node.content
						?.map((child: JSONContent) => MarkdownTipTapConverter.convertJsonToMarkdown(child))
						.join(" ") || ""
				)
			case "codeBlock": {
				const language = node.attrs?.language || ""
				const code = MarkdownTipTapConverter.extractTextContent(node)
				return `\`\`\`${language}\n${code}\n\`\`\``
			}
			case "blockquote":
				return (
					node.content
						?.map(
							(child: JSONContent) => `> ${MarkdownTipTapConverter.convertJsonToMarkdown(child)}`
						)
						.join("\n") || ""
				)
			case "image": {
				const src = node.attrs?.src || ""
				const alt = node.attrs?.alt || ""
				return `![${alt}](${src})`
			}
			case "table":
				return MarkdownTipTapConverter.convertTableToMarkdown(node)
			case "tableRow":
				return (
					node.content
						?.map((cell: JSONContent) => MarkdownTipTapConverter.convertJsonToMarkdown(cell))
						.join("|") || ""
				)
			case "tableHeader":
			case "tableCell": {
				const cellContent = MarkdownTipTapConverter.extractTextContent(node)
				return ` ${cellContent} `
			}
			case "hardBreak":
				return "  \n" // Two spaces + newline for proper line break
			default:
				if (node.content) {
					return node.content
						.map((child: JSONContent) => MarkdownTipTapConverter.convertJsonToMarkdown(child))
						.join("")
				}
				return node.text || ""
		}
	}

	/**
	 * 段落コンテンツを適切に変換（Link/Imageの正しい処理）
	 */
	private static convertParagraphContent(node: JSONContent): string {
		if (!node.content || !Array.isArray(node.content)) {
			return ""
		}

		return node.content
			.map((child: JSONContent) => {
				if (child.type === "text") {
					// マークがある場合の処理
					if (child.marks && child.marks.length > 0) {
						let result = child.text || ""

						child.marks.forEach(mark => {
							switch (mark.type) {
								case "bold":
								case "strong":
									result = `**${result}**`
									break
								case "italic":
								case "em":
									result = `*${result}*`
									break
								case "code":
									result = `\`${result}\``
									break
								case "link": {
									// 🔧 修正: URLエンコード文字をデコード
									const href = MarkdownTipTapConverter.decodeUrlChars(mark.attrs?.href || "")
									result = `[${result}](${href})`
									break
								}
							}
						})

						return result
					}

					return child.text || ""
				}

				// 他のnode typeの場合は再帰処理
				return MarkdownTipTapConverter.convertJsonToMarkdown(child)
			})
			.join("")
	}

	/**
	 * テーブルをMarkdownに変換
	 */
	private static convertTableToMarkdown(tableNode: JSONContent): string {
		if (!tableNode.content || !Array.isArray(tableNode.content)) {
			return ""
		}

		const rows = tableNode.content
		if (rows.length === 0) {
			return ""
		}

		const markdownRows: string[] = []
		let headerProcessed = false

		for (const row of rows) {
			if (row.type !== "tableRow" || !row.content) {
				continue
			}

			const cells = row.content.map((cell: JSONContent) => {
				const cellText = MarkdownTipTapConverter.extractTextContent(cell)
				return cellText.trim() || " "
			})

			const markdownRow = `|${cells.join("|")}|`
			markdownRows.push(markdownRow)

			// 最初の行（ヘッダー）の後にセパレーター行を追加
			if (!headerProcessed) {
				const separatorRow = `|${cells.map(() => "------").join("|")}|`
				markdownRows.push(separatorRow)
				headerProcessed = true
			}
		}

		return markdownRows.join("\n")
	}

	/**
	 * URLエンコード文字をデコード（%5B, %5D等）
	 */
	private static decodeUrlChars(url: string): string {
		try {
			// %5B = [, %5D = ] をデコード
			return url.replace(/%5B/g, "[").replace(/%5D/g, "]")
		} catch {
			return url
		}
	}

	private static extractTextContent(node: JSONContent): string {
		if (node.text) return node.text
		if (node.content) {
			return node.content
				.map((child: JSONContent) => MarkdownTipTapConverter.extractTextContent(child))
				.join("")
		}
		return ""
	}

	/**
	 * TipTap Native Markdown Parser - marked.jsを使わない軽量実装
	 */
	private static parseMarkdownToTipTapJSON(markdown: string): JSONContent {
		const lines = markdown.split("\n")
		const content: JSONContent[] = []

		let currentParagraph: string[] = []

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i] || ""
			const trimmedLine = line.trim()

			// 空行の処理
			if (!trimmedLine) {
				if (currentParagraph.length > 0) {
					const paragraphNode = MarkdownTipTapConverter.createParagraphNode(
						currentParagraph.join(" ")
					)
					if (paragraphNode.content && paragraphNode.content.length > 0) {
						content.push(paragraphNode)
					}
					currentParagraph = []
				}
				continue
			}

			// 見出し
			const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/)
			if (headingMatch) {
				// 前の段落があれば先に処理
				if (currentParagraph.length > 0) {
					const paragraphNode = MarkdownTipTapConverter.createParagraphNode(
						currentParagraph.join(" ")
					)
					if (paragraphNode.content && paragraphNode.content.length > 0) {
						content.push(paragraphNode)
					}
					currentParagraph = []
				}

				const level = (headingMatch[1] || "#").length
				const headingText = headingMatch[2] || ""
				const headingContent = MarkdownTipTapConverter.parseInlineElements(headingText)

				content.push({
					type: "heading",
					attrs: { level },
					content: headingContent,
				})
				continue
			}

			// コードブロック
			const codeBlockMatch = trimmedLine.match(/^```(\w*)$/)
			if (codeBlockMatch) {
				// 前の段落があれば先に処理
				if (currentParagraph.length > 0) {
					const paragraphNode = MarkdownTipTapConverter.createParagraphNode(
						currentParagraph.join(" ")
					)
					if (paragraphNode.content && paragraphNode.content.length > 0) {
						content.push(paragraphNode)
					}
					currentParagraph = []
				}

				const language = codeBlockMatch[1] || ""
				const codeLines: string[] = []

				// コードブロックの終了まで読み込み
				let j = i + 1
				while (j < lines.length) {
					const codeLine = lines[j] || ""
					if (codeLine.trim() === "```") {
						break
					}
					codeLines.push(codeLine)
					j++
				}

				content.push({
					type: "codeBlock",
					attrs: { language },
					content: [{ type: "text", text: codeLines.join("\n") }],
				})

				// 処理したコードブロックの行数分スキップ
				i = j
				continue
			}

			// リスト項目
			const listMatch = trimmedLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
			if (listMatch) {
				// 前の段落があれば先に処理
				if (currentParagraph.length > 0) {
					const paragraphNode = MarkdownTipTapConverter.createParagraphNode(
						currentParagraph.join(" ")
					)
					if (paragraphNode.content && paragraphNode.content.length > 0) {
						content.push(paragraphNode)
					}
					currentParagraph = []
				}

				const isOrdered = /^\d+\./.test(listMatch[2] || "")
				const itemText = listMatch[3] || ""
				const itemContent = MarkdownTipTapConverter.parseInlineElements(itemText)

				const listItem = {
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: itemContent,
						},
					],
				}

				// 簡略化: 既存のリストに追加するか新しいリスト作成
				const lastNode = content[content.length - 1]
				const listType = isOrdered ? "orderedList" : "bulletList"

				if (lastNode && lastNode.type === listType) {
					lastNode.content = lastNode.content || []
					lastNode.content.push(listItem)
				} else {
					content.push({
						type: listType,
						content: [listItem],
					})
				}
				continue
			}

			// ブロッククォート
			const blockquoteMatch = trimmedLine.match(/^>\s*(.*)$/)
			if (blockquoteMatch) {
				// 前の段落があれば先に処理
				if (currentParagraph.length > 0) {
					const paragraphNode = MarkdownTipTapConverter.createParagraphNode(
						currentParagraph.join(" ")
					)
					if (paragraphNode.content && paragraphNode.content.length > 0) {
						content.push(paragraphNode)
					}
					currentParagraph = []
				}

				const quoteText = blockquoteMatch[1] || ""
				const quoteContent = MarkdownTipTapConverter.parseInlineElements(quoteText)

				content.push({
					type: "blockquote",
					content: [
						{
							type: "paragraph",
							content: quoteContent,
						},
					],
				})
				continue
			}

			// 🔧 修正: テーブル検出条件を改善（インデントされたテーブル対応）
			// 行に | が含まれ、かつ複数の | がある場合（最低2個以上）
			const tableMatch = trimmedLine.includes("|") && (trimmedLine.match(/\|/g) || []).length >= 2
			if (tableMatch) {
				// 前の段落があれば先に処理
				if (currentParagraph.length > 0) {
					const paragraphNode = MarkdownTipTapConverter.createParagraphNode(
						currentParagraph.join(" ")
					)
					if (paragraphNode.content && paragraphNode.content.length > 0) {
						content.push(paragraphNode)
					}
					currentParagraph = []
				}

				const tableResult = MarkdownTipTapConverter.parseTableFromLines(lines, i)
				if (tableResult.table) {
					try {
						JSON.stringify(tableResult.table)
						content.push(tableResult.table)
					} catch {
						// 循環参照がある場合はスキップ
					}
				}

				i += tableResult.processedLines - 1
				continue
			}

			// 通常のテキスト行は段落に追加
			if (line.trim()) {
				currentParagraph.push(line)
			} else {
				// 空行の場合、前の段落を処理（空段落は追加しない）
				if (currentParagraph.length > 0) {
					const paragraphNode = MarkdownTipTapConverter.createParagraphNode(
						currentParagraph.join(" ")
					)
					if (paragraphNode.content && paragraphNode.content.length > 0) {
						content.push(paragraphNode)
					}
					currentParagraph = []
				}
				// 空段落は追加しない
			}
		}

		// 最後の段落を処理
		if (currentParagraph.length > 0) {
			const paragraphNode = MarkdownTipTapConverter.createParagraphNode(currentParagraph.join(" "))
			if (paragraphNode.content && paragraphNode.content.length > 0) {
				content.push(paragraphNode)
			}
		}

		if (content.length === 0) {
			return {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: markdown || " " }],
					},
				],
			}
		}

		const validContent = content.filter(node => {
			if (node.type === "paragraph" && (!node.content || node.content.length === 0)) {
				return false
			}
			return true
		})

		return {
			type: "doc",
			content:
				validContent.length > 0
					? validContent
					: [
							{
								type: "paragraph",
								content: [{ type: "text", text: " " }], // フォールバック：最低限の有効な段落
							},
						],
		}
	}

	/**
	 * 段落ノードを作成（インライン要素を解析）
	 * TipTapスキーマ準拠: 空ノードは作成しない
	 */
	private static createParagraphNode(text: string): JSONContent {
		if (!text || text.trim().length === 0) {
			return {
				type: "paragraph",
				content: [{ type: "text", text: " " }],
			}
		}

		const content = MarkdownTipTapConverter.parseInlineElements(text)
		// 有効なコンテンツのみを保持
		const validContent = content.filter(node => {
			if (node.type === "text" && (!node.text || node.text.trim().length === 0)) {
				return false
			}
			return true
		})

		if (validContent.length === 0) {
			return {
				type: "paragraph",
				content: [{ type: "text", text: " " }],
			}
		}

		return {
			type: "paragraph",
			content: validContent,
		}
	}

	/**
	 * インライン要素を解析（Link, Image, 太字, 斜体, インラインコード）
	 */
	/**
	 * インライン要素を解析（Link, Image, 太字, 斜体, インラインコード）
	 * 軽量化: ログ出力を削除してメモリ効率を向上
	 */
	private static parseInlineElements(text: string): JSONContent[] {
		if (!text || !text.trim()) {
			return []
		}

		const elements: JSONContent[] = []
		const currentText = text

		// Link/Image のパターン（優先順位: Image > Link）
		const patterns = [
			{
				type: "image",
				regex: /!\[([^\]]*)\]\(([^)]+)\)/g,
				handler: (match: RegExpMatchArray) => ({
					type: "image",
					attrs: {
						src: match[2],
						alt: match[1] || "",
					},
				}),
			},
			{
				type: "link",
				regex: /\[([^\]]+)\]\(([^)]+)\)/g,
				handler: (match: RegExpMatchArray) => {
					let href = match[2] || ""
					const nestedLinkMatch = href.match(/^(https?:\/\/[^)]+)/)
					if (nestedLinkMatch?.[1]) {
						href = nestedLinkMatch[1]
					}

					// 🔧 セキュリティチェック: URL検証
					const isValidUrl = (url: string): boolean => {
						try {
							const urlObj = new URL(url)
							return ["http:", "https:", "mailto:"].includes(urlObj.protocol)
						} catch {
							return false
						}
					}

					if (!isValidUrl(href)) {
						log.warn("⚠️ Invalid URL in Markdown link:", href)
						// 無効なURLの場合はプレーンテキストとして返す
						return {
							type: "text",
							text: match[0] || "", // リンク記法全体をそのまま表示
						}
					}

					return {
						type: "text",
						text: match[1] || "",
						marks: [
							{
								type: "link",
								attrs: { href: href },
							},
						],
					}
				},
			},
		]

		// すべてのパターンをマッチして位置順にソート
		const matches: Array<{
			index: number
			length: number
			element: JSONContent
		}> = []

		for (const pattern of patterns) {
			let match
			pattern.regex.lastIndex = 0 // リセット
			while ((match = pattern.regex.exec(currentText)) !== null) {
				const element = pattern.handler(match)
				matches.push({
					index: match.index,
					length: match[0].length,
					element: element,
				})
			}
		}

		// 位置順にソート
		matches.sort((a, b) => a.index - b.index)

		// マッチした要素を順番に処理
		let textIndex = 0
		for (const matchInfo of matches) {
			// マッチ前のテキストを追加
			if (matchInfo.index > textIndex) {
				const beforeText = currentText.slice(textIndex, matchInfo.index)
				const beforeElements = MarkdownTipTapConverter.parseBasicFormatting(beforeText)
				elements.push(...beforeElements)
			}

			// マッチした要素を追加
			elements.push(matchInfo.element)
			textIndex = matchInfo.index + matchInfo.length
		}

		// 残りのテキストを処理
		if (textIndex < currentText.length) {
			const remainingText = currentText.slice(textIndex)
			const remainingElements = MarkdownTipTapConverter.parseBasicFormatting(remainingText)
			elements.push(...remainingElements)
		}

		// マッチがなかった場合は基本フォーマットのみ処理
		if (matches.length === 0) {
			return MarkdownTipTapConverter.parseBasicFormatting(currentText)
		}

		const filteredElements = elements.filter(el => el.text !== "" || el.type !== "text")
		return filteredElements
	}

	/**
	 * テーブルをパースする（キャッシュ機能削除済み）
	 */
	private static parseTableFromLines(
		lines: string[],
		startIndex: number
	): {
		table: JSONContent | null
		processedLines: number
	} {
		log.debug("📊 parseTableFromLines called with startIndex:", startIndex)
		log.debug("📊 Available lines from startIndex", {
			startIndex,
			availableCount: lines.length - startIndex,
		})

		const tableLines: string[] = []
		let currentIndex = startIndex

		// 🔥 キャッシュ機能完全削除 - シンプルな1回処理のみ
		const firstTableLine = lines[startIndex]?.trim()
		if (!firstTableLine) {
			return { table: null, processedLines: 0 }
		}

		log.debug("📊 Processing table starting - length:", firstTableLine?.length || 0)

		// テーブル行を収集（無限ループ防止: 先にインクリメントせず、条件チェック後にインクリメント）
		while (currentIndex < lines.length) {
			const line = lines[currentIndex]?.trim() || ""

			// 🔧 修正: テーブル行の判定を厳格化
			// 1. | が含まれ、かつ複数の | がある場合（最低2個以上）
			// 2. コードブロック内やスクリプトでない（|| や |& は除外）
			// 3. Bashコマンドパターン（&&, ||, command | pipe）は除外
			// 4. JavaScriptコードパターン（'6379'), など）も除外
			const pipeCount = (line.match(/\|/g) || []).length
			const hasLogicalOr = line.includes("||")
			const hasBackgroundProcess = line.includes("|&")
			const hasPipeToCommand = /^\s*[a-zA-Z][a-zA-Z0-9_-]*.*\|\s*[a-zA-Z][a-zA-Z0-9_-]+/.test(line) // "command | grep", "sort | head" etc
			const looksLikeBashCommand =
				line.includes("&&") ||
				line.includes("echo") ||
				line.includes("az ") ||
				/^\s*(ls|cd|grep|sort|head|tail|cat|mv|cp|rm)\s+/.test(line)
			const looksLikeJavaScript =
				line.includes("parseInt") ||
				line.includes("process.env") ||
				line.includes("'),") ||
				/[a-zA-Z_]+:\s*[a-zA-Z_]/.test(line)

			if (
				line.includes("|") &&
				pipeCount >= 2 &&
				!hasLogicalOr &&
				!hasBackgroundProcess &&
				!looksLikeBashCommand &&
				!hasPipeToCommand &&
				!looksLikeJavaScript
			) {
				tableLines.push(line)
				currentIndex++ // テーブル行が見つかった場合のみインクリメント
			} else {
				// 🔧 修正: テーブルの終了条件を正確に判定
				// 次の行に | がない場合はテーブル終了
				break
			}
		}

		if (tableLines.length < 2) {
			return { table: null, processedLines: 1 } // 🔧 修正: 最低1行は進めて無限ループ防止
		}

		// セパレータ行を検索（通常は2行目）
		let separatorIndex = -1
		for (let i = 0; i < tableLines.length; i++) {
			const line = tableLines[i] || ""
			// セパレータ検出: "-" を含む行をセパレータとみなす
			if (line.includes("|") && line.includes("-")) {
				separatorIndex = i
				break
			}
		}

		if (separatorIndex === -1) {
			return { table: null, processedLines: tableLines.length } // 🔥 修正: 処理した行数を返す
		}

		// ヘッダ行とデータ行を分離
		const headerLines = tableLines.slice(0, separatorIndex)
		const dataLines = tableLines.slice(separatorIndex + 1)

		if (headerLines.length === 0) {
			log.debug("❌ No header lines found")
			return { table: null, processedLines: tableLines.length } // 🔥 修正: 処理した行数を返す
		}

		// テーブル構造を構築
		const tableRows: JSONContent[] = []

		// ヘッダ行を処理
		for (const headerLine of headerLines) {
			const cells = MarkdownTipTapConverter.parseTableRow(headerLine, true)
			if (cells.length > 0) {
				tableRows.push({
					type: "tableRow",
					content: cells,
				})
			}
		}

		// データ行を処理
		for (const dataLine of dataLines) {
			const cells = MarkdownTipTapConverter.parseTableRow(dataLine, false)
			if (cells.length > 0) {
				tableRows.push({
					type: "tableRow",
					content: cells,
				})
			}
		}

		const finalTable = {
			type: "table",
			content: tableRows,
		}

		log.debug("📊 Created table structure", { rowCount: tableRows.length })

		// 🔥 キャッシュ削除済み - シンプルな1回処理
		log.debug(`🔥 RETURN: processedLines = ${tableLines.length}`)
		return {
			table: finalTable,
			processedLines: tableLines.length,
		}
	}

	/**
	 * テーブル行をセルに分解
	 */
	private static parseTableRow(line: string, isHeader: boolean): JSONContent[] {
		// |で分割（最初と最後の|を除去）
		const cellTexts = line
			.slice(1, -1)
			.split("|")
			.map(cell => cell.trim())

		return cellTexts.map(cellText => {
			const cellContent = MarkdownTipTapConverter.parseInlineElements(cellText)

			// 🔧 TipTapスキーマ準拠: tableHeader/tableCellの中身は必ずparagraphでラップ
			return {
				type: isHeader ? "tableHeader" : "tableCell",
				content: [
					{
						type: "paragraph",
						content:
							cellContent.length > 0 ? cellContent : [{ type: "text", text: cellText || " " }],
					},
				],
			}
		})
	}

	/**
	 * 基本的なフォーマット（太字、斜体、インラインコード）を処理
	 */
	private static parseBasicFormatting(text: string): JSONContent[] {
		if (!text) {
			return []
		}

		// シンプル実装: 基本的なマーク処理
		const elements: JSONContent[] = []

		// インラインコード: `code`
		const codeRegex = /`([^`]+)`/g
		let lastIndex = 0
		let match

		while ((match = codeRegex.exec(text)) !== null) {
			// コード前のテキスト
			if (match.index > lastIndex) {
				const beforeText = text.slice(lastIndex, match.index)
				if (beforeText) {
					elements.push(...MarkdownTipTapConverter.parseTextWithMarks(beforeText))
				}
			}

			// インラインコード
			elements.push({
				type: "text",
				text: match[1],
				marks: [{ type: "code" }],
			})

			lastIndex = match.index + match[0].length
		}

		// 残りのテキスト
		if (lastIndex < text.length) {
			const remainingText = text.slice(lastIndex)
			if (remainingText) {
				elements.push(...MarkdownTipTapConverter.parseTextWithMarks(remainingText))
			}
		}

		return elements.length > 0 ? elements : [{ type: "text", text }]
	}

	/**
	 * 太字・斜体マークを処理 - より正確な順序処理
	 */
	private static parseTextWithMarks(text: string): JSONContent[] {
		if (!text) {
			return []
		}

		// より正確な順序で処理: 先に太字（**）から処理し、次にイタリック（*）
		const elements: JSONContent[] = []

		// まず太字を見つけて保護
		const boldPattern = /\*\*([^*]+)\*\*/g
		const protectedTexts: string[] = []
		let protectedIndex = 0

		// 太字部分を一時保護
		let workingText = text.replace(boldPattern, (_match, content) => {
			const placeholder = `__BOLD_${protectedIndex}__`
			protectedTexts.push(`**${content}**`)
			protectedIndex++
			return placeholder
		})

		// イタリック処理: *text* （太字で保護された部分は除外）
		const italicPattern = /\*([^*]+)\*/g
		workingText = workingText.replace(italicPattern, (match, content, offset) => {
			// プレースホルダー内でないかチェック
			if (
				workingText
					.substring(Math.max(0, offset - 10), offset + match.length + 10)
					.includes("__BOLD_")
			) {
				return match // 太字プレースホルダー内なのでそのまま
			}
			const placeholder = `__ITALIC_${protectedIndex}__`
			protectedTexts.push(`*${content}*`)
			protectedIndex++
			return placeholder
		})

		// プレースホルダーを順番に復元しながら要素を構築
		let currentIndex = 0
		const placeholderPattern = /__(?:BOLD|ITALIC)_(\d+)__/g
		let match

		while ((match = placeholderPattern.exec(workingText)) !== null) {
			// プレースホルダー前のテキスト
			if (match.index > currentIndex) {
				const beforeText = workingText.slice(currentIndex, match.index)
				if (beforeText) {
					elements.push({ type: "text", text: beforeText })
				}
			}

			// 保護されたテキストを復元
			const protectedTextIndex = Number.parseInt(match[1] || "0")
			const protectedText = protectedTexts[protectedTextIndex]

			if (protectedText?.startsWith("**")) {
				const content = protectedText.slice(2, -2)
				elements.push({
					type: "text",
					text: content,
					marks: [{ type: "bold" }],
				})
			} else if (protectedText?.startsWith("*")) {
				const content = protectedText.slice(1, -1)
				elements.push({
					type: "text",
					text: content,
					marks: [{ type: "italic" }],
				})
			}

			currentIndex = match.index + match[0].length
		}

		// 残りのテキスト
		if (currentIndex < workingText.length) {
			const remainingText = workingText.slice(currentIndex)
			if (remainingText) {
				elements.push({ type: "text", text: remainingText })
			}
		}

		// 結果が空の場合は元のテキストを返す
		return elements.length > 0 ? elements : [{ type: "text", text }]
	}
}
