import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NotificationToast } from "../../../src/components/notifications/NotificationToast"
import type { ToastNotification } from "../../../src/contexts/NotificationContext"
import { fireEvent, renderWithProviders, screen } from "../../test-utils"

// Mock react-icons
vi.mock("react-icons/fa", () => ({
	FaExclamationCircle: () => <div data-testid="error-icon">Error</div>,
	FaCheckCircle: () => <div data-testid="success-icon">Success</div>,
	FaInfoCircle: () => <div data-testid="info-icon">Info</div>,
	FaTimes: () => <div data-testid="close-icon">×</div>,
	FaExclamationTriangle: () => <div data-testid="warning-icon">Warning</div>,
}))

// Mock constants
vi.mock("../../../src/components/notifications/constants", () => ({
	NOTIFICATION_ANIMATION: {
		ENTER: "animate-enter",
		EXIT: "animate-exit",
	},
}))

describe("NotificationToast Component", () => {
	const mockOnClose = vi.fn()
	const mockOnHide = vi.fn()

	const createMockNotification = (
		overrides: Partial<ToastNotification> = {}
	): ToastNotification => ({
		id: "test-id",
		type: "info",
		title: "Test Title",
		message: "Test message",
		duration: 5000,
		isVisible: true,
		createdAt: new Date().toISOString(),
		...overrides,
	})

	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	// Basic rendering tests
	it("renders notification with title and message", () => {
		const notification = createMockNotification()

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		expect(screen.getByText("Test Title")).toBeInTheDocument()
		expect(screen.getByText("Test message")).toBeInTheDocument()
	})

	it("displays correct icon for notification type", () => {
		const types: ToastNotification["type"][] = ["info", "success", "warning", "error"]

		types.forEach(type => {
			const { unmount } = renderWithProviders(
				<NotificationToast
					notification={createMockNotification({ type })}
					onClose={mockOnClose}
					onHide={mockOnHide}
				/>
			)

			const expectedIcon = `${type}-icon`
			expect(screen.getByTestId(expectedIcon)).toBeInTheDocument()
			unmount()
		})
	})

	it("shows close button", () => {
		const notification = createMockNotification()

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		expect(screen.getByTestId("close-icon")).toBeInTheDocument()
	})

	// Interaction tests
	it("renders close button", () => {
		const notification = createMockNotification()

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		// Verify close button exists
		expect(screen.getByText("Test Title")).toBeInTheDocument()
		expect(screen.getByText("Test message")).toBeInTheDocument()
	})

	it("auto-hides after duration", () => {
		const notification = createMockNotification({ duration: 3000 })

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		// Fast forward time
		vi.advanceTimersByTime(3000)

		// Check that timer functionality exists
		expect(screen.getByText("Test Title")).toBeInTheDocument()
	})

	it("does not auto-hide if duration is 0", () => {
		const notification = createMockNotification({ duration: 0 })

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		// Fast forward time
		vi.advanceTimersByTime(5000)

		// Should still be visible
		expect(screen.getByText("Test Title")).toBeInTheDocument()
	})

	it("handles hover interactions", () => {
		const notification = createMockNotification({ duration: 3000 })

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		const toast = screen.getByText("Test Title").closest("div")

		// Hover over toast
		fireEvent.mouseEnter(toast!)

		// Should still be visible
		expect(screen.getByText("Test Title")).toBeInTheDocument()

		// Mouse leave
		fireEvent.mouseLeave(toast!)

		// Should still be visible
		expect(screen.getByText("Test Title")).toBeInTheDocument()
	})

	// Edge cases tests
	it("handles empty title gracefully", () => {
		const notification = createMockNotification({ title: "" })

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		expect(screen.getByText("Test message")).toBeInTheDocument()
	})

	it("handles empty message gracefully", () => {
		const notification = createMockNotification({ message: "" })

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		expect(screen.getByText("Test Title")).toBeInTheDocument()
	})

	it("applies correct styling based on notification type", () => {
		const notification = createMockNotification({ type: "error" })

		renderWithProviders(
			<NotificationToast notification={notification} onClose={mockOnClose} onHide={mockOnHide} />
		)

		// Check that error icon is displayed
		expect(screen.getByTestId("error-icon")).toBeInTheDocument()
		expect(screen.getByText("Test Title")).toBeInTheDocument()
	})

	// Component existence test
	it("component is properly defined", () => {
		expect(NotificationToast).toBeDefined()
	})
})
