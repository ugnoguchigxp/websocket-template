/**
 * Markdown Document Renderer Component
 * Renders markdown documents with enhanced features and controls
 */

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
	FiClock,
	FiCopy,
	FiDownload,
	FiEdit3,
	FiFileText,
	FiMaximize2,
	FiMinimize2,
	FiPause,
	FiPlay,
	FiRotateCcw,
	FiSave,
	FiTag,
	FiUser,
	FiX,
} from "react-icons/fi"

import { createContextLogger } from "@/modules/logger"

import { MarkdownPreview } from "../../../../components/common/MarkdownPreview"
import type { DocumentType, MarkdownDocumentData } from "../../types/mcpChat"

const log = createContextLogger("MarkdownDocumentRenderer")

interface MarkdownDocumentRendererProps {
	/** Markdown document data */
	documentData: MarkdownDocumentData
	/** Whether the document is in full-screen mode */
	fullscreen?: boolean
	/** Whether the document is interactive */
	interactive?: boolean
	/** Callback when document is exported */
	onExport?: (format: "md" | "txt" | "html") => void
	/** Callback when document is closed */
	onClose?: () => void
	/** Callback when document is edited */
	onEdit?: (content: string) => void
	/** Whether editing is enabled */
	enableEditing?: boolean
}

/**
 * Get document type display name in Japanese
 */
const getDocumentTypeDisplay = (type: DocumentType): string => {
	switch (type) {
		case "specification":
			return "仕様書"
		case "draft":
			return "下書き"
		case "novel":
			return "小説"
		case "article":
			return "記事"
		case "report":
			return "報告書"
		case "memo":
			return "メモ"
		case "manual":
			return "マニュアル"
		case "guide":
			return "ガイド"
		default:
			return "ドキュメント"
	}
}

/**
 * Get document type color class
 */
const getDocumentTypeColor = (type: DocumentType): string => {
	switch (type) {
		case "specification":
			return "bg-blue-100 text-blue-800 border-blue-200"
		case "draft":
			return "bg-yellow-100 text-yellow-800 border-yellow-200"
		case "novel":
			return "bg-purple-100 text-purple-800 border-purple-200"
		case "article":
			return "bg-green-100 text-green-800 border-green-200"
		case "report":
			return "bg-red-100 text-red-800 border-red-200"
		case "memo":
			return "bg-gray-100 text-gray-800 border-gray-200"
		case "manual":
			return "bg-indigo-100 text-indigo-800 border-indigo-200"
		case "guide":
			return "bg-cyan-100 text-cyan-800 border-cyan-200"
		default:
			return "bg-gray-100 text-gray-800 border-gray-200"
	}
}

export const MarkdownDocumentRenderer: React.FC<MarkdownDocumentRendererProps> = ({
	documentData,
	fullscreen = false,
	interactive = true,
	onExport,
	onClose,
	onEdit,
	enableEditing = false,
}) => {
	const [isFullscreen, setIsFullscreen] = useState(fullscreen)
	const [isEditing, setIsEditing] = useState(false)
	const [editContent, setEditContent] = useState(documentData.content)
	const [copied, setCopied] = useState(false)

	// Audio playback states
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
	const [isCompleted, setIsCompleted] = useState(false)
	const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
	const speechSynthRef = useRef<SpeechSynthesis | null>(null)
	const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

	const {
		type,
		title,
		description,
		content,
		author,
		version,
		createdAt,
		updatedAt,
		tags,
		category,
		wordCount,
		estimatedReadTime,
	} = documentData

	// Memoized calculations
	const documentTypeDisplay = useMemo(() => getDocumentTypeDisplay(type), [type])
	const documentTypeColor = useMemo(() => getDocumentTypeColor(type), [type])

	const calculatedWordCount = useMemo(() => {
		if (wordCount) return wordCount
		return content.trim().split(/\s+/).length
	}, [content, wordCount])

	const calculatedReadTime = useMemo(() => {
		if (estimatedReadTime) return estimatedReadTime
		// Assume average reading speed of 200 words per minute
		return Math.ceil(calculatedWordCount / 200)
	}, [calculatedWordCount, estimatedReadTime])

	const formattedDate = useCallback((dateString?: string) => {
		if (!dateString) return null
		try {
			return new Date(dateString).toLocaleDateString("ja-JP", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		} catch {
			return dateString
		}
	}, [])

	// Audio initialization
	useEffect(() => {
		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			speechSynthRef.current = window.speechSynthesis

			const loadVoices = () => {
				const voices = speechSynthRef.current?.getVoices() || []
				setAvailableVoices(voices)
			}

			loadVoices()
			speechSynthRef.current.onvoiceschanged = loadVoices

			return () => {
				if (speechSynthRef.current) {
					speechSynthRef.current.cancel()
				}
			}
		}

		// Return undefined for the else case (when speechSynthesis is not available)
		return undefined
	}, [])

	// Audio utility functions
	const cleanMarkdownForSpeech = useCallback(
		(text: string): string => {
			const cleanedText = text
				// Remove markdown headers
				.replace(/^#+\s*/gm, "")
				// Remove emphasis markers
				.replace(/(\*\*|__)(.*?)\1/g, "$2")
				.replace(/(\*|_)(.*?)\1/g, "$2")
				// Remove inline code markers
				.replace(/`([^`]+)`/g, "$1")
				// Remove code blocks
				.replace(/```[\s\S]*?```/g, "")
				// Remove links but keep text
				.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
				// Remove reference-style links
				.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
				// Remove images
				.replace(/!\[[^\]]*\]\([^)]+\)/g, "")
				// Remove blockquotes marker
				.replace(/^>\s*/gm, "")
				// Clean up extra whitespace
				.replace(/\n\s*\n/g, "\n\n")
				.trim()

			// For novels, extract only chapter content (skip metadata)
			if (type === "novel") {
				return extractNovelChapters(cleanedText)
			}

			return cleanedText
		},
		[type]
	)

	const extractNovelChapters = useCallback((text: string): string => {
		// Find the first chapter (チャプター, 第, Chapter, など)
		const chapterPatterns = [
			/^\[(\d+)\]/gim, // New bracket format [1], [2], etc.
			/^(チャプター\s*\d+|第\s*\d+\s*章|Chapter\s*\d+|第\s*\d+\s*話)/gim,
			/^(第\s*[一二三四五六七八九十]+\s*章)/gim,
			/^([１２３４５６７８９０]+\s*章)/gim,
		]

		let firstChapterIndex = -1
		let matchedPattern = null

		for (const pattern of chapterPatterns) {
			const match = text.match(pattern)
			if (match) {
				const index = text.indexOf(match[0])
				if (firstChapterIndex === -1 || index < firstChapterIndex) {
					firstChapterIndex = index
					matchedPattern = match[0]
				}
			}
		}

		if (firstChapterIndex >= 0 && matchedPattern) {
			// Extract from first chapter onwards
			return text.substring(firstChapterIndex).trim()
		}

		// If no chapter found, look for story content markers
		const storyMarkers = [
			/^(本文|物語|ストーリー)/gim,
			/^(あらすじ|概要|登場人物)[\s\S]*?^(本文|物語)/gim,
		]

		for (const marker of storyMarkers) {
			const match = text.match(marker)
			if (match) {
				const index = text.indexOf(match[0])
				return text.substring(index + match[0].length).trim()
			}
		}

		// Fallback: Skip common metadata sections
		const lines = text.split("\n")
		let contentStartIndex = 0

		const metadataKeywords = [
			"登場人物",
			"主要人物",
			"キャラクター",
			"登場キャラクター",
			"舞台設定",
			"世界観",
			"設定",
			"あらすじ",
			"概要",
			"作者",
			"著者",
			"タイトル",
			"題名",
		]

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]?.trim()
			if (!line) continue

			const isMetadata = metadataKeywords.some(
				keyword => line.includes(keyword) || line.startsWith("・") || line.startsWith("-")
			)

			if (!isMetadata) {
				contentStartIndex = i
				break
			}
		}

		return lines.slice(contentStartIndex).join("\n").trim()
	}, [])

	const splitIntoSections = useCallback((text: string, maxLength = 1000): string[] => {
		const sections: string[] = []
		let currentSection = ""
		const sentences = text.split(/(?<=[.!?。！？])\s+/)

		for (const sentence of sentences) {
			if (currentSection.length + sentence.length <= maxLength) {
				currentSection += (currentSection ? " " : "") + sentence
			} else {
				if (currentSection) {
					sections.push(currentSection)
				}
				currentSection = sentence
			}
		}

		if (currentSection) {
			sections.push(currentSection)
		}

		return sections
	}, [])

	const processTextSegments = useCallback((text: string) => {
		const segments: Array<{ isDialogue: boolean; character: string | null; text: string }> = []

		// Process text line by line for better dialogue detection
		const lines = text.split("\n")
		let currentNarration = ""

		for (const line of lines) {
			const trimmedLine = line.trim()
			if (!trimmedLine) {
				if (currentNarration) {
					currentNarration += "\n"
				}
				continue
			}

			// Check for dialogue patterns: 「」quotes, ""quotes, or character name followed by colon
			const dialoguePatterns = [
				/「([^」]+)」/g, // Japanese quotes
				/"([^"]+)"/g, // English quotes
				/([一-龯ァ-ヶーa-zA-Z]+)：「([^」]+)」/g, // Character name with colon and quote
				/([一-龯ァ-ヶーa-zA-Z]+)："([^"]+)"/g, // Character name with colon and English quote
			]

			let hasDialogue = false
			let processedText = trimmedLine

			// Check each pattern
			for (const pattern of dialoguePatterns) {
				const matches = Array.from(trimmedLine.matchAll(pattern))
				if (matches.length > 0) {
					hasDialogue = true

					// Add any narration before dialogue
					if (currentNarration.trim()) {
						segments.push({
							isDialogue: false,
							character: null,
							text: currentNarration.trim(),
						})
						currentNarration = ""
					}

					// Process each dialogue match
					for (const match of matches) {
						let characterName = null
						let dialogueText = ""

						if (match.length >= 3 && match[2]) {
							// Pattern with character name
							characterName = match[1] || null
							dialogueText = match[2]
						} else {
							// Just dialogue text
							dialogueText = match[1] || match[0]
							// Try to find character from previous narration
							const characterMatch = currentNarration.match(
								/([一-龯ァ-ヶーa-zA-Z]+)(?:は|が|の|：|:)/
							)
							characterName = characterMatch ? characterMatch[1] || null : null
						}

						if (dialogueText.trim()) {
							// Clean dialogue text by removing quotes and brackets
							const cleanedDialogue = dialogueText.replace(/[「」""''『』【】［］\[\]]/g, "").trim()

							if (cleanedDialogue) {
								segments.push({
									isDialogue: true,
									character: characterName,
									text: cleanedDialogue,
								})
							}
						}

						// Remove processed dialogue from the line
						processedText = processedText.replace(match[0], "").trim()
					}
				}
			}

			if (!hasDialogue) {
				// This line has no dialogue, add to narration
				currentNarration += (currentNarration ? " " : "") + trimmedLine
			} else if (processedText) {
				// Add any remaining text after dialogue processing as narration
				currentNarration += (currentNarration ? " " : "") + processedText
			}
		}

		// Add any remaining narration
		if (currentNarration.trim()) {
			segments.push({
				isDialogue: false,
				character: null,
				text: currentNarration.trim(),
			})
		}

		return segments.length > 0
			? segments.filter(s => s.text.length > 0)
			: [{ isDialogue: false, character: null, text }]
	}, [])

	const getVoiceForCharacter = useCallback(
		(character: string | null, isDialogue: boolean) => {
			if (!availableVoices.length) return null

			// Default nanami voice for narration
			const defaultVoice =
				availableVoices.find(voice => voice.name === "ja-JP-NanamiNeural") ||
				availableVoices.find(voice => voice.lang.startsWith("ja"))

			if (!isDialogue) return defaultVoice

			// Different voices for different characters (Japanese voices only)
			if (character) {
				const japaneseVoices = availableVoices.filter(voice => voice.lang.startsWith("ja"))
				if (japaneseVoices.length > 0) {
					const characterHash = Array.from(character).reduce(
						(acc, char) => acc + char.charCodeAt(0),
						0
					)
					const voiceIndex = characterHash % Math.min(japaneseVoices.length, 5) // Use up to 5 different Japanese voices
					return japaneseVoices[voiceIndex] || defaultVoice
				}
			}

			return defaultVoice
		},
		[availableVoices]
	)

	// Audio playback segments
	const audioSegments = useMemo(() => {
		const cleanText = cleanMarkdownForSpeech(content)
		const sections = splitIntoSections(cleanText)

		// Process each section into segments (narration + dialogue)
		const allSegments: Array<{ isDialogue: boolean; character: string | null; text: string }> = []
		sections.forEach(section => {
			const segments = processTextSegments(section)
			allSegments.push(...segments)
		})

		return allSegments.filter(segment => segment.text.trim().length > 0)
	}, [content, cleanMarkdownForSpeech, splitIntoSections, processTextSegments])

	// Event handlers
	const handleToggleFullscreen = useCallback(() => {
		setIsFullscreen(!isFullscreen)
	}, [isFullscreen])

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(content)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			log.error("Failed to copy content:", err)
		}
	}, [content])

	// Audio playback handlers
	const playCurrentSegment = useCallback(() => {
		if (!speechSynthRef.current || currentSegmentIndex >= audioSegments.length) return

		const segment = audioSegments[currentSegmentIndex]
		if (!segment || !segment.text.trim()) {
			// Skip empty segments and move to next
			if (currentSegmentIndex < audioSegments.length - 1) {
				setCurrentSegmentIndex(prev => prev + 1)
			} else {
				setIsPlaying(false)
				setIsCompleted(true)
			}
			return
		}

		const utterance = new SpeechSynthesisUtterance(segment.text)
		const voice = getVoiceForCharacter(segment.character, segment.isDialogue)

		if (voice) {
			utterance.voice = voice
		}

		// Adjust rate and pitch for different characters
		utterance.rate = segment.isDialogue ? 1.1 : 1.0
		utterance.pitch = segment.isDialogue ? 1.2 : 1.0
		utterance.volume = 0.8

		utterance.onend = () => {
			// Move to next segment after current one finishes
			if (currentSegmentIndex < audioSegments.length - 1) {
				setCurrentSegmentIndex(prev => prev + 1)
			} else {
				// All segments completed
				setIsPlaying(false)
				setIsCompleted(true)
			}
		}

		utterance.onerror = event => {
			log.error("Speech synthesis error:", event)
			// Try to continue to next segment on error
			if (currentSegmentIndex < audioSegments.length - 1) {
				setCurrentSegmentIndex(prev => prev + 1)
			} else {
				setIsPlaying(false)
				setIsCompleted(false) // Don't mark as completed on error
			}
		}

		currentUtteranceRef.current = utterance
		speechSynthRef.current.speak(utterance)
	}, [currentSegmentIndex, audioSegments, getVoiceForCharacter])

	const handlePlayAudio = useCallback(() => {
		if (!speechSynthRef.current || !audioSegments.length) return

		if (isPlaying) {
			// Pause
			speechSynthRef.current.cancel()
			setIsPlaying(false)
		} else if (isCompleted) {
			// Restart from beginning
			setCurrentSegmentIndex(0)
			setIsCompleted(false)
			setIsPlaying(true)
			// playCurrentSegment will be called by useEffect when currentSegmentIndex changes
		} else {
			// Play/Resume
			setIsPlaying(true)
			playCurrentSegment()
		}
	}, [isPlaying, isCompleted, audioSegments, playCurrentSegment])

	// Auto-play next segment when currentSegmentIndex changes
	useEffect(() => {
		if (isPlaying && !isCompleted && currentSegmentIndex >= 0) {
			playCurrentSegment()
		}
	}, [currentSegmentIndex, isPlaying, isCompleted, playCurrentSegment])

	const handleExport = useCallback(
		(format: "md" | "txt" | "html") => {
			if (onExport) {
				onExport(format)
				return
			}

			// Default export implementation
			let exportContent = content
			let mimeType = "text/plain"
			let fileExtension = "txt"

			switch (format) {
				case "md":
					mimeType = "text/markdown"
					fileExtension = "md"
					break
				case "html":
					// Convert markdown to HTML (simplified)
					exportContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
    code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${description ? `<p><em>${description}</em></p>` : ""}
  <div>${content.replace(/\n/g, "<br>")}</div>
</body>
</html>`
					mimeType = "text/html"
					fileExtension = "html"
					break
			}

			// Generate filename from title, with fallback logic
			const generateFileName = (titleParam: string, extension: string): string => {
				// If title is empty, undefined, or just whitespace, extract from content
				let filename = titleParam?.trim()

				if (!filename) {
					// Try to extract title from markdown content (look for # heading)
					const h1Match = content.match(/^#\s+(.+)$/m)
					if (h1Match?.[1]) {
						filename = h1Match[1].trim()
					} else {
						// Try to get first non-empty line
						const firstLine = content.split("\n").find(line => line.trim())
						if (firstLine) {
							filename = firstLine.trim().substring(0, 50)
						} else {
							filename = "document"
						}
					}
				}

				// Clean filename: remove/replace invalid characters
				filename = filename
					.replace(/[<>:"/\\|?*]/g, "_") // Replace invalid filename characters
					.replace(/\s+/g, "_") // Replace spaces with underscores
					.replace(/_+/g, "_") // Replace multiple underscores with single
					.replace(/^_|_$/g, "") // Remove leading/trailing underscores

				// Ensure filename isn't too long (max 100 chars before extension)
				if (filename.length > 100) {
					filename = filename.substring(0, 100)
				}

				// Ensure we have a valid filename
				if (!filename || filename === "_") {
					filename = "document"
				}

				return `${filename}.${extension}`
			}

			const blob = new Blob([exportContent], { type: mimeType })
			const url = URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = url
			link.download = generateFileName(title, fileExtension)
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)
		},
		[content, title, description, onExport]
	)

	const handleStartEdit = useCallback(() => {
		setIsEditing(true)
		setEditContent(content)
	}, [content])

	const handleSaveEdit = useCallback(() => {
		if (onEdit) {
			onEdit(editContent)
		}
		setIsEditing(false)
	}, [editContent, onEdit])

	const handleCancelEdit = useCallback(() => {
		setIsEditing(false)
		setEditContent(content)
	}, [content])

	return (
		<div
			className={`markdown-document-renderer bg-white ${isFullscreen ? "fixed inset-0 z-50 flex flex-col" : "rounded-lg max-h-[80vh] flex flex-col"} border border-gray-200 shadow-sm`}
		>
			{/* Scrollable container for entire modal */}
			<div className="flex-1 overflow-auto">
				{/* Header */}
				<div className="border-b border-gray-200 p-4 bg-white">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							{/* Title and type */}
							<div className="flex items-center space-x-3 mb-2">
								<FiFileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
								<h2 className="text-xl font-semibold text-gray-900 truncate">{title}</h2>
								<span
									className={`px-2 py-1 rounded-md text-xs font-medium border ${documentTypeColor}`}
								>
									{documentTypeDisplay}
								</span>
								{version && (
									<span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
										v{version}
									</span>
								)}
							</div>

							{/* Description */}
							{description && <p className="text-gray-600 mb-3">{description}</p>}

							{/* Metadata */}
							<div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
								{author && (
									<div className="flex items-center space-x-1">
										<FiUser className="w-4 h-4" />
										<span>{author}</span>
									</div>
								)}
								<div className="flex items-center space-x-1">
									<span>{calculatedWordCount.toLocaleString()}文字</span>
								</div>
								{calculatedReadTime > 0 && (
									<div className="flex items-center space-x-1">
										<FiClock className="w-4 h-4" />
										<span>約{calculatedReadTime}分で読了</span>
									</div>
								)}
								{updatedAt && (
									<div className="flex items-center space-x-1">
										<span>更新: {formattedDate(updatedAt)}</span>
									</div>
								)}
								{createdAt && !updatedAt && (
									<div className="flex items-center space-x-1">
										<span>作成: {formattedDate(createdAt)}</span>
									</div>
								)}
							</div>

							{/* Tags and Category */}
							{(tags?.length || category) && (
								<div className="flex flex-wrap items-center gap-2 mt-3">
									{category && (
										<span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
											{category}
										</span>
									)}
									{tags?.map((tag, index) => (
										<div key={index} className="flex items-center space-x-1">
											<FiTag className="w-3 h-3 text-gray-400" />
											<span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md">
												{tag}
											</span>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Action buttons */}
						{interactive && (
							<div className="flex items-center space-x-2 ml-4">
								{enableEditing && (
									<button
										onClick={isEditing ? handleSaveEdit : handleStartEdit}
										className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
										title={isEditing ? "保存" : "編集"}
									>
										{isEditing ? <FiSave className="w-4 h-4" /> : <FiEdit3 className="w-4 h-4" />}
									</button>
								)}
								{isEditing && (
									<button
										onClick={handleCancelEdit}
										className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
										title="キャンセル"
									>
										<FiX className="w-4 h-4" />
									</button>
								)}
								<button
									onClick={handleCopy}
									className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
									title={copied ? "コピー済み" : "コピー"}
								>
									<FiCopy className="w-4 h-4" />
								</button>
								<button
									onClick={handlePlayAudio}
									className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
									disabled={!audioSegments.length}
									title={
										isPlaying
											? "一時停止"
											: isCompleted
												? "最初から再生"
												: currentSegmentIndex > 0
													? "再生を継続"
													: "音声再生"
									}
								>
									{isPlaying ? (
										<FiPause className="w-4 h-4" />
									) : isCompleted ? (
										<FiRotateCcw className="w-4 h-4" />
									) : (
										<FiPlay className="w-4 h-4" />
									)}
								</button>
								<div className="relative group">
									<button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
										<FiDownload className="w-4 h-4" />
									</button>
									<div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 min-w-[120px]">
										<button
											onClick={() => handleExport("md")}
											className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
										>
											Markdown
										</button>
										<button
											onClick={() => handleExport("txt")}
											className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
										>
											テキスト
										</button>
										<button
											onClick={() => handleExport("html")}
											className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
										>
											HTML
										</button>
									</div>
								</div>
								<button
									onClick={handleToggleFullscreen}
									className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
									title={isFullscreen ? "縮小" : "拡大"}
								>
									{isFullscreen ? (
										<FiMinimize2 className="w-4 h-4" />
									) : (
										<FiMaximize2 className="w-4 h-4" />
									)}
								</button>
								{onClose && (
									<button
										onClick={onClose}
										className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
										title="閉じる"
									>
										<FiX className="w-4 h-4" />
									</button>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Content */}
				<div className="p-6">
					{isEditing ? (
						<div className="min-h-[400px]">
							<textarea
								value={editContent}
								onChange={e => setEditContent(e.target.value)}
								className="w-full h-full min-h-[400px] p-4 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
								placeholder="Markdownコンテンツを入力..."
							/>
						</div>
					) : (
						<div className="markdown-content">
							<MarkdownPreview content={content} />
						</div>
					)}
				</div>

				{/* Footer (in fullscreen only) */}
				{isFullscreen && (
					<div className="border-t border-gray-200 p-3 bg-gray-50">
						<div className="flex items-center justify-between text-xs text-gray-500">
							<div className="flex items-center space-x-4">
								<span>{calculatedWordCount.toLocaleString()}文字</span>
								{calculatedReadTime > 0 && <span>約{calculatedReadTime}分</span>}
							</div>
							{(updatedAt || createdAt) && (
								<span>
									{updatedAt
										? `更新: ${formattedDate(updatedAt)}`
										: `作成: ${formattedDate(createdAt)}`}
								</span>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
