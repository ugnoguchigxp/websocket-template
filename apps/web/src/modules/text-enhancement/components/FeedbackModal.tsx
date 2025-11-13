/**
 * FeedbackModal - フィードバック送信モーダル
 *
 * ユーザーが処理結果に対してフィードバックを送信するモーダル
 */

import type React from "react"
import { useState } from "react"

import { createContextLogger } from "@/modules/logger"

import type { UserFeedback } from "../types/textEnhancement"

const log = createContextLogger("FeedbackModal")

interface FeedbackModalProps {
	isOpen: boolean
	resultId: string
	onClose: () => void
	onSubmit: (feedback: UserFeedback) => void
}

const FEEDBACK_CATEGORIES = [
	{ id: "accuracy", label: "正確性", description: "内容が原文を正確に反映している" },
	{ id: "clarity", label: "分かりやすさ", description: "理解しやすい表現・構造" },
	{ id: "completeness", label: "情報の完全性", description: "重要な情報が含まれている" },
	{ id: "usefulness", label: "有用性", description: "実際に活用できる内容" },
]

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
	isOpen,
	resultId,
	onClose,
	onSubmit,
}) => {
	const [rating, setRating] = useState<number>(0)
	const [comment, setComment] = useState("")
	const [categories, setCategories] = useState<string[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async () => {
		if (rating === 0) {
			alert("評価を選択してください")
			return
		}

		setIsSubmitting(true)

		try {
			const feedback: UserFeedback = {
				resultId,
				rating,
				comment: comment.trim(),
				categories,
				timestamp: new Date().toISOString(),
			}

			await onSubmit(feedback)

			// フォームリセット
			setRating(0)
			setComment("")
			setCategories([])
		} catch (error) {
			log.error("Feedback submission failed:", error)
			alert("フィードバック送信に失敗しました")
		} finally {
			setIsSubmitting(false)
		}
	}

	const toggleCategory = (categoryId: string) => {
		setCategories(prev =>
			prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
		)
	}

	if (!isOpen) {
		return null
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
				{/* ヘッダー */}
				<div className="p-6 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold text-gray-900">結果の評価</h3>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 transition-colors"
							disabled={isSubmitting}
						>
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
					<p className="text-sm text-gray-600 mt-1">
						処理結果の品質向上のため、ご評価をお聞かせください。
					</p>
				</div>

				<div className="p-6 space-y-6">
					{/* 星評価 */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-3">
							満足度 <span className="text-red-500">*</span>
						</label>
						<div className="flex items-center space-x-2">
							{[1, 2, 3, 4, 5].map(star => (
								<button
									key={star}
									onClick={() => setRating(star)}
									className={`w-10 h-10 text-2xl transition-colors ${
										star <= rating
											? "text-yellow-400 hover:text-yellow-500"
											: "text-gray-300 hover:text-yellow-300"
									}`}
									disabled={isSubmitting}
								>
									★
								</button>
							))}
							<span className="ml-3 text-sm text-gray-600">
								{rating > 0 && getRatingText(rating)}
							</span>
						</div>
					</div>

					{/* カテゴリ選択 */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-3">
							評価カテゴリ（複数選択可）
						</label>
						<div className="space-y-3">
							{FEEDBACK_CATEGORIES.map(category => (
								<label key={category.id} className="flex items-start space-x-3 cursor-pointer">
									<input
										type="checkbox"
										checked={categories.includes(category.id)}
										onChange={() => toggleCategory(category.id)}
										className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
										disabled={isSubmitting}
									/>
									<div className="flex-1">
										<div className="text-sm font-medium text-gray-900">{category.label}</div>
										<div className="text-xs text-gray-600">{category.description}</div>
									</div>
								</label>
							))}
						</div>
					</div>

					{/* コメント */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">コメント（任意）</label>
						<textarea
							value={comment}
							onChange={e => setComment(e.target.value)}
							className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
							rows={4}
							placeholder="改善点や感想をお聞かせください...&#10;&#10;例：要約がもう少し詳しいと良い、専門用語の説明が分かりやすかった、など"
							maxLength={1000}
							disabled={isSubmitting}
						/>
						<div className="text-xs text-gray-500 mt-1 text-right">{comment.length}/1000文字</div>
					</div>

					{/* 評価済みの場合の感謝メッセージ */}
					{rating > 0 && (
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
							<div className="text-sm text-blue-800">
								<div className="font-medium">ご評価ありがとうございます！</div>
								<div className="mt-1">
									いただいたフィードバックは、AIモデルの改善に活用させていただきます。
								</div>
							</div>
						</div>
					)}
				</div>

				{/* フッター */}
				<div className="p-6 border-t border-gray-200">
					<div className="flex space-x-3">
						<button
							onClick={onClose}
							className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
							disabled={isSubmitting}
						>
							キャンセル
						</button>
						<button
							onClick={handleSubmit}
							disabled={rating === 0 || isSubmitting}
							className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
						>
							{isSubmitting ? (
								<div className="flex items-center justify-center space-x-2">
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									<span>送信中...</span>
								</div>
							) : (
								"送信"
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

// ヘルパー関数
const getRatingText = (rating: number): string => {
	switch (rating) {
		case 1:
			return "不満"
		case 2:
			return "やや不満"
		case 3:
			return "普通"
		case 4:
			return "満足"
		case 5:
			return "非常に満足"
		default:
			return ""
	}
}
