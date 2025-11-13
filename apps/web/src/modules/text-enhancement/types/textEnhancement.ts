/**
 * Text Enhancement Feature - Frontend Type Definitions
 *
 * フロントエンド専用の型定義。バックエンドとの整合性を保ちつつ、
 * React コンポーネントや Hooks で使用する型を定義します。
 */

// ===========================================
// 基本的な列挙型・定数型（バックエンドと共通）
// ===========================================

export const ENHANCEMENT_TYPES = {
	SUMMARY: "summary",
	IMPROVEMENT: "improvement",
	SUPPLEMENTATION: "supplementation",
	COMPREHENSIVE: "comprehensive",
} as const

export type EnhancementType = (typeof ENHANCEMENT_TYPES)[keyof typeof ENHANCEMENT_TYPES]

export const SUMMARY_LENGTHS = {
	SHORT: "short",
	MEDIUM: "medium",
	LONG: "long",
} as const

export type SummaryLength = (typeof SUMMARY_LENGTHS)[keyof typeof SUMMARY_LENGTHS]

export const TARGET_AUDIENCES = {
	GENERAL: "general",
	TECHNICAL: "technical",
	EXECUTIVE: "executive",
} as const

export type TargetAudience = (typeof TARGET_AUDIENCES)[keyof typeof TARGET_AUDIENCES]

export const FORMATS = {
	MARKDOWN: "markdown",
	PLAIN_TEXT: "plain_text",
} as const

export type Format = (typeof FORMATS)[keyof typeof FORMATS]

export const AGENT_TYPES = {
	SUMMARY: "summary",
	ENHANCEMENT: "enhancement",
	SUPPLEMENT: "supplement",
	ANALYSIS: "analysis",
	EVALUATION: "evaluation",
} as const

export type AgentType = (typeof AGENT_TYPES)[keyof typeof AGENT_TYPES]

// ===========================================
// API通信用型定義
// ===========================================

export interface EnhancementOptions {
	summaryLength: SummaryLength
	format: Format
	targetAudience: TargetAudience
	addSupplements: boolean
	addAnalysis: boolean
	language: string
	maxAgents?: number
	enableParallelProcessing?: boolean
	// Quick-Fix機能用の追加プロパティ
	quickFix?: boolean
	theme?: string
	preserveFormatting?: boolean
}

export interface TextEnhancementRequest {
	text: string
	enhancementType: EnhancementType
	options: EnhancementOptions
	userId: string
}

export interface Improvement {
	type: "grammar" | "clarity" | "structure" | "conciseness" | "terminology"
	count: number
}

export interface Supplement {
	term: string
	explanation: string
}

export interface AgentOutput {
	summary?: string
	enhancedText?: string
	supplementedText?: string
	wordCount?: number
	format?: Format
	improvements?: Improvement[]
	supplements?: Supplement[]
}

export interface AgentResult {
	agentId: string
	agentType: AgentType
	score: number
	output: AgentOutput
	processingTime: number
}

export interface BestResult {
	agentId: string
	combinedScore: number
	finalOutput: {
		summary?: string
		enhancedText?: string
		supplements?: string[]
		analysisText?: string
	}
}

export interface ProcessingMetadata {
	originalWordCount: number
	summaryRatio: number
	confidenceLevel: "low" | "medium" | "high"
}

export interface TextEnhancementResponse {
	success: boolean
	requestId: string
	results: AgentResult[]
	bestResult: BestResult
	totalProcessingTime: number
	metadata: ProcessingMetadata
	error?: string
}

// ===========================================
// React Hook用型定義
// ===========================================

export interface UseTextEnhancementReturn {
	enhance: (
		text: string,
		enhancementType: EnhancementType,
		options: EnhancementOptions
	) => Promise<void>
	results: AgentResult[]
	bestResult: BestResult | null
	isLoading: boolean
	progress: number
	error: string | null
	clearResults: () => void
}

// ===========================================
// WebSocket通信用型定義
// ===========================================

export interface WebSocketMessage {
	type: "progress" | "agent_result" | "best_result" | "complete" | "error"
	data: Record<string, unknown>
}

export interface ProgressUpdate {
	type: "progress"
	progress: number
	currentAgent?: string
	message?: string
}

export interface AgentResultUpdate {
	type: "agent_result"
	result: AgentResult
}

export interface BestResultUpdate {
	type: "best_result"
	bestResult: BestResult
}

export interface CompleteUpdate {
	type: "complete"
	finalResults: TextEnhancementResponse
}

export interface ErrorUpdate {
	type: "error"
	error: string
	code?: string
}

// ===========================================
// フィードバック用型定義
// ===========================================

export interface UserFeedback {
	resultId: string
	rating: number // 1-5の星評価
	comment: string
	categories: string[] // 'accuracy', 'clarity', 'completeness', 'usefulness'
	timestamp: string
}

export interface FeedbackCategory {
	id: string
	label: string
}

// ===========================================
// UI コンポーネント用型定義
// ===========================================

export interface TextEnhancementFormData {
	text: string
	enhancementType: EnhancementType
	summaryLength: SummaryLength
	format: Format
	targetAudience: TargetAudience
	addSupplements: boolean
}

export interface ResultDisplayProps {
	result: AgentResult
	isSelected?: boolean
	onSelect?: (agentId: string) => void
	onAccept?: (agentId: string) => void
}

export interface BestResultDisplayProps {
	bestResult: BestResult
	onAccept: (agentId: string) => void
}

export interface ProgressDisplayProps {
	isLoading: boolean
	progress: number
	currentAgent?: string
	message?: string
}

export interface FeedbackModalProps {
	resultId: string
	isOpen: boolean
	onClose: () => void
	onSubmit: (feedback: UserFeedback) => void
}

export interface OptionsFormProps {
	options: EnhancementOptions
	onChange: (options: EnhancementOptions) => void
	disabled?: boolean
}

// ===========================================
// エラーハンドリング用型定義
// ===========================================

export interface EnhancementError {
	code: string
	message: string
	details?: Record<string, unknown>
}

export const ERROR_CODES = {
	INVALID_INPUT: "INVALID_INPUT",
	TEXT_TOO_LONG: "TEXT_TOO_LONG",
	RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
	COST_LIMIT_EXCEEDED: "COST_LIMIT_EXCEEDED",
	NETWORK_ERROR: "NETWORK_ERROR",
	WEBSOCKET_ERROR: "WEBSOCKET_ERROR",
	TIMEOUT_ERROR: "TIMEOUT_ERROR",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// ===========================================
// 設定・表示用型定義
// ===========================================

export interface DisplayLabels {
	enhancementTypes: Record<EnhancementType, string>
	summaryLengths: Record<SummaryLength, string>
	targetAudiences: Record<TargetAudience, string>
	formats: Record<Format, string>
	agentTypes: Record<AgentType, string>
}

export interface ValidationRules {
	minTextLength: number
	maxTextLength: number
	maxCostPerRequest: number
}

// ===========================================
// i18n用型定義
// ===========================================

export interface TextEnhancementTranslations {
	pageTitle: string
	pageDescription: string
	inputLabel: string
	inputPlaceholder: string
	enhanceButton: string
	loadingMessage: string
	errorTitle: string
	resultTitle: string
	bestResultTitle: string
	agentResultTitle: string
	feedbackTitle: string
	costEstimateTitle: string
	characterCount: string
	processingTime: string
	confidence: string
	acceptButton: string
	cancelButton: string
	submitButton: string
	clearButton: string
}
