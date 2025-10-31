import React from 'react';
import { createContextLogger } from '@logger';

const log = createContextLogger('TopPage');

export function TopPage() {
	log.info('TopPage displayed');

	return (
		<div className="min-h-screen bg-gray-100">
			<div className="max-w-6xl mx-auto px-4 py-12">
				<div className="bg-white border border-gray-400 rounded shadow-sm p-8">
					<h1 className="text-4xl font-bold mb-6 text-gray-800">WebSocket Framework</h1>
					<div className="space-y-4 text-gray-700">
						<p className="text-lg">
							Welcome to the WebSocket Framework demo application.
						</p>
						<p>
							This is a MonoRepo project featuring:
						</p>
						<ul className="list-disc pl-6 space-y-2">
							<li>Real-time communication using WebSocket</li>
							<li>Type-safe tRPC API</li>
							<li>React frontend with TypeScript</li>
							<li>Node.js backend with Prisma</li>
						</ul>
						<div className="mt-8 pt-6 border-t border-gray-300">
							<p className="text-sm text-gray-600">
								Use the menu on the left to navigate to different pages.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
