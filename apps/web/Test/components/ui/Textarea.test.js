import { describe, expect, it, vi } from "vitest"
import { Textarea } from "../../../src/components/ui/Textarea"
import { renderWithProviders, screen, userEvent } from "../../test-utils"
describe("Textarea Component", () => {
	// Basic rendering
	it("renders textarea element", () => {
		renderWithProviders(<Textarea />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toBeInTheDocument()
		expect(textarea.tagName).toBe("TEXTAREA")
	})
	// Default styling
	it("applies default styling classes", () => {
		renderWithProviders(<Textarea />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toHaveClass("flex")
		expect(textarea).toHaveClass("min-h-[80px]")
		expect(textarea).toHaveClass("w-full")
		expect(textarea).toHaveClass("rounded-md")
		expect(textarea).toHaveClass("border")
		expect(textarea).toHaveClass("border-input")
		expect(textarea).toHaveClass("bg-transparent")
		expect(textarea).toHaveClass("px-3")
		expect(textarea).toHaveClass("py-2")
		expect(textarea).toHaveClass("text-sm")
		expect(textarea).toHaveClass("shadow-sm")
	})
	// Custom className
	it("merges custom className with default classes", () => {
		const customClass = "custom-textarea"
		renderWithProviders(<Textarea className={customClass} />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toHaveClass(customClass)
		expect(textarea).toHaveClass("min-h-[80px]") // Should still have default classes
	})
	// User input
	it("accepts user input", async () => {
		const user = userEvent.setup()
		renderWithProviders(<Textarea />)
		const textarea = screen.getByRole("textbox")
		await user.type(textarea, "Hello World\nNew line")
		expect(textarea.value).toBe("Hello World\nNew line")
	})
	// onChange handler
	it("calls onChange handler when value changes", async () => {
		const handleChange = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(<Textarea onChange={handleChange} />)
		const textarea = screen.getByRole("textbox")
		await user.type(textarea, "test")
		expect(handleChange).toHaveBeenCalledTimes(4) // One call per character
	})
	// Placeholder
	it("renders with placeholder text", () => {
		renderWithProviders(<Textarea placeholder="Enter your message" />)
		const textarea = screen.getByPlaceholderText(/enter your message/i)
		expect(textarea).toBeInTheDocument()
	})
	// Disabled state
	it("is disabled when disabled prop is true", () => {
		renderWithProviders(<Textarea disabled />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toBeDisabled()
		expect(textarea).toHaveAttribute("disabled")
	})
	it("has disabled styles when disabled", () => {
		renderWithProviders(<Textarea disabled />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toHaveClass("disabled:cursor-not-allowed")
		expect(textarea).toHaveClass("disabled:opacity-50")
	})
	it("does not accept input when disabled", async () => {
		const handleChange = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(<Textarea disabled onChange={handleChange} />)
		const textarea = screen.getByRole("textbox")
		await user.type(textarea, "test")
		expect(textarea.value).toBe("")
		expect(handleChange).not.toHaveBeenCalled()
	})
	// Ref forwarding
	it("forwards ref to the textarea element", () => {
		const ref = { current: null }
		renderWithProviders(<Textarea ref={ref} />)
		expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
	})
	// Value prop
	it("respects the value prop", () => {
		renderWithProviders(<Textarea value="Initial value" onChange={() => {}} />)
		const textarea = screen.getByRole("textbox")
		expect(textarea.value).toBe("Initial value")
	})
	// Controlled component
	it("renders with controlled value", () => {
		const { rerender } = renderWithProviders(<Textarea value="initial" onChange={() => {}} />)
		const textarea = screen.getByRole("textbox")
		expect(textarea.value).toBe("initial")
		rerender(<Textarea value="updated" onChange={() => {}} />)
		expect(textarea.value).toBe("updated")
	})
	// Readonly state
	it("is read-only when readOnly prop is true", () => {
		renderWithProviders(<Textarea readOnly />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toHaveAttribute("readonly")
	})
	// Required attribute
	it("has required attribute when required prop is true", () => {
		renderWithProviders(<Textarea required />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toBeRequired()
	})
	// Name attribute
	it("applies name attribute", () => {
		renderWithProviders(<Textarea name="test-textarea" />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toHaveAttribute("name", "test-textarea")
	})
	// Rows attribute
	it("applies rows attribute", () => {
		renderWithProviders(<Textarea rows={5} />)
		const textarea = screen.getByRole("textbox")
		expect(textarea.rows).toBe(5)
	})
	// Max length
	it("supports maxLength attribute", () => {
		renderWithProviders(<Textarea maxLength={100} />)
		const textarea = screen.getByRole("textbox")
		expect(textarea.maxLength).toBe(100)
	})
	// Form validation
	it("supports form validation attributes", () => {
		renderWithProviders(
			<Textarea
				required
				minLength={10}
				maxLength={500}
				pattern="[A-Za-z0-9\s]+"
				title="Alphanumeric characters only"
			/>
		)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toBeRequired()
		expect(textarea).toHaveAttribute("minlength", "10")
		expect(textarea).toHaveAttribute("maxlength", "500")
		expect(textarea).toHaveAttribute("pattern", "[A-Za-z0-9\\s]+")
		expect(textarea).toHaveAttribute("title", "Alphanumeric characters only")
	})
	// ARIA attributes
	it("supports ARIA attributes", () => {
		renderWithProviders(
			<Textarea
				aria-label="Message input"
				aria-describedby="message-help"
				aria-invalid="false"
				aria-required="true"
			/>
		)
		const textarea = screen.getByLabelText("Message input")
		expect(textarea).toHaveAttribute("aria-describedby", "message-help")
		expect(textarea).toHaveAttribute("aria-invalid", "false")
		expect(textarea).toHaveAttribute("aria-required", "true")
	})
	// Event handlers
	it("calls onFocus and onBlur handlers", async () => {
		const handleFocus = vi.fn()
		const handleBlur = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(<Textarea onFocus={handleFocus} onBlur={handleBlur} />)
		const textarea = screen.getByRole("textbox")
		await user.click(textarea)
		expect(handleFocus).toHaveBeenCalledTimes(1)
		await user.tab()
		expect(handleBlur).toHaveBeenCalledTimes(1)
	})
	// Focus styles
	it("applies focus styles", () => {
		renderWithProviders(<Textarea />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toHaveClass("focus-visible:outline-none")
		expect(textarea).toHaveClass("focus-visible:ring-2")
		expect(textarea).toHaveClass("focus-visible:ring-ring")
	})
	// Placeholder styles
	it("applies placeholder styles", () => {
		renderWithProviders(<Textarea placeholder="Test placeholder" />)
		const textarea = screen.getByRole("textbox")
		expect(textarea).toHaveClass("placeholder:text-muted-foreground")
	})
	// Data attributes
	it("passes through data-* attributes", () => {
		renderWithProviders(<Textarea data-testid="custom-textarea" data-custom="value" />)
		const textarea = screen.getByTestId("custom-textarea")
		expect(textarea).toHaveAttribute("data-custom", "value")
	})
	// Custom styles
	it("applies custom styles", () => {
		const style = { color: "red", backgroundColor: "blue" }
		renderWithProviders(<Textarea style={style} />)
		const textarea = screen.getByRole("textbox")
		expect(textarea.style.color).toBe("red")
		expect(textarea.style.backgroundColor).toBe("blue")
	})
	// Display name
	it("has correct displayName", () => {
		expect(Textarea.displayName).toBe("Textarea")
	})
})
