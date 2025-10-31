import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../../src/components/ui/Select"
import { renderWithProviders, screen } from "../../test-utils"
// Setup Radix mocks
import { setupRadixMocks } from "../../test-utils/radix-mocks"
beforeEach(() => {
	setupRadixMocks()
	vi.clearAllMocks()
})
describe("Select Component", () => {
	const defaultProps = {
		value: "option1",
		onValueChange: vi.fn(),
		options: [
			{ value: "option1", label: "Option 1" },
			{ value: "option2", label: "Option 2" },
			{ value: "option3", label: "Option 3" },
		],
	}
	// Basic rendering tests
	it("renders select with default props", () => {
		renderWithProviders(
			<Select {...defaultProps}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{defaultProps.options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
		expect(screen.getByRole("combobox")).toBeInTheDocument()
	})
	it("displays current value", () => {
		renderWithProviders(
			<Select {...defaultProps}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{defaultProps.options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
		expect(screen.getByText("Option 1")).toBeInTheDocument()
	})
	// Custom props tests
	it("applies custom className to trigger", () => {
		renderWithProviders(
			<Select {...defaultProps}>
				<SelectTrigger className="custom-class">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{defaultProps.options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
		const trigger = screen.getByRole("combobox")
		expect(trigger).toHaveClass("custom-class")
	})
	it("applies custom id to trigger", () => {
		renderWithProviders(
			<Select {...defaultProps}>
				<SelectTrigger id="custom-id">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{defaultProps.options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
		const trigger = screen.getByRole("combobox")
		expect(trigger).toHaveAttribute("id", "custom-id")
	})
	// Accessibility tests
	it("has proper accessibility attributes", () => {
		renderWithProviders(
			<Select {...defaultProps}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{defaultProps.options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
		const trigger = screen.getByRole("combobox")
		expect(trigger).toHaveAttribute("aria-controls")
		expect(trigger).toHaveAttribute("aria-expanded", "false")
	})
	// Edge cases
	it("handles empty options array", () => {
		renderWithProviders(
			<Select {...defaultProps} options={[]}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent />
			</Select>
		)
		expect(screen.getByRole("combobox")).toBeInTheDocument()
	})
	it("handles null value", () => {
		renderWithProviders(
			<Select {...defaultProps} value={null}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{defaultProps.options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
		expect(screen.getByRole("combobox")).toBeInTheDocument()
	})
	// Component structure tests
	it("renders all subcomponents correctly", () => {
		renderWithProviders(
			<Select {...defaultProps}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{defaultProps.options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
		// Check that trigger exists
		expect(screen.getByRole("combobox")).toBeInTheDocument()
		// Check that current value is displayed
		expect(screen.getByText("Option 1")).toBeInTheDocument()
	})
	// Display names for debugging
	it("has correct display names for components", () => {
		expect(Select.displayName).toBe("Select")
		expect(SelectContent.displayName).toBe("SelectContent")
		expect(SelectItem.displayName).toBe("SelectItem")
		expect(SelectTrigger.displayName).toBe("SelectTrigger")
		expect(SelectValue.displayName).toBe("SelectValue")
	})
})
