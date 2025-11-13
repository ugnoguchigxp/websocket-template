/**
 * Socket Chat Components Export Index
 * 全てのSocket Chat関連コンポーネントのエクスポート
 */

// Core components
export { SocketChatComponent } from "./SocketChatComponent"
export { SocketChatModal } from "./SocketChatModal"
export { SocketChatDrawer } from "./SocketChatDrawer"

// Universal components
export {
	UniversalSocketChat,
	SocketChatAsModal,
	SocketChatAsDrawer,
	SocketChatAsEmbed,
} from "./UniversalSocketChat"

// Legacy components (for backward compatibility)
export { SocketChatMessage } from "./SocketChatMessage"
export { AgentInteractionMessage } from "./AgentInteractionMessage"
export { SocketChatInput } from "./SocketChatInput"
export { SocketChatSettings } from "./SocketChatSettings"
export { SocketChatLayout } from "./SocketChatLayout"

// Types
export type { SocketChatModalProps } from "./SocketChatModal"
export type { SocketChatDrawerProps } from "./SocketChatDrawer"
export type {
	SocketChatEmbedProps,
	UniversalSocketChatProps,
} from "./UniversalSocketChat"
