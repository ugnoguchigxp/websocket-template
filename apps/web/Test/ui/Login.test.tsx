import { beforeEach, describe, expect, it, vi } from "vitest"
import { Login } from "../../src/ui/Login"
import { renderWithProviders, screen, userEvent, waitFor } from "../test-utils"

// Mock tRPC client
vi.mock("../../src/client", () => ({
	createUnauthedTrpcClient: vi.fn(() => ({
		client: {
			auth: {
				login: {
					mutate: vi.fn(),
				},
			},
		},
		close: vi.fn(),
	})),
}))

describe("Login Component", () => {
	const mockOnLoggedIn = vi.fn()

	beforeEach(() => {
		mockOnLoggedIn.mockClear()
	})

	it("renders login form with username and password fields", () => {
		renderWithProviders(<Login onLoggedIn={mockOnLoggedIn as typeof mockOnLoggedInType} />)
		expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument()
		expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
	})

	it("has default values for demo user", () => {
		renderWithProviders(<Login onLoggedIn={mockOnLoggedIn as typeof mockOnLoggedInType} />)
		const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement
		const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
		expect(usernameInput.value).toBe("demo")
		expect(passwordInput.value).toBe("demo1234")
	})

	it("allows user to change username and password", async () => {
		const user = userEvent.setup()
		renderWithProviders(<Login onLoggedIn={mockOnLoggedIn as typeof mockOnLoggedInType} />)
		const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement
		const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
		await user.clear(usernameInput)
		await user.type(usernameInput, "testuser")
		expect(usernameInput).toHaveValue("testuser")
		await user.clear(passwordInput)
		await user.type(passwordInput, "testpass123")
		expect(passwordInput).toHaveValue("testpass123")
	})

	it("shows loading state when submitting", async () => {
		const { createUnauthedTrpcClient } = await import("../../src/client")
		const mockMutate = vi.fn(() => new Promise(() => {})) // Never resolves
		;(createUnauthedTrpcClient as ReturnType<typeof vi.fn>).mockReturnValue({
			client: {
				auth: {
					login: {
						mutate: mockMutate,
					},
				},
			},
			close: vi.fn(),
		})
		const user = userEvent.setup()
		renderWithProviders(<Login onLoggedIn={mockOnLoggedIn as typeof mockOnLoggedInType} />)
		const submitButton = screen.getByRole("button", { name: /sign in/i })
		await user.click(submitButton)
		await waitFor(() => {
			expect(screen.getByText(/signing in/i)).toBeInTheDocument()
		})
	})

	it("calls onLoggedIn with token on successful login", async () => {
		const { createUnauthedTrpcClient } = await import("../../src/client")
		const mockToken = "mock-jwt-token"
		const mockMutate = vi.fn().mockResolvedValue({ token: mockToken })
		const mockClose = vi.fn()
		;(createUnauthedTrpcClient as ReturnType<typeof vi.fn>).mockReturnValue({
			client: {
				auth: {
					login: {
						mutate: mockMutate,
					},
				},
			},
			close: mockClose,
		})
		const user = userEvent.setup()
		renderWithProviders(<Login onLoggedIn={mockOnLoggedIn as typeof mockOnLoggedInType} />)
		const submitButton = screen.getByRole("button", { name: /sign in/i })
		await user.click(submitButton)
		await waitFor(() => {
			expect(mockOnLoggedIn).toHaveBeenCalledWith(mockToken)
			expect(mockClose).toHaveBeenCalled()
		})
	})

	it("displays error message on login failure", async () => {
		const { createUnauthedTrpcClient } = await import("../../src/client")
		const mockMutate = vi.fn().mockRejectedValue(new Error("Invalid credentials"))
		const mockClose = vi.fn()
		;(createUnauthedTrpcClient as ReturnType<typeof vi.fn>).mockReturnValue({
			client: {
				auth: {
					login: {
						mutate: mockMutate,
					},
				},
			},
			close: mockClose,
		})
		const user = userEvent.setup()
		renderWithProviders(<Login onLoggedIn={mockOnLoggedIn as typeof mockOnLoggedInType} />)
		const submitButton = screen.getByRole("button", { name: /sign in/i })
		await user.click(submitButton)
		await waitFor(() => {
			expect(screen.getByText(/login failed/i)).toBeInTheDocument()
			expect(mockClose).toHaveBeenCalled()
			expect(mockOnLoggedIn).not.toHaveBeenCalled()
		})
	})

	it("password field has type password", () => {
		renderWithProviders(<Login onLoggedIn={mockOnLoggedIn as typeof mockOnLoggedInType} />)
		const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
		expect(passwordInput.type).toBe("password")
	})

	it("has autocomplete attributes for accessibility", () => {
		renderWithProviders(<Login onLoggedIn={mockOnLoggedIn as typeof mockOnLoggedInType} />)
		const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement
		const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
		expect(usernameInput).toHaveAttribute("autocomplete", "username")
		expect(passwordInput).toHaveAttribute("autocomplete", "current-password")
	})
})
