import type React from "react"
import { useMemo } from "react"

import DOMPurify from "dompurify"
import { marked } from "marked"

interface IMarkdownPreviewProps {
	markdown: string
	className?: string
}

export type { IMarkdownPreviewProps }

export const MarkdownPreview: React.FC<IMarkdownPreviewProps> = ({ markdown, className = "" }) => {
	const renderedHtml = useMemo(() => {
		if (!markdown.trim()) {
			return '<p class="text-gray-500 italic">Markdown output will appear here...</p>'
		}

		try {
			// Configure marked with better options
			const html = marked.parse(markdown, {
				gfm: true,
				breaks: false,
				pedantic: false,
			}) as string

			// Sanitize the HTML to prevent XSS
			const cleanHtml = DOMPurify.sanitize(html, {
				ALLOWED_TAGS: [
					"h1",
					"h2",
					"h3",
					"h4",
					"h5",
					"h6",
					"p",
					"br",
					"strong",
					"em",
					"b",
					"i",
					"u",
					"s",
					"ul",
					"ol",
					"li",
					"blockquote",
					"code",
					"pre",
					"a",
					"img",
					"table",
					"thead",
					"tbody",
					"tr",
					"th",
					"td",
					"hr",
					"div",
					"span",
				],
				ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target"],
				ALLOW_DATA_ATTR: false,
			})

			return cleanHtml
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			return `<p class="text-red-500">⚠️ Markdown rendering error: ${errorMessage}</p>`
		}
	}, [markdown])

	const styleContent = `
    .markdown-preview pre {
      background-color: rgb(30 41 59) !important;
      color: rgb(243 244 246) !important;
      border: 1px solid rgb(51 65 85) !important;
    }
    .markdown-preview pre code {
      background-color: transparent !important;
      color: rgb(243 244 246) !important;
      padding: 0 !important;
    }
  `

	return (
		<div className={className}>
			<style dangerouslySetInnerHTML={{ __html: styleContent }} />
			<div
				className="markdown-preview prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2 prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-1 prose-h3:text-lg prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-em:text-gray-800 prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-gray-900 prose-pre:bg-slate-800 prose-pre:text-gray-100 prose-pre:rounded-md prose-pre:p-4 prose-pre:shadow-inner prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-700 prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800 prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2 prose-hr:border-gray-300"
				dangerouslySetInnerHTML={{ __html: renderedHtml }}
			/>
		</div>
	)
}
