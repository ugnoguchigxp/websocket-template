import { createContextLogger } from "@logger";

const log = createContextLogger("authClient");

export type AuthUserResponse = {
	id: number;
	username: string;
	role: string;
	email: string | null;
	displayName: string | null;
	sub: string;
	preferredUsername: string | null;
	name: string | null;
	roles: string[];
};

export type ExchangeResponse = {
	accessToken: string;
	accessTokenExpiresAt: string;
	scope?: string | null;
	user?: AuthUserResponse;
};

async function parseJson<T>(response: Response): Promise<T> {
	const text = await response.text();
	try {
		return JSON.parse(text) as T;
	} catch (error) {
		log.error("Failed to parse JSON response", {
			status: response.status,
			body: text,
			error: error instanceof Error ? error.message : String(error),
		});
		throw new Error("Invalid response from server");
	}
}

export async function loginWithPassword(params: {
	username: string;
	password: string;
}): Promise<ExchangeResponse> {
	const response = await fetch("/auth/login", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			username: params.username,
			password: params.password,
		}),
	});

	if (!response.ok) {
		const details = await response.text();
		log.warn("Login failed", {
			status: response.status,
			body: details,
		});
		throw new Error("Invalid credentials");
	}

	return parseJson<ExchangeResponse>(response);
}

export async function exchangeAuthorizationCode(params: {
	code: string;
	codeVerifier: string;
	state?: string | null;
	redirectUri: string;
}): Promise<ExchangeResponse> {
	const response = await fetch("/auth/exchange", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			code: params.code,
			codeVerifier: params.codeVerifier,
			state: params.state,
			redirectUri: params.redirectUri,
		}),
	});

	if (!response.ok) {
		const details = await response.text();
		log.warn("Authorization code exchange failed", {
			status: response.status,
			body: details,
		});
		throw new Error("Failed to exchange authorization code");
	}

	return parseJson<ExchangeResponse>(response);
}

export async function refreshAccessToken(): Promise<ExchangeResponse> {
	const response = await fetch("/auth/refresh", {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		const details = await response.text();
		log.warn("Access token refresh failed", { status: response.status, body: details });
		throw new Error("Failed to refresh access token");
	}

	return parseJson<ExchangeResponse>(response);
}

export async function logoutFromServer(): Promise<void> {
	const response = await fetch("/auth/logout", {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok && response.status !== 204) {
		const body = await response.text().catch(() => "");
		log.warn("Server logout returned non-success status", {
			status: response.status,
			body,
		});
		throw new Error("Failed to log out");
	}
}
