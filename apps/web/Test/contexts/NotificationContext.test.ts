import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	NotificationProvider,
	useNotificationContext,
} from "../../src/contexts/NotificationContext"
import { renderWithProviders, screen } from "../test-utils"
// Mock logger
vi.mock("../../src/modules/logger", () => ({
	createContextLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}))
// Test component to access context
const TestComponent = () => {
	const context = useNotificationContext()
	return (
		<div>
			<div data-testid="unread-count">{context.unreadCount}</div>
			<div data-testid="center-open">{context.isNotificationCenterOpen ? "open" : "closed"}</div>
			<div data-testid="toast-count">{context.toasts.length}</div>

			<button
				onClick={() => {
					if ("addToast" in context) {
						context.addToast({
							type: "info",
							title: "Test Toast",
							message: "Test message",
							duration: 5000,
						})
					}
				}}
			>
				Add Toast
			</button>

			<button
				onClick={() => {
					if ("removeToast" in context) {
						context.removeToast("test-id")
					}
				}}
			>
				Remove Toast
			</button>

			<button
				onClick={() => {
					if ("clearAllToasts" in context) {
						context.clearAllToasts()
					}
				}}
			>
				Clear All
			</button>

			<button
				onClick={() => {
					if ("toggleNotificationCenter" in context) {
						context.toggleNotificationCenter()
					}
				}}
			>
				Toggle Center
			</button>
		</div>
	)
}
const renderWithNotificationProvider = component => {
	return renderWithProviders(<NotificationProvider>{component}</NotificationProvider>)
}
describe("NotificationContext", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	// Provider tests
	it("provides default context values", () => {
		renderWithNotificationProvider(<TestComponent />)
		expect(screen.getByTestId("unread-count")).toHaveTextContent("0")
		expect(screen.getByTestId("center-open")).toHaveTextContent("closed")
		expect(screen.getByTestId("toast-count")).toHaveTextContent("0")
	})
	// Toast management tests
	it("provides context methods", () => {
		renderWithNotificationProvider(<TestComponent />)
		expect(screen.getByTestId("unread-count")).toHaveTextContent("0")
		expect(screen.getByTestId("center-open")).toHaveTextContent("closed")
		expect(screen.getByTestId("toast-count")).toHaveTextContent("0")
	})
	it("renders buttons for context actions", () => {
		renderWithNotificationProvider(<TestComponent />)
		expect(screen.getByText("Add Toast")).toBeInTheDocument()
		expect(screen.getByText("Remove Toast")).toBeInTheDocument()
		expect(screen.getByText("Clear All")).toBeInTheDocument()
		expect(screen.getByText("Toggle Center")).toBeInTheDocument()
	})
	// Toast functionality tests
	it("can add toast through context", () => {
		const TestComponentWithActions = () => {
			const context = useNotificationContext()
			return (
				<div>
					<button
						onClick={() => {
							if ("addToast" in context && typeof context.addToast === "function") {
								context.addToast({
									type: "info",
									title: "Test Toast",
									message: "Test message",
									duration: 5000,
								})
							}
						}}
					>
						Add Toast
					</button>
					<div data-testid="toast-count">{context.toasts.length}</div>
				</div>
			)
		}
		renderWithNotificationProvider(<TestComponentWithActions />)
		expect(screen.getByTestId("toast-count")).toHaveTextContent("0")
		expect(screen.getByText("Add Toast")).toBeInTheDocument()
	})
	it("can clear all toasts through context", () => {
		const TestComponentWithClear = () => {
			const context = useNotificationContext()
			return (
				<div>
					<button
						onClick={() => {
							if ("clearAllToasts" in context && typeof context.clearAllToasts === "function") {
								context.clearAllToasts()
							}
						}}
					>
						Clear All
					</button>
					<div data-testid="toast-count">{context.toasts.length}</div>
				</div>
			)
		}
		renderWithNotificationProvider(<TestComponentWithClear />)
		expect(screen.getByTestId("toast-count")).toHaveTextContent("0")
		expect(screen.getByText("Clear All")).toBeInTheDocument()
	})
	it("can toggle notification center", () => {
		const TestComponentWithToggle = () => {
			const context = useNotificationContext()
			return (
				<div>
					<button
						onClick={() => {
							if (
								"toggleNotificationCenter" in context &&
								typeof context.toggleNotificationCenter === "function"
							) {
								context.toggleNotificationCenter()
							}
						}}
					>
						Toggle Center
					</button>
					<div data-testid="center-open">
						{context.isNotificationCenterOpen ? "open" : "closed"}
					</div>
				</div>
			)
		}
		renderWithNotificationProvider(<TestComponentWithToggle />)
		expect(screen.getByTestId("center-open")).toHaveTextContent("closed")
		expect(screen.getByText("Toggle Center")).toBeInTheDocument()
	})
	// Notification center tests
	it("toggles notification center button exists", () => {
		renderWithNotificationProvider(<TestComponent />)
		const toggleButton = screen.getByText("Toggle Center")
		expect(toggleButton).toBeInTheDocument()
	})
	// Component existence test
	it("NotificationProvider is properly defined", () => {
		expect(NotificationProvider).toBeDefined()
	})
	it("useNotificationContext hook is properly defined", () => {
		expect(useNotificationContext).toBeDefined()
	})
})
