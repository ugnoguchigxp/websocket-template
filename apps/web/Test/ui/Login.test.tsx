import { beforeEach, describe, expect, it, vi } from "vitest"
import { Login } from "../../src/ui/Login"
import { renderWithProviders, screen, userEvent } from "../test-utils"

describe("Login Component", () => {
	const mockOnLogin = vi.fn()

	beforeEach(() => {
		mockOnLogin.mockReset()
	})

	it("renders sign-in card with button", () => {
		renderWithProviders(<Login onLogin={mockOnLogin} />)
		expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument()
		expect(
			screen.getByText(/you will be redirected to the identity provider/i),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /continue with single sign-on/i })).toBeInTheDocument()
	})

	it("calls onLogin when button is clicked", async () => {
		const user = userEvent.setup()
		renderWithProviders(<Login onLogin={mockOnLogin} />)
		const button = screen.getByRole("button", { name: /continue with single sign-on/i })
		await user.click(button)
		expect(mockOnLogin).toHaveBeenCalledTimes(1)
	})

	it("disables button when processing", async () => {
		const user = userEvent.setup()
		renderWithProviders(<Login onLogin={mockOnLogin} isProcessing />)
		const button = screen.getByRole("button", { name: /redirecting/i })
		expect(button).toBeDisabled()
		await user.click(button)
		expect(mockOnLogin).not.toHaveBeenCalled()
	})

	it("displays error message when provided", () => {
		renderWithProviders(<Login onLogin={mockOnLogin} errorMessage="Something went wrong" />)
		expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
	})
})
