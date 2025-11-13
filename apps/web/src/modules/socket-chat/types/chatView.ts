/**
 * Socket Chat View Types
 * チャット表示モードとポジションの型定義
 */

export type ChatViewMode = "modal" | "drawer" | "embed" | "fullpage"

export type ChatPosition = "top" | "bottom" | "left" | "right"

export interface ChatViewConfig {
	mode: ChatViewMode
	position?: ChatPosition
	size?: {
		width?: number | string
		height?: number | string
	}
}
