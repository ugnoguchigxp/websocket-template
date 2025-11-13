import type React from "react"
import { useState } from "react"

interface IPasteEvent {
	timestamp: Date
	plainText: string
	htmlText: string
	isMarkdownDetected: boolean
	isSimpleHtml: boolean
	wasProcessed: boolean
	processingResult?: string
}

interface IPasteDebugPanelProps {
	pasteEvents: IPasteEvent[]
	onClearEvents: () => void
	className?: string
}

export const PasteDebugPanel: React.FC<IPasteDebugPanelProps> = ({
	pasteEvents,
	onClearEvents,
	className = "",
}) => {
	const [isExpanded, setIsExpanded] = useState(false)
	const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null)

	const selectedEvent = selectedEventIndex !== null ? pasteEvents[selectedEventIndex] : null

	const toggleExpanded = () => {
		setIsExpanded(!isExpanded)
	}

	const copyToClipboard = (text: string) => {
		navigator.clipboard
			.writeText(text)
			.then(() => {})
			.catch(() => {})
	}

	return (
		<div className={`border border-yellow-300 rounded-md bg-yellow-50 ${className}`}>
			<div
				className="flex items-center justify-between p-3 cursor-pointer hover:bg-yellow-100"
				onClick={toggleExpanded}
			>
				<h3 className="font-semibold text-yellow-800 flex items-center">
					🔍 ペーストデバッグ ({pasteEvents.length} イベント)
					<span className="ml-2 text-sm">{isExpanded ? "▼" : "▶"}</span>
				</h3>
				<button
					onClick={e => {
						e.stopPropagation()
						onClearEvents()
					}}
					className="px-2 py-1 text-xs bg-yellow-200 hover:bg-yellow-300 rounded text-yellow-800"
				>
					クリア
				</button>
			</div>

			{isExpanded && (
				<div className="border-t border-yellow-300 p-3 space-y-3">
					{pasteEvents.length === 0 ? (
						<div className="text-yellow-700 text-sm text-center py-4">
							まだペーストイベントがありません。
							<br />
							エディタにテキストをペーストして確認してください。
						</div>
					) : (
						<div className="space-y-2">
							<div className="text-xs text-yellow-700 mb-2">
								最新のペーストイベントから表示（クリックで詳細表示）:
							</div>
							{pasteEvents
								.slice()
								.reverse()
								.map((event, index) => {
									const originalIndex = pasteEvents.length - 1 - index
									return (
										<div
											key={originalIndex}
											className={`p-2 rounded cursor-pointer transition-colors ${
												selectedEventIndex === originalIndex
													? "bg-yellow-200 border border-yellow-400"
													: "bg-yellow-100 hover:bg-yellow-150"
											}`}
											onClick={() => setSelectedEventIndex(originalIndex)}
										>
											<div className="flex items-center justify-between text-xs">
												<span className="font-mono">{event.timestamp.toLocaleTimeString()}</span>
												<div className="flex gap-2">
													<span
														className={`px-1 rounded ${
															event.wasProcessed
																? "bg-green-200 text-green-800"
																: "bg-gray-200 text-gray-800"
														}`}
													>
														{event.wasProcessed ? "Processed" : "Default"}
													</span>
													<span
														className={`px-1 rounded ${
															event.isMarkdownDetected
																? "bg-blue-200 text-blue-800"
																: "bg-gray-200 text-gray-800"
														}`}
													>
														{event.isMarkdownDetected ? "MD" : "Plain"}
													</span>
												</div>
											</div>
											<div className="text-xs text-yellow-700 mt-1 truncate">
												Plain: "{event.plainText.substring(0, 50)}..."
											</div>
										</div>
									)
								})}
						</div>
					)}

					{selectedEvent && (
						<div className="border-t border-yellow-300 pt-3 space-y-3">
							<h4 className="font-semibold text-yellow-800 text-sm">
								📋 選択されたイベントの詳細:
							</h4>

							<div className="space-y-2 text-xs">
								<div>
									<strong>タイムスタンプ:</strong> {selectedEvent.timestamp.toLocaleString()}
								</div>
								<div>
									<strong>Markdown検出:</strong>{" "}
									{selectedEvent.isMarkdownDetected ? "✅ はい" : "❌ いいえ"}
								</div>
								<div>
									<strong>Simple HTML:</strong>{" "}
									{selectedEvent.isSimpleHtml ? "✅ はい" : "❌ いいえ"}
								</div>
								<div>
									<strong>処理結果:</strong>{" "}
									{selectedEvent.wasProcessed ? "✅ 変換実行" : "❌ デフォルト処理"}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<div className="flex items-center justify-between mb-1">
										<strong className="text-xs text-yellow-800">プレーンテキスト:</strong>
										<button
											onClick={() => copyToClipboard(selectedEvent.plainText)}
											className="px-1 py-0.5 text-xs bg-yellow-200 hover:bg-yellow-300 rounded"
										>
											📋
										</button>
									</div>
									<pre className="bg-gray-100 p-2 rounded text-xs max-h-32 overflow-auto font-mono border">
										{selectedEvent.plainText}
									</pre>
								</div>

								<div>
									<div className="flex items-center justify-between mb-1">
										<strong className="text-xs text-yellow-800">HTMLコンテンツ:</strong>
										<button
											onClick={() => copyToClipboard(selectedEvent.htmlText)}
											className="px-1 py-0.5 text-xs bg-yellow-200 hover:bg-yellow-300 rounded"
										>
											📋
										</button>
									</div>
									<pre className="bg-gray-100 p-2 rounded text-xs max-h-32 overflow-auto font-mono border">
										{selectedEvent.htmlText || "(なし)"}
									</pre>
								</div>
							</div>

							{selectedEvent.processingResult && (
								<div>
									<strong className="text-xs text-yellow-800">処理ログ:</strong>
									<pre className="bg-gray-100 p-2 rounded text-xs max-h-20 overflow-auto font-mono border mt-1">
										{selectedEvent.processingResult}
									</pre>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export type { IPasteEvent }
