// Socket Chat Module Exports

// Core Components
export { SocketChatComponent } from "./components/SocketChatComponent"
export { SocketChatMessage } from "./components/SocketChatMessage"
export { SocketChatInput } from "./components/SocketChatInput"
export { SocketChatLayout } from "./components/SocketChatLayout"
export { SocketChatSettings } from "./components/SocketChatSettings"

// Enhanced Components
export { EnhancedSocketChatInput } from "./components/EnhancedSocketChatInput"
export { ResponsiveSocketChat } from "./components/ResponsiveSocketChat"
export { AgentActivity } from "./components/AgentActivity"
export { AgentInteractionMessage } from "./components/AgentInteractionMessage"

// Universal Components
export {
	SocketChatAsModal,
	SocketChatAsDrawer,
	SocketChatAsEmbed,
	UniversalSocketChat,
} from "./components/UniversalSocketChat"
export { SocketChatModal } from "./components/SocketChatModal"
export { SocketChatDrawer } from "./components/SocketChatDrawer"

// Page Components
export { SocketChat } from "./components/SocketChat"
export { SocketChatDemo } from "./components/SocketChatDemo"

// Hooks
export { useWebSocketChat } from "./hooks/useWebSocketChat"
export * from "./hooks"

// Types
export type {
	MCPChatMessage,
	MCPChatSettings,
	MessageType,
	ChartData,
	BrowserFrameData,
	PlaywrightResult,
	MarkdownDocumentData,
} from "./types/mcpChat"
