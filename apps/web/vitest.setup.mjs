import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// Mock PointerEvent for Radix UI
class MockPointerEvent extends Event {
	button = 0
	ctrlKey = false
	shiftKey = false
	altKey = false
	metaKey = false

	constructor(type, props) {
		super(type, props)
		if (props?.button != null) {
			this.button = props.button
		}
		if (props?.ctrlKey != null) {
			this.ctrlKey = props.ctrlKey
		}
		if (props?.shiftKey != null) {
			this.shiftKey = props.shiftKey
		}
		if (props?.altKey != null) {
			this.altKey = props.altKey
		}
		if (props?.metaKey != null) {
			this.metaKey = props.metaKey
		}
	}
}

// Assign the mock to global window
window.PointerEvent = MockPointerEvent

// Mock HTMLElement methods required by Radix UI
Object.assign(window.HTMLElement.prototype, {
	scrollIntoView: vi.fn(),
	hasPointerCapture: vi.fn(),
	releasePointerCapture: vi.fn(),
})

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
})

// Mock ResizeObserver
class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
window.ResizeObserver = ResizeObserver

// Mock getComputedStyle
const { getComputedStyle } = window
window.getComputedStyle = elt => getComputedStyle(elt)
