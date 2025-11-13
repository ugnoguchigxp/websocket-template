/**
 * Socket Chat Demo Page
 * 既存システムと統合したSocket Chat表示パターンのデモンストレーション
 */

import type React from "react"
import { useState } from "react"

import {
	FiEye,
	FiEyeOff,
	FiGrid,
	FiMaximize2,
	FiMessageSquare,
	FiMonitor,
	FiSidebar,
	FiSmartphone,
} from "react-icons/fi"

import { useIsMobile } from "../../../hooks/useIsMobile"

import { SocketChatAsDrawer, SocketChatAsEmbed, SocketChatAsModal } from "./UniversalSocketChat"

export const SocketChatDemo: React.FC = () => {
	const isMobile = useIsMobile()

	// モーダル状態
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [modalSize, setModalSize] = useState<"sm" | "md" | "lg" | "xl" | "full">("lg")

	// ドロワー状態
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)
	const [drawerPosition, setDrawerPosition] = useState<"left" | "right" | "bottom">("right")

	// 埋め込み表示状態
	const [isEmbedVisible, setIsEmbedVisible] = useState(false)

	// 現在のデモ状態
	const [currentDemo, setCurrentDemo] = useState<string>("")

	const openModal = (size: typeof modalSize) => {
		setModalSize(size)
		setIsModalOpen(true)
		setCurrentDemo(`modal-${size}`)
	}

	const openDrawer = (position: typeof drawerPosition) => {
		setDrawerPosition(position)
		setIsDrawerOpen(true)
		setCurrentDemo(`drawer-${position}`)
	}

	const toggleEmbed = () => {
		setIsEmbedVisible(!isEmbedVisible)
		setCurrentDemo(isEmbedVisible ? "" : "embed")
	}

	return (
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-6xl mx-auto">
				{/* ヘッダー */}
				<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
					<div className="flex items-center space-x-3 mb-4">
						<FiMessageSquare className="w-8 h-8 text-blue-600" />
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Socket Chat Demo</h1>
							<p className="text-gray-600">
								既存エージェントシステム統合・レスポンシブ対応・マルチモーダル制御デモ
							</p>
						</div>
					</div>

					<div className="flex items-center space-x-4 text-sm text-gray-500">
						<div className="flex items-center space-x-1">
							{isMobile ? <FiSmartphone className="w-4 h-4" /> : <FiMonitor className="w-4 h-4" />}
							<span>{isMobile ? "モバイル表示" : "デスクトップ表示"}</span>
						</div>
						<div className="w-px h-4 bg-gray-300" />
						<span>現在のデモ: {currentDemo || "なし"}</span>
					</div>
				</div>

				{/* デモボタングリッド */}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
					{/* モーダル表示 */}
					<div className="bg-white rounded-lg shadow-sm p-6">
						<div className="flex items-center space-x-2 mb-4">
							<FiMaximize2 className="w-5 h-5 text-purple-600" />
							<h3 className="text-lg font-semibold text-gray-900">モーダル表示</h3>
							<div className="flex items-center space-x-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
								<FiEyeOff className="w-3 h-3" />
								<span>マルチモーダルOFF</span>
							</div>
						</div>
						<p className="text-gray-600 text-sm mb-4">
							オーバーレイ表示・既存エージェント機能完全対応・レスポンシブ最適化
						</p>
						<div className="space-y-2">
							<button
								onClick={() => openModal("sm")}
								className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
							>
								小サイズ (400x400)
							</button>
							<button
								onClick={() => openModal("lg")}
								className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm"
							>
								大サイズ (80%画面)
							</button>
							<button
								onClick={() => openModal("full")}
								className="w-full px-4 py-2 bg-purple-400 text-white rounded-md hover:bg-purple-500 transition-colors text-sm"
							>
								フルサイズ
							</button>
							<button
								onClick={() => {
									setModalSize("lg")
									setIsModalOpen(true)
									setCurrentDemo("modal-lg-draggable")
								}}
								className="w-full px-4 py-2 bg-purple-300 text-white rounded-md hover:bg-purple-400 transition-colors text-sm"
							>
								ドラッグ可能
							</button>
						</div>
					</div>

					{/* ドロワー表示 */}
					<div className="bg-white rounded-lg shadow-sm p-6">
						<div className="flex items-center space-x-2 mb-4">
							<FiSidebar className="w-5 h-5 text-blue-600" />
							<h3 className="text-lg font-semibold text-gray-900">ドロワー表示</h3>
							<div className="flex items-center space-x-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
								<FiEyeOff className="w-3 h-3" />
								<span>マルチモーダルOFF</span>
							</div>
						</div>
						<p className="text-gray-600 text-sm mb-4">
							画面端スライドイン・コンパクト表示・エージェント機能統合
						</p>
						<div className="space-y-2">
							<button
								onClick={() => openDrawer("right")}
								className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
							>
								右からスライド
							</button>
							<button
								onClick={() => openDrawer("left")}
								className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
							>
								左からスライド
							</button>
							<button
								onClick={() => openDrawer("bottom")}
								className="w-full px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 transition-colors text-sm"
							>
								下からスライド
							</button>
						</div>
					</div>

					{/* 埋め込み表示 */}
					<div className="bg-white rounded-lg shadow-sm p-6">
						<div className="flex items-center space-x-2 mb-4">
							<FiGrid className="w-5 h-5 text-green-600" />
							<h3 className="text-lg font-semibold text-gray-900">埋め込み表示</h3>
							<div className="flex items-center space-x-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
								<FiEye className="w-3 h-3" />
								<span>マルチモーダルON</span>
							</div>
						</div>
						<p className="text-gray-600 text-sm mb-4">
							インライン表示・全機能利用可能・markdownWriterエージェント対応
						</p>
						<div className="space-y-2">
							<button
								onClick={toggleEmbed}
								className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
							>
								{isEmbedVisible ? "非表示にする" : "埋め込み表示"}
							</button>
						</div>
					</div>
				</div>

				{/* 埋め込み表示エリア */}
				{isEmbedVisible && (
					<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">埋め込みSocket Chat</h3>
							<div className="flex items-center space-x-2 text-sm text-green-600">
								<FiEye className="w-4 h-4" />
								<span>マルチモーダル機能有効</span>
							</div>
						</div>
						<div className="border border-gray-200 rounded-lg overflow-hidden">
							<SocketChatAsEmbed height={isMobile ? "400px" : "500px"} showSettings={true} />
						</div>
					</div>
				)}

				{/* 機能説明 */}
				<div className="bg-white rounded-lg shadow-sm p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">実装機能</h3>
					<div className="grid md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-medium text-gray-900 mb-2">🎯 既存システム統合</h4>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• markdownWriterエージェント完全対応</li>
								<li>• AgentInteractionMessage表示継続</li>
								<li>• エージェント交換ログON/OFF</li>
								<li>• WebSocketチャット機能完全保持</li>
							</ul>
						</div>
						<div>
							<h4 className="font-medium text-gray-900 mb-2">📱 レスポンシブ対応</h4>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• モバイル・デスクトップ自動最適化</li>
								<li>• アイコン・フォントサイズ動的調整</li>
								<li>• タッチジェスチャー対応</li>
								<li>• コンパクトモード切り替え</li>
							</ul>
						</div>
						<div>
							<h4 className="font-medium text-gray-900 mb-2">🎨 表示モード制御</h4>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• モーダル: 5段階サイズ選択</li>
								<li>• ドロワー: 3方向スライド対応</li>
								<li>• 埋め込み: カスタマイズ可能</li>
								<li>• ESC・背景クリックでクローズ</li>
							</ul>
						</div>
						<div>
							<h4 className="font-medium text-gray-900 mb-2">⚙️ マルチモーダル制御</h4>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• フルページ: ON/OFF切り替えボタン</li>
								<li>• モーダル・ドロワー: 自動OFF</li>
								<li>• チャート・ブラウザフレーム対応</li>
								<li>• Playwright・Markdown文書対応</li>
							</ul>
						</div>
					</div>
				</div>

				{/* モーダル */}
				<SocketChatAsModal
					isOpen={isModalOpen}
					onClose={() => {
						setIsModalOpen(false)
						setCurrentDemo("")
					}}
					size={modalSize}
					closeOnBackdrop={currentDemo !== "modal-lg-draggable"} // ドラッグ可能モードでは背景クリック無効
					closeOnEscape={true}
					showCloseButton={currentDemo === "modal-lg-draggable"} // ドラッグ可能モードではクローズボタン表示
					draggable={currentDemo === "modal-lg-draggable"} // ドラッグ可能モードでドラッグ有効
				/>

				{/* ドロワー */}
				<SocketChatAsDrawer
					isOpen={isDrawerOpen}
					onClose={() => {
						setIsDrawerOpen(false)
						setCurrentDemo("")
					}}
					position={drawerPosition}
					size={drawerPosition === "bottom" ? "60vh" : "400px"}
					showOverlay={true}
					animationDuration={300}
				/>
			</div>
		</div>
	)
}
