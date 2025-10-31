import { BBSPage } from "@pages/BBSPage"
import { ComponentsDemoPage } from "@pages/ComponentsDemoPage"
import { NotificationDemoPage } from "@pages/NotificationDemoPage"
import { TetrisPage } from "@pages/TetrisPage"
import { TopPage } from "@pages/TopPage"
import { UserManagementPage } from "@pages/UserManagementPage"
import { Route, Routes } from "react-router-dom"
import Layout from "./components/layout/Layout"
export function App() {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/" element={<TopPage />} />
				<Route path="/bbs" element={<BBSPage />} />
				<Route path="/user-management" element={<UserManagementPage />} />
				<Route path="/components-demo" element={<ComponentsDemoPage />} />
				<Route path="/notification-demo" element={<NotificationDemoPage />} />
				<Route path="/tetris" element={<TetrisPage />} />
			</Route>
		</Routes>
	)
}
