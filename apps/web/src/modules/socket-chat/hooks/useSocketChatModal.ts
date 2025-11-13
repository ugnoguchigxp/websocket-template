/**
 * Socket Chat Modal Hook
 * モーダル・ドロワー表示の状態管理フック
 */

import { useCallback, useState } from "react"

import type { ChatPosition, ChatViewMode } from "../types/chatView"

export interface UseSocketChatModalResult {
	/** モーダル表示状態 */
	isModalOpen: boolean
	/** ドロワー表示状態 */
	isDrawerOpen: boolean
	/** 現在の表示モード */
	currentMode: ChatViewMode | null
	/** ドロワーの位置 */
	drawerPosition: ChatPosition
	/** セッションID */
	sessionId: string | undefined

	/** モーダルを開く */
	openModal: (sessionId?: string) => void
	/** ドロワーを開く */
	openDrawer: (position?: ChatPosition, sessionId?: string) => void
	/** モーダルを閉じる */
	closeModal: () => void
	/** ドロワーを閉じる */
	closeDrawer: () => void
	/** 全て閉じる */
	closeAll: () => void
	/** 表示モードを切り替え */
	switchMode: (mode: ChatViewMode, sessionId?: string) => void
}

export const useSocketChatModal = (): UseSocketChatModalResult => {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)
	const [currentMode, setCurrentMode] = useState<ChatViewMode | null>(null)
	const [drawerPosition, setDrawerPosition] = useState<ChatPosition>("right")
	const [sessionId, setSessionId] = useState<string | undefined>()

	const openModal = useCallback((newSessionId?: string) => {
		setIsModalOpen(true)
		setIsDrawerOpen(false)
		setCurrentMode("modal")
		if (newSessionId) {
			setSessionId(newSessionId)
		}
	}, [])

	const openDrawer = useCallback((position: ChatPosition = "right", newSessionId?: string) => {
		setIsDrawerOpen(true)
		setIsModalOpen(false)
		setCurrentMode("drawer")
		setDrawerPosition(position)
		if (newSessionId) {
			setSessionId(newSessionId)
		}
	}, [])

	const closeModal = useCallback(() => {
		setIsModalOpen(false)
		if (currentMode === "modal") {
			setCurrentMode(null)
		}
	}, [currentMode])

	const closeDrawer = useCallback(() => {
		setIsDrawerOpen(false)
		if (currentMode === "drawer") {
			setCurrentMode(null)
		}
	}, [currentMode])

	const closeAll = useCallback(() => {
		setIsModalOpen(false)
		setIsDrawerOpen(false)
		setCurrentMode(null)
	}, [])

	const switchMode = useCallback(
		(mode: ChatViewMode, newSessionId?: string) => {
			closeAll()

			if (newSessionId) {
				setSessionId(newSessionId)
			}

			switch (mode) {
				case "modal":
					openModal(newSessionId)
					break
				case "drawer":
					openDrawer("right", newSessionId)
					break
				case "fullpage":
					setCurrentMode("fullpage")
					break
			}
		},
		[closeAll, openModal, openDrawer]
	)

	return {
		isModalOpen,
		isDrawerOpen,
		currentMode,
		drawerPosition,
		sessionId,
		openModal,
		openDrawer,
		closeModal,
		closeDrawer,
		closeAll,
		switchMode,
	}
}
