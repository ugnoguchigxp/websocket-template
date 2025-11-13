import { MarkdownAdvanceEditor } from "@/modules/text-enhancement/components/markdownEditor/components/MarkdownAdvanceEditor"
import { MarkdownPreview as MarkdownPreviewComponent } from "@/modules/text-enhancement/components/markdownEditor/components/MarkdownPreview"
import type React from "react"
import { useState } from "react"

const SAMPLE_MARKDOWN = `# Welcome to Markdown Editor

This is a **Tiptap-based** markdown editor with advanced features.

## Features

- **Rich text editing** with markdown syntax
- Table support with inline editing
- Code blocks with syntax highlighting
- Image and link insertion
- Real-time preview

## Sample Table

| Feature | Status | Priority |
|---------|--------|----------|
| Editor | ✅ Working | High |
| Preview | ✅ Working | High |
| Tables | ✅ Working | Medium |

## Code Example

\`\`\`typescript
const greeting = (name: string) => {
  return \`Hello, \${name}!\`;
};

console.log(greeting('World'));
\`\`\`

Start editing to see the markdown editor in action!
`

export const MarkdownEditorPage: React.FC = () => {
	const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN)
	const [showPreview, setShowPreview] = useState(true)

	return (
		<div className="flex flex-col h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200 px-6 py-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-gray-900">Markdown Editor</h1>
					<button
						onClick={() => setShowPreview(!showPreview)}
						className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						{showPreview ? "Hide Preview" : "Show Preview"}
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-hidden">
				<div className={`grid h-full ${showPreview ? "grid-cols-2" : "grid-cols-1"} gap-4 p-6`}>
					{/* Editor */}
					<div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
						<div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
							<h2 className="text-sm font-semibold text-gray-700">Editor</h2>
						</div>
						<div className="flex-1 overflow-auto p-4">
							<MarkdownAdvanceEditor
								initialValue={markdown}
								onChange={setMarkdown}
								placeholder="Start typing your markdown here..."
							/>
						</div>
					</div>

					{/* Preview */}
					{showPreview && (
						<div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
							<div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
								<h2 className="text-sm font-semibold text-gray-700">Preview</h2>
							</div>
							<div className="flex-1 overflow-auto p-4">
								<MarkdownPreviewComponent content={markdown} />
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Footer */}
			<div className="bg-white border-t border-gray-200 px-6 py-3">
				<div className="flex items-center justify-between text-sm text-gray-600">
					<span>Character count: {markdown.length}</span>
					<span className="text-xs text-gray-500">Tiptap v3 • Markdown Editor</span>
				</div>
			</div>
		</div>
	)
}
