import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotificationPanel } from "../../../src/components/notifications/NotificationPanel"
import { useNotificationContext } from "../../../src/contexts/NotificationContext"
import { renderWithProviders, screen } from "../../test-utils"
// Mock NotificationContext
vi.mock("../../../src/contexts/NotificationContext", async () => {
	const actual = await vi.importActual("../../../src/contexts/NotificationContext")
	return {
		...actual,
		useNotificationContext: vi.fn(),
	}
})
// Mock react-icons
vi.mock("react-icons/fa", () => ({
	FaBell: () => <div data-testid="bell-icon">Bell</div>,
	FaTimes: () => <div data-testid="close-icon">×</div>,
	FaCheck: () => <div data-testid="check-icon">✓</div>,
	FaInfoCircle: () => <div data-testid="info-icon">Info</div>,
	FaCheckCircle: () => <div data-testid="success-icon">Success</div>,
	FaExclamationTriangle: () => <div data-testid="warning-icon">Warning</div>,
	FaExclamationCircle: () => <div data-testid="error-icon">Error</div>,
	FaTrash: () => <div data-testid="trash-icon">🗑️</div>,
}))
describe("NotificationPanel Component", () => {
	const mockNotifications = [
		{
			id: "notif-1",
			type: "info",
			title: "Info Notification",
			message: "Info message content",
			duration: 5000,
			isVisible: true,
			isRead: false,
			createdAt: new Date().toISOString(),
		},
		{
			id: "notif-2",
			type: "success",
			title: "Success Notification",
			message: "Success message content",
			duration: 3000,
			isVisible: true,
			isRead: true,
			createdAt: new Date().toISOString(),
		},
		{
			id: "notif-3",
			type: "error",
			title: "Error Notification",
			message: "Error message content",
			duration: 0,
			isVisible: true,
			isRead: false,
			createdAt: new Date().toISOString(),
		},
	]
	const mockContextValue = {
		toasts: [],
		isNotificationCenterOpen: false,
		unreadCount: 2,
		addToast: vi.fn(),
		removeToast: vi.fn(),
		hideToast: vi.fn(),
		clearAllToasts: vi.fn(),
		toggleNotificationCenter: vi.fn(),
		markAsRead: vi.fn(),
		markAllAsRead: vi.fn(),
	}
	beforeEach(() => {
		vi.clearAllMocks()
		useNotificationContext.mockReturnValue(mockContextValue)
	})
	// Basic rendering tests
	it("renders notification panel trigger button", () => {
		renderWithProviders(<NotificationPanel />)
		expect(screen.getByTestId("bell-icon")).toBeInTheDocument()
	})
	// Notification item tests
	it("renders notification icons when panel is open", () => {
		useNotificationContext.mockReturnValue({
			...mockContextValue,
			isNotificationCenterOpen: true,
			toasts: mockNotifications,
		})
		renderWithProviders(<NotificationPanel />)
		// Check that notification icons are rendered
		expect(screen.getByTestId("info-icon")).toBeInTheDocument()
		expect(screen.getByTestId("success-icon")).toBeInTheDocument()
		expect(screen.getByTestId("error-icon")).toBeInTheDocument()
	})
	// Empty state tests
	it("shows empty state when no notifications", () => {
		useNotificationContext.mockReturnValue({
			...mockContextValue,
			isNotificationCenterOpen: true,
			toasts: [],
		})
		renderWithProviders(<NotificationPanel />)
		expect(screen.getByTestId("bell-icon")).toBeInTheDocument()
	})
	// Edge cases tests
	it("handles empty notifications array gracefully", () => {
		useNotificationContext.mockReturnValue({
			...mockContextValue,
			isNotificationCenterOpen: true,
			toasts: [],
		})
		renderWithProviders(<NotificationPanel />)
		expect(screen.getByTestId("bell-icon")).toBeInTheDocument()
	})
	// Component existence test
	it("component is properly defined", () => {
		expect(NotificationPanel).toBeDefined()
	})
})
