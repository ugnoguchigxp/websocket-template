/**
 * Translation Feature - Frontend Type Definitions
 *
 * フロントエンド専用の型定義。バックエンドとの整合性を保ちつつ、
 * React コンポーネントや Hooks で使用する型を定義します。
 */

// ===========================================
// 基本的な列挙型・定数型（バックエンドと共通）
// ===========================================

export const LANGUAGES = {
	JA: "ja",
	EN: "en",
	ZH_CN: "zh-cn",
	ZH_TW: "zh-tw",
	KO: "ko",
	ES: "es",
	FR: "fr",
	DE: "de",
	IT: "it",
	PT: "pt",
	RU: "ru",
	AR: "ar",
	HI: "hi",
	TH: "th",
	VI: "vi",
} as const

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES]

export const TRANSLATION_MODES = {
	NATURAL: "natural", // 自然な翻訳
	LITERAL: "literal", // 直訳
	FORMAL: "formal", // 敬語・丁寧語
	CASUAL: "casual", // カジュアル
	TECHNICAL: "technical", // 技術文書
	BUSINESS: "business", // ビジネス文書
} as const

export type TranslationMode = (typeof TRANSLATION_MODES)[keyof typeof TRANSLATION_MODES]

export const OUTPUT_FORMATS = {
	PLAIN_TEXT: "plain_text",
	MARKDOWN: "markdown",
} as const

export type OutputFormat = (typeof OUTPUT_FORMATS)[keyof typeof OUTPUT_FORMATS]

// ===========================================
// 言語サポート情報
// ===========================================

export interface LanguageInfo {
	code: Language
	name: string
	nativeName: string
	family: string
	direction: "ltr" | "rtl"
	supported: boolean
}

export const LANGUAGE_INFO: Record<Language, LanguageInfo> = {
	[LANGUAGES.JA]: {
		code: LANGUAGES.JA,
		name: "Japanese",
		nativeName: "日本語",
		family: "Japonic",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.EN]: {
		code: LANGUAGES.EN,
		name: "English",
		nativeName: "English",
		family: "Germanic",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.ZH_CN]: {
		code: LANGUAGES.ZH_CN,
		name: "Chinese (Simplified)",
		nativeName: "简体中文",
		family: "Sino-Tibetan",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.ZH_TW]: {
		code: LANGUAGES.ZH_TW,
		name: "Chinese (Traditional)",
		nativeName: "繁體中文",
		family: "Sino-Tibetan",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.KO]: {
		code: LANGUAGES.KO,
		name: "Korean",
		nativeName: "한국어",
		family: "Koreanic",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.ES]: {
		code: LANGUAGES.ES,
		name: "Spanish",
		nativeName: "Español",
		family: "Romance",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.FR]: {
		code: LANGUAGES.FR,
		name: "French",
		nativeName: "Français",
		family: "Romance",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.DE]: {
		code: LANGUAGES.DE,
		name: "German",
		nativeName: "Deutsch",
		family: "Germanic",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.IT]: {
		code: LANGUAGES.IT,
		name: "Italian",
		nativeName: "Italiano",
		family: "Romance",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.PT]: {
		code: LANGUAGES.PT,
		name: "Portuguese",
		nativeName: "Português",
		family: "Romance",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.RU]: {
		code: LANGUAGES.RU,
		name: "Russian",
		nativeName: "Русский",
		family: "Slavic",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.AR]: {
		code: LANGUAGES.AR,
		name: "Arabic",
		nativeName: "العربية",
		family: "Semitic",
		direction: "rtl",
		supported: true,
	},
	[LANGUAGES.HI]: {
		code: LANGUAGES.HI,
		name: "Hindi",
		nativeName: "हिन्दी",
		family: "Indo-Aryan",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.TH]: {
		code: LANGUAGES.TH,
		name: "Thai",
		nativeName: "ไทย",
		family: "Tai-Kadai",
		direction: "ltr",
		supported: true,
	},
	[LANGUAGES.VI]: {
		code: LANGUAGES.VI,
		name: "Vietnamese",
		nativeName: "Tiếng Việt",
		family: "Austroasiatic",
		direction: "ltr",
		supported: true,
	},
}

// ===========================================
// API通信用型定義
// ===========================================

export interface TranslationOptions {
	targetLanguage: Language
	sourceLanguage?: Language // 自動検出の場合はundefined
	mode: TranslationMode
	outputFormat: OutputFormat
	preserveFormatting: boolean
	includeAlternatives: boolean // 代替訳を含める
}

export interface TranslationRequest {
	text: string
	options: TranslationOptions
	userId?: string
}

export interface TranslationResult {
	translatedText: string
	detectedSourceLanguage?: Language
	alternatives?: string[] // 代替翻訳
	confidence: number // 翻訳の信頼度 (0-1)
	wordCount: number
	processingTime: number
}

export interface TranslationResponse {
	success: boolean
	requestId: string
	result?: TranslationResult
	error?: string
	totalProcessingTime: number
	metadata: {
		originalWordCount: number
		translatedWordCount: number
		detectedLanguage?: Language
		confidence: number
	}
}

export interface SupportedLanguagesResponse {
	success: boolean
	languages: LanguageInfo[]
	totalCount: number
	translationModes: TranslationMode[]
	outputFormats: OutputFormat[]
}

export interface LanguageDetectionRequest {
	text: string
}

export interface LanguageDetectionResponse {
	success: boolean
	detectedLanguage: Language
	error?: string
}

// ===========================================
// React Hook用型定義
// ===========================================

export interface UseTranslationReturn {
	translate: (text: string, options: TranslationOptions) => Promise<void>
	result: TranslationResult | null
	isLoading: boolean
	error: string | null
	clearResults: () => void
	getSupportedLanguages: () => Promise<SupportedLanguagesResponse | null>
	detectLanguage: (text: string) => Promise<Language | null>
}

// ===========================================
// UI コンポーネント用型定義
// ===========================================

export interface TranslationFormData {
	text: string
	targetLanguage: Language
	sourceLanguage?: Language
	mode: TranslationMode
	outputFormat: OutputFormat
	preserveFormatting: boolean
	includeAlternatives: boolean
}

export interface TranslationSettingsProps {
	options: TranslationOptions
	onChange: (options: TranslationOptions) => void
	disabled?: boolean
}

export interface LanguageSelectProps {
	value?: Language
	onChange: (language: Language) => void
	placeholder?: string
	disabled?: boolean
	excludeLanguages?: Language[]
}

export interface TranslationResultDisplayProps {
	result: TranslationResult
	onAccept?: () => void
	onRegenerate?: () => void
}

export interface AlternativeTranslationsProps {
	alternatives: string[]
	onSelect: (alternative: string) => void
}

// ===========================================
// エラーハンドリング用型定義
// ===========================================

export interface TranslationError {
	code: string
	message: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	details?: any
}

export const TRANSLATION_ERROR_CODES = {
	INVALID_INPUT: "INVALID_INPUT",
	TEXT_TOO_LONG: "TEXT_TOO_LONG",
	UNSUPPORTED_LANGUAGE: "UNSUPPORTED_LANGUAGE",
	SAME_LANGUAGE: "SAME_LANGUAGE",
	RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
	NETWORK_ERROR: "NETWORK_ERROR",
	TIMEOUT_ERROR: "TIMEOUT_ERROR",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const

export type TranslationErrorCode =
	(typeof TRANSLATION_ERROR_CODES)[keyof typeof TRANSLATION_ERROR_CODES]

// ===========================================
// 設定・表示用型定義
// ===========================================

export interface TranslationDisplayLabels {
	languages: Record<Language, string>
	translationModes: Record<TranslationMode, string>
	outputFormats: Record<OutputFormat, string>
}

export interface TranslationValidationRules {
	minTextLength: number
	maxTextLength: number
	maxRequestsPerMinute: number
}

// ===========================================
// i18n用型定義
// ===========================================

export interface TranslationTranslations {
	pageTitle: string
	pageDescription: string
	inputLabel: string
	inputPlaceholder: string
	translateButton: string
	loadingMessage: string
	errorTitle: string
	resultTitle: string
	alternativesTitle: string
	settingsTitle: string
	targetLanguageLabel: string
	sourceLanguageLabel: string
	translationModeLabel: string
	outputFormatLabel: string
	preserveFormattingLabel: string
	includeAlternativesLabel: string
	characterCount: string
	processingTime: string
	confidence: string
	wordCount: string
	detectedLanguage: string
	acceptButton: string
	regenerateButton: string
	clearButton: string
	closeButton: string
}

// ===========================================
// 定数とヘルパー関数用型定義
// ===========================================

export const TRANSLATION_CONFIG = {
	MAX_INPUT_LENGTH: 10000,
	DEFAULT_TARGET_LANGUAGE: LANGUAGES.EN,
	DEFAULT_MODE: TRANSLATION_MODES.NATURAL,
	DEFAULT_OUTPUT_FORMAT: OUTPUT_FORMATS.PLAIN_TEXT,
} as const

export const TRANSLATION_MODE_LABELS: Record<TranslationMode, string> = {
	[TRANSLATION_MODES.NATURAL]: "自然な翻訳",
	[TRANSLATION_MODES.LITERAL]: "直訳",
	[TRANSLATION_MODES.FORMAL]: "敬語・丁寧語",
	[TRANSLATION_MODES.CASUAL]: "カジュアル",
	[TRANSLATION_MODES.TECHNICAL]: "技術文書",
	[TRANSLATION_MODES.BUSINESS]: "ビジネス文書",
}

export const OUTPUT_FORMAT_LABELS: Record<OutputFormat, string> = {
	[OUTPUT_FORMATS.PLAIN_TEXT]: "プレーンテキスト",
	[OUTPUT_FORMATS.MARKDOWN]: "Markdown",
}
