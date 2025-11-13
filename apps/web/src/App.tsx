import Layout from "@components/layout/Layout"
import { BBSPage } from "@pages/BBSPage"
import { ComponentsDemoPage } from "@pages/ComponentsDemoPage"
import { MarkdownEditorPage } from "@pages/MarkdownEditorPage"
import { MindMapPage } from "@pages/MindMapPage"
import { NotificationDemoPage } from "@pages/NotificationDemoPage"
import { SocketChatPage } from "@pages/SocketChatPage"
import { TetrisPage } from "@pages/TetrisPage"
import { TopPage } from "@pages/TopPage"
import { UserManagementPage } from "@pages/UserManagementPage"
import { Route, Routes } from "react-router-dom"

interface AppProps {
	trpcClient?: any
}

export function App({ trpcClient }: AppProps) {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/" element={<TopPage />} />
				<Route path="/bbs" element={<BBSPage />} />
				<Route path="/user-management" element={<UserManagementPage />} />
				<Route path="/components-demo" element={<ComponentsDemoPage />} />
				<Route path="/notification-demo" element={<NotificationDemoPage />} />
				<Route path="/tetris" element={<TetrisPage />} />
				<Route path="/mindmap" element={<MindMapPage />} />
				<Route path="/socket-chat" element={<SocketChatPage />} />
				<Route path="/markdown-editor" element={<MarkdownEditorPage />} />
			</Route>
		</Routes>
	)
}
