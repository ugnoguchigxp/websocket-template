/**
 * SpeechSettingsDrawer - 音声キャラクター設定用Drawer
 *
 * Azure Speech Serviceの音声キャラクター設定を管理
 */

import React, { useState, useCallback } from "react"

import { FaPlay, FaStop, FaTimes } from "react-icons/fa"

import { createContextLogger } from "@/modules/logger"

import { useApiClient } from "../../../lib/api/client"
import { useTextToSpeech } from "../../speech"

const log = createContextLogger("SpeechSettingsDrawer")

interface SpeechCharacter {
	id: string
	name: string
	displayName: string
	language: string
	gender: "Male" | "Female"
	description: string
	sampleText: string
}

interface SpeechSettingsDrawerProps {
	open: boolean
	onClose: () => void
}

// 利用可能な音声キャラクター
const SPEECH_CHARACTERS: SpeechCharacter[] = [
	{
		id: "ja-JP-NanamiNeural-Misato",
		name: "NanamiNeural-Misato",
		displayName: "ミサト",
		language: "ja-JP",
		gender: "Female",
		description: "明るく魅力的な大人の女性の声",
		sampleText: "私はミサトよ。私は今のシンジ君に全てを託してみたいと思うの。",
	},
	{
		id: "ja-JP-MayuNeural-Motoko",
		name: "MayuNeural-Motoko",
		displayName: "モトコ",
		language: "ja-JP",
		gender: "Female",
		description: "クールで知的な女性の声",
		sampleText:
			"私はモトコ。世の中に不満があるなら、自分を変えろ、それが嫌なら耳と目を閉じて、口をつぐんで孤独に暮らせ",
	},
	{
		id: "ja-JP-AoiNeural-Shinobu",
		name: "AoiNeural-Shinobu",
		displayName: "しのぶ",
		language: "ja-JP",
		gender: "Female",
		description: "かわいらしく幼い女の子の声",
		sampleText: "しのぶじゃ。こうも大量に展示されている所を見ると、圧巻じゃあ。ぱないの",
	},
	{
		id: "ja-JP-KeitaNeural-Snake",
		name: "KeitaNeural-Snake",
		displayName: "あきお",
		language: "ja-JP",
		gender: "Male",
		description: "渋くてハードボイルドな男性の声",
		sampleText: "俺はあきお。待たせたな。スニークポイントに到着した。",
	},
	{
		id: "ja-JP-DaichiNeural-Tsuda",
		name: "DaichiNeural-Tsuda",
		displayName: "けんじろう",
		language: "ja-JP",
		gender: "Male",
		description: "知的な大人の男性の声",
		sampleText: "けんじろうです。ここからは時間外労働です。呪術師は最悪だと言うことです",
	},
	{
		id: "en-US-JennyNeural",
		name: "JennyNeural",
		displayName: "Jenny",
		language: "en-US",
		gender: "Female",
		description: "Standard female voice (English)",
		sampleText: "Hello! I'm Jenny. I speak with a clear and natural voice.",
	},
	{
		id: "en-US-DavisNeural",
		name: "DavisNeural",
		displayName: "Davis",
		language: "en-US",
		gender: "Male",
		description: "Standard male voice (English)",
		sampleText: "Hello! I'm Davis. I have a warm and professional voice.",
	},
]

export const SpeechSettingsDrawer: React.FC<SpeechSettingsDrawerProps> = ({ open, onClose }) => {
	const [selectedCharacter, setSelectedCharacter] = useState<string>("ja-JP-NanamiNeural")
	const [testingCharacter, setTestingCharacter] = useState<string | null>(null)
	const apiClient = useApiClient()
	const { isAutoPlaying, playAutoSpeech, stopAutoSpeech } = useTextToSpeech()

	// キャラクター音声のテスト再生
	const handleTestVoice = useCallback(
		async (character: SpeechCharacter) => {
			if (testingCharacter === character.id) {
				stopAutoSpeech()
				setTestingCharacter(null)
				return
			}

			try {
				setTestingCharacter(character.id)

				// API呼び出し（統合APIクライアントを使用）
				const speechData = await apiClient.post(
					"/a../../modules/speech/generate",
					{
						text: character.sampleText,
						sessionId: `voice-test-${Date.now()}`,
						voiceName: character.id,
					},
					{ skipAuth: true }
				)
				await playAutoSpeech(speechData)
			} catch (error) {
				log.error("Voice test error:", error)
			} finally {
				setTestingCharacter(null)
			}
		},
		[testingCharacter, playAutoSpeech, stopAutoSpeech]
	)

	// 自動保存機能（キャラクター選択時）
	const handleCharacterSelect = useCallback((characterId: string, characterName: string) => {
		log.debug("[SpeechSettings] Character selected", { characterId, characterName })

		// 選択状態を即座に更新
		setSelectedCharacter(characterId)

		// ローカルストレージに即座に保存
		localStorage.setItem("speechCharacter", characterId)
		log.debug("[SpeechSettings] Auto-saved voice:", characterId)

		// 保存確認
		const saved = localStorage.getItem("speechCharacter")
		log.debug("[SpeechSettings] Confirmed auto-saved voice:", saved)
	}, [])

	// 設定読み込み（デフォルト選択状態を保証）
	React.useEffect(() => {
		const saved = localStorage.getItem("speechCharacter")
		if (saved && SPEECH_CHARACTERS.find(c => c.id === saved)) {
			setSelectedCharacter(saved)
		} else {
			// デフォルトをミサトに設定し、即座にlocalStorageに保存
			const defaultCharacter = "ja-JP-NanamiNeural-Misato"
			setSelectedCharacter(defaultCharacter)
			localStorage.setItem("speechCharacter", defaultCharacter)
			log.debug("[SpeechSettings] Set default character:", defaultCharacter)
		}
	}, [])

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 overflow-hidden">
			{/* オーバーレイ */}
			<div
				className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
				onClick={onClose}
			/>

			{/* Drawerコンテンツ */}
			<div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform">
				{/* ヘッダー */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">音声キャラクター設定</h2>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
						<FaTimes className="w-5 h-5" />
					</button>
				</div>

				{/* コンテンツ */}
				<div className="flex flex-col h-full">
					<div className="flex-1 overflow-y-auto p-6">
						<div className="space-y-4">
							<p className="text-sm text-gray-600 mb-6">
								読み上げに使用する音声キャラクターを選択してください。
								各キャラクターの音声をテストできます。
							</p>

							{SPEECH_CHARACTERS.map(character => (
								<div
									key={character.id}
									className={`
                    border rounded-lg p-4 cursor-pointer transition-colors
                    ${
											selectedCharacter === character.id
												? "border-blue-500 bg-blue-50"
												: "border-gray-200 hover:border-gray-300"
										}
                  `}
									onClick={() => {
										handleCharacterSelect(character.id, character.displayName)
									}}
								>
									<div className="flex items-center justify-between">
										<div className="flex-1">
											<div className="flex items-center space-x-2">
												<span className="font-medium text-gray-900">{character.displayName}</span>
												<span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
													{character.gender}
												</span>
												<span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
													{character.language}
												</span>
											</div>
											<p className="text-sm text-gray-600 mt-1">{character.description}</p>
										</div>

										<button
											onClick={e => {
												e.stopPropagation()
												handleTestVoice(character)
											}}
											disabled={isAutoPlaying && testingCharacter !== character.id}
											className={`
                        ml-3 w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                        ${
													testingCharacter === character.id && isAutoPlaying
														? "bg-red-500 text-white hover:bg-red-600"
														: "bg-gray-100 text-gray-600 hover:bg-gray-200"
												}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
											title={
												testingCharacter === character.id && isAutoPlaying ? "停止" : "音声テスト"
											}
										>
											{testingCharacter === character.id && isAutoPlaying ? (
												<FaStop className="w-3 h-3" />
											) : (
												<FaPlay className="w-3 h-3" />
											)}
										</button>
									</div>

									{/* サンプルテキスト */}
									<div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
										<span className="text-xs text-gray-500 block mb-1">サンプル:</span>
										{character.sampleText}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* フッター */}
					<div className="border-t border-gray-200 p-6">
						<div className="flex justify-center">
							<button
								onClick={onClose}
								className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
							>
								閉じる
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
