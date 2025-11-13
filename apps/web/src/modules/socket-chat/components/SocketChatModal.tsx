/**
 * Socket Chat Modal Component
 * Socket Chatをモーダル表示するコンポーネント
 */

import type React from "react"

import Modal from "../../../components/ui/Modal"
import { useIsMobile } from "../../../hooks/useIsMobile"

import { SocketChatComponent } from "./SocketChatComponent"

export interface SocketChatModalProps {
	/** モーダルの表示状態 */
	isOpen: boolean
	/** モーダルクローズ時のコールバック */
	onClose: () => void
	/** モーダルサイズ */
	size?: "sm" | "md" | "lg" | "xl" | "full"
	/** 背景クリックで閉じるか */
	closeOnBackdrop?: boolean
	/** ESCキーで閉じるか */
	closeOnEscape?: boolean
	/** バツボタンを表示するか */
	showCloseButton?: boolean
	/** ドラッグ移動を有効にするか */
	draggable?: boolean
	/** 初期セッションID */
	initialSessionId?: string
	/** 設定パネルの表示制御 */
	showSettings?: boolean
}

export const SocketChatModal: React.FC<SocketChatModalProps> = ({
	isOpen,
	onClose,
	size = "lg",
	closeOnBackdrop = true,
	closeOnEscape = true,
	showCloseButton = true,
	draggable = false,
	initialSessionId,
	// showSettings - モーダルでは常に無効のため削除
}) => {
	const isMobile = useIsMobile()

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			size={isMobile ? "full" : size}
			closeOnBackdrop={closeOnBackdrop}
			closeOnEscape={closeOnEscape}
			showCloseButton={showCloseButton}
			draggable={draggable && !isMobile}
			className={`${isMobile ? "rounded-none" : "rounded-lg"} overflow-hidden`}
		>
			<div className="w-full h-full">
				<SocketChatComponent
					initialSessionId={initialSessionId}
					height="100%"
					showSettings={false} // モーダルでは設定無効
					displayMode="modal"
					responsive={true}
					compact={true}
					extraCompact={size === "sm"} // smサイズでは超コンパクト表示
					enableMultimodal={false} // モーダルではマルチモーダルOFF
				/>
			</div>
		</Modal>
	)
}
