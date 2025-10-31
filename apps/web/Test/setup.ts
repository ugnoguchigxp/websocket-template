import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"
// Cleanup after each test
afterEach(() => {
	cleanup()
	vi.clearAllMocks()
	sessionStorage.clear()
	localStorage.clear()
})
// Mock window.location
window.location = undefined
window.location = {
	...window.location,
	hostname: "localhost",
	protocol: "http:",
	reload: vi.fn(),
}
// Mock WebSocket
class MockWebSocket {
	static CONNECTING = 0
	static OPEN = 1
	static CLOSING = 2
	static CLOSED = 3
	readyState = MockWebSocket.OPEN
	url
	protocol
	onopen = null
	onclose = null
	onerror = null
	onmessage = null
	constructor(url, protocols) {
		this.url = url
		this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || ""
		setTimeout(() => {
			if (this.onopen) {
				this.onopen(new Event("open"))
			}
		}, 0)
	}
	send(_data) {
		// Mock implementation
	}
	close(code, reason) {
		this.readyState = MockWebSocket.CLOSED
		if (this.onclose) {
			const event = new CloseEvent("close", { code, reason })
			this.onclose(event)
		}
	}
	addEventListener(_type, _listener) {
		// Mock implementation
	}
	removeEventListener(_type, _listener) {
		// Mock implementation
	}
	dispatchEvent(_event) {
		return true
	}
}
global.WebSocket = MockWebSocket
