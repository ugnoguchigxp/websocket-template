type OidcEnv = {
	authorizationEndpoint: string;
	clientId: string;
	redirectUri: string;
	scope: string;
	audience?: string;
	endSessionEndpoint?: string;
	postLogoutRedirectUri?: string;
};

function getEnv(key: string): string {
	return import.meta.env[key] || "";
}

const scopeDefault = "openid profile email";

export const oidcConfig: OidcEnv = {
	authorizationEndpoint: getEnv("VITE_OIDC_AUTHORIZATION_URL"),
	clientId: getEnv("VITE_OIDC_CLIENT_ID"),
	redirectUri: getEnv("VITE_OIDC_REDIRECT_URI"),
	scope: getEnv("VITE_OIDC_SCOPE") || scopeDefault,
	audience: getEnv("VITE_OIDC_AUDIENCE") || undefined,
	endSessionEndpoint: getEnv("VITE_OIDC_END_SESSION_URL") || undefined,
	postLogoutRedirectUri: getEnv("VITE_OIDC_POST_LOGOUT_REDIRECT_URI") || undefined,
};

export type OidcConfig = typeof oidcConfig;
