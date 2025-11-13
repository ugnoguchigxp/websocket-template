/**
 * CreatePresentationDialog Component
 * プレゼンテーション新規作成ダイアログ（名前 + アスペクト比選択）
 */

import type React from "react"
import { useEffect, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import Modal from "./Modal"

export interface ICreatePresentationDialogProps {
	isOpen: boolean
	onConfirm: (name: string, aspectRatio: "16:9" | "4:3") => void
	onCancel: () => void
}

/**
 * CreatePresentationDialog
 * 名前入力とアスペクト比選択を含む新規作成ダイアログ
 */
export const CreatePresentationDialog: React.FC<ICreatePresentationDialogProps> = ({
	isOpen,
	onConfirm,
	onCancel,
}) => {
	const { t } = useTranslation()
	const [name, setName] = useState("")
	const [aspectRatio, setAspectRatio] = useState<"16:9" | "4:3">("16:9")
	const inputRef = useRef<HTMLInputElement>(null)

	// ダイアログが開かれたときの初期化処理
	useEffect(() => {
		if (isOpen) {
			// 値をリセット
			setName("")
			setAspectRatio("16:9")

			// inputにフォーカス
			if (inputRef.current) {
				inputRef.current.focus()
				inputRef.current.select()
			}
		}
	}, [isOpen])

	const handleConfirm = () => {
		if (name.trim()) {
			onConfirm(name.trim(), aspectRatio)
		}
	}

	const handleCancel = () => {
		onCancel()
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault()
			handleConfirm()
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleCancel}
			size="sm"
			closeOnBackdrop={false}
			closeOnEscape={true}
			showCloseButton={false}
		>
			<div className="p-6">
				{/* タイトル */}
				<h2 className="text-xl font-semibold text-gray-800 mb-4">
					{t("presentations.createNewPresentation")}
				</h2>

				{/* プレゼンテーション名 */}
				<div className="mb-4">
					<label
						htmlFor="presentation-name"
						className="block text-sm font-medium text-gray-700 mb-2"
					>
						{t("presentations.presentationName")}
					</label>
					<input
						id="presentation-name"
						ref={inputRef}
						type="text"
						value={name}
						onChange={e => setName(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t("presentations.enterPresentationName")}
						className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				{/* アスペクト比選択 */}
				<div className="mb-6">
					<label id="aspect-ratio-label" className="block text-sm font-medium text-gray-700 mb-2">
						{t("presentations.aspectRatio")}
					</label>
					<div
						className="grid grid-cols-2 gap-3"
						role="radiogroup"
						aria-labelledby="aspect-ratio-label"
					>
						{/* 16:9 (横長・デフォルト) */}
						<button
							id="aspect-ratio-16-9"
							type="button"
							role="radio"
							aria-checked={aspectRatio === "16:9"}
							aria-label={t("presentations.aspectRatio169")}
							onClick={() => setAspectRatio("16:9")}
							className={`
                flex flex-col items-center justify-center p-4 border-2 rounded transition-all
                ${
									aspectRatio === "16:9"
										? "border-primary bg-primary/5"
										: "border-gray-300 hover:border-gray-400"
								}
              `}
						>
							<div
								className={`
                  w-16 h-9 border-2 rounded mb-2 transition-colors
                  ${aspectRatio === "16:9" ? "border-primary bg-primary/10" : "border-gray-400"}
                `}
								aria-hidden="true"
							/>
							<span
								className={`text-sm font-medium ${aspectRatio === "16:9" ? "text-primary" : "text-gray-700"}`}
							>
								16:9
							</span>
							<span className="text-xs text-gray-500 mt-1">{t("presentations.widescreen")}</span>
						</button>

						{/* 4:3 */}
						<button
							id="aspect-ratio-4-3"
							type="button"
							role="radio"
							aria-checked={aspectRatio === "4:3"}
							aria-label={t("presentations.aspectRatio43")}
							onClick={() => setAspectRatio("4:3")}
							className={`
                flex flex-col items-center justify-center p-4 border-2 rounded transition-all
                ${
									aspectRatio === "4:3"
										? "border-primary bg-primary/5"
										: "border-gray-300 hover:border-gray-400"
								}
              `}
						>
							<div
								className={`
                  w-12 h-9 border-2 rounded mb-2 transition-colors
                  ${aspectRatio === "4:3" ? "border-primary bg-primary/10" : "border-gray-400"}
                `}
								aria-hidden="true"
							/>
							<span
								className={`text-sm font-medium ${aspectRatio === "4:3" ? "text-primary" : "text-gray-700"}`}
							>
								4:3
							</span>
							<span className="text-xs text-gray-500 mt-1">{t("presentations.standard")}</span>
						</button>
					</div>
				</div>

				{/* ボタン */}
				<div className="flex items-center justify-end gap-3">
					<button
						id="presentation-cancel-btn"
						onClick={handleCancel}
						className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
					>
						{t("common.cancel")}
					</button>

					<button
						id="presentation-create-btn"
						onClick={handleConfirm}
						disabled={!name.trim()}
						className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						aria-label={t("common.create")}
					>
						{t("common.create")}
					</button>
				</div>
			</div>
		</Modal>
	)
}

export default CreatePresentationDialog
