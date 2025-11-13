/**
 * Text sanitization utilities
 */

// Remove control chars except tab/newline; trim and collapse whitespace
// Also remove potential XSS vectors
export function sanitizeText(input: string): string {
	// Remove control chars (null-backspace, vertical tab, form feed, shift out-unit separator, delete)
	// using character class with hex escapes to avoid Biome control character lint warnings
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional sanitization of control characters
	const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
	return input
		.replace(controlChars, " ")
		.replace(/\s{2,}/g, " ")
		.replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
		.replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframes
		.replace(/on\w+\s*=/gi, "") // Remove event handlers
		.replace(/javascript:/gi, "") // Remove javascript: protocol
		.trim();
}
