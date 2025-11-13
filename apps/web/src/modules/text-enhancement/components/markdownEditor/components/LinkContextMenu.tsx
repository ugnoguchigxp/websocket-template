/**
 * LinkContextMenu - リンククリック時のコンテキストメニュー
 *
 * リンクを右クリックまたはCtrl+クリック時に表示される選択肢メニュー
 */

import type React from "react"
import { useEffect, useState } from "react"

import { FaEdit, FaExternalLinkAlt, FaTimes } from "react-icons/fa"

interface LinkContextMenuProps {
	visible: boolean
	position: { x: number; y: number }
	linkData: {
		href: string
		text: string
	} | null
	onClose: () => void
	onOpenLink: (href: string) => void
	onEditLink: (linkData: { href: string; text: string }) => void
}

export const LinkContextMenu: React.FC<LinkContextMenuProps> = ({
	visible,
	position,
	linkData,
	onClose,
	onOpenLink,
	onEditLink,
}) => {
	const [showEditModal, setShowEditModal] = useState(false)
	const [editText, setEditText] = useState("")
	const [editUrl, setEditUrl] = useState("")

	useEffect(() => {
		if (linkData) {
			setEditText(linkData.text)
			setEditUrl(linkData.href)
		}
	}, [linkData])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element
			if (target && typeof target.closest === "function") {
				if (!target.closest(".link-context-menu") && !target.closest(".link-edit-modal")) {
					onClose()
				}
			} else {
				// フォールバック: targetがclosestメソッドを持たない場合（テスト環境等）
				onClose()
			}
		}

		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setShowEditModal(false)
				onClose()
			}
		}

		if (visible) {
			document.addEventListener("mousedown", handleClickOutside)
			document.addEventListener("keydown", handleEscapeKey)
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
			document.removeEventListener("keydown", handleEscapeKey)
		}
	}, [visible]) // onCloseを依存配列から除去

	const handleOpenLink = () => {
		if (linkData?.href) {
			onOpenLink(linkData.href)
			onClose()
		}
	}

	const handleEditClick = () => {
		setShowEditModal(true)
	}

	const handleEditSubmit = () => {
		if (linkData && editUrl.trim()) {
			onEditLink({
				href: editUrl.trim(),
				text: editText.trim() || editUrl.trim(),
			})
			setShowEditModal(false)
			onClose()
		}
	}

	const handleEditCancel = () => {
		if (linkData) {
			setEditText(linkData.text)
			setEditUrl(linkData.href)
		}
		setShowEditModal(false)
	}

	if (!visible || !linkData) {
		return null
	}

	return (
		<>
			{/* コンテキストメニュー */}
			<div
				className="link-context-menu fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 z-50"
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
				}}
			>
				<button
					className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-sm"
					onClick={handleOpenLink}
				>
					<FaExternalLinkAlt className="w-3 h-3 text-blue-500" />
					<span>リンク先へ飛ぶ</span>
				</button>

				<button
					className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-sm"
					onClick={handleEditClick}
				>
					<FaEdit className="w-3 h-3 text-gray-600" />
					<span>リンクの内容を編集する</span>
				</button>

				<div className="border-t border-gray-200 my-1" />

				<div className="px-4 py-1 text-xs text-gray-500 truncate">{linkData.href}</div>
			</div>

			{/* 編集モーダル */}
			{showEditModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
					<div
						className="link-edit-modal bg-white rounded-lg p-6 w-96 max-w-[90vw] mx-4 shadow-xl"
						onClick={e => e.stopPropagation()}
					>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-900">リンクを編集</h3>
							<button
								onClick={handleEditCancel}
								className="text-gray-400 hover:text-gray-600 p-1"
								aria-label="閉じる"
							>
								<FaTimes />
							</button>
						</div>

						<div className="space-y-4">
							{/* リンクテキスト */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									リンクテキスト
								</label>
								<input
									type="text"
									value={editText}
									onChange={e => setEditText(e.target.value)}
									onKeyDown={e => {
										if (e.key === "Enter" && editUrl.trim()) {
											e.preventDefault()
											handleEditSubmit()
										}
									}}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="リンクテキストを入力"
								/>
							</div>

							{/* URL */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
								<input
									type="url"
									value={editUrl}
									onChange={e => setEditUrl(e.target.value)}
									onKeyDown={e => {
										if (e.key === "Enter" && editUrl.trim()) {
											e.preventDefault()
											handleEditSubmit()
										}
									}}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="https://example.com"
								/>
							</div>
						</div>

						{/* ボタン */}
						<div className="flex justify-end space-x-3 mt-6">
							<button
								type="button"
								onClick={handleEditCancel}
								className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
							>
								キャンセル
							</button>
							<button
								type="button"
								onClick={handleEditSubmit}
								disabled={!editUrl.trim()}
								className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
							>
								更新
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
