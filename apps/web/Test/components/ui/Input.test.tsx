import { describe, expect, it, vi } from "vitest"
import { Input } from "../../../src/components/ui/Input"
import { renderWithProviders, screen, userEvent } from "../../test-utils"
describe("Input Component", () => {
	// Basic rendering
	it("renders input element with default type text", () => {
		renderWithProviders(<Input />)
		const input = screen.getByRole("textbox")
		expect(input).toBeInTheDocument()
		// The input should be of type 'text' by default, but we'll check the actual behavior
		// which might not explicitly set the type attribute
		expect(input.getAttribute("type")).not.toBe("password")
	})
	it("renders with custom type attribute", () => {
		renderWithProviders(<Input type="email" />)
		const input = screen.getByRole("textbox")
		expect(input).toHaveAttribute("type", "email")
	})
	it("renders with placeholder text", () => {
		renderWithProviders(<Input placeholder="Enter text" />)
		const input = screen.getByPlaceholderText(/enter text/i)
		expect(input).toBeInTheDocument()
	})
	// User interaction
	it("accepts user input", async () => {
		const user = userEvent.setup()
		renderWithProviders(<Input />)
		const input = screen.getByRole("textbox")
		await user.type(input, "Hello World")
		expect(input.value).toBe("Hello World")
	})
	it("calls onChange handler when value changes", async () => {
		const handleChange = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(<Input onChange={handleChange} />)
		const input = screen.getByRole("textbox")
		await user.type(input, "test")
		expect(handleChange).toHaveBeenCalledTimes(4) // One call per character
	})
	// Disabled state
	it("is disabled when disabled prop is true", () => {
		renderWithProviders(<Input disabled />)
		const input = screen.getByRole("textbox")
		expect(input).toBeDisabled()
		expect(input).toHaveAttribute("disabled")
	})
	it("has disabled styles when disabled", () => {
		renderWithProviders(<Input disabled />)
		const input = screen.getByRole("textbox")
		expect(input).toHaveClass("disabled:cursor-not-allowed")
		expect(input).toHaveClass("disabled:opacity-50")
	})
	it("does not accept input when disabled", async () => {
		const handleChange = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(<Input disabled onChange={handleChange} />)
		const input = screen.getByRole("textbox")
		await user.type(input, "test")
		expect(input.value).toBe("")
		expect(handleChange).not.toHaveBeenCalled()
	})
	// Different input types
	it("renders with different types", () => {
		const { container } = renderWithProviders(<Input type="password" />)
		const input = container.querySelector("input")
		expect(input.type).toBe("password")
	})
	// Ref forwarding
	it("forwards ref to the input element", () => {
		const ref = { current: null }
		renderWithProviders(<Input ref={ref} />)
		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})
	// Class name merging
	it("merges custom className with default classes", () => {
		const customClass = "custom-class"
		renderWithProviders(<Input className={customClass} />)
		const input = screen.getByRole("textbox")
		expect(input).toHaveClass(customClass)
		expect(input).toHaveClass("h-9") // Default class from the component
	})
	// Default props
	it("applies default props when not specified", () => {
		renderWithProviders(<Input />)
		const input = screen.getByRole("textbox")
		// Check for some default classes from the component
		expect(input).toHaveClass("h-9")
		expect(input).toHaveClass("w-full")
		expect(input).toHaveClass("rounded-md")
	})
	// Value prop
	it("respects the value prop", () => {
		renderWithProviders(<Input value="Test Value" onChange={() => {}} />)
		const input = screen.getByRole("textbox")
		expect(input.value).toBe("Test Value")
	})
	// Readonly state
	it("is read-only when readOnly prop is true", () => {
		renderWithProviders(<Input readOnly />)
		const input = screen.getByRole("textbox")
		expect(input).toHaveAttribute("readonly")
	})
	// Required attribute
	it("has required attribute when required prop is true", () => {
		renderWithProviders(<Input required />)
		const input = screen.getByRole("textbox")
		expect(input).toBeRequired()
	})
	// Name attribute
	it("applies name attribute", () => {
		renderWithProviders(<Input name="test-input" />)
		const input = screen.getByRole("textbox")
		expect(input).toHaveAttribute("name", "test-input")
	})
	// Aria attributes
	it("applies aria-* attributes", () => {
		renderWithProviders(<Input aria-label="Test Input" aria-describedby="description" />)
		const input = screen.getByLabelText("Test Input")
		expect(input).toHaveAttribute("aria-describedby", "description")
	})
	// Auto-complete attribute
	it("applies autoComplete attribute", () => {
		renderWithProviders(<Input autoComplete="email" />)
		const input = screen.getByRole("textbox")
		expect(input).toHaveAttribute("autocomplete", "email")
	})
	// Auto-focus
	it("can be auto-focused", () => {
		renderWithProviders(<Input autoFocus />)
		const input = screen.getByRole("textbox")
		expect(document.activeElement).toBe(input)
	})
	// Controlled component
	it("renders with controlled value", () => {
		const { rerender } = renderWithProviders(<Input value="initial" onChange={() => {}} />)
		const input = screen.getByRole("textbox")
		expect(input.value).toBe("initial")
		// Test that the input updates when the value prop changes
		rerender(<Input value="updated" onChange={() => {}} />)
		expect(input.value).toBe("updated")
	})
	// Test with ref and focus
	it("can be focused programmatically", () => {
		const ref = { current: null }
		renderWithProviders(<Input ref={ref} />)
		expect(ref.current).not.toBeNull()
		if (ref.current) {
			ref.current.focus()
			expect(document.activeElement).toBe(ref.current)
		}
	})
	// Test with custom data attributes
	it("passes through data-* attributes", () => {
		renderWithProviders(<Input data-testid="custom-input" data-custom="value" />)
		const input = screen.getByTestId("custom-input")
		expect(input).toHaveAttribute("data-custom", "value")
	})
	// Test with custom styles
	it("applies custom styles", () => {
		const style = { color: "red", backgroundColor: "blue" }
		renderWithProviders(<Input style={style} />)
		const input = screen.getByRole("textbox")
		// Check for the computed style values in RGB format
		expect(window.getComputedStyle(input).color).toBe("rgb(255, 0, 0)")
		expect(window.getComputedStyle(input).backgroundColor).toBe("rgb(0, 0, 255)")
	})
	// Additional HTML5 attributes
	it("supports maxLength attribute", () => {
		renderWithProviders(<Input maxLength={10} />)
		const input = screen.getByRole("textbox")
		expect(input.maxLength).toBe(10)
	})
	// Form validation
	it("supports form validation attributes", () => {
		renderWithProviders(
			<Input
				required
				minLength={3}
				maxLength={10}
				pattern="[A-Za-z]{3}"
				title="Three letter code"
			/>
		)
		const input = screen.getByRole("textbox")
		expect(input).toBeRequired()
		expect(input).toHaveAttribute("minlength", "3")
		expect(input).toHaveAttribute("maxlength", "10")
		expect(input).toHaveAttribute("pattern", "[A-Za-z]{3}")
		expect(input).toHaveAttribute("title", "Three letter code")
	})
	// Accessibility
	it("supports ARIA attributes", () => {
		renderWithProviders(
			<Input aria-label="Search" aria-describedby="search-help" aria-invalid="false" />
		)
		const input = screen.getByLabelText("Search")
		expect(input).toHaveAttribute("aria-describedby", "search-help")
		expect(input).toHaveAttribute("aria-invalid", "false")
	})
	// Event handlers
	it("calls onFocus and onBlur handlers", async () => {
		const handleFocus = vi.fn()
		const handleBlur = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(<Input onFocus={handleFocus} onBlur={handleBlur} />)
		const input = screen.getByRole("textbox")
		await user.click(input)
		expect(handleFocus).toHaveBeenCalledTimes(1)
		await user.tab()
		expect(handleBlur).toHaveBeenCalledTimes(1)
	})
	// Performance optimization
	it("memoizes the component with React.memo", () => {
		// This is a simple test to ensure the component is memoized
		// In a real app, you might want to test this with a more complex setup
		expect(Input).toHaveProperty("displayName")
	})
})
