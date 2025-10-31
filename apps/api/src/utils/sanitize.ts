/**
 * Text sanitization utilities
 */

// Remove control chars except tab/newline; trim and collapse whitespace
// Also remove potential XSS vectors
export function sanitizeText(input: string): string {
	return input
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
		.replace(/\s{2,}/g, " ")
		.replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
		.replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframes
		.replace(/on\w+\s*=/gi, "") // Remove event handlers
		.replace(/javascript:/gi, "") // Remove javascript: protocol
		.trim();
}
