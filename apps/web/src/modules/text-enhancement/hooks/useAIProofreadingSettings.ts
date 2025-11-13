/**
 * useAIProofreadingSettings - AI文章校正設定のカスタムフック
 *
 * AI文章校正機能の設定をlocalStorageに保存・読み込みするフック
 */

import { useCallback, useEffect, useState } from "react"

import { createContextLogger } from "@/modules/logger"

import { STORAGE_KEYS, getFromStorage, setToStorage } from "../../../utils/localStorage"
import {
	type EnhancementOptions,
	FORMATS,
	SUMMARY_LENGTHS,
	TARGET_AUDIENCES,
} from "../types/textEnhancement"

const log = createContextLogger("useAIProofreadingSettings")

// デフォルト設定
const DEFAULT_SETTINGS: EnhancementOptions = {
	summaryLength: SUMMARY_LENGTHS.MEDIUM,
	format: FORMATS.MARKDOWN,
	targetAudience: TARGET_AUDIENCES.GENERAL,
	addSupplements: true,
	addAnalysis: true,
	language: "ja",
}

export function useAIProofreadingSettings() {
	const [settings, setSettings] = useState<EnhancementOptions>(DEFAULT_SETTINGS)
	const [isLoading, setIsLoading] = useState(true)

	// 初期化: localStorageから設定を読み込み
	useEffect(() => {
		const loadSettings = () => {
			try {
				const savedSettings = getFromStorage(
					STORAGE_KEYS.AI_TEXT_PROOFREADING_SETTINGS,
					DEFAULT_SETTINGS
				)

				// 保存された設定とデフォルト設定をマージ（新しいプロパティに対応）
				const mergedSettings: EnhancementOptions = {
					...DEFAULT_SETTINGS,
					...savedSettings,
				}

				setSettings(mergedSettings)
			} catch (error) {
				log.error("Failed to load AI proofreading settings:", error)
				setSettings(DEFAULT_SETTINGS)
			} finally {
				setIsLoading(false)
			}
		}

		loadSettings()
	}, [])

	// 設定を保存する関数
	const saveSettings = useCallback((newSettings: EnhancementOptions) => {
		try {
			setSettings(newSettings)
			const success = setToStorage(STORAGE_KEYS.AI_TEXT_PROOFREADING_SETTINGS, newSettings)

			if (!success) {
				log.warn("Failed to save AI proofreading settings to localStorage")
			}

			return success
		} catch (error) {
			log.error("Error saving AI proofreading settings:", error)
			return false
		}
	}, [])

	// 個別設定を更新する関数
	const updateSetting = useCallback(
		<K extends keyof EnhancementOptions>(key: K, value: EnhancementOptions[K]) => {
			const newSettings = {
				...settings,
				[key]: value,
			}
			return saveSettings(newSettings)
		},
		[settings, saveSettings]
	)

	return {
		settings,
		isLoading,
		saveSettings,
		updateSetting,
		defaultSettings: DEFAULT_SETTINGS,
	}
}
