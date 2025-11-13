/**
 * useTextEnhancementSettings - 文章変換機能の設定管理Hook
 *
 * LocalStorageを使用して設定を永続化します
 */

import { useCallback, useEffect, useState } from "react"

import { createContextLogger } from "@/modules/logger"

const log = createContextLogger("useTextEnhancementSettings")

// EnhancementTypeを定義
export type EnhancementType =
	| "summary"
	| "proofreading"
	| "translation"
	| "condensation"
	| "expansion"

// 設定項目の型定義
export interface TextEnhancementSettings {
	enhancementType: EnhancementType
	confidenceThreshold: number
	outputFormat: "markdown" | "plain" | "html"
}

// デフォルト設定
const DEFAULT_SETTINGS: TextEnhancementSettings = {
	enhancementType: "summary",
	confidenceThreshold: 0.7,
	outputFormat: "plain",
}

// 内部定数（UIでは設定しないが、システムで使用）
export const SYSTEM_CONSTANTS = {
	MAX_AGENTS: 3, // 3つのエージェントで固定
	ENABLE_PARALLEL_PROCESSING: true, // 常に並列処理を有効
	LANGUAGE: "ja", // レイアウトの言語セレクターを使用
} as const

// LocalStorageのキー
const STORAGE_KEY = "textEnhancementSettings"

export const useTextEnhancementSettings = () => {
	const [settings, setSettings] = useState<TextEnhancementSettings>(DEFAULT_SETTINGS)
	const [isLoading, setIsLoading] = useState(true)

	// LocalStorageから設定を読み込む
	const loadSettings = useCallback(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored) {
				const parsedSettings = JSON.parse(stored) as TextEnhancementSettings
				// デフォルト設定とマージして、新しい設定項目にも対応
				setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
			}
		} catch (error) {
			log.error("Failed to load text enhancement settings:", error)
			// エラーの場合はデフォルト設定を使用
			setSettings(DEFAULT_SETTINGS)
		} finally {
			setIsLoading(false)
		}
	}, [])

	// LocalStorageに設定を保存する
	const saveSettings = useCallback((newSettings: TextEnhancementSettings) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
			setSettings(newSettings)
		} catch (error) {
			log.error("Failed to save text enhancement settings:", error)
		}
	}, [])

	// 個別の設定項目を更新する
	const updateSetting = useCallback(
		<K extends keyof TextEnhancementSettings>(key: K, value: TextEnhancementSettings[K]) => {
			const newSettings = { ...settings, [key]: value }
			saveSettings(newSettings)
		},
		[settings, saveSettings]
	)

	// 設定をリセットする
	const resetSettings = useCallback(() => {
		saveSettings(DEFAULT_SETTINGS)
	}, [saveSettings])

	// 設定をエクスポート/インポートする
	const exportSettings = useCallback(() => {
		return JSON.stringify(settings, null, 2)
	}, [settings])

	const importSettings = useCallback(
		(settingsJson: string) => {
			try {
				const importedSettings = JSON.parse(settingsJson) as Partial<TextEnhancementSettings>
				const mergedSettings = { ...DEFAULT_SETTINGS, ...importedSettings }
				saveSettings(mergedSettings)
				return true
			} catch (error) {
				log.error("Failed to import settings:", error)
				return false
			}
		},
		[saveSettings]
	)

	// 初期化時に設定を読み込む
	useEffect(() => {
		loadSettings()
	}, [loadSettings])

	return {
		settings,
		isLoading,
		updateSetting,
		saveSettings,
		resetSettings,
		exportSettings,
		importSettings,
	}
}

// 設定の説明文を取得するヘルパー関数
export const getSettingDescription = (key: keyof TextEnhancementSettings): string => {
	const descriptions: Record<keyof TextEnhancementSettings, string> = {
		enhancementType: "文章変換の種類を選択します",
		confidenceThreshold: "結果を採用する信頼度の閾値です（0.0-1.0）",
		outputFormat: "出力結果のフォーマットを指定します",
	}

	return descriptions[key]
}

// 設定項目の表示名を取得するヘルパー関数
export const getSettingLabel = (key: keyof TextEnhancementSettings): string => {
	const labels: Record<keyof TextEnhancementSettings, string> = {
		enhancementType: "変換タイプ",
		confidenceThreshold: "信頼度閾値",
		outputFormat: "出力フォーマット",
	}

	return labels[key]
}
