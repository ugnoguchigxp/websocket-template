import type React from "react"

import type { ISelectionInfo } from "../utils/selectionUtils"

interface IMarkdownSyntaxStatusProps {
	selectionInfo: ISelectionInfo | null
	className?: string
}

export const MarkdownSyntaxStatus: React.FC<IMarkdownSyntaxStatusProps> = ({
	selectionInfo,
	className = "",
}) => {
	if (!selectionInfo || !selectionInfo.selectedText.trim()) {
		return (
			<div
				className={`bg-gray-50 border-t border-gray-200 px-4 py-2 text-sm text-gray-500 ${className}`}
			>
				<span>カーソルをテキストに合わせるか、テキストを選択してMarkdown構文を表示</span>
			</div>
		)
	}

	return (
		<div className={`bg-blue-50 border-t border-blue-200 px-4 py-2 text-sm ${className}`}>
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-4">
					<span className="font-medium text-blue-700">選択テキスト:</span>
					<span className="text-gray-700 truncate max-w-xs">"{selectionInfo.selectedText}"</span>
				</div>

				<div className="flex items-center gap-4">
					<span className="font-medium text-blue-700">Markdown構文:</span>
					<code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">
						{selectionInfo.markdownSyntax}
					</code>
				</div>

				{selectionInfo.marks.length > 0 && (
					<div className="flex items-center gap-4">
						<span className="font-medium text-blue-700">スタイル:</span>
						<div className="flex gap-2">
							{selectionInfo.marks.map((mark, index) => (
								<span
									key={index}
									className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs"
								>
									{mark}
								</span>
							))}
						</div>
					</div>
				)}

				<div className="flex items-center gap-4">
					<span className="font-medium text-blue-700">ノードタイプ:</span>
					<span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">
						{selectionInfo.nodeType}
					</span>
				</div>
			</div>
		</div>
	)
}
