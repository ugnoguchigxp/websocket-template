/**
 * Markdown Preview Component
 *
 * A reusable component for rendering markdown content with:
 * - Custom markdown parsing for better control
 * - Table support with manual parsing
 * - Security-first approach
 * - Comprehensive markdown element support
 *
 * Used across the application for consistent markdown rendering
 */

import type React from "react"
import { useCallback, useState } from "react"

import { FiCopy } from "react-icons/fi"
import { useNavigate } from "react-router-dom"

interface MarkdownPreviewProps {
	content: string
	className?: string
	isMobile?: boolean
	isSlideshow?: boolean
	format?: "docx" | "pptx"
}

// テーブルセル内のマークダウンを処理するヘルパー関数
const parseInlineMarkdown = (text: string): string => {
	// まず危険な文字をエスケープ（HTMLタグ生成前）
	const processedText = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")

	// その後マークダウン記法を処理
	return (
		processedText
			// インラインコード
			.replace(
				/`([^`]+)`/g,
				'<code class="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-900 border border-gray-300 rounded font-mono">$1</code>'
			)

			// リンク（エスケープ済みの文字列を扱うため、エスケープされた記号で検索）
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
				// URL validation（エスケープを一時的に戻して検証）
				const unescapedUrl = url
					.replace(/&amp;/g, "&")
					.replace(/&lt;/g, "<")
					.replace(/&gt;/g, ">")
					.replace(/&quot;/g, '"')
					.replace(/&#39;/g, "'")

				const isValidUrl = (url: string): boolean => {
					try {
						const urlObj = new URL(url)
						return ["http:", "https:", "mailto:"].includes(urlObj.protocol)
					} catch {
						return (
							!url.startsWith("javascript:") &&
							!url.includes("<") &&
							!url.includes(">") &&
							!url.includes('"')
						)
					}
				}

				if (!isValidUrl(unescapedUrl)) {
					return `<span class="text-gray-500">${linkText}</span>`
				}

				const isExternalLink = (url: string): boolean => {
					try {
						const urlObj = new URL(url)
						return urlObj.hostname !== window.location.hostname
					} catch {
						return false
					}
				}

				const shouldOpenInNewTab = isExternalLink(unescapedUrl)
				const targetAttr = shouldOpenInNewTab ? ' target="_blank"' : ""
				const relAttr = shouldOpenInNewTab ? ' rel="noopener noreferrer"' : ""
				const externalIcon = shouldOpenInNewTab
					? '<span class="ml-1 text-xs text-gray-400">↗</span>'
					: ""

				return `<a href="${unescapedUrl}" class="text-blue-600 hover:text-blue-800 underline"${targetAttr}${relAttr}>${linkText}${externalIcon}</a>`
			})

			// チェックボックス - チェック済み [x]
			.replace(
				/\[x\]/g,
				'<span class="inline-flex items-center justify-center w-4 h-4 mr-2 bg-blue-500 border border-blue-500 rounded text-white text-xs font-bold">✓</span>'
			)

			// チェックボックス - 未チェック [ ]
			.replace(
				/\[\s\]/g,
				'<span class="inline-flex items-center justify-center w-4 h-4 mr-2 bg-white border-2 border-gray-300 rounded"></span>'
			)

			// 太字・斜体
			.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
			.replace(/\*(.+?)\*/g, '<em class="italic text-gray-700">$1</em>')
	)
}

// Enhanced table parser with better handling for MS document formats
const parseTable = (content: string, isMobile = false, isSlideshow = false) => {
	const tableRegex = /(\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)*)/g
	const tables: { match: string; html: string }[] = []

	let match
	while ((match = tableRegex.exec(content)) !== null) {
		const tableText = match[1]
		if (!tableText) continue

		const lines = tableText.trim().split("\n")

		if (lines.length >= 2) {
			const headerRow = lines[0]
			const dataRows = lines.slice(2)

			if (!headerRow) continue

			// ヘッダー解析 - より正確な分割処理
			const headers = headerRow
				.split("|")
				.map(h => h.trim())
				.filter((h, index, arr) => {
					// 最初と最後の空の要素を除外
					return !(h === "" && (index === 0 || index === arr.length - 1))
				})

			// データ行解析 - より正確な分割処理
			const rows = dataRows
				.map(row => {
					const cells = row
						.split("|")
						.map(cell => cell.trim())
						.filter((cell, index, arr) => {
							// 最初と最後の空の要素を除外
							return !(cell === "" && (index === 0 || index === arr.length - 1))
						})
					return cells
				})
				.filter(row => row.length > 0)

			// スタイリング設定 - スライドショー/通常/モバイル対応
			const tablePadding = isSlideshow ? "px-2 py-1" : isMobile ? "px-2 py-1" : "px-4 py-2"
			const headerPadding = isSlideshow ? "px-2 py-1" : isMobile ? "px-2 py-1" : "px-4 py-2"
			const textSize = isSlideshow ? "text-xs" : isMobile ? "text-xs" : "text-sm"
			const headerSize = isSlideshow ? "text-xs" : isMobile ? "text-xs" : "text-sm"
			const borderColor = isSlideshow ? "border-gray-300" : "border-gray-200"
			const headerBg = isSlideshow ? "bg-gray-100" : "bg-gray-50"

			// HTML生成（テーブル用横スクロールコンテナ強化）
			let tableHtml = `<div class="overflow-x-auto overflow-y-hidden ${borderColor} border rounded-lg max-w-full my-4" style="max-width: 100%; width: 100%;"><div class="min-w-max"><table class="w-full border-collapse">`

			// ヘッダー
			tableHtml += `<thead class="${headerBg}"><tr class="border-b ${borderColor}">`
			headers.forEach((header, index) => {
				const processedHeader = parseInlineMarkdown(header)
				const rightBorder = index < headers.length - 1 ? `border-r ${borderColor}` : ""
				tableHtml += `<th class="${headerPadding} ${rightBorder} text-left ${headerSize} font-semibold text-gray-900 min-w-0 break-words">${processedHeader}</th>`
			})
			tableHtml += "</tr></thead>"

			// ボディ
			tableHtml += '<tbody class="bg-white">'
			rows.forEach((row, rowIndex) => {
				const bottomBorder = rowIndex < rows.length - 1 ? `border-b ${borderColor}` : ""
				tableHtml += `<tr class="${bottomBorder}">`
				row.forEach((cell, cellIndex) => {
					const rightBorder = cellIndex < row.length - 1 ? `border-r ${borderColor}` : ""
					const processedCell = parseInlineMarkdown(cell)
					tableHtml += `<td class="${tablePadding} ${rightBorder} ${textSize} text-gray-700 min-w-0 break-words">${processedCell}</td>`
				})
				tableHtml += "</tr>"
			})
			tableHtml += "</tbody></table></div></div>"

			tables.push({ match: tableText, html: tableHtml })
		}
	}

	return tables
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
	content,
	className = "",
	isMobile = false,
	isSlideshow = false,
	format = "docx",
}) => {
	const [copied, setCopied] = useState(false)
	const navigate = useNavigate()

	// Suppress unused variable warning - format parameter reserved for future use
	void format

	// Helper function to generate anchor ID from heading text
	const generateAnchorId = (text: string): string => {
		return text
			.toLowerCase()
			.replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "") // Remove special chars but keep Japanese
			.replace(/\s+/g, "-") // Replace spaces with hyphens
			.trim()
	}

	// 入力値を安全に文字列として扱う
	const safeContent = typeof content === "string" ? content : String(content || "")

	// テーブルを手動で解析・変換
	const tables = parseTable(safeContent, isMobile, isSlideshow)
	let processedContent = safeContent

	tables.forEach((table, index) => {
		processedContent = processedContent.replace(table.match, `__TABLE__${index}__`)
	})

	// コードブロック（```）を事前処理 - シンプルな``` ```制御のみ
	const processCodeBlocks = (text: string): { processedText: string; codeBlocks: string[] } => {
		const codeBlocks: string[] = []

		// シンプルな```制御のみ - 複雑な条件は一切無し
		let processedText = typeof text === "string" ? text : String(text || "")
		let blockIndex = 0

		// ```で始まって```で終わる部分をすべて検出
		const parts = processedText.split("```")

		// 奇数番目がコードブロック内容
		for (let i = 0; i < parts.length; i++) {
			if (i % 2 === 1) {
				// コードブロック部分
				const codeContent = parts[i]

				// 最初の改行で言語名とコード内容を分離
				const lines = (codeContent || "").split("\n")
				const language = lines[0]?.trim() || ""
				const code = lines.slice(1).join("\n").trim()

				if (code) {
					// HTMLエスケープ
					const escapedCode = code
						.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
						.replace(/"/g, "&quot;")
						.replace(/'/g, "&#39;")

					const codePadding = isMobile ? "p-2" : "p-4"
					const codeTextSize = isMobile ? "text-xs" : "text-sm"
					const codeMargin = isMobile ? "my-2" : "my-3"

					// 言語ラベル
					const languageLabel = language
						? `<div class="px-3 py-1 text-xs font-mono text-gray-400 border-b border-slate-600 bg-slate-800">${language}</div>`
						: ""

					// コードブロックHTML生成
					const styledCodeBlock = `<div class="bg-slate-700 rounded-lg overflow-hidden border border-slate-500 ${codeMargin} max-w-full w-full" style="max-width: 800px;">${languageLabel}<pre class="overflow-x-auto"><code class="${codeTextSize} font-mono whitespace-pre block leading-relaxed text-gray-200 ${codePadding}">${escapedCode}</code></pre></div>`
					codeBlocks.push(styledCodeBlock)

					// プレースホルダーで置換
					parts[i] = `__CODEBLOCK__${blockIndex}__`
					blockIndex++
				}
			}
		}

		processedText = parts.join("")

		return { processedText, codeBlocks }
	}

	// インデントレベルでスコープを判断するMarkdownパーサー
	const parseMarkdown = (text: string): string => {
		// 行をスコープ別に分類
		const lines = text.split("\n")
		const scopedLines: Array<{
			content: string
			indentLevel: number
			type: "heading" | "list" | "text" | "empty" | "hr"
			originalIndex: number
		}> = []

		lines.forEach((line, index) => {
			const indentMatch = line.match(/^(\s*)/)
			const indentLevel = indentMatch?.[1]?.length || 0
			const content = line.trim()

			let type: "heading" | "list" | "text" | "empty" | "hr" = "text"

			if (!content) {
				type = "empty"
			} else if (content === "---") {
				type = "hr"
			} else if (content.match(/^#{1,6}\s/)) {
				type = "heading"
			} else if (content.match(/^[-*+]\s/) || content.match(/^\d+\.\s/)) {
				type = "list"
			}

			scopedLines.push({
				content,
				indentLevel,
				type,
				originalIndex: index,
			})
		})

		// スコープ別にグループ化してHTML生成
		let result = ""
		let currentListLevel = -1
		let isInList = false

		scopedLines.forEach(lineInfo => {
			const { content, indentLevel, type } = lineInfo

			// 見出し処理
			if (type === "heading") {
				if (isInList) {
					result += "</ul>"
					isInList = false
					currentListLevel = -1
				}

				if (content.startsWith("# ")) {
					const headingText = content.substring(2)
					const anchorId = generateAnchorId(headingText)
					const sizeClass = isSlideshow ? "text-lg" : isMobile ? "text-2xl" : "text-3xl"
					const marginClass = isSlideshow
						? "mb-1 text-center"
						: isMobile
							? "mb-1 mt-2"
							: "mb-2 mt-3"
					const paddingClass = isSlideshow ? "pb-1" : isMobile ? "pb-1" : "pb-2"
					const borderClass = isSlideshow ? "" : "border-b border-gray-200"
					result += `<h1 id="${anchorId}" class="${sizeClass} font-bold text-gray-900 ${marginClass} ${borderClass} ${paddingClass}">${headingText}</h1>`
				} else if (content.startsWith("## ")) {
					const headingText = content.substring(3)
					const anchorId = generateAnchorId(headingText)
					const sizeClass = isSlideshow ? "text-base" : isMobile ? "text-xl" : "text-2xl"
					const marginClass = isSlideshow
						? "mb-1 text-center"
						: isMobile
							? "mb-1 mt-1"
							: "mb-1 mt-2"
					result += `<h2 id="${anchorId}" class="${sizeClass} font-semibold text-gray-800 ${marginClass}">${headingText}</h2>`
				} else if (content.startsWith("### ")) {
					const headingText = content.substring(4)
					const anchorId = generateAnchorId(headingText)
					const sizeClass = isSlideshow ? "text-sm" : isMobile ? "text-lg" : "text-xl"
					const marginClass = isSlideshow ? "mb-1" : isMobile ? "mb-0 mt-1" : "mb-1 mt-1"
					result += `<h3 id="${anchorId}" class="${sizeClass} font-medium text-gray-700 ${marginClass}">${headingText}</h3>`
				} else if (content.startsWith("#### ")) {
					const headingText = content.substring(5)
					const anchorId = generateAnchorId(headingText)
					const sizeClass = isSlideshow ? "text-sm" : isMobile ? "text-lg" : "text-xl"
					const marginClass = isSlideshow ? "mb-0" : isMobile ? "mb-0 mt-1" : "mb-0 mt-1"
					result += `<h4 id="${anchorId}" class="${sizeClass} font-medium text-gray-700 ${marginClass}">${headingText}</h4>`
				} else if (content.startsWith("##### ")) {
					const headingText = content.substring(6)
					const anchorId = generateAnchorId(headingText)
					const sizeClass = isSlideshow ? "text-sm" : isMobile ? "text-base" : "text-lg"
					const marginClass = isSlideshow ? "mb-0" : isMobile ? "mb-0 mt-1" : "mb-0 mt-1"
					result += `<h5 id="${anchorId}" class="${sizeClass} font-medium text-gray-700 ${marginClass}">${headingText}</h5>`
				}
			}
			// 水平線処理
			else if (type === "hr") {
				if (isInList) {
					result += "</ul>"
					isInList = false
					currentListLevel = -1
				}
				result += '<hr class="my-3 border-gray-300 border-t-2">'
			}
			// リスト項目処理
			else if (type === "list") {
				// インデントレベルが変わった場合はリストを終了
				if (isInList && indentLevel !== currentListLevel) {
					result += "</ul>"
					isInList = false
				}

				if (!isInList) {
					const listSpacing = isSlideshow ? "space-y-0 my-0" : "space-y-0 my-0"
					result += `<ul class="list-none ${listSpacing}">`
					isInList = true
					currentListLevel = indentLevel
				}

				const listContent = content.replace(/^[-*+]\s/, "").replace(/^\d+\.\s/, "")
				const textSize = isSlideshow ? "text-sm" : "text-base"
				const bulletStyle = isSlideshow ? "text-gray-600 font-bold text-sm" : "text-gray-600"

				if (isSlideshow) {
					result += `<li class="flex items-start gap-1"><span class="${bulletStyle}">•</span><span class="${textSize} text-gray-700 leading-tight">${listContent}</span></li>`
				} else {
					result += `<li class="text-gray-700 leading-tight">• ${listContent}</li>`
				}
			}
			// 通常のテキスト処理
			else if (type === "text" && content) {
				if (isInList) {
					result += "</ul>"
					isInList = false
					currentListLevel = -1
				}

				// 太字の見出し項目（**項目名**:の形式）を独立した見出しとして処理
				if (content.match(/^\*\*[^*]+\*\*:?\s*$/)) {
					const marginClass = isSlideshow ? "mt-2 mb-1" : isMobile ? "mt-2 mb-1" : "mt-3 mb-1"
					result += `<div class="font-semibold text-gray-900 ${marginClass}">${content}</div>`
				} else {
					const textSize = isSlideshow ? "text-sm" : "text-base"
					const marginClass = isSlideshow ? "mb-1" : isMobile ? "mb-0" : "mb-0"
					result += `<p class="${textSize} text-gray-700 ${marginClass} leading-tight break-words">${content}</p>`
				}
			}
			// 空行処理
			else if (type === "empty") {
				if (isInList) {
					result += "</ul>"
					isInList = false
					currentListLevel = -1
				}
				result += "<br>"
			}
		})

		// 最後にリストが開いている場合は閉じる
		if (isInList) {
			result += "</ul>"
		}

		// インライン要素の処理
		result = result
			// 強制改行（行末の2つ以上のスペース）を<br>に変換
			.replace(/ {2,}$/gm, "<br>")

			// インラインコード
			.replace(/`([^`]+)`/g, (_, code) => {
				const codeClass = isMobile ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"
				return `<code class="${codeClass} bg-gray-200 text-gray-900 border border-gray-300 rounded font-mono">${code}</code>`
			})

			// 画像 - リンクより先に処理
			.replace(/!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g, (_, altText, url, title) => {
				// URL validation for images
				const isValidUrl = (url: string): boolean => {
					try {
						const urlObj = new URL(url)
						return ["http:", "https:", "data:"].includes(urlObj.protocol)
					} catch {
						// Relative URLs are also valid
						return !url.startsWith("javascript:") && !url.includes("<") && !url.includes(">")
					}
				}

				if (!isValidUrl(url)) {
					return `<span class="text-gray-500 italic">画像: ${altText || "Invalid URL"}</span>`
				}

				// サイズ指定の解析（title属性から）
				// コンテナ範囲内で適切に表示し、必要に応じてスクロール可能にする
				let sizeClass = "max-w-full h-auto"

				if (title) {
					// サイズ指定の形式: "width:300px" や "width:50%" や "small", "medium", "large"
					if (title.includes("width:")) {
						const width = title.match(/width:\s*([^;\s]+)/)?.[1]
						if (width) {
							if (width.includes("%")) {
								// パーセント指定は最大幅として扱う
								sizeClass = `w-[${width}] max-w-full h-auto`
							} else if (width.includes("px")) {
								// ピクセル指定は推奨幅として扱う、ただし最大幅を超えない
								sizeClass = `w-[${width}] max-w-full h-auto`
							} else {
								// 数値のみの場合はピクセルとして扱う
								sizeClass = `w-[${width}px] max-w-full h-auto`
							}
						}
					} else if (title.includes("height:")) {
						const height = title.match(/height:\s*([^;\s]+)/)?.[1]
						if (height) {
							if (height.includes("%")) {
								sizeClass = `h-[${height}] max-w-full w-auto`
							} else if (height.includes("px")) {
								sizeClass = `h-[${height}] max-w-full w-auto`
							} else {
								sizeClass = `h-[${height}px] max-w-full w-auto`
							}
						}
					} else {
						// プリセットサイズ - 推奨サイズとして扱い、コンテナを超えない
						switch (title.toLowerCase()) {
							case "small":
							case "sm":
								sizeClass = "w-32 max-w-full h-auto"
								break
							case "medium":
							case "md":
								sizeClass = "w-64 max-w-full h-auto"
								break
							case "large":
							case "lg":
								sizeClass = "w-96 max-w-full h-auto"
								break
							case "thumbnail":
							case "thumb":
								sizeClass = "w-16 h-16 object-cover"
								break
							case "icon":
								sizeClass = "w-8 h-8 object-cover"
								break
							case "responsive":
								// レスポンシブモードは完全に親コンテナに合わせる
								sizeClass = "w-full h-auto"
								break
							case "fit-content":
								// コンテンツサイズに合わせるが、コンテナを超えない
								sizeClass = "w-auto h-auto max-w-full max-h-full"
								break
							default: {
								// カスタムサイズの場合（例: "300x200"）
								const customSize = title.match(/^(\d+)x(\d+)$/)
								if (customSize) {
									sizeClass = `w-[${customSize[1]}px] h-[${customSize[2]}px] max-w-full max-h-full object-contain`
								}
								break
							}
						}
					}
				}

				return `<img src="${url}" alt="${altText || ""}" class="${sizeClass} rounded-lg shadow-sm border border-gray-200 my-2" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';" /><div class="text-gray-500 italic text-sm hidden">画像の読み込みに失敗しました: ${altText || url}</div>`
			})

			// リンク
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
				// URL validation and security checks
				const isValidUrl = (url: string): boolean => {
					try {
						const urlObj = new URL(url)
						return ["http:", "https:", "mailto:"].includes(urlObj.protocol)
					} catch {
						// 相対パスの場合もバリデーション
						return (
							!url.startsWith("javascript:") &&
							!url.includes("<") &&
							!url.includes(">") &&
							!url.includes('"')
						)
					}
				}

				const isExternalLink = (url: string): boolean => {
					try {
						const urlObj = new URL(url)
						return urlObj.hostname !== window.location.hostname
					} catch {
						// 相対パスは内部リンクとして扱う
						return false
					}
				}

				const isAbsoluteUrl = (url: string): boolean => {
					try {
						new URL(url)
						return true
					} catch {
						return false
					}
				}

				// Check if it's an anchor link (starts with #)
				const isAnchorLink = url.startsWith("#")

				if (!isValidUrl(url) && !isAnchorLink) {
					return `<span class="text-gray-500">${text}</span>`
				}

				const shouldOpenInNewTab = isAbsoluteUrl(url) && isExternalLink(url)
				const targetAttr = shouldOpenInNewTab ? ' target="_blank"' : ""
				const relAttr = shouldOpenInNewTab ? ' rel="noopener noreferrer"' : ""
				const externalIcon = shouldOpenInNewTab
					? '<span class="ml-1 text-xs text-gray-400">↗</span>'
					: ""

				// Add data attribute for anchor links to handle them differently in JavaScript
				const anchorAttr = isAnchorLink ? ' data-anchor-link="true"' : ""

				return `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline break-words"${targetAttr}${relAttr}${anchorAttr}>${text}${externalIcon}</a>`
			})

			// 引用
			.replace(
				/^> (.+$)/gm,
				'<blockquote class="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50 text-gray-700 my-3 rounded-r-md"><span class="text-gray-600 italic">$1</span></blockquote>'
			)

			// チェックボックス - チェック済み [x]
			.replace(
				/\[x\]/g,
				'<span class="inline-flex items-center justify-center w-4 h-4 mr-2 bg-blue-500 border border-blue-500 rounded text-white text-xs font-bold">✓</span>'
			)

			// チェックボックス - 未チェック [ ]
			.replace(
				/\[\s\]/g,
				'<span class="inline-flex items-center justify-center w-4 h-4 mr-2 bg-white border-2 border-gray-300 rounded"></span>'
			)

			// 太字・斜体 - スライドショー対応
			.replace(/\*\*(.+?)\*\*/g, (_, text) => {
				const boldStyle = isSlideshow ? "font-bold text-gray-800" : "font-bold text-gray-900"
				return `<strong class="${boldStyle}">${text}</strong>`
			})
			.replace(/\*(.+?)\*/g, '<em class="italic text-gray-700">$1</em>')

		return result
	}

	// コードブロックを処理
	const { processedText: codeProcessedContent, codeBlocks } = processCodeBlocks(processedContent)

	const htmlContent = codeProcessedContent
		.split(/(__TABLE__\d+__|__CODEBLOCK__\d+__)/)
		.map(part => {
			const tableMatch = part.match(/^__TABLE__(\d+)__$/)
			if (tableMatch?.[1]) {
				const tableIndex = Number.parseInt(tableMatch[1])
				return tables[tableIndex]?.html || ""
			}

			const codeMatch = part.match(/^__CODEBLOCK__(\d+)__$/)
			if (codeMatch?.[1]) {
				const codeIndex = Number.parseInt(codeMatch[1])
				return codeBlocks[codeIndex] || ""
			}

			return parseMarkdown(part)
		})
		.join("")

	// Handle clicks on links within the HTML content
	const handleClick = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			const target = event.target as HTMLElement

			// Check if the clicked element is a link
			if (target.tagName === "A") {
				const link = target as HTMLAnchorElement
				const href = link.getAttribute("href")

				if (href) {
					// Handle anchor links first (same page navigation)
					if (href.startsWith("#") && link.getAttribute("data-anchor-link") === "true") {
						event.preventDefault()
						const targetId = href.substring(1)
						const targetElement = document.getElementById(targetId)

						if (targetElement) {
							// Smooth scroll to the target element
							targetElement.scrollIntoView({
								behavior: "smooth",
								block: "start",
							})

							// Optionally update the URL hash without causing a page reload
							window.history.replaceState(null, "", href)
						}
						return
					}

					// For external links with target="_blank", let the browser handle it normally
					if (link.getAttribute("target") === "_blank") {
						return
					}

					// For internal relative links, use React Router navigation
					const isAbsoluteUrl =
						href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")

					if (!isAbsoluteUrl) {
						// Prevent default browser navigation
						event.preventDefault()

						// Special handling for wiki files (ending with .md)
						if (href.endsWith(".md")) {
							// Clean up relative path markers and handle various path formats
							let cleanPath = href

							// Handle relative paths like "../file.md", "./file.md", etc.
							if (href.startsWith("./")) {
								cleanPath = href.substring(2) // Remove "./"
							} else if (href.startsWith("../")) {
								// For now, just remove the "../" and treat as direct file reference
								// This might need more sophisticated logic depending on the current location
								cleanPath = href.replace(/\.\.\//g, "") // Remove all "../"
							}

							// Navigate to wiki page using the actual file path including .md extension
							// Encode each path component separately to handle special characters properly
							const encodedPath = cleanPath
								.split("/")
								.map(part => encodeURIComponent(part))
								.join("/")

							navigate(`/wiki/${encodedPath}`)
							return
						}

						// Use React Router for internal navigation
						if (href.startsWith("/")) {
							// Absolute path within the app
							navigate(href)
						} else {
							// Relative path - resolve it against current location
							const currentPath = window.location.pathname
							const resolvedPath = new URL(href, window.location.origin + currentPath).pathname
							navigate(resolvedPath)
						}
					}
				}
			}
		},
		[navigate]
	)

	// Copy markdown content to clipboard
	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(content)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000) // Hide message after 2 seconds
		} catch {
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement("textarea")
			textArea.value = content
			document.body.appendChild(textArea)
			textArea.focus()
			textArea.select()
			try {
				document.execCommand("copy")
				setCopied(true)
				setTimeout(() => setCopied(false), 2000)
			} catch {
				// Silent failure - copy functionality not available
			}
			document.body.removeChild(textArea)
		}
	}, [content])

	return (
		<div
			className={`markdown-preview relative max-w-full overflow-auto ${className}`}
			style={{ maxWidth: "100vw", width: "100%" }}
		>
			{/* Copy button in top-right corner - sticky positioned */}
			<button
				onClick={handleCopy}
				className={`sticky top-0 right-0 float-right ${isMobile ? "p-1.5" : "p-2"} bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 z-20 group ${isMobile ? "ml-1 mb-1" : "ml-2 mb-2"}`}
				title="コピー"
				type="button"
				aria-label="マークダウンをコピー"
			>
				<FiCopy className="w-4 h-4 text-gray-600" />
				{/* Custom tooltip */}
				<div className="absolute top-full right-0 mt-2 px-2 py-1 text-xs text-white bg-blue-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
					{copied ? "コピーしました" : "コピー"}
				</div>
			</button>

			<div
				className="text-gray-700 leading-tight break-words overflow-wrap-anywhere max-w-full min-w-0 text-base"
				style={{ fontFamily: '"Meiryo", "メイリオ", sans-serif', fontSize: "1rem" }}
				dangerouslySetInnerHTML={{
					__html: htmlContent,
				}}
				onClick={handleClick}
			/>
		</div>
	)
}
