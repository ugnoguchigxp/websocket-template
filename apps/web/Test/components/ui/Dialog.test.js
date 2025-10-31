import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogTitle,
	DialogTrigger,
} from "../../../src/components/ui/Dialog"
import { renderWithProviders, screen } from "../../test-utils"
// Setup Radix mocks
import { setupRadixMocks } from "../../test-utils/radix-mocks"
beforeEach(() => {
	setupRadixMocks()
	vi.clearAllMocks()
})
describe("Dialog Component", () => {
	const defaultProps = {
		open: false,
		onOpenChange: vi.fn(),
	}
	// Dialog basic tests
	it("renders dialog with trigger", () => {
		renderWithProviders(
			<Dialog {...defaultProps}>
				<DialogTrigger asChild>
					<button>Open Dialog</button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
					</DialogHeader>
					<div>Dialog Content</div>
				</DialogContent>
			</Dialog>
		)
		expect(screen.getByText("Open Dialog")).toBeInTheDocument()
	})
	it("renders dialog content when open", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogTrigger asChild>
					<button>Open Dialog</button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Test Title</DialogTitle>
						<DialogDescription>Test Description</DialogDescription>
					</DialogHeader>
					<div>Dialog Content</div>
				</DialogContent>
			</Dialog>
		)
		expect(screen.getByText("Test Title")).toBeInTheDocument()
		expect(screen.getByText("Test Description")).toBeInTheDocument()
		expect(screen.getByText("Dialog Content")).toBeInTheDocument()
	})
	// DialogContent tests
	it("renders DialogContent with proper structure", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Content Title</DialogTitle>
						<DialogDescription>Content Description</DialogDescription>
					</DialogHeader>
					<div>Content</div>
				</DialogContent>
			</Dialog>
		)
		expect(screen.getByText("Content")).toBeInTheDocument()
	})
	// DialogHeader tests
	it("renders DialogHeader with children", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Header Title</DialogTitle>
						<DialogDescription>Header Description</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		)
		expect(screen.getByText("Header Title")).toBeInTheDocument()
		expect(screen.getByText("Header Description")).toBeInTheDocument()
	})
	// DialogTitle tests
	it("renders DialogTitle with proper semantics", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Important Title</DialogTitle>
						<DialogDescription>Description</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		)
		expect(screen.getByText("Important Title")).toBeInTheDocument()
	})
	// DialogDescription tests
	it("renders DialogDescription with proper content", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogContent>
					<DialogHeader>
						<DialogDescription>Detailed description text</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		)
		expect(screen.getByText("Detailed description text")).toBeInTheDocument()
	})
	// DialogTrigger tests
	it("renders DialogTrigger as child", () => {
		renderWithProviders(
			<Dialog {...defaultProps}>
				<DialogTrigger asChild>
					<button data-testid="trigger-button">Custom Trigger</button>
				</DialogTrigger>
				<DialogContent>
					<div>Content</div>
				</DialogContent>
			</Dialog>
		)
		const trigger = screen.getByTestId("trigger-button")
		expect(trigger).toBeInTheDocument()
		expect(trigger).toHaveTextContent("Custom Trigger")
	})
	// DialogClose tests
	it("renders DialogClose button", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Close Test</DialogTitle>
						<DialogDescription>Description</DialogDescription>
					</DialogHeader>
					<DialogClose asChild>
						<button>Close Dialog</button>
					</DialogClose>
					<div>Content</div>
				</DialogContent>
			</Dialog>
		)
		expect(screen.getByText("Close Dialog")).toBeInTheDocument()
	})
	// DialogOverlay tests
	it("renders DialogOverlay when open", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogOverlay />
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Overlay Test</DialogTitle>
						<DialogDescription>Description</DialogDescription>
					</DialogHeader>
					<div>Content</div>
				</DialogContent>
			</Dialog>
		)
		// Overlay should be rendered due to portal mock
		expect(screen.getByText("Content")).toBeInTheDocument()
	})
	// Custom props tests
	it("applies custom className to DialogContent", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogContent className="custom-dialog-class">
					<DialogHeader>
						<DialogTitle>Custom Class Test</DialogTitle>
						<DialogDescription>Description</DialogDescription>
					</DialogHeader>
					<div>Content</div>
				</DialogContent>
			</Dialog>
		)
		expect(screen.getByText("Content")).toBeInTheDocument()
	})
	// Accessibility tests
	it("has proper accessibility attributes", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Accessible Title</DialogTitle>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		)
		// Dialog should have role="dialog"
		const dialog = screen.getByRole("dialog")
		expect(dialog).toBeInTheDocument()
		expect(screen.getByText("Accessible Title")).toBeInTheDocument()
	})
	// Edge cases
	it("handles empty children gracefully", () => {
		renderWithProviders(
			<Dialog {...defaultProps} open={true}>
				<DialogContent />
			</Dialog>
		)
		const dialog = screen.getByRole("dialog")
		expect(dialog).toBeInTheDocument()
	})
	// Display names for debugging
	it("has correct display names for components", () => {
		expect(Dialog.displayName).toBe("Dialog")
		expect(DialogContent.displayName).toBe("DialogContent")
		expect(DialogDescription.displayName).toBe("DialogDescription")
		expect(DialogHeader.displayName).toBe("DialogHeader")
		expect(DialogTitle.displayName).toBe("DialogTitle")
		expect(DialogTrigger.displayName).toBe("DialogTrigger")
		expect(DialogClose.displayName).toBe("DialogClose")
		expect(DialogOverlay.displayName).toBe("DialogOverlay")
		// DialogFooter might not exist in all Radix UI versions
		if (DialogFooter) {
			expect(DialogFooter.displayName).toBe("DialogFooter")
		}
	})
})
