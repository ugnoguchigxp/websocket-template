/**
 * Socket Chat Drawer Component
 * Socket Chatをドロワー表示するコンポーネント
 */

import type React from "react"
import { useEffect } from "react"

import { createPortal } from "react-dom"

import { useIsMobile } from "../../../hooks/useIsMobile"

import { SocketChatComponent } from "./SocketChatComponent"

export interface SocketChatDrawerProps {
	/** ドロワーの表示状態 */
	isOpen: boolean
	/** ドロワークローズ時のコールバック */
	onClose: () => void
	/** ドロワーの位置 */
	position?: "left" | "right" | "bottom"
	/** ドロワーのサイズ */
	size?: string | number
	/** 初期セッションID */
	initialSessionId?: string
	/** 設定パネルの表示制御 */
	showSettings?: boolean
	/** オーバーレイ表示 */
	showOverlay?: boolean
	/** アニメーション時間 */
	animationDuration?: number
}

export const SocketChatDrawer: React.FC<SocketChatDrawerProps> = ({
	isOpen,
	onClose,
	position = "right",
	size = "400px",
	initialSessionId,
	// showSettings - ドロワーでは常に無効のため削除
	showOverlay = true,
	animationDuration = 300,
}) => {
	const isMobile = useIsMobile()

	// ESCキーでクローズ
	useEffect(() => {
		if (!isOpen) return

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose()
			}
		}

		document.addEventListener("keydown", handleEscape)
		return () => document.removeEventListener("keydown", handleEscape)
	}, [isOpen, onClose])

	// オーバーレイクリックでクローズ
	const handleOverlayClick = (event: React.MouseEvent) => {
		if (showOverlay && event.target === event.currentTarget) {
			onClose()
		}
	}

	// ドロワーのスタイルを計算
	const getDrawerStyles = () => {
		const baseSize = typeof size === "number" ? `${size}px` : size
		const mobileSize = isMobile ? "100%" : baseSize

		const baseStyle = {
			position: "fixed" as const,
			zIndex: 41,
		}

		switch (position) {
			case "left":
				return {
					...baseStyle,
					left: 0,
					top: 0,
					bottom: 0,
					width: mobileSize,
					height: "100vh",
					transform: isOpen ? "translateX(0%)" : "translateX(-100%)",
				}
			case "right":
				return {
					...baseStyle,
					right: 0,
					top: 0,
					bottom: 0,
					width: mobileSize,
					height: "100vh",
					transform: isOpen ? "translateX(0%)" : "translateX(100%)",
				}
			case "bottom":
				return {
					...baseStyle,
					left: 0,
					right: 0,
					bottom: 0,
					height: isMobile ? "80vh" : baseSize,
					width: "100vw",
					maxWidth: "100%",
					transform: isOpen ? "translateY(0%)" : "translateY(100%)",
				}
			default:
				return baseStyle
		}
	}

	// チャットの高さ計算
	const getChatHeight = () => {
		if (position === "bottom") {
			return isMobile ? "80vh" : typeof size === "number" ? `${size}px` : size
		}
		return "100vh"
	}

	// ドロワーが閉じていてオーバーレイも表示しない場合は何も表示しない
	if (!isOpen && !showOverlay) return null

	const drawerContent = (
		<>
			{/* オーバーレイ */}
			{showOverlay && (
				<div
					className={"fixed inset-0 bg-black transition-opacity"}
					style={{
						zIndex: 40,
						transitionDuration: `${animationDuration}ms`,
						opacity: isOpen ? 0.5 : 0,
						pointerEvents: isOpen ? "auto" : "none",
					}}
					onClick={handleOverlayClick}
				/>
			)}

			{/* ドロワー */}
			<div
				className={"bg-white shadow-lg transition-transform ease-in-out"}
				style={{
					transitionDuration: `${animationDuration}ms`,
					...getDrawerStyles(),
				}}
			>
				{/* ドロワーが開いている時のみSocketChatComponentをレンダリング */}
				{isOpen && (
					<SocketChatComponent
						initialSessionId={initialSessionId}
						height={getChatHeight()}
						showSettings={false} // ドロワーでは設定無効
						displayMode="drawer"
						responsive={true}
						compact={true}
						enableMultimodal={false} // ドロワーではマルチモーダルOFF
					/>
				)}
			</div>
		</>
	)

	return createPortal(<div key={position}>{drawerContent}</div>, document.body)
}
