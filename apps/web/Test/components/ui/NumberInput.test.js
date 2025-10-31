import { beforeEach, describe, expect, it, vi } from "vitest"
import { NumberInput } from "../../../src/components/ui/NumberInput"
import { fireEvent, renderWithProviders, screen } from "../../test-utils"
// Mock KeypadModal
vi.mock("../../../src/components/ui/KeypadModal", () => ({
	KeypadModal: ({
		open,
		onClose,
		onNumberClick,
		onBackspace,
		onClear,
		onConfirm,
		displayContent,
		title,
		additionalButton,
	}) =>
		open ? (
			<div data-testid="keypad-modal">
				<h2>{title}</h2>
				<div data-testid="display-content">{displayContent}</div>
				<button onClick={() => onNumberClick("1")}>1</button>
				<button onClick={() => onNumberClick("2")}>2</button>
				<button onClick={() => onNumberClick("3")}>3</button>
				<button onClick={() => onNumberClick("4")}>4</button>
				<button onClick={() => onNumberClick("5")}>5</button>
				<button onClick={() => onNumberClick("6")}>6</button>
				<button onClick={() => onNumberClick("7")}>7</button>
				<button onClick={() => onNumberClick("8")}>8</button>
				<button onClick={() => onNumberClick("9")}>9</button>
				<button onClick={() => onNumberClick("0")}>0</button>
				<button onClick={() => onBackspace()}>←</button>
				<button onClick={() => onClear()}>クリア</button>
				<button onClick={() => onConfirm()}>確定</button>
				<button onClick={onClose}>キャンセル</button>
				{additionalButton}
			</div>
		) : null,
}))
describe("NumberInput Component", () => {
	const defaultProps = {
		value: null,
		onChange: vi.fn(),
	}
	beforeEach(() => {
		vi.clearAllMocks()
	})
	// Basic rendering tests
	it("renders with default props", () => {
		renderWithProviders(<NumberInput {...defaultProps} />)
		expect(screen.getByPlaceholderText("タップして入力")).toBeInTheDocument()
	})
	it("renders with custom placeholder", () => {
		renderWithProviders(<NumberInput {...defaultProps} placeholder="Enter number" />)
		expect(screen.getByPlaceholderText("Enter number")).toBeInTheDocument()
	})
	it("displays current value", () => {
		renderWithProviders(<NumberInput {...defaultProps} value={123} />)
		expect(screen.getByDisplayValue("123")).toBeInTheDocument()
	})
	it("displays zero value", () => {
		renderWithProviders(<NumberInput {...defaultProps} value={0} />)
		expect(screen.getByDisplayValue("0")).toBeInTheDocument()
	})
	// Input interaction tests
	it("opens keypad when input is clicked", () => {
		renderWithProviders(<NumberInput {...defaultProps} />)
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)
		expect(screen.getByTestId("keypad-modal")).toBeInTheDocument()
	})
	// Keypad interaction tests
	it("handles number input from keypad", () => {
		renderWithProviders(<NumberInput {...defaultProps} />)
		// Open keypad
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)
		// Click number buttons
		fireEvent.click(screen.getByText("1"))
		fireEvent.click(screen.getByText("2"))
		// Confirm
		fireEvent.click(screen.getByText("確定"))
		expect(defaultProps.onChange).toHaveBeenCalledWith(12)
	})
	// Close functionality tests
	it("closes keypad when cancel is clicked", () => {
		renderWithProviders(<NumberInput {...defaultProps} />)
		// Open keypad
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)
		expect(screen.getByTestId("keypad-modal")).toBeInTheDocument()
		// Click cancel
		fireEvent.click(screen.getByText("キャンセル"))
		expect(screen.queryByTestId("keypad-modal")).not.toBeInTheDocument()
	})
	// Disabled state tests
	it("does not open keypad when disabled", () => {
		renderWithProviders(<NumberInput {...defaultProps} disabled={true} />)
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)
		expect(screen.queryByTestId("keypad-modal")).not.toBeInTheDocument()
	})
	it("applies disabled styles", () => {
		renderWithProviders(<NumberInput {...defaultProps} disabled={true} />)
		const input = screen.getByPlaceholderText("タップして入力")
		expect(input).toBeDisabled()
	})
	// Accessibility tests
	it("has proper accessibility attributes", () => {
		renderWithProviders(<NumberInput {...defaultProps} />)
		const input = screen.getByPlaceholderText("タップして入力")
		expect(input).toHaveAttribute("type", "text")
		expect(input).toHaveAttribute("readOnly")
	})
	// Component existence test
	it("component is properly defined", () => {
		expect(NumberInput).toBeDefined()
	})
	// Edge cases tests
	it("handles null value", () => {
		renderWithProviders(<NumberInput {...defaultProps} value={null} />)
		expect(screen.getByPlaceholderText("タップして入力")).toBeInTheDocument()
	})
	// Validation tests
	it("validates min value", () => {
		renderWithProviders(<NumberInput {...defaultProps} min={10} />)
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)
		// Input value below min
		fireEvent.click(screen.getByText("5"))
		fireEvent.click(screen.getByText("確定"))
		// Should not call onChange with invalid value
		expect(defaultProps.onChange).not.toHaveBeenCalled()
	})
	it("validates max value", () => {
		renderWithProviders(<NumberInput {...defaultProps} max={100} />)
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)
		// Input value above max
		fireEvent.click(screen.getByText("1"))
		fireEvent.click(screen.getByText("5"))
		fireEvent.click(screen.getByText("0"))
		fireEvent.click(screen.getByText("確定"))
		// Should not call onChange with invalid value
		expect(defaultProps.onChange).not.toHaveBeenCalled()
	})
	it("shows decimal button when allowDecimal is true", () => {
		renderWithProviders(<NumberInput {...defaultProps} allowDecimal={true} />)
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)
		// Should show decimal button in keypad
		expect(screen.getByText(".")).toBeInTheDocument()
	})
	it("handles decimal input", () => {
		renderWithProviders(<NumberInput {...defaultProps} allowDecimal={true} />)
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)
		// Input decimal number
		fireEvent.click(screen.getByText("1"))
		fireEvent.click(screen.getByText("2"))
		fireEvent.click(screen.getByText("."))
		fireEvent.click(screen.getByText("5"))
		fireEvent.click(screen.getByText("確定"))
		expect(defaultProps.onChange).toHaveBeenCalled()
	})
})
