import { describe, expect, it, vi } from "vitest"
import { Button, buttonVariants } from "../../../src/components/ui/Button"
import { renderWithProviders, screen, userEvent } from "../../test-utils"

describe("Button Component", () => {
	// Basic rendering
	it("renders button with text", () => {
		renderWithProviders(<Button>Click me</Button>)
		expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument()
	})

	// Click handler
	it("calls onClick handler when clicked", async () => {
		const handleClick = vi.fn()
		const user = userEvent.setup()

		renderWithProviders(<Button onClick={handleClick}>Click me</Button>)

		const button = screen.getByRole("button", { name: /click me/i })
		await user.click(button)

		expect(handleClick).toHaveBeenCalledTimes(1)
	})

	// Disabled state
	it("is disabled when disabled prop is true", () => {
		renderWithProviders(<Button disabled>Disabled Button</Button>)
		const button = screen.getByRole("button", { name: /disabled button/i })
		expect(button).toBeDisabled()
		expect(button).toHaveAttribute("disabled")
	})

	it("does not call onClick when disabled", async () => {
		const handleClick = vi.fn()
		const user = userEvent.setup()

		renderWithProviders(
			<Button disabled onClick={handleClick}>
				Disabled Button
			</Button>
		)

		const button = screen.getByRole("button", { name: /disabled button/i })
		await user.click(button)

		expect(handleClick).not.toHaveBeenCalled()
	})

	// Variants
	const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const

	variants.forEach(variant => {
		it(`applies ${variant} variant class`, () => {
			renderWithProviders(<Button variant={variant}>{variant} Button</Button>)
			const button = screen.getByRole("button", { name: new RegExp(`${variant} button`, "i") })
			expect(button).toHaveClass(buttonVariants({ variant }))
		})
	})

	// Sizes
	const sizes = ["default", "sm", "lg", "icon"] as const

	sizes.forEach(size => {
		it(`applies ${size} size class`, () => {
			renderWithProviders(<Button size={size}>{size} Button</Button>)
			const button = screen.getByRole("button", { name: new RegExp(`${size} button`, "i") })
			expect(button).toHaveClass(buttonVariants({ size }))
		})
	})

	// asChild prop
	it("renders as child when asChild is true", () => {
		renderWithProviders(
			<Button asChild>
				<a href="#test">Link Button</a>
			</Button>
		)

		const link = screen.getByRole("link", { name: /link button/i })
		expect(link).toBeInTheDocument()
		expect(link).toHaveClass(buttonVariants())
	})

	// Class name merging
	it("merges custom className with default classes", () => {
		const customClass = "custom-class"
		renderWithProviders(<Button className={customClass}>Custom Class</Button>)

		const button = screen.getByRole("button", { name: /custom class/i })
		expect(button).toHaveClass(customClass)
		expect(button).toHaveClass(buttonVariants())
	})

	// Ref forwarding
	it("forwards ref to the button element", () => {
		const ref = { current: null } as React.RefObject<HTMLButtonElement>
		renderWithProviders(<Button ref={ref}>Ref Test</Button>)

		expect(ref.current).toBeInstanceOf(HTMLButtonElement)
		expect(ref.current?.textContent).toBe("Ref Test")
	})

	// Default props
	it("applies default variant and size when not specified", () => {
		renderWithProviders(<Button>Default Props</Button>)
		const button = screen.getByRole("button", { name: /default props/i })

		expect(button).toHaveClass(buttonVariants({ variant: "default" }))
		expect(button).toHaveClass(buttonVariants({ size: "default" }))
	})

	it("renders with destructive variant", () => {
		renderWithProviders(<Button variant="destructive">Delete</Button>)
		const button = screen.getByRole("button", { name: /delete/i })
		expect(button).toBeInTheDocument()
	})

	it("renders with outline variant", () => {
		renderWithProviders(<Button variant="outline">Outline</Button>)
		const button = screen.getByRole("button", { name: /outline/i })
		expect(button).toBeInTheDocument()
	})

	it("renders with ghost variant", () => {
		renderWithProviders(<Button variant="ghost">Ghost</Button>)
		const button = screen.getByRole("button", { name: /ghost/i })
		expect(button).toBeInTheDocument()
	})

	it("renders with different sizes", () => {
		const { rerender } = renderWithProviders(<Button size="sm">Small</Button>)
		expect(screen.getByRole("button", { name: /small/i })).toBeInTheDocument()

		rerender(<Button size="lg">Large</Button>)
		expect(screen.getByRole("button", { name: /large/i })).toBeInTheDocument()
	})

	it("supports type attribute", () => {
		renderWithProviders(<Button type="submit">Submit</Button>)
		const button = screen.getByRole("button", { name: /submit/i }) as HTMLButtonElement
		expect(button.type).toBe("submit")
	})

	it("renders with custom className", () => {
		renderWithProviders(<Button className="custom-class">Custom</Button>)
		const button = screen.getByRole("button", { name: /custom/i })
		expect(button).toHaveClass("custom-class")
	})

	it("can render as a child component (asChild)", () => {
		renderWithProviders(
			<Button asChild>
				<a href="/test">Link Button</a>
			</Button>
		)
		const link = screen.getByRole("link", { name: /link button/i })
		expect(link).toBeInTheDocument()
		expect(link).toHaveAttribute("href", "/test")
	})
})
