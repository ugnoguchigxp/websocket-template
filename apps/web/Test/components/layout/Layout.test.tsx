import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Layout from "../../../src/components/layout/Layout"
import { fireEvent, renderWithProviders, screen } from "../../test-utils"

// Mock react-i18next
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, fallback: string) => fallback || key,
	}),
}))

// Mock react-icons
vi.mock("react-icons/fa", () => ({
	FaBars: () => <div data-testid="bars-icon">☰</div>,
	FaChevronRight: () => <div data-testid="chevron-right">→</div>,
}))

vi.mock("react-icons/fi", () => ({
	FiUser: () => <div data-testid="user-icon">👤</div>,
}))

// Mock hooks
vi.mock("../../../src/hooks/useIsMobile", () => ({
	useIsMobile: () => false,
}))

vi.mock("../../../src/contexts/AuthContext", () => ({
	useAuth: () => ({
		logout: vi.fn(),
	}),
}))

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
}
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
})

// Mock child components
vi.mock("../../../src/components/notifications/NotificationPanel", () => ({
	NotificationPanel: ({ isVisible }: { isVisible: boolean }) => (
		<div data-testid="notification-panel">{isVisible ? "Visible" : "Hidden"}</div>
	),
}))

vi.mock("../../../src/components/ui/Drawer", () => ({
	default: ({
		children,
		isOpen,
		onClose,
		position = "right",
	}: {
		children: React.ReactNode
		isOpen: boolean
		onClose: () => void
		position?: string
	}) => (
		<div data-testid={`drawer-${position}`} style={{ display: isOpen ? "block" : "none" }}>
			<button onClick={onClose} data-testid="drawer-close">
				Close
			</button>
			{children}
		</div>
	),
}))

vi.mock("../../../src/components/ui/LanguageSelector", () => ({
	default: ({ className, id }: { className?: string; id?: string }) => (
		<div data-testid="language-selector" className={className} id={id}>
			Language Selector
		</div>
	),
}))

vi.mock("../../../src/components/ui/Tooltip", () => ({
	default: ({ text, children }: { text: string; children: React.ReactNode }) => (
		<div data-testid="tooltip" title={text}>
			{children}
		</div>
	),
}))

vi.mock("../../../src/components/TreeMenu", () => ({
	TreeMenu: ({
		menuData,
		onSelect,
		showCloseButton,
		onCloseMenu,
	}: {
		menuData: any[]
		onSelect?: () => void
		showCloseButton?: boolean
		onCloseMenu?: () => void
	}) => (
		<div data-testid="tree-menu">
			<div>Menu Items: {menuData.length}</div>
			{showCloseButton && (
				<button onClick={onCloseMenu} data-testid="tree-menu-close">
					Close Menu
				</button>
			)}
		</div>
	),
}))

vi.mock("../../../src/components/ui/Button", () => ({
	Button: ({
		children,
		onClick,
		variant,
		className,
	}: {
		children: React.ReactNode
		onClick?: () => void
		variant?: string
		className?: string
	}) => (
		<button onClick={onClick} data-testid="button" data-variant={variant} className={className}>
			{children}
		</button>
	),
}))

const renderLayout = (component: React.ReactElement) => {
	return renderWithProviders(component)
}

describe("Layout Component", () => {
	const mockLogout = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		localStorageMock.getItem.mockReturnValue("true")
		;(mockLogout as any).mockClear()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	// Basic rendering tests
	it("renders layout structure", () => {
		renderLayout(<Layout />)

		expect(screen.getByText("WebSocket Framework")).toBeInTheDocument()
		expect(screen.getByTestId("language-selector")).toBeInTheDocument()
		expect(screen.getAllByTestId("user-icon")).toHaveLength(2) // Header and dropdown
	})

	it("renders tree menu when expanded", () => {
		localStorageMock.getItem.mockReturnValue("true")
		renderLayout(<Layout />)

		expect(screen.getAllByTestId("tree-menu")).toHaveLength(2) // Desktop and mobile drawer
	})

	it("shows tree menu toggle button when collapsed", () => {
		localStorageMock.getItem.mockReturnValue("false")
		renderLayout(<Layout />)

		expect(screen.getByTestId("chevron-right")).toBeInTheDocument()
	})

	it("opens user dropdown when user button is clicked", () => {
		renderLayout(<Layout />)

		const userButton = screen.getAllByTestId("user-icon")[0].closest("button") // First one (header)
		fireEvent.click(userButton!)

		expect(screen.getByTestId("drawer-right")).toBeInTheDocument()
	})

	it("renders logout button in dropdown", () => {
		renderLayout(<Layout />)

		const userButton = screen.getAllByTestId("user-icon")[0].closest("button") // First one (header)
		fireEvent.click(userButton!)

		expect(screen.getByText("ログアウト")).toBeInTheDocument()
	})

	it("loads tree menu state from localStorage on mount", () => {
		localStorageMock.getItem.mockReturnValue("false")
		renderLayout(<Layout />)

		expect(localStorageMock.getItem).toHaveBeenCalledWith("treeMenuOpen")
	})

	it("has proper aria-labels for buttons", () => {
		localStorageMock.getItem.mockReturnValue("false")
		renderLayout(<Layout />)

		const toggleButton = screen.getByTestId("chevron-right").closest("button")
		expect(toggleButton).toHaveAttribute("aria-label", "Open menu")

		const userButton = screen.getAllByTestId("user-icon")[0].closest("button") // First one (header)
		expect(userButton).toHaveAttribute("aria-label", "User menu")
	})

	it("renders main content area", () => {
		renderLayout(<Layout />)

		const main = document.querySelector("main")
		expect(main).toBeInTheDocument()
	})

	it("integrates all child components properly", () => {
		renderLayout(<Layout />)

		expect(screen.getByTestId("language-selector")).toBeInTheDocument()
		expect(screen.getAllByTestId("user-icon")).toHaveLength(2) // Header and dropdown
		expect(screen.getAllByTestId("tree-menu")).toHaveLength(2) // Desktop and mobile drawer
	})

	// Component existence test
	it("Layout component is properly defined", () => {
		expect(Layout).toBeDefined()
	})
})
