/**
 * Socket Chat Page
 * Full-page interface for WebSocket-based multi-agent chat system
 */

import { SocketChat } from "@/modules/socket-chat/components/SocketChat"
import React from "react"
import { useParams } from "react-router-dom"

/**
 * Socket Chat page component
 * Provides a full-page chat interface with optional session ID from URL
 */
export function SocketChatPage() {
	const { sessionId } = useParams<{ sessionId?: string }>()

	return <SocketChat />
}
