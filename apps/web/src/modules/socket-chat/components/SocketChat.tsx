/**
 * Socket Chat Page
 * Full-page interface for WebSocket-based multi-agent chat system
 * Audio functionality has been disabled per requirements
 */

import type React from "react"

import { useParams } from "react-router-dom"

import { SocketChatComponent } from "./SocketChatComponent"

/**
 * Socket Chat page component
 * Provides a full-page chat interface with optional session ID from URL
 */
export const SocketChat: React.FC = () => {
	const { sessionId } = useParams<{ sessionId?: string }>()

	return (
		<div className="min-h-screen bg-gray-100 p-4">
			<div className="max-w-7xl mx-auto h-full">
				<div
					className="bg-white rounded-lg shadow-lg h-full"
					style={{ height: "calc(100vh - 2rem)" }}
				>
					{/* Speech UI removed */}

					<SocketChatComponent initialSessionId={sessionId} height="100%" showSettings={true} />
				</div>
			</div>
		</div>
	)
}
