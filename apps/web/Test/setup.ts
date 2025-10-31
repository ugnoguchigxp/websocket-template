import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	sessionStorage.clear();
	localStorage.clear();
});

// Mock window.location
delete (window as { location?: Location }).location;
window.location = {
	...window.location,
	hostname: 'localhost',
	protocol: 'http:',
	reload: vi.fn(),
};

// Mock WebSocket
class MockWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	static CLOSING = 2;
	static CLOSED = 3;

	readyState = MockWebSocket.OPEN;
	url: string;
	protocol: string;
	onopen: ((event: Event) => void) | null = null;
	onclose: ((event: CloseEvent) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;

	constructor(url: string, protocols?: string | string[]) {
		this.url = url;
		this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || '';
		setTimeout(() => {
			if (this.onopen) {
				this.onopen(new Event('open'));
			}
		}, 0);
	}

	send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
		// Mock implementation
	}

	close(code?: number, reason?: string): void {
		this.readyState = MockWebSocket.CLOSED;
		if (this.onclose) {
			const event = new CloseEvent('close', { code, reason });
			this.onclose(event);
		}
	}

	addEventListener(type: string, listener: EventListener): void {
		// Mock implementation
	}

	removeEventListener(type: string, listener: EventListener): void {
		// Mock implementation
	}

	dispatchEvent(event: Event): boolean {
		return true;
	}
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
