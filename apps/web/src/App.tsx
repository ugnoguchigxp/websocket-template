import { Routes, Route } from 'react-router-dom';
import { TopPage } from '@pages/TopPage';
import { BBSPage } from '@pages/BBSPage';
import { ComponentsDemoPage } from '@pages/ComponentsDemoPage';
import { NotificationDemoPage } from '@pages/NotificationDemoPage';
import Layout from './components/layout/Layout';

export function App() {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/" element={<TopPage />} />
				<Route path="/bbs" element={<BBSPage />} />
				<Route path="/components-demo" element={<ComponentsDemoPage />} />
				<Route path="/notification-demo" element={<NotificationDemoPage />} />
			</Route>
		</Routes>
	);
}
