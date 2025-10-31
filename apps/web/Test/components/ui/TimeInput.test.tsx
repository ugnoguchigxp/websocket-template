import { beforeEach, describe, expect, it, vi } from "vitest"
import { TimeInput } from "../../../src/components/ui/TimeInput"
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
	}: any) =>
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
				<button onClick={() => onNumberClick("0")}>0</button>
				<button onClick={() => onBackspace()}>←</button>
				<button onClick={() => onClear()}>クリア</button>
				<button onClick={() => onConfirm()}>確定</button>
				<button onClick={onClose}>キャンセル</button>
			</div>
		) : null,
}))

describe("TimeInput Component", () => {
	const defaultProps = {
		value: "",
		onChange: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	// Basic rendering tests
	it("renders with default props", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		expect(screen.getByPlaceholderText("タップして入力")).toBeInTheDocument()
	})

	it("renders with custom placeholder", () => {
		renderWithProviders(<TimeInput {...defaultProps} placeholder="Select time" />)

		expect(screen.getByPlaceholderText("Select time")).toBeInTheDocument()
	})

	it("displays current time value", () => {
		renderWithProviders(<TimeInput {...defaultProps} value="12:34" />)

		expect(screen.getByDisplayValue("12:34")).toBeInTheDocument()
	})

	// Input interaction tests
	it("opens keypad when input is clicked", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		expect(screen.getByTestId("keypad-modal")).toBeInTheDocument()
		expect(screen.getByText("時刻を入力")).toBeInTheDocument()
	})

	// Time input tests
	it("opens keypad for time input", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		// Open keypad
		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		// Should show keypad with time title
		expect(screen.getByTestId("keypad-modal")).toBeInTheDocument()
		expect(screen.getByText("時刻を入力")).toBeInTheDocument()
	})

	// Close functionality tests
	it("closes keypad when cancel is clicked", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

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
		renderWithProviders(<TimeInput {...defaultProps} disabled={true} />)

		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		expect(screen.queryByTestId("keypad-modal")).not.toBeInTheDocument()
	})

	it("applies disabled styles", () => {
		renderWithProviders(<TimeInput {...defaultProps} disabled={true} />)

		const input = screen.getByPlaceholderText("タップして入力")
		expect(input).toBeDisabled()
	})

	// Accessibility tests
	it("has proper accessibility attributes", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		const input = screen.getByPlaceholderText("タップして入力")
		expect(input).toHaveAttribute("type", "text")
		expect(input).toHaveAttribute("readOnly")
	})

	// Component existence test
	it("component is properly defined", () => {
		expect(TimeInput).toBeDefined()
	})

	// Edge cases tests
	it("handles empty value", () => {
		renderWithProviders(<TimeInput {...defaultProps} value="" />)

		expect(screen.getByPlaceholderText("タップして入力")).toBeInTheDocument()
	})

	// Time validation tests
	it("limits input to 4 digits", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		// Input 5 digits - should format as time after 4 digits
		fireEvent.click(screen.getByText("1"))
		fireEvent.click(screen.getByText("2"))
		fireEvent.click(screen.getByText("3"))
		fireEvent.click(screen.getByText("4"))
		fireEvent.click(screen.getByText("5"))

		const display = screen.getByTestId("display-content")
		expect(display.textContent).toBe("12:34")
	})

	it("validates time format - requires 4 digits", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		// Input only 3 digits
		fireEvent.click(screen.getByText("1"))
		fireEvent.click(screen.getByText("2"))
		fireEvent.click(screen.getByText("3"))
		fireEvent.click(screen.getByText("確定"))

		// Should not call onChange with invalid format
		expect(defaultProps.onChange).not.toHaveBeenCalled()
	})

	it("validates hour range - rejects invalid hours", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		// Input invalid hour (25)
		fireEvent.click(screen.getByText("2"))
		fireEvent.click(screen.getByText("5"))
		fireEvent.click(screen.getByText("0"))
		fireEvent.click(screen.getByText("0"))
		fireEvent.click(screen.getByText("確定"))

		// Should not call onChange with invalid hour
		expect(defaultProps.onChange).not.toHaveBeenCalled()
	})

	it("validates minute range - rejects invalid minutes", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		// Input invalid minutes (65)
		fireEvent.click(screen.getByText("1"))
		fireEvent.click(screen.getByText("2"))
		fireEvent.click(screen.getByText("6"))
		fireEvent.click(screen.getByText("5"))
		fireEvent.click(screen.getByText("確定"))

		// Should not call onChange with invalid minutes
		expect(defaultProps.onChange).not.toHaveBeenCalled()
	})

	it("handles backspace functionality", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		// Input some digits
		fireEvent.click(screen.getByText("1"))
		fireEvent.click(screen.getByText("2"))

		// Press backspace
		fireEvent.click(screen.getByText("←"))

		const display = screen.getByTestId("display-content")
		expect(display.textContent).toBe("1")
	})

	it("handles clear functionality", () => {
		renderWithProviders(<TimeInput {...defaultProps} />)

		const input = screen.getByPlaceholderText("タップして入力")
		fireEvent.click(input)

		// Input some digits
		fireEvent.click(screen.getByText("1"))
		fireEvent.click(screen.getByText("2"))

		// Press clear
		fireEvent.click(screen.getByText("クリア"))

		const display = screen.getByTestId("display-content")
		expect(display.textContent).toBe("--:--")
	})
})
