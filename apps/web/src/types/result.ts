/**
 * Result type for error handling
 */

export type Result<T, E = Error> =
	| { ok: true; value: T; success: true }
	| { ok: false; error: E; success: false }

export const Ok = <T>(value: T): Result<T, never> => ({
	ok: true,
	value,
	success: true,
})

export const Err = <E>(error: E): Result<never, E> => ({
	ok: false,
	error,
	success: false,
})

// Result utility class with static methods
export class Result {
	/**
	 * Wrap a function that might throw into a Result
	 */
	static fromThrowable<T>(
		fn: () => T
	): { success: true; value: T } | { success: false; error: Error } {
		try {
			const value = fn()
			return { success: true, value }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			}
		}
	}

	/**
	 * Wrap an async function that might throw into a Result
	 */
	static async fromThrowableAsync<T>(
		fn: () => Promise<T>
	): Promise<{ success: true; value: T } | { success: false; error: Error }> {
		try {
			const value = await fn()
			return { success: true, value }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			}
		}
	}
}
