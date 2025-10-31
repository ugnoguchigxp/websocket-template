import { describe, expect, it, vi } from "vitest"
import { Label } from "../../../src/components/ui/Label"
import { renderWithProviders, screen, userEvent } from "../../test-utils"

describe("Label Component", () => {
	// Basic rendering
	it("renders label with text", () => {
		renderWithProviders(<Label>Test Label</Label>)
		expect(screen.getByText(/test label/i)).toBeInTheDocument()
	})

	it("renders label with htmlFor attribute", () => {
		renderWithProviders(<Label htmlFor="test-input">Test Label</Label>)
		const label = screen.getByText(/test label/i)
		expect(label).toHaveAttribute("for", "test-input")
	})

	// Default classes
	it("applies default styling classes", () => {
		renderWithProviders(<Label>Default Label</Label>)
		const label = screen.getByText(/default label/i)
		expect(label).toHaveClass("text-sm")
		expect(label).toHaveClass("font-medium")
		expect(label).toHaveClass("leading-none")
	})

	// Custom className
	it("merges custom className with default classes", () => {
		const customClass = "custom-label-class"
		renderWithProviders(<Label className={customClass}>Custom Label</Label>)
		const label = screen.getByText(/custom label/i)
		expect(label).toHaveClass(customClass)
		expect(label).toHaveClass("text-sm") // Should still have default classes
	})

	// Ref forwarding
	it("forwards ref to the label element", () => {
		const ref = { current: null } as React.RefObject<HTMLLabelElement>
		renderWithProviders(<Label ref={ref}>Label with Ref</Label>)

		expect(ref.current).toBeInstanceOf(HTMLLabelElement)
		expect(ref.current?.textContent).toBe("Label with Ref")
	})

	// Accessibility
	it("supports accessibility attributes", () => {
		renderWithProviders(
			<Label id="test-label-id" aria-label="Screen reader label" aria-describedby="description-id">
				Accessible Label
			</Label>
		)

		const label = screen.getByText(/accessible label/i)
		expect(label).toHaveAttribute("id", "test-label-id")
		expect(label).toHaveAttribute("aria-label", "Screen reader label")
		expect(label).toHaveAttribute("aria-describedby", "description-id")
	})

	// Data attributes
	it("passes through data-* attributes", () => {
		renderWithProviders(
			<Label data-testid="test-label" data-custom="value">
				Label with Data
			</Label>
		)

		const label = screen.getByTestId("test-label")
		expect(label).toHaveAttribute("data-custom", "value")
	})

	// Click handler
	it("handles click events", async () => {
		const handleClick = vi.fn()
		const user = userEvent.setup()

		renderWithProviders(<Label onClick={handleClick}>Clickable Label</Label>)

		const label = screen.getByText(/clickable label/i)
		await user.click(label)
		expect(handleClick).toHaveBeenCalledTimes(1)
	})

	// Form association
	it("can be associated with form inputs", () => {
		renderWithProviders(
			<div>
				<Label htmlFor="email-input">Email Address</Label>
				<input id="email-input" type="email" />
			</div>
		)

		const label = screen.getByText(/email address/i)
		const input = screen.getByRole("textbox")

		expect(label).toHaveAttribute("for", "email-input")
		expect(input).toHaveAttribute("id", "email-input")
	})

	// Required indicator
	it("can display required indicator", () => {
		renderWithProviders(
			<Label>
				Required Field
				<span aria-hidden="true">*</span>
			</Label>
		)

		expect(screen.getByText(/required field/i)).toBeInTheDocument()
		expect(screen.getByText("*")).toBeInTheDocument()
	})

	// Display name
	it("has correct displayName", () => {
		expect(Label.displayName).toBe("Label")
	})
})
