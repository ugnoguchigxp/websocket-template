/**
 * Universal Socket Chat Component
 * モーダル・ドロワー・埋め込み表示に対応した統合チャットコンポーネント
 */

import type React from "react"

import { SocketChatComponent } from "./SocketChatComponent"
import { SocketChatDrawer, type SocketChatDrawerProps } from "./SocketChatDrawer"
import { SocketChatModal, type SocketChatModalProps } from "./SocketChatModal"

/**
 * 統合チャットコンポーネント - モーダル表示
 */
export const SocketChatAsModal: React.FC<SocketChatModalProps> = props => {
	return <SocketChatModal {...props} />
}

/**
 * 統合チャットコンポーネント - ドロワー表示
 */
export const SocketChatAsDrawer: React.FC<SocketChatDrawerProps> = props => {
	return <SocketChatDrawer {...props} />
}

/**
 * 埋め込み表示用のプロパティ
 */
export interface SocketChatEmbedProps {
	/** チャットの高さ */
	height?: string | number
	/** 初期セッションID */
	initialSessionId?: string
	/** 設定パネルの表示制御 */
	showSettings?: boolean
	/** カスタムクラス名 */
	className?: string
}

/**
 * 統合チャットコンポーネント - 埋め込み表示
 */
export const SocketChatAsEmbed: React.FC<SocketChatEmbedProps> = ({
	height = "600px",
	initialSessionId,
	showSettings = true,
}) => {
	return (
		<SocketChatComponent
			initialSessionId={initialSessionId}
			height={typeof height === "number" ? `${height}px` : height}
			showSettings={showSettings}
			displayMode="embed" // 埋め込み表示用のモードを追加
			responsive={true}
			compact={false}
			enableMultimodal={true} // 埋め込み表示ではマルチモーダル有効
		/>
	)
}

/**
 * 動的モード切り替え対応の統合コンポーネント
 */
export interface UniversalSocketChatProps {
	/** 表示モード */
	mode: "modal" | "drawer" | "fullpage"
	/** 表示状態（modal/drawerモード時） */
	isOpen?: boolean
	/** クローズコールバック（modal/drawerモード時） */
	onClose?: () => void
	/** 初期セッションID */
	initialSessionId?: string
	/** 設定パネルの表示制御 */
	showSettings?: boolean
	/** モーダルサイズ（modalモード時） */
	modalSize?: "sm" | "md" | "lg" | "xl" | "full"
	/** ドロワー位置（drawerモード時） */
	drawerPosition?: "left" | "right" | "bottom"
	/** ドロワーサイズ（drawerモード時） */
	drawerSize?: string | number
	/** 高さ（fullpageモード時） */
	height?: string | number
	/** カスタムクラス名 */
	className?: string
	/** 背景クリックで閉じるか（modalモード時） */
	closeOnBackdrop?: boolean
	/** ESCキーで閉じるか（modalモード時） */
	closeOnEscape?: boolean
	/** バツボタンを表示するか（modalモード時） */
	showCloseButton?: boolean
	/** ドラッグ移動を有効にするか（modalモード時） */
	draggable?: boolean
}

/**
 * 動的モード切り替え対応の統合チャットコンポーネント
 */
export const UniversalSocketChat: React.FC<UniversalSocketChatProps> = ({
	mode,
	isOpen = false,
	onClose,
	initialSessionId,
	showSettings = true,
	modalSize = "lg",
	drawerPosition = "right",
	drawerSize = "400px",
	height = "600px",
	className = "",
	closeOnBackdrop = true,
	closeOnEscape = true,
	showCloseButton = true,
	draggable = false,
}) => {
	switch (mode) {
		case "modal":
			return (
				<SocketChatAsModal
					isOpen={isOpen}
					onClose={onClose || (() => {})}
					size={modalSize}
					closeOnBackdrop={closeOnBackdrop}
					closeOnEscape={closeOnEscape}
					showCloseButton={showCloseButton}
					draggable={draggable}
					initialSessionId={initialSessionId}
					showSettings={showSettings}
				/>
			)

		case "drawer":
			return (
				<SocketChatAsDrawer
					isOpen={isOpen}
					onClose={onClose || (() => {})}
					position={drawerPosition}
					size={drawerSize}
					initialSessionId={initialSessionId}
					showSettings={showSettings}
				/>
			)
		default:
			return (
				<SocketChatAsEmbed
					height={height}
					initialSessionId={initialSessionId}
					showSettings={showSettings}
					className={className}
				/>
			)
	}
}
