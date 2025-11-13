import React, { useState, useCallback, useEffect } from "react"

import { Extension } from "@tiptap/core"
import CharacterCount from "@tiptap/extension-character-count"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import Typography from "@tiptap/extension-typography"
import { type Editor, EditorContent, useEditor } from "@tiptap/react"
import type { JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { common, createLowlight } from "lowlight"
import { Plugin, PluginKey } from "prosemirror-state"

import { createContextLogger } from "@/modules/logger"

import { MarkdownToolbar } from "../../MarkdownToolbar"
import JsonToMarkdownConverter from "../converters/JsonToMarkdownConverter"
import { MarkdownTipTapConverter } from "../converters/MarkdownTipTapConverter"
import { useTableToolbar } from "../hooks/useTableToolbar"
import { type ISelectionInfo, SelectionUtils } from "../utils/selectionUtils"

import { LinkContextMenu } from "./LinkContextMenu"
import { MarkdownSyntaxStatus } from "./MarkdownSyntaxStatus"
import { type IPasteEvent, PasteDebugPanel } from "./PasteDebugPanel"
import { TableContextMenu } from "./TableContextMenu"
import { TableEdgeControls } from "./TableEdgeControls"
import { TableToolbar } from "./TableToolbar"

const log = createContextLogger("MarkdownAdvanceEditor")

// 🔧 TypeScript型定義の改善
interface ExtendedEditor extends Editor {
	__isProcessing?: boolean
	__preventUpdate?: boolean
}

// 🔧 セキュリティユーティリティ関数
const isValidUrl = (url: string): boolean => {
	try {
		const urlObj = new URL(url)
		return ["http:", "https:", "mailto:"].includes(urlObj.protocol)
	} catch (error) {
		logger.debug("URL validation failed", { url, error })
		return false
	}
}

const sanitizeText = (text: string): string => {
	return text
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
}

// 🔧 パフォーマンス最適化: ログレベル制御
const logger = {
	debug: log.debug,
	info: log.info,
	warn: log.warn,
	error: log.error,
}

// カスタムTable拡張は一旦全て無効化し、TipTap標準機能のみ使用

export interface IMarkdownAdvanceEditorProps {
	initialContent?: string // 自己完結型：Markdownテキストのみ受け取り
	placeholder?: string
	editable?: boolean
	onContentChange?: (content: JSONContent) => void
	onMarkdownChange?: (markdown: string) => void
	onSelectionChange?: (selectionInfo: ISelectionInfo | null) => void
	onEditorReady?: (editor: Editor) => void // TipTapエディターインスタンスの取得
	showSyntaxStatus?: boolean
	showPasteDebug?: boolean
	showToolbar?: boolean // ツールバー表示フラグ
	enableVerticalScroll?: boolean // 縦スクロール有効化フラグ（デフォルト: true）
	autoHeight?: boolean // コンテンツに合わせて高さを自動調整（デフォルト: false）
	className?: string
	showDownloadButton?: boolean // ダウンロードボタン表示フラグ（デフォルト: false）
	downloadFilename?: string // ダウンロードファイル名（デフォルト: 'document.md'）
}

// Link click handling extension
const createLinkClickExtension = (
	handleContextMenu: (event: React.MouseEvent, linkData: { href: string; text: string }) => void
) =>
	Extension.create({
		name: "linkClick",

		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey("linkClick"),
					props: {
						handleDOMEvents: {
							contextmenu: (_, event) => {
								const target = event.target as HTMLElement
								const linkElement = target.closest("a[href]") as HTMLAnchorElement

								if (linkElement) {
									const href = linkElement.getAttribute("href") || ""
									const text = linkElement.textContent || ""

									logger.debug("🔗 Link right-clicked:", { href, text })

									if (href) {
										handleContextMenu(event as unknown as React.MouseEvent, { href, text })
										return true
									}
								}
								return false
							},
							click: (_, event) => {
								const target = event.target as HTMLElement
								const linkElement = target.closest("a[href]") as HTMLAnchorElement

								// クリックイベントをログ出力
								if (linkElement) {
									const href = linkElement.getAttribute("href") || ""
									const text = linkElement.textContent || ""
									logger.debug("🔗 Link clicked:", {
										href,
										text,
										ctrlKey: event.ctrlKey,
										metaKey: event.metaKey,
										shiftKey: event.shiftKey,
									})

									// Ctrl/Cmd+クリック、または単純な左クリックでコンテキストメニューを表示
									if (href) {
										event.preventDefault()
										event.stopPropagation()
										handleContextMenu(event as unknown as React.MouseEvent, { href, text })
										return true
									}
								}
								return false
							},
						},
					},
				}),
			]
		},
	})

// Table right-click extension for context menu
const createTableRightClickExtension = (handleContextMenu: (event: React.MouseEvent) => void) =>
	Extension.create({
		name: "tableRightClick",

		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey("tableRightClick"),
					props: {
						handleDOMEvents: {
							contextmenu: (_, event) => {
								const target = event.target as HTMLElement
								const tableElement = target.closest("table, th, td")

								if (tableElement && event.button === 2) {
									event.preventDefault()
									// Table right-click
									handleContextMenu(event as unknown as React.MouseEvent)
									return true
								}
								return false
							},
						},
					},
				}),
			]
		},
	})

// Markdown shortcuts extension for typing shortcuts like ```
const createMarkdownShortcutsExtension = () =>
	Extension.create({
		name: "markdownShortcuts",

		addInputRules() {
			// 🚨 無限ループ完全防止: 全てのInput Rulesを無効化
			return []
		},
	})

// Progressive rendering extension - simplified safe approach
const createMarkdownPasteExtension = (
	setIsProcessing: (processing: boolean) => void,
	setProcessingProgress: (progress: { processed: number; total: number }) => void
) => {
	let pasteCount = 0
	let lastPasteTime = 0

	return Extension.create({
		name: "markdownPaste",

		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey("markdownPaste"),
					props: {
						handlePaste: (_view, event, _slice) => {
							// PASTE EVENT
							logger.debug("Event details:", {
								eventType: event.type,
								clipboardData: !!event.clipboardData,
								timestamp: new Date().toISOString(),
							})

							const now = Date.now()
							pasteCount++

							logger.debug(`Paste #${pasteCount}: ${now - lastPasteTime}ms`)

							// 無限ループ防止: 連続ペーストを検出
							if (pasteCount > 2 && now - lastPasteTime < 500) {
								logger.error("🚨 RAPID PASTE DETECTED - Ignoring to prevent infinite loop")
								return false
							}

							// 現在処理中の場合は無視（厳格チェック）
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							if (this.editor && (this.editor as any).__isProcessing) {
								// Already processing
								return false
							}

							lastPasteTime = now

							const clipboardData = event.clipboardData
							logger.debug("Clipboard check:", {
								hasClipboardData: !!clipboardData,
								types: clipboardData ? Array.from(clipboardData.types) : [],
							})

							if (!clipboardData) {
								logger.warn("❌ No clipboard data available")
								return false
							}

							const plainText = clipboardData.getData("text/plain")
							logger.debug("Text analysis:", {
								hasText: !!plainText,
								length: plainText ? plainText.length : 0,
								trimmedLength: plainText ? plainText.trim().length : 0,
								firstLine: plainText ? plainText.split("\n")[0]?.substring(0, 100) || "" : "",
							})

							if (!plainText || plainText.trim().length === 0) {
								logger.warn("❌ Empty or no plain text found")
								return false
							}

							// Text preview: first 200 chars

							// 基本的なMarkdown検出
							const hasMarkdown =
								/^#{1,6}\s|```|^\s*[-*+]\s|^\s*>\s|\[.*\]\(.*\)|\|.*\||\*\*.*\*\*/.test(plainText)
							logger.debug("Markdown:", hasMarkdown)

							if (!hasMarkdown) {
								// No markdown patterns
								return false // 通常のペーストとして処理
							}

							try {
								const editor = this.editor
								if (!editor) {
									logger.error("❌ Editor not available")
									return false
								}

								// MARKDOWN PASTE - processing
								logger.debug("📊 Processing details:", {
									textLength: plainText.length,
									lineCount: plainText.split("\n").length,
								})

								logger.debug("📋 STEP 1: Inserting plain text immediately for responsiveness")

								// STEP 1: 即座にプレーンテキスト挿入（ユーザー体験向上）
								editor.commands.deleteSelection()
								editor.commands.insertContent(plainText)

								// STEP 2: 真の順次レンダリング処理
								if (plainText.length < 10000) {
									// テキスト変換制限を緩和
									logger.info("📋 STEP 2: Starting true sequential rendering")
									;(editor as ExtendedEditor).__isProcessing = true
									setIsProcessing(true)
									setProcessingProgress({ processed: 0, total: plainText.split("\n").length })

									;(async () => {
										try {
											logger.info("🔄 Starting true sequential rendering with render monitoring")

											// 現在のカーソル位置を保存
											const currentPos = editor.state.selection.from

											// 最後に挿入したプレーンテキストを削除
											const from = currentPos - plainText.length
											const to = currentPos
											editor.commands.deleteRange({ from, to })
											editor.commands.setTextSelection(from)

											// 真の順次レンダリング処理を実行
											await MarkdownTipTapConverter.processMarkdownInSmallChunksWithRender(
												plainText,
												editor,
												(processed, total) => {
													logger.debug(`📊 Progress: ${processed}/${total} lines processed`)
													setProcessingProgress({ processed, total })
												}
											)

											logger.info("✅ True sequential rendering completed")
										} catch (error) {
											logger.warn("⚠️ Sequential rendering failed, keeping plain text:", error)
											// エラー時は元のプレーンテキストを復元
											editor.commands.insertContent(plainText)
										} finally {
											;(editor as ExtendedEditor).__isProcessing = false
											setIsProcessing(false)
										}
									})() // 即座に変換開始
								} else {
									logger.info(
										"📋 Large text detected - keeping as plain text to prevent performance issues"
									)
								}
							} catch (error) {
								logger.error("🚨 Paste processing error:", error)
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								;(this.editor as any).__isProcessing = false
								setIsProcessing(false)
								return false
							}

							return true
						},
					},
				}),
			]
		},
	})
}

export const MarkdownAdvanceEditor: React.FC<IMarkdownAdvanceEditorProps> = ({
	initialContent,
	placeholder = "Start typing...",
	editable = true,
	onContentChange,
	onMarkdownChange, // 🚫 Currently disabled to prevent infinite loops with TextEditor
	onSelectionChange,
	onEditorReady,
	showSyntaxStatus = true,
	showPasteDebug = false,
	showToolbar = true,
	enableVerticalScroll = true,
	autoHeight = false,
	className = "",
	showDownloadButton = false,
	downloadFilename = "document.md",
}) => {
	const [, setContent] = useState<JSONContent>()
	const [selectionInfo, setSelectionInfo] = useState<ISelectionInfo | null>(null)
	const [pasteEvents, setPasteEvents] = useState<IPasteEvent[]>([])
	// const [lastMarkdown, setLastMarkdown] = useState<string>(''); // 削除: useEffect削除により不要
	const [isUpdating, setIsUpdating] = useState<boolean>(false) // Prevent update loops
	const [isProcessing, setIsProcessing] = useState<boolean>(false) // Prevent paste processing loops
	const [processingProgress, setProcessingProgress] = useState<{
		processed: number
		total: number
	}>({ processed: 0, total: 0 })

	// 🔍 グローバル変数でエディターインスタンスを管理（コンポーネント内でのみ使用）
	// onMarkdownChange は TextEditor バイパス後に再有効化

	// リンクコンテキストメニューの状態
	const [linkContextMenu, setLinkContextMenu] = useState<{
		visible: boolean
		position: { x: number; y: number }
		linkData: { href: string; text: string } | null
	}>({
		visible: false,
		position: { x: 0, y: 0 },
		linkData: null,
	})

	const [tableContextMenu, setTableContextMenu] = useState<{
		visible: boolean
		position: { x: number; y: number }
	}>({
		visible: false,
		position: { x: 0, y: 0 },
	})

	const editorElementRef = React.useRef<HTMLDivElement>(null)

	const lowlight = createLowlight(common)

	// リンクコンテキストメニューのイベントハンドラー
	const handleLinkContextMenu = useCallback(
		(event: React.MouseEvent, linkData: { href: string; text: string }) => {
			event.preventDefault()
			event.stopPropagation()

			setLinkContextMenu({
				visible: true,
				position: { x: event.clientX, y: event.clientY },
				linkData,
			})
		},
		[]
	)

	// テーブルコンテキストメニューのイベントハンドラー
	const handleTableContextMenu = useCallback((event: React.MouseEvent) => {
		event.preventDefault()
		event.stopPropagation()

		setTableContextMenu({
			visible: true,
			position: { x: event.clientX, y: event.clientY },
		})
	}, [])

	const handleCloseLinkContextMenu = useCallback(() => {
		setLinkContextMenu({
			visible: false,
			position: { x: 0, y: 0 },
			linkData: null,
		})
	}, [])

	const handleCloseTableContextMenu = useCallback(() => {
		setTableContextMenu({
			visible: false,
			position: { x: 0, y: 0 },
		})
	}, [])

	// グローバルクリックでコンテキストメニューを閉じる
	// useEffect(() => {
	//   const handleGlobalClick = (event: MouseEvent) => {
	//     // TableContextMenu以外がクリックされた場合に閉じる
	//     const target = event.target as HTMLElement;
	//     if (!target.closest('.table-context-menu')) {
	//       setTableContextMenu({
	//         visible: false,
	//         position: { x: 0, y: 0 },
	//       });
	//     }
	//     // LinkContextMenu以外がクリックされた場合に閉じる
	//     if (!target.closest('.link-context-menu')) {
	//       setLinkContextMenu({
	//         visible: false,
	//         position: { x: 0, y: 0 },
	//         linkData: null
	//       });
	//     }
	//   };

	//   if (tableContextMenu.visible || linkContextMenu.visible) {
	//     document.addEventListener('click', handleGlobalClick);
	//     return () => document.removeEventListener('click', handleGlobalClick);
	//   }

	//   return () => {}; // 空の関数を返す
	// }, [tableContextMenu.visible, linkContextMenu.visible]);

	const handleOpenLink = useCallback((href: string) => {
		window.open(href, "_blank", "noopener,noreferrer")
	}, [])

	// handleEditLinkとhandleInsertMarkdownはuseEditorの後で定義されるため、この場所から削除

	// handleInsertMarkdownはuseEditorの後で定義されるため削除

	const handleShowHelp = () => {
		logger.info("📚 Markdown help requested")
		// ヘルプ機能は必要に応じて実装
	}

	const clearPasteEvents = () => {
		setPasteEvents([])
	}

	// テーブル操作コマンド（useEditor後で定義されるため後に移動）

	const editor = useEditor({
		// TipTapのスキーマ検証を無効化してempty nodesエラーを防止
		enableContentCheck: false,
		emitContentError: true, // エラーは監視するが、自動検証は無効
		onContentError: ({ error }) => {
			logger.warn("🚨 TipTap Content Error (handled):", error)
			// エラーを記録するが処理は続行
		},
		extensions: [
			StarterKit.configure({
				// StarterKitのCodeBlockとLinkを無効化して重複を避ける
				codeBlock: false,
				link: false,
			}),
			CodeBlockLowlight.configure({
				lowlight,
			}),
			Table.configure({
				resizable: true,
				handleWidth: 5, // TipTap標準推奨値
				cellMinWidth: 40, // 40px最小幅に設定
				lastColumnResizable: true, // 最後の列もリサイズ可能に
				allowTableNodeSelection: true,
				HTMLAttributes: {
					class: "markdown-advance-table",
				},
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
			createLinkClickExtension(handleLinkContextMenu),
			createTableRightClickExtension(handleTableContextMenu),
			createMarkdownShortcutsExtension(),
			createMarkdownPasteExtension(setIsProcessing, setProcessingProgress),
		],
		content: initialContent || "", // シンプルに文字列として初期化
		editable,
		editorProps: {
			attributes: {
				class:
					"prose prose-base max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2 prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-1 prose-h3:text-lg prose-p:text-gray-700 prose-p:leading-tight prose-strong:text-gray-900 prose-strong:font-semibold prose-em:text-gray-800 prose-code:bg-gray-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-base prose-code:font-mono prose-code:text-gray-900 prose-pre:bg-slate-700 prose-pre:text-gray-200 prose-pre:rounded-md prose-pre:p-4 prose-pre:shadow-inner prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 prose-blockquote:bg-gray-50 prose-blockquote:py-3 prose-blockquote:rounded-r-md prose-ul:list-none prose-ol:list-decimal prose-li:text-gray-700 prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800 prose-a:break-words prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2 prose-hr:border-gray-300 p-4 focus:outline-none text-gray-700",
				"data-placeholder": placeholder,
			},
		},
		onUpdate: ({ editor }) => {
			// 🚨 処理中フラグで無限ループ完全防止
			if (isUpdating || (editor as ExtendedEditor).__preventUpdate || isProcessing) {
				logger.debug("🔄 Skipping onUpdate - prevention active")
				return
			}

			// 🎯 最小限のonUpdate処理
			const json = editor.getJSON()
			setContent(json)

			// ContentChangeコールバックの実行
			if (onContentChange) {
				onContentChange(json)
			}

			// 🚫 onMarkdownChangeコールバック完全無効化（カーソル強制移動・無限ループ防止）
			// onMarkdownChangeはonBlurやボタンクリック時のみ実行する設計に変更
		},
		onBlur: ({ editor }) => {
			// 🔧 onBlurでのみMarkdown変換実行（カーソル移動なし）
			if (onMarkdownChange) {
				try {
					const json = editor.getJSON()
					const markdown = JsonToMarkdownConverter.convertToMarkdown(json)
					onMarkdownChange(markdown)
				} catch (error) {
					logger.warn("⚠️ Markdown conversion failed in onBlur:", error)
				}
			}
		},
		onSelectionUpdate: ({ editor }) => {
			try {
				const newSelectionInfo = SelectionUtils.getSelectionMarkdownSyntax(editor)
				setSelectionInfo(newSelectionInfo)

				if (onSelectionChange) {
					onSelectionChange(newSelectionInfo)
				}
			} catch (error) {
				logger.warn("⚠️ MarkdownAdvanceEditor: Selection update failed:", error)
				// Fallback: 最小限のselectionInfoを設定
				setSelectionInfo(null)
			}
		},
		onCreate: ({ editor }) => {
			// 🔧 安全なエディターインスタンス管理（グローバル変数を使用しない）
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			;(window as any).__markdownAdvanceEditor__ = editor

			// onEditorReadyコールバックの実行
			try {
				if (onEditorReady) {
					onEditorReady(editor)
				}
			} catch (error) {
				logger.warn("⚠️ MarkdownAdvanceEditor: onEditorReady callback failed:", error)
			}
		},
	})

	// TableToolbar フックを追加
	const tableToolbar = useTableToolbar(editor)

	// 🏗️ 自己完結型Markdown変換処理
	useEffect(() => {
		const processInitialMarkdown = async () => {
			if (!editor || !initialContent?.trim()) return

			const trimmed = initialContent.trim()
			const hasMarkdown = MarkdownTipTapConverter.isMarkdownText(trimmed)

			if (hasMarkdown) {
				logger.debug("[MarkdownAdvanceEditor] 自動Markdown変換開始:", `${trimmed.length}文字`)
				logger.debug(
					"[MarkdownAdvanceEditor] テーブル検索:",
					trimmed.includes("|") ? "テーブル構文あり" : "テーブル構文なし"
				)
				if (trimmed.includes("|")) {
					const tableLines = trimmed.split("\n").filter(line => line.includes("|"))
					logger.debug("[MarkdownAdvanceEditor] テーブル候補行数:", tableLines.length)
					tableLines.forEach((line, idx) => {
						logger.debug(`[MarkdownAdvanceEditor] テーブル候補行${idx}:`, line)
					})
				}
				try {
					const json = await MarkdownTipTapConverter.markdownToTipTapJson(trimmed)
					logger.debug(
						"[MarkdownAdvanceEditor] 自動変換完了 - ノード数:",
						json?.content?.length || 0
					)

					// テーブル変換結果をログ出力
					const tables = json?.content?.filter(node => node.type === "table") || []
					logger.debug("[MarkdownAdvanceEditor] 変換されたテーブル数:", tables.length)
					tables.forEach((table, idx) => {
						logger.debug(
							`[MarkdownAdvanceEditor] テーブル${idx} - 行数:`,
							table.content?.length || 0
						)
					})

					// エディターに変換結果を設定
					editor.commands.setContent(json)

					// テーブル要素が正しくレンダリングされているか確認
					setTimeout(() => {
						const tableElements = document.querySelectorAll(".markdown-advance-table")
						logger.debug(
							"[MarkdownAdvanceEditor] レンダリング後のテーブル要素数:",
							tableElements.length
						)
						tableElements.forEach((tableEl, idx) => {
							logger.debug(`[MarkdownAdvanceEditor] テーブル要素${idx}:`, tableEl)
						})
					}, 500)
				} catch (error) {
					logger.warn("[MarkdownAdvanceEditor] 自動Markdown変換失敗:", error)
					// 失敗時はプレーンテキストのまま
				}
			}
		}

		// エディター準備完了後に変換実行
		if (editor) {
			processInitialMarkdown()
		}
	}, [editor, initialContent]) // editorとinitialContentが変更された時のみ実行

	// テーブル操作コマンド（useEditor後で定義）
	const handleAddRowAbove = useCallback(() => {
		if (!editor) return
		editor.chain().focus().addRowBefore().run()
	}, [editor])

	const handleAddRowBelow = useCallback(() => {
		if (!editor) return
		editor.chain().focus().addRowAfter().run()
	}, [editor])

	const handleAddColumnBefore = useCallback(() => {
		if (!editor) return
		editor.chain().focus().addColumnBefore().run()
	}, [editor])

	const handleAddColumnAfter = useCallback(() => {
		if (!editor) return
		editor.chain().focus().addColumnAfter().run()
	}, [editor])

	const handleDeleteRow = useCallback(() => {
		if (!editor) return
		editor.chain().focus().deleteRow().run()
	}, [editor])

	const handleDeleteColumn = useCallback(() => {
		if (!editor) return
		editor.chain().focus().deleteColumn().run()
	}, [editor])

	const handleDeleteTable = useCallback(() => {
		if (!editor) return
		editor.chain().focus().deleteTable().run()
	}, [editor])

	// リンク編集のハンドラー（useEditorの後で定義）
	const handleEditLink = useCallback(
		(newLinkData: { href: string; text: string }) => {
			if (!editor || !linkContextMenu.linkData) return

			logger.debug("🔗 handleEditLink called:", newLinkData)

			// isUpdating フラグを設定して無限ループを防ぐ
			setIsUpdating(true)

			// 循環参照防止フラグを設定
			const originalPreventUpdate = (editor as ExtendedEditor).__preventUpdate
			;(editor as ExtendedEditor).__preventUpdate = true

			try {
				// エディター内でリンクを見つけて更新
				const { state, dispatch } = editor.view
				let linkUpdated = false

				// ドキュメント全体を走査してリンクを見つける
				state.doc.descendants((node, pos) => {
					if (linkUpdated) return false

					if (node.isText && node.marks) {
						const linkMark = node.marks.find(mark => mark.type.name === "link")
						if (
							linkMark &&
							linkMark.attrs.href === linkContextMenu.linkData?.href &&
							node.text === linkContextMenu.linkData?.text
						) {
							// リンクマークの型を確認
							if (!state.schema.marks.link) {
								logger.warn("Link mark type not found in schema")
								return false
							}

							// リンクを更新
							const from = pos
							const to = pos + node.nodeSize
							const newLinkMark = state.schema.marks.link.create({ href: newLinkData.href })
							const transaction = state.tr

							// 既存のテキストを削除して新しいテキストとリンクを挿入
							transaction.delete(from, to)
							transaction.insert(from, state.schema.text(newLinkData.text, [newLinkMark]))

							dispatch(transaction)
							linkUpdated = true
							return false
						}
					}
					return true // 他のノードは続行
				})

				if (!linkUpdated) {
					logger.warn("Link not found for update")
				}
			} finally {
				// フラグとstateを非同期にリセット
				setTimeout(() => {
					;(editor as ExtendedEditor).__preventUpdate = originalPreventUpdate
					setIsUpdating(false)
					logger.debug("✅ Link edit update locks released")
				}, 150)
			}
		},
		[editor, linkContextMenu.linkData]
	)

	// 選択テキストの取得とMarkdown挿入のハンドラー
	const handleInsertMarkdown = async (markdown: string, cursorOffset?: number) => {
		if (!editor) return

		logger.debug(`🎨 Inserting markdown: "${markdown}"`)

		const { from, to } = editor.state.selection
		const selectedText = editor.state.doc.textBetween(from, to, " ").trim()

		let insertText = markdown

		// 選択テキストがある場合、フォーマットを適用
		if (selectedText && markdown.includes("*")) {
			if (markdown === "****") {
				insertText = `**${selectedText}**` // 太字
			} else if (markdown === "**") {
				insertText = `*${selectedText}*` // 斜体
			} else if (markdown === "~~~~") {
				insertText = `~~${selectedText}~~` // 取り消し線
			} else if (markdown === "``") {
				insertText = `\`${selectedText}\`` // インラインコード
			}
		} else if (selectedText && markdown === "> ") {
			insertText = `> ${selectedText}` // 引用
		} else {
			// cursorOffsetが指定されている場合の処理（カーソル位置調整）
			insertText = markdown
		}

		logger.debug(`📝 Final insert text: "${insertText}"`)

		try {
			// 選択範囲を削除
			if (selectedText) {
				editor.commands.deleteRange({ from, to })
			}

			// 🔧 MarkdownをTipTap JSONに変換して挿入（ペースト時と同様のプロセス）
			// 全てのMarkdownフォーマットの検出
			logger.debug("🔍 Checking formatting for text:", insertText)

			const formatChecks = {
				bold: insertText.includes("**"),
				italic: insertText.includes("*") && !insertText.includes("**"),
				strikethrough: insertText.includes("~~"),
				code: insertText.includes("`"),
				blockquote: insertText.startsWith("> "),
				bulletList: insertText.startsWith("- "),
				orderedList: /^\d+\.\s/.test(insertText),
				link: insertText.includes("[") && insertText.includes("](") && insertText.includes(")"),
				table: insertText.includes("|") && insertText.includes("\n") && insertText.includes("---"),
				heading: insertText.startsWith("#"),
			}

			logger.debug("🔍 Format checks:", formatChecks)

			const hasFormatting =
				formatChecks.bold ||
				formatChecks.italic ||
				formatChecks.strikethrough ||
				formatChecks.code ||
				formatChecks.blockquote ||
				formatChecks.bulletList ||
				formatChecks.orderedList ||
				formatChecks.link ||
				formatChecks.table ||
				formatChecks.heading

			logger.debug("🔍 Has formatting:", hasFormatting)

			if (hasFormatting) {
				logger.debug(`🔄 Converting to JSON for formatting: "${insertText}"`)
				setIsUpdating(true)

				// 🔧 セキュリティチェック: リンクの場合はURL検証を実行
				if (insertText.includes("[") && insertText.includes("](") && insertText.includes(")")) {
					const linkMatch = insertText.match(/\[([^\]]+)\]\(([^)]+)\)/)
					if (linkMatch) {
						const linkUrl = linkMatch[2]
						if (linkUrl && !isValidUrl(linkUrl)) {
							logger.warn("⚠️ Invalid URL detected, treating as plain text:", linkUrl)
							// 無効なURLの場合はプレーンテキストとして処理
							editor.commands.insertContent(sanitizeText(insertText))
							return
						}
						logger.debug("✅ Valid URL detected, proceeding with link creation")
					}
				}

				// 循環参照防止フラグを設定
				const originalPreventUpdate = (editor as ExtendedEditor).__preventUpdate
				;(editor as ExtendedEditor).__preventUpdate = true

				const markdownJson = await MarkdownTipTapConverter.markdownToTipTapJson(insertText)
				logger.debug("📄 Converted JSON - nodes:", markdownJson?.content?.length || 0)

				if (markdownJson.content && markdownJson.content.length > 0) {
					logger.debug("📄 Inserting content - nodes:", markdownJson.content.length)

					// TipTap JSON直接挿入を試行 - 完全なdocument構造を渡す
					const insertSuccess = editor.commands.insertContent(markdownJson)
					logger.debug("📄 Direct JSON insert success:", insertSuccess)

					// 挿入後のエディター状態を確認
					setTimeout(() => {
						const currentContent = editor.getJSON()
						logger.debug(
							"📄 Editor content after insertion - nodes:",
							currentContent?.content?.length || 0
						)
					}, 100)

					// 失敗した場合は、HTML文字列として挿入を試行
					if (!insertSuccess) {
						logger.debug("📄 Trying HTML string insertion...")
						const htmlString = MarkdownTipTapConverter.tipTapJsonToHtml(markdownJson)
						logger.debug("📄 Generated HTML:", htmlString)
						const htmlInsertSuccess = editor.commands.insertContent(htmlString)
						logger.debug("📄 HTML insert success:", htmlInsertSuccess)
					}

					// setLastMarkdown(insertText); // 削除: 不要
					logger.info("✅ Content inserted successfully")
				} else {
					// フォールバック: プレーンテキストとして挿入
					logger.warn("⚠️ JSON conversion failed, inserting as plain text")
					editor.commands.insertContent(insertText)
				}

				setTimeout(() => {
					;(editor as ExtendedEditor).__preventUpdate = originalPreventUpdate
					setIsUpdating(false)
					logger.debug("✅ Markdown insert update locks released")
				}, 150)
			} else {
				// プレーンMarkdown（見出し、リスト等）をそのまま挿入
				editor.commands.insertContent(insertText)

				// cursorOffsetが指定されている場合、カーソル位置を調整
				if (cursorOffset !== undefined && cursorOffset > 0) {
					const currentPos = editor.state.selection.from
					const newPos = currentPos - (insertText.length - cursorOffset)
					editor.commands.setTextSelection(newPos)
				}
			}

			editor.commands.focus()
		} catch (error) {
			logger.error("❌ Error inserting markdown:", error)
			// エラー時のフォールバック
			editor.commands.insertContent(insertText)
			editor.commands.focus()
		}
	}

	// ダウンロード機能のハンドラー
	const handleDownloadAsMarkdown = useCallback(() => {
		if (!editor) {
			logger.warn("[MarkdownAdvanceEditor] Editor not available for download")
			return
		}

		try {
			const editorContent = editor.getJSON()
			logger.info("[MarkdownAdvanceEditor] Downloading content as Markdown:", downloadFilename)
			JsonToMarkdownConverter.downloadAsMarkdown(editorContent, downloadFilename)
		} catch (error) {
			logger.error("[MarkdownAdvanceEditor] Download failed:", error)
		}
	}, [editor, downloadFilename])

	// 🚨 useEffect削除: 無限ループの原因となるため削除
	// Selection監視はonSelectionUpdateイベントで十分

	if (!editor) {
		return (
			<div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-md">
				<div className="text-gray-500">Loading editor...</div>
			</div>
		)
	}

	return (
		<div className={`${className}`}>
			<style>
				{`
          .ProseMirror {
            font-family: "Meiryo", "メイリオ", sans-serif !important;
            line-height: 1.625 !important;
            font-size: 1rem !important;
            min-height: ${autoHeight ? "auto" : "100%"} !important;
            width: 100% !important;
            cursor: text;
          }
          /* EditorContentエリアのテキストカーソル設定 */
          .markdown-editor-content .ProseMirror {
            cursor: text;
          }
          .ProseMirror p,
          .ProseMirror li,
          .ProseMirror h1,
          .ProseMirror h2,
          .ProseMirror h3,
          .ProseMirror h4,
          .ProseMirror h5,
          .ProseMirror h6,
          .ProseMirror blockquote {
            cursor: text;
          }
          /* エディターエリア全体をクリック可能にする */
          .ProseMirror:empty::before {
            content: attr(data-placeholder);
            float: left;
            color: #aaa;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror pre {
            background-color: rgb(51 65 85) !important;
            color: rgb(229 231 235) !important;
            border: 1px solid rgb(100 116 139) !important;
            border-radius: 0.5rem !important;
            padding: 1rem !important;
            margin: 0.75rem 0 !important;
            overflow-x: auto !important;
            max-width: 80ch !important; /* コードブロック横幅80文字制限 */
            width: 100% !important;
            white-space: pre !important;
          }
          .ProseMirror pre code {
            background-color: transparent !important;
            color: rgb(229 231 235) !important;
            padding: 0 !important;
            border: none !important;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace !important;
            font-size: 0.875rem !important;
            line-height: 1.625 !important;
            white-space: pre !important;
            display: block !important;
          }
          .ProseMirror ul {
            list-style-type: none !important;
            padding-left: 0 !important;
          }
          .ProseMirror li {
            position: relative !important;
            padding-left: 1.5rem !important;
          }
          .ProseMirror li::before {
            content: "•" !important;
            position: absolute !important;
            left: 0 !important;
            color: rgb(107 114 128) !important;
          }
          .ProseMirror blockquote {
            border-left: 4px solid rgb(209 213 219) !important;
            padding-left: 1rem !important;
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
            background-color: rgb(249 250 251) !important;
            border-top-right-radius: 0.375rem !important;
            border-bottom-right-radius: 0.375rem !important;
            margin: 0.75rem 0 !important;
          }
          .ProseMirror code {
            background-color: rgb(229 231 235) !important;
            color: rgb(17 24 39) !important;
            padding: 0.125rem 0.375rem !important;
            border-radius: 0.25rem !important;
            border: 1px solid rgb(209 213 219) !important;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace !important;
          }
          /* テーブル拡張CSS - Phase 1 */
          .tiptap-table-enhanced .tableWrapper {
            position: relative !important;
          }
          .tiptap-table-enhanced .resize-cursor {
            cursor: col-resize !important;
            border-right: 2px solid #3b82f6 !important;
            background: rgba(59, 130, 246, 0.1) !important;
          }
          .tiptap-table-enhanced th:hover,
          .tiptap-table-enhanced td:hover {
            background-color: rgba(59, 130, 246, 0.05) !important;
            transition: background-color 0.2s ease !important;
          }
          .tiptap-table-enhanced table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
            max-width: 800px !important; /* テーブル横幅800px最大制限 */
            width: auto !important; /* 内容サイズ依存の可変幅 */
          }
        `}
			</style>
			<div
				className={`border border-gray-300 rounded-md shadow-sm ${enableVerticalScroll ? "h-full" : "min-h-fit"} flex flex-col relative`}
			>
				{/* 処理中インジケータ（右上） */}
				{isProcessing && (
					<div className="absolute top-2 right-2 z-50">
						<div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex items-center space-x-2 min-w-48">
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
							<div className="text-xs">
								<div className="font-medium text-gray-700">Markdown変換中</div>
								<div className="text-gray-500">
									{processingProgress.processed}/{processingProgress.total} 行完了
								</div>
								<div className="w-full bg-gray-200 rounded-full h-1 mt-1">
									<div
										className="bg-blue-500 h-1 rounded-full transition-all duration-300"
										style={{
											width: `${processingProgress.total > 0 ? (processingProgress.processed / processingProgress.total) * 100 : 0}%`,
										}}
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				{showToolbar && (
					<MarkdownToolbar
						onInsertMarkdown={handleInsertMarkdown}
						onShowHelp={handleShowHelp}
						selectedText={selectionInfo?.selectedText || ""}
						disabled={!editable}
						editor={editor}
						showDownloadButton={showDownloadButton}
						onDownloadAsMarkdown={handleDownloadAsMarkdown}
					/>
				)}
				<div
					className={`relative ${enableVerticalScroll ? "flex-1 overflow-hidden" : "overflow-visible"}`}
					ref={editorElementRef}
					onClick={e => {
						// エディターエリア全体をクリック可能にする
						if (editor && editable) {
							// クリックされた場所がEditorContent内でない場合、エディターにフォーカス
							const target = e.target as HTMLElement
							const proseMirrorElement = editorElementRef.current?.querySelector(
								".ProseMirror"
							) as HTMLElement

							if (proseMirrorElement && !proseMirrorElement.contains(target)) {
								// エディターの最後にカーソルを移動
								const { state } = editor
								const lastPosition = state.doc.content.size
								editor.chain().focus().setTextSelection(lastPosition).run()
							} else if (!target.closest(".ProseMirror")) {
								// ProseMirror要素の外側がクリックされた場合もフォーカス
								editor.commands.focus()
							}
						}
					}}
					style={{ cursor: editable ? "text" : "default" }}
				>
					<EditorContent
						editor={editor}
						className={`markdown-editor-content ${
							autoHeight
								? "min-h-fit overflow-visible"
								: enableVerticalScroll
									? "h-full overflow-y-auto"
									: "min-h-full"
						}`}
					/>
				</div>
				{showSyntaxStatus && (
					<MarkdownSyntaxStatus selectionInfo={selectionInfo} className="rounded-b-md" />
				)}
			</div>

			{showPasteDebug && (
				<PasteDebugPanel
					pasteEvents={pasteEvents}
					onClearEvents={clearPasteEvents}
					className="mt-3"
				/>
			)}

			{/* リンクコンテキストメニュー */}
			<LinkContextMenu
				visible={linkContextMenu.visible}
				position={linkContextMenu.position}
				linkData={linkContextMenu.linkData}
				onClose={handleCloseLinkContextMenu}
				onOpenLink={handleOpenLink}
				onEditLink={handleEditLink}
			/>

			{/* テーブルコンテキストメニュー */}
			<TableContextMenu
				isVisible={tableContextMenu.visible}
				position={tableContextMenu.position}
				onClose={handleCloseTableContextMenu}
				onAddRowAbove={handleAddRowAbove}
				onAddRowBelow={handleAddRowBelow}
				onAddColumnBefore={handleAddColumnBefore}
				onAddColumnAfter={handleAddColumnAfter}
				onDeleteRow={handleDeleteRow}
				onDeleteColumn={handleDeleteColumn}
				onDeleteTable={handleDeleteTable}
			/>

			{/* テーブルツールバー */}
			<TableToolbar
				editor={editor!}
				visible={tableToolbar.visible}
				position={tableToolbar.position}
			/>
			{/* テーブル周辺コントロール */}
			<TableEdgeControls editor={editor} />
		</div>
	)
}
