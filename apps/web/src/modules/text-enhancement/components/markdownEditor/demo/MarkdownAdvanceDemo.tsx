import type React from "react"
import { useEffect, useState } from "react"

import { MarkdownAdvanceEditor } from "../components/MarkdownAdvanceEditor"
import { MarkdownPreview } from "../components/MarkdownPreview"
import type { ISelectionInfo } from "../utils/selectionUtils"

const SAMPLE_MARKDOWN = `# P-0026: メモリ管理のリファクタリング

## 📋 チケット情報
- **作成日**: 2025/8/27
- **ステータス**: TODO
- **優先度**: High（メモリリーク問題によりMCP機能に影響）
- **担当者**: 開発チーム
- **関連チケット**: P-0020（Kanban MCP実装）

## 🎯 目的
テストモジュールで発生しているメモリリーク問題を特定・解決し、LLM Multi-Agent、Wiki MCP、API Executorの各モジュールのメモリ効率を向上させる。

## 🚨 問題概要

### 発見された問題
メモリリーク検出スクリプト実行により、以下のメモリ消費パターンが判明：

| モジュール | 実行時間 | メモリ制限 | 状況 | メモリリーク判定 |
|------------|----------|------------|------|------------------|
| **Kanban MCP Basic** | 0.3秒 | 256MB | ✅ 正常動作 | なし |
| **LLM Multi-Agent** | 18秒 | 512MB | 🚨 大量メモリ消費 | **高リスク** |
| **Wiki MCP Integration** | 6秒 | 512MB | ⚠️ 中程度消費 | 中リスク |
| **API Executor** | 5秒 | 512MB | ⚠️ 中程度消費 | 中リスク |

### 影響範囲
- MCPツールの実行時にJavaScript heap out of memory エラーが発生
- テスト実行にNODE_OPTIONS='--max-old-space-size=8192'が必要な状況
- LLM Multi-Agentテストの15/17テストが失敗状態

## 🔍 詳細分析

### 1. LLM Multi-Agent Orchestrator（最大問題）
**ファイル**: \`src/modules/summary-fix/agents/orchestrator/MultiAgentOrchestrator.test.ts\`

**症状**:
- 実行時間: 18秒（他モジュールの3-6倍）
- エラー: "マルチエージェント実行に失敗しました: すべてのエージェントが失敗しました"
- ヘルスチェックテストも全て'unhealthy'を返す

**推定原因**:
\`\`\`typescript
// 問題のあるパターン（推定）
class MultiAgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeAgents(request: any) {
    // 並列エージェント実行でメモリ蓄積
    const results = await Promise.all([
      this.summaryAgent.execute(request),
      this.enhancementAgent.execute(request), 
      this.supplementAgent.execute(request)
    ]);
    // エージェント実行後のクリーンアップ不足
  }
}
\`\`\`

**修正要件**:
- エージェント実行後の明示的なリソース解放
- 並列処理からシーケンシャル実行への変更検討
- メモリ使用量監視機能の追加
`

export const MarkdownAdvanceDemo: React.FC = () => {
	const [markdownOutput, setMarkdownOutput] = useState<string>("")
	const [initialContent, setInitialContent] = useState<string>()
	const [, setCurrentSelection] = useState<ISelectionInfo | null>(null)
	const [showPasteDebug, setShowPasteDebug] = useState<boolean>(true)
	const [showPreview, setShowPreview] = useState<boolean>(false)

	// 初期コンテンツを直接Markdownテキストで設定
	useEffect(() => {
		// MarkdownAdvanceEditorは自己完結型なので直接Markdownテキストを渡す
		setInitialContent(SAMPLE_MARKDOWN)
		setMarkdownOutput(SAMPLE_MARKDOWN)
	}, [])

	const handleMarkdownChange = (markdown: string) => {
		setMarkdownOutput(markdown)
	}

	const handleSelectionChange = (selectionInfo: ISelectionInfo | null) => {
		setCurrentSelection(selectionInfo)
	}

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			<div className="text-center">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Markdown Advance Editor Demo</h1>
				<p className="text-gray-600">
					TipTap-based WYSIWYG editor with Markdown support and syntax display
				</p>
				<div className="mt-4 space-y-2">
					<label className="flex items-center justify-center gap-2 text-sm text-gray-600">
						<input
							type="checkbox"
							checked={showPasteDebug}
							onChange={e => setShowPasteDebug(e.target.checked)}
							className="rounded"
						/>
						📋 ペーストデバッグを表示（右側の出力からコピーして確認）
					</label>
					<label className="flex items-center justify-center gap-2 text-sm text-gray-600">
						<input
							type="checkbox"
							checked={showPreview}
							onChange={e => setShowPreview(e.target.checked)}
							className="rounded"
						/>
						👁️ Markdownプレビューを表示（# **bold** 記法のレンダリング）
					</label>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div>
					<h2 className="text-lg font-semibold text-gray-800 mb-2">Editor</h2>
					{initialContent ? (
						<MarkdownAdvanceEditor
							initialContent={initialContent}
							placeholder="Start typing..."
							onMarkdownChange={handleMarkdownChange}
							onSelectionChange={handleSelectionChange}
							showSyntaxStatus={true}
							showPasteDebug={showPasteDebug}
							className="w-full"
						/>
					) : (
						<div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-md">
							<div className="text-gray-500">Loading editor...</div>
						</div>
					)}
				</div>

				<div>
					<h2 className="text-lg font-semibold text-gray-800 mb-2">
						{showPreview ? "Markdown Preview" : "Markdown Output"}
					</h2>
					<div className="bg-gray-50 border border-gray-200 rounded-md p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
						{showPreview ? (
							<>
								<div className="bg-white border border-gray-200 rounded p-3 mb-4">
									<MarkdownPreview
										markdown={markdownOutput || "Markdown preview will appear here..."}
										className="select-all"
									/>
								</div>
								<h3 className="text-sm font-semibold text-gray-700 mb-2">Raw Markdown</h3>
								<textarea
									className="w-full h-32 text-xs text-gray-800 font-mono border border-gray-200 rounded p-2 resize-none bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
									value={markdownOutput || "Markdown output will appear here..."}
									readOnly
									onClick={e => e.currentTarget.select()}
								/>
							</>
						) : (
							<>
								<textarea
									className="w-full h-96 text-sm text-gray-800 font-mono border border-gray-200 rounded p-2 resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
									value={markdownOutput || "Markdown output will appear here..."}
									readOnly
									onClick={e => e.currentTarget.select()}
								/>
								<div className="mt-2 text-xs text-gray-500">
									💡
									この出力をコピーして左のエディタにペーストできます（チェックボックスでプレビューモードも切り替え可能）
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
