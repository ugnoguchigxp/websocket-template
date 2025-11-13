/**
 * Markdown書式の挿入を管理するカスタムフック
 */

import { type RefObject, useCallback } from "react"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("useMarkdownInsert")

interface MarkdownInsertHookOptions {
	textareaRef: RefObject<HTMLTextAreaElement | null>
	value: string
	onChange: (value: string) => void
}

interface MarkdownInsertHookResult {
	handleInsertMarkdown: (markdown: string) => void
}

export const useMarkdownInsert = ({
	textareaRef,
	value,
	onChange,
}: MarkdownInsertHookOptions): MarkdownInsertHookResult => {
	const handleInsertMarkdown = useCallback(
		(markdown: string) => {
			if (!textareaRef.current) return

			const textarea = textareaRef.current
			const start = textarea.selectionStart
			const end = textarea.selectionEnd
			const selectedText = value.substring(start, end)

			let insertText = ""
			let newCursorPos = start

			// フォーカスを確実にテキストエリアに設定
			textarea.focus()

			if (markdown.includes("()")) {
				// リンク用の特別処理
				insertText = `[${selectedText}](${selectedText ? "URL" : ""})`
				newCursorPos = start + 1 + selectedText.length + 2 // ](の間
			} else if (markdown.includes("**") || markdown.includes("~~") || markdown.includes("``")) {
				// 囲み書式の処理（インライン要素）
				let wrapper = ""
				if (markdown === "**") {
					wrapper = "**"
				} else if (markdown === "~~") {
					wrapper = "~~"
				} else if (markdown === "``") {
					wrapper = "`"
				} else if (markdown === "*") {
					wrapper = "*"
				} else {
					wrapper = markdown.substring(0, markdown.length / 2)
				}

				if (selectedText) {
					insertText = wrapper + selectedText + wrapper
					newCursorPos = end + wrapper.length * 2
				} else {
					insertText = wrapper + wrapper
					newCursorPos = start + wrapper.length
				}
			} else if (markdown.includes("```")) {
				// コードブロックの特別処理
				if (selectedText) {
					insertText = `\`\`\`\n${selectedText}\n\`\`\``
					newCursorPos = start + 4 // コードブロック内の開始位置
				} else {
					insertText = "```\n\n```"
					newCursorPos = start + 4 // コードブロック内の開始位置
				}
			} else if (markdown.startsWith("#")) {
				// 見出しの特別処理
				handleHeadingInsertion(markdown, selectedText, start, end)
				return
			} else if (
				markdown.startsWith(">") ||
				markdown.startsWith("-") ||
				markdown.startsWith("1.")
			) {
				// ブロックレベル要素の処理
				handleBlockLevelInsertion(markdown, selectedText, start, end)
				return
			} else {
				// その他の要素（テーブルなど）
				if (selectedText) {
					insertText = markdown + selectedText
					newCursorPos = start + markdown.length + selectedText.length
				} else {
					insertText = markdown
					newCursorPos = start + markdown.length
				}
			}

			// ブラウザ標準のexecCommandを使用してUndo/Redo履歴に残す
			try {
				textarea.setSelectionRange(start, end)
				document.execCommand("insertText", false, insertText)

				setTimeout(() => {
					if (textareaRef.current) {
						textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
					}
				}, 0)
			} catch {
				// execCommandが使えない場合のフォールバック
				log.warn("execCommand not supported, falling back to direct manipulation")
				const newText = value.substring(0, start) + insertText + value.substring(end)
				onChange(newText)

				setTimeout(() => {
					if (textareaRef.current) {
						textareaRef.current.focus()
						textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
					}
				}, 0)
			}
		},
		[value, onChange, textareaRef]
	)

	// 見出しの挿入処理
	const handleHeadingInsertion = useCallback(
		(markdown: string, selectedText: string, start: number, end: number) => {
			if (selectedText) {
				// 選択されたテキストがある場合
				const lines = selectedText.split("\n")
				const processedLines = lines.map(line => {
					if (line.trim() === "") return line
					return markdown + line
				})

				const hasNewlineBefore = start === 0 || value.charAt(start - 1) === "\n"
				const hasNewlineAfter = end === value.length || value.charAt(end) === "\n"

				const beforeNewline = hasNewlineBefore ? "" : "\n"
				const afterNewline = hasNewlineAfter ? "" : "\n\n"

				const insertText = beforeNewline + processedLines.join("\n") + afterNewline
				const newCursorPos =
					start + beforeNewline.length + processedLines.join("\n").length + afterNewline.length

				const newText = value.substring(0, start) + insertText + value.substring(end)
				onChange(newText)

				setTimeout(() => {
					if (textareaRef.current) {
						textareaRef.current.focus()
						textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
					}
				}, 0)
			} else {
				// 選択がない場合、現在の行を見出しに変換
				const lineStart = value.lastIndexOf("\n", start - 1) + 1
				const lineEnd = value.indexOf("\n", start)
				const currentLineEnd = lineEnd === -1 ? value.length : lineEnd
				const currentLine = value.substring(lineStart, currentLineEnd)

				if (currentLine.startsWith(markdown)) {
					// プレフィックスを削除
					const newLine = currentLine.substring(markdown.length)
					const beforeLine = value.substring(0, lineStart)
					const afterLine = value.substring(currentLineEnd)
					const newText = beforeLine + newLine + afterLine

					onChange(newText)
					const newCursorPos = Math.max(lineStart, start - markdown.length)

					setTimeout(() => {
						if (textareaRef.current) {
							textareaRef.current.focus()
							textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
						}
					}, 0)
				} else {
					// 見出しに変換
					const hasContentBefore = lineStart > 0 && value.substring(0, lineStart - 1).trim() !== ""
					const hasContentAfter =
						currentLineEnd < value.length && value.substring(currentLineEnd + 1).trim() !== ""

					const beforeNewline = hasContentBefore ? "\n" : ""
					const afterNewline = hasContentAfter ? "\n\n" : "\n"

					const beforeLine = value.substring(0, lineStart)
					const afterLine = value.substring(lineStart)
					const newText =
						beforeLine +
						beforeNewline +
						markdown +
						afterLine +
						(currentLine.trim() === "" ? afterNewline : "")

					onChange(newText)
					const newCursorPos = lineStart + beforeNewline.length + markdown.length

					setTimeout(() => {
						if (textareaRef.current) {
							textareaRef.current.focus()
							textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
						}
					}, 0)
				}
			}
		},
		[value, onChange, textareaRef]
	)

	// ブロックレベル要素の挿入処理
	const handleBlockLevelInsertion = useCallback(
		(markdown: string, selectedText: string, start: number, end: number) => {
			if (selectedText) {
				// 選択されたテキストがある場合、各行にプレフィックスを適用
				const lines = selectedText.split("\n")
				const processedLines = lines.map(line => {
					if (line.trim() === "") return line
					return markdown + line
				})
				const insertText = processedLines.join("\n")
				const newCursorPos = end + processedLines.length * markdown.length

				const newText = value.substring(0, start) + insertText + value.substring(end)
				onChange(newText)

				setTimeout(() => {
					if (textareaRef.current) {
						textareaRef.current.focus()
						textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
					}
				}, 0)
			} else {
				// 現在の行にプレフィックスを適用
				const lineStart = value.lastIndexOf("\n", start - 1) + 1
				const lineEnd = value.indexOf("\n", start)
				const currentLineEnd = lineEnd === -1 ? value.length : lineEnd
				const currentLine = value.substring(lineStart, currentLineEnd)

				if (currentLine.startsWith(markdown)) {
					// プレフィックスを削除
					const newLine = currentLine.substring(markdown.length)
					const beforeLine = value.substring(0, lineStart)
					const afterLine = value.substring(currentLineEnd)
					const newText = beforeLine + newLine + afterLine

					onChange(newText)
					const newCursorPos = Math.max(lineStart, start - markdown.length)

					setTimeout(() => {
						if (textareaRef.current) {
							textareaRef.current.focus()
							textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
						}
					}, 0)
				} else {
					// プレフィックスを追加
					const beforeLine = value.substring(0, lineStart)
					const afterLine = value.substring(lineStart)
					const newText = beforeLine + markdown + afterLine

					onChange(newText)
					const newCursorPos = start + markdown.length

					setTimeout(() => {
						if (textareaRef.current) {
							textareaRef.current.focus()
							textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
						}
					}, 0)
				}
			}
		},
		[value, onChange, textareaRef]
	)

	return {
		handleInsertMarkdown,
	}
}
