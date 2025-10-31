import { describe, expect, it, vi } from "vitest"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../../../src/components/ui/Card"
import { renderWithProviders, screen, userEvent } from "../../test-utils"
describe("Card Components", () => {
	// Test Card component
	describe("Card", () => {
		it("renders card component with children", () => {
			renderWithProviders(<Card>Card Content</Card>)
			expect(screen.getByText(/card content/i)).toBeInTheDocument()
		})
		it("applies custom className", () => {
			const { container } = renderWithProviders(<Card className="custom-card">Content</Card>)
			const card = container.firstChild
			expect(card).toHaveClass("custom-card")
		})
		it("forwards ref to the card element", () => {
			const ref = { current: null }
			renderWithProviders(<Card ref={ref}>Card with Ref</Card>)
			expect(ref.current).toBeInstanceOf(HTMLDivElement)
			expect(ref.current?.textContent).toBe("Card with Ref")
		})
		it("applies default styles", () => {
			const { container } = renderWithProviders(<Card>Default Card</Card>)
			const card = container.firstChild
			expect(card).toHaveClass("rounded-lg")
			expect(card).toHaveClass("border")
			expect(card).toHaveClass("bg-card")
			expect(card).toHaveClass("text-card-foreground")
			expect(card).toHaveClass("shadow-sm")
		})
	})
	// Test CardHeader component
	describe("CardHeader", () => {
		it("renders card header with children", () => {
			renderWithProviders(
				<Card>
					<CardHeader>Header Content</CardHeader>
				</Card>
			)
			expect(screen.getByText(/header content/i)).toBeInTheDocument()
		})
		it("applies default padding and spacing", () => {
			const { container } = renderWithProviders(
				<Card>
					<CardHeader>Header</CardHeader>
				</Card>
			)
			const header = container.querySelector(".p-4")
			expect(header).toHaveClass("p-4")
			expect(header).toHaveClass("flex")
			expect(header).toHaveClass("flex-col")
			expect(header).toHaveClass("space-y-1.5")
		})
		it("forwards ref to the header element", () => {
			const ref = { current: null }
			renderWithProviders(
				<Card>
					<CardHeader ref={ref}>Header with Ref</CardHeader>
				</Card>
			)
			expect(ref.current).toBeInstanceOf(HTMLDivElement)
			expect(ref.current?.textContent).toBe("Header with Ref")
		})
	})
	// Test CardTitle component
	describe("CardTitle", () => {
		it("renders card title with children", () => {
			renderWithProviders(
				<Card>
					<CardHeader>
						<CardTitle>Card Title</CardTitle>
					</CardHeader>
				</Card>
			)
			const title = screen.getByText(/card title/i)
			expect(title).toBeInTheDocument()
			expect(title.tagName).toBe("H3")
		})
		it("applies default typography styles", () => {
			const { container } = renderWithProviders(
				<Card>
					<CardHeader>
						<CardTitle>Title</CardTitle>
					</CardHeader>
				</Card>
			)
			const title = container.querySelector("h3")
			expect(title).toHaveClass("text-lg")
			expect(title).toHaveClass("font-semibold")
			expect(title).toHaveClass("leading-none")
			expect(title).toHaveClass("tracking-tight")
		})
		it("forwards ref to the title element", () => {
			const ref = { current: null }
			renderWithProviders(
				<Card>
					<CardHeader>
						<CardTitle ref={ref}>Title with Ref</CardTitle>
					</CardHeader>
				</Card>
			)
			expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
			expect(ref.current?.textContent).toBe("Title with Ref")
		})
	})
	// Test CardDescription component
	describe("CardDescription", () => {
		it("renders card description with children", () => {
			renderWithProviders(
				<Card>
					<CardHeader>
						<CardDescription>Card Description</CardDescription>
					</CardHeader>
				</Card>
			)
			const description = screen.getByText(/card description/i)
			expect(description).toBeInTheDocument()
			expect(description.tagName).toBe("P")
		})
		it("applies muted text styles", () => {
			const { container } = renderWithProviders(
				<Card>
					<CardHeader>
						<CardDescription>Description</CardDescription>
					</CardHeader>
				</Card>
			)
			const description = container.querySelector("p")
			expect(description).toHaveClass("text-sm")
			expect(description).toHaveClass("text-muted-foreground")
		})
		it("forwards ref to the description element", () => {
			const ref = { current: null }
			renderWithProviders(
				<Card>
					<CardHeader>
						<CardDescription ref={ref}>Description with Ref</CardDescription>
					</CardHeader>
				</Card>
			)
			expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
			expect(ref.current?.textContent).toBe("Description with Ref")
		})
	})
	// Test CardContent component
	describe("CardContent", () => {
		it("renders card content with children", () => {
			renderWithProviders(
				<Card>
					<CardContent>Card Content</CardContent>
				</Card>
			)
			expect(screen.getByText(/card content/i)).toBeInTheDocument()
		})
		it("applies default padding and removes top padding", () => {
			const { container } = renderWithProviders(
				<Card>
					<CardContent>Content</CardContent>
				</Card>
			)
			const content = container.querySelector(".p-4.pt-0")
			expect(content).toBeInTheDocument()
		})
		it("applies custom className", () => {
			const { container } = renderWithProviders(
				<Card>
					<CardContent className="custom-content">Content</CardContent>
				</Card>
			)
			const content = container.querySelector(".custom-content")
			expect(content).toBeInTheDocument()
			expect(content).toHaveClass("p-4")
			expect(content).toHaveClass("pt-0")
		})
		it("forwards ref to the content element", () => {
			const ref = { current: null }
			renderWithProviders(
				<Card>
					<CardContent ref={ref}>Content with Ref</CardContent>
				</Card>
			)
			expect(ref.current).toBeInstanceOf(HTMLDivElement)
			expect(ref.current?.textContent).toBe("Content with Ref")
		})
	})
	// Test CardFooter component
	describe("CardFooter", () => {
		it("renders card footer with children", () => {
			renderWithProviders(
				<Card>
					<CardFooter>Footer Content</CardFooter>
				</Card>
			)
			expect(screen.getByText(/footer content/i)).toBeInTheDocument()
		})
		it("applies default flex and padding styles", () => {
			const { container } = renderWithProviders(
				<Card>
					<CardFooter>Footer</CardFooter>
				</Card>
			)
			const footer = container.querySelector(".flex.items-center.p-4.pt-0")
			expect(footer).toBeInTheDocument()
		})
		it("applies custom className", () => {
			const { container } = renderWithProviders(
				<Card>
					<CardFooter className="custom-footer">Footer</CardFooter>
				</Card>
			)
			const footer = container.querySelector(".custom-footer")
			expect(footer).toBeInTheDocument()
			expect(footer).toHaveClass("flex")
			expect(footer).toHaveClass("items-center")
			expect(footer).toHaveClass("p-4")
			expect(footer).toHaveClass("pt-0")
		})
		it("forwards ref to the footer element", () => {
			const ref = { current: null }
			renderWithProviders(
				<Card>
					<CardFooter ref={ref}>Footer with Ref</CardFooter>
				</Card>
			)
			expect(ref.current).toBeInstanceOf(HTMLDivElement)
			expect(ref.current?.textContent).toBe("Footer with Ref")
		})
	})
	// Test integration of all card components
	describe("Integration", () => {
		it("renders a complete card with all components", () => {
			renderWithProviders(
				<Card data-testid="complete-card">
					<CardHeader>
						<CardTitle>Complete Card</CardTitle>
						<CardDescription>This is a complete card example</CardDescription>
					</CardHeader>
					<CardContent>
						<p>This is the main content of the card.</p>
					</CardContent>
					<CardFooter>
						<button>Action</button>
					</CardFooter>
				</Card>
			)
			const card = screen.getByTestId("complete-card")
			expect(card).toBeInTheDocument()
			expect(screen.getByText("Complete Card")).toBeInTheDocument()
			expect(screen.getByText("This is a complete card example")).toBeInTheDocument()
			expect(screen.getByText("This is the main content of the card.")).toBeInTheDocument()
			expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument()
		})
		it("handles click events on interactive elements", async () => {
			const user = userEvent.setup()
			const handleClick = vi.fn()
			renderWithProviders(
				<Card>
					<CardContent>
						<button onClick={handleClick}>Click Me</button>
					</CardContent>
				</Card>
			)
			const button = screen.getByRole("button", { name: "Click Me" })
			await user.click(button)
			expect(handleClick).toHaveBeenCalledTimes(1)
		})
	})
})
