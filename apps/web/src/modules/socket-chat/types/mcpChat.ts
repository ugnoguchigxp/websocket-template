/**
 * メッセージタイプの型定義
 */
export type MessageType = "text" | "chart" | "browser" | "playwright" | "flow" | "markdown_document"

/**
 * チャートタイプの型定義
 */
export type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "composed"

/**
 * ビューポートタイプの型定義
 */
export type ViewportType = "desktop" | "mobile" | "tablet"

/**
 * テーマタイプの型定義
 */
export type ThemeType = "light" | "dark"

/**
 * 実行ステータスの型定義
 */
export type ExecutionStatus = "running" | "completed" | "failed"

/**
 * チャート設定の型定義
 */
export interface ChartConfig {
	xAxis?: string
	yAxis?: string | string[]
	dataKey?: string
	nameKey?: string
	colors?: string[]
	width?: number
	height?: number
}

/**
 * チャートデータの型定義
 */
export interface ChartData {
	type: ChartType
	title: string
	description?: string
	data: Record<string, string | number>[]
	config: ChartConfig
}

/**
 * ブラウザフレームデータの型定義
 */
export interface BrowserFrameData {
	url: string
	title?: string
	width?: number
	height?: number
	allowInteraction?: boolean
	sandbox?: string[]
	viewport?: ViewportType
}

/**
 * Playwright実行ステップの型定義
 */
export interface PlaywrightStep {
	step: number
	action: string
	screenshot?: string
	timestamp: string
	duration: number
}

/**
 * Playwright実行結果の型定義
 */
export interface PlaywrightResult {
	scriptId: string
	status: ExecutionStatus
	steps: PlaywrightStep[]
	finalScreenshot?: string
	logs: string[]
	error?: string
}

/**
 * Markdownドキュメントの型定義
 */
export type DocumentType =
	| "specification"
	| "draft"
	| "novel"
	| "article"
	| "report"
	| "memo"
	| "manual"
	| "guide"
	| "other"

/**
 * Markdownドキュメントデータの型定義
 */
export interface MarkdownDocumentData {
	type: DocumentType
	title: string
	description?: string
	content: string
	author?: string
	version?: string
	createdAt?: string
	updatedAt?: string
	tags?: string[]
	category?: string
	wordCount?: number
	estimatedReadTime?: number
}

/**
 * ツール呼び出し情報の型定義
 */
export interface ToolCall {
	/** ツール呼び出しの一意識別子 */
	id: string
	/** ツール名 */
	toolName: string
	/** ツールに渡された引数 */
	arguments: Record<string, unknown>
	/** ツールの実行結果（任意） */
	result?: unknown
	/** ツール実行時刻（任意） */
	timestamp?: string
}

/**
 * エージェント間やり取り情報の型定義
 */
export interface AgentInteraction {
	id: string
	sessionId: string
	conductorMessage: string
	executorMessage: string
	interactionType: "proposal" | "evaluation" | "feedback" | "approved" | "rejected"
	messageCategory: "conductor_thinking" | "agent_exchange"
	timestamp: string
}

/**
 * 処理失敗レポートの型定義
 */
export interface FailureReport {
	reason: string
	details: string
	troubleshootingInfo?: string
	isImmediateFailure: boolean
	severity: "low" | "medium" | "high" | "critical"
	suggestions?: string[]
	requiresAdminContact?: boolean
}

/**
 * パフォーマンス指標の型定義
 */
export interface PerformanceMetrics {
	totalDuration: number
	averageExchangeDuration: number
	tokensUsedByConductor: number
	tokensUsedByExecutor: number
}

/**
 * MCP チャットメッセージの型定義
 */
export interface MCPChatMessage {
	/** メッセージの一意識別子 */
	id: string
	/** メッセージ内容 */
	content: string
	/** メッセージの送信者（ユーザー or アシスタント） */
	role: "user" | "assistant"
	/** メッセージ送信時刻（ISO文字列） */
	timestamp: string
	/** メッセージの種類（テキスト or マルチモーダル） */
	messageType?: MessageType
	/** 使用されたツールの情報（任意） */
	toolCalls?: ToolCall[]
	/** メッセージに関連するコンテキスト情報（任意） */
	context?: unknown

	// マルチエージェント対応の追加プロパティ
	/** マルチエージェントが使用されたかどうか */
	isMultiAgentUsed?: boolean
	/** エージェント間のやり取りメッセージかどうか */
	isInteractionMessage?: boolean
	/** ツール実行ログなど一時的なメッセージかどうか */
	isTemporary?: boolean
	/** エージェント間のやりとり情報 */
	agentInteractions?: AgentInteraction[]
	/** 処理失敗レポート */
	failureReport?: FailureReport
	/** 総交換回数 */
	totalExchanges?: number
	/** 指揮者の決定履歴 */
	conductorDecisions?: string[]
	/** 実行者の提案履歴 */
	executorProposals?: string[]
	/** パフォーマンス情報 */
	performanceMetrics?: PerformanceMetrics
	/** エージェント情報（Web検索エージェント等） */
	agentInfo?: string

	// マルチモーダル対応の追加プロパティ
	/** チャートデータ */
	chartData?: ChartData
	/** ブラウザフレームデータ */
	browserFrameData?: BrowserFrameData
	/** Playwright実行結果 */
	playwrightResult?: PlaywrightResult
	/** フローダイアグラムデータ */
	flowData?: import("../../../types/multimodal").FlowData
	/** Markdownドキュメントデータ */
	markdownDocumentData?: MarkdownDocumentData
}

/**
 * チャートデフォルト設定の型定義
 */
export interface ChartDefaults {
	width: number
	height: number
	theme: ThemeType
}

/**
 * ブラウザデフォルト設定の型定義
 */
export interface BrowserDefaults {
	width: number
	height: number
	viewport: ViewportType
	allowInteraction: boolean
}

/**
 * Playwrightデフォルト設定の型定義
 */
export interface PlaywrightDefaults {
	headless: boolean
	timeout: number
	viewport: { width: number; height: number }
}

/**
 * MCP チャット設定の型定義
 */
export interface MCPChatSettings {
	/** 選択されたツール名一覧 */
	selectedTools: string[]
	/** 選択されたリソースURI一覧 */
	selectedResources: string[]
	/** AI応答のランダム性を制御する値（0.0-2.0） */
	temperature: number
	/** AI応答の最大トークン数 */
	maxTokens: number
	/** Markdown表示の有効/無効 */
	enableMarkdown: boolean

	// マルチモーダル機能設定
	/** チャート表示の有効/無効 */
	enableCharts: boolean
	/** ブラウザーエミュレーションの有効/無効 */
	enableBrowserFrame: boolean
	/** Playwrightスクリプト実行の有効/無効 */
	enablePlaywright: boolean
	/** Markdownドキュメント表示の有効/無効 */
	enableMarkdownDocument: boolean

	// 詳細設定
	/** チャートのデフォルト設定 */
	chartDefaults: ChartDefaults
	/** ブラウザーのデフォルト設定 */
	browserDefaults: BrowserDefaults
	/** Playwrightのデフォルト設定 */
	playwrightDefaults: PlaywrightDefaults
}

/**
 * マルチモーダルメッセージ検証ユーティリティ
 */
export const isChartMessage = (
	message: MCPChatMessage
): message is MCPChatMessage & { chartData: ChartData } => {
	return message.messageType === "chart" && !!message.chartData
}

export const isBrowserMessage = (
	message: MCPChatMessage
): message is MCPChatMessage & { browserFrameData: BrowserFrameData } => {
	return message.messageType === "browser" && !!message.browserFrameData
}

export const isPlaywrightMessage = (
	message: MCPChatMessage
): message is MCPChatMessage & { playwrightResult: PlaywrightResult } => {
	return message.messageType === "playwright" && !!message.playwrightResult
}

export const isFlowMessage = (
	message: MCPChatMessage
): message is MCPChatMessage & { flowData: import("../../../types/multimodal").FlowData } => {
	// messageTypeに依存せず、実際のflowDataの存在のみをチェック
	return !!message.flowData && typeof message.flowData === "object"
}

export const isMarkdownDocumentMessage = (
	message: MCPChatMessage
): message is MCPChatMessage & { markdownDocumentData: MarkdownDocumentData } => {
	return message.messageType === "markdown_document" && !!message.markdownDocumentData
}

/**
 * メッセージ種別判定ユーティリティ
 */
export const getMessageDisplayType = (message: MCPChatMessage): string => {
	switch (message.messageType) {
		case "chart":
			return "チャート"
		case "browser":
			return "ブラウザ"
		case "playwright":
			return "Playwright"
		case "flow":
			return "フローダイアグラム"
		case "markdown_document":
			return "Markdownドキュメント"
		default:
			return "テキスト"
	}
}
