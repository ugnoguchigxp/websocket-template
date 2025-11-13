/**
 * エディタとプレビューのスクロール同期を管理するカスタムフック
 */

import { type RefObject, useCallback } from "react"

interface ScrollSyncHookOptions {
	textareaRef: RefObject<HTMLTextAreaElement | null>
	previewRef: RefObject<HTMLDivElement | null>
	enabled: boolean
}

interface ScrollSyncHookResult {
	handleTextareaScroll: () => void
	handlePreviewScroll: () => void
}

export const useScrollSync = ({
	textareaRef,
	previewRef,
	enabled,
}: ScrollSyncHookOptions): ScrollSyncHookResult => {
	const handleTextareaScroll = useCallback(() => {
		if (!enabled || !textareaRef.current || !previewRef.current) return

		const textarea = textareaRef.current
		const preview = previewRef.current

		const scrollRatio = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight || 1)
		const targetScrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight)

		preview.scrollTop = targetScrollTop
	}, [enabled])

	const handlePreviewScroll = useCallback(() => {
		if (!enabled || !textareaRef.current || !previewRef.current) return

		const textarea = textareaRef.current
		const preview = previewRef.current

		const scrollRatio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1)
		const targetScrollTop = scrollRatio * (textarea.scrollHeight - textarea.clientHeight)

		textarea.scrollTop = targetScrollTop
	}, [enabled])

	return {
		handleTextareaScroll,
		handlePreviewScroll,
	}
}
