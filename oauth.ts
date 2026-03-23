import type {
	Api,
	Model,
	OAuthCredentials,
	OAuthLoginCallbacks,
	OAuthPrompt,
	OAuthProviderInterface,
} from "@mariozechner/pi-ai";
import { GIGACHAT_DEFAULT_BASE_URL } from "./models.js";
import {
	createPasswordClient,
	createTokenClient,
	GIGACHAT_DEFAULT_AUTH_MODE,
	type GigaChatAccountType,
	type GigaChatScope,
	type GigaChatStoredCredentials,
	getDefaultScope,
	normalizeAccountType,
	normalizeAuthMode,
	normalizeAuthorizationKey,
	normalizeBaseUrl,
	normalizeBaseUrlChoice,
	normalizePassword,
	normalizeScope,
	normalizeStoredBaseUrl,
	normalizeUser,
	parseExpiresAt,
	withCertificateHint,
} from "./shared.js";

async function requestAccessToken(
	authorizationKey: string,
	scope: GigaChatScope,
	options?: {
		baseUrl?: string;
		signal?: AbortSignal;
	},
): Promise<GigaChatStoredCredentials> {
	if (options?.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const normalizedAuthorizationKey =
		normalizeAuthorizationKey(authorizationKey);
	const normalizedBaseUrl = normalizeBaseUrl(
		options?.baseUrl ?? "",
		GIGACHAT_DEFAULT_BASE_URL,
	);
	const client = createTokenClient(
		normalizedAuthorizationKey,
		scope,
		normalizedBaseUrl,
	);

	try {
		await client.updateTokenQuietly();
	} catch (error) {
		if (options?.signal?.aborted) {
			throw new Error("Login cancelled");
		}
		throw withCertificateHint(error);
	}

	if (options?.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const data = client.accessTokenData;
	if (
		!data ||
		typeof data.access_token !== "string" ||
		data.access_token.length === 0
	) {
		throw new Error("Invalid GigaChat token response: missing access_token");
	}

	return {
		access: data.access_token,
		refresh: normalizedAuthorizationKey,
		expires: parseExpiresAt(data.expires_at),
		authMode: "token",
		authorizationKey: normalizedAuthorizationKey,
		scope,
		baseUrl: normalizedBaseUrl,
	};
}

async function requestBasicAccessToken(
	user: string,
	password: string,
	options: {
		accountType: GigaChatAccountType;
		baseUrl?: string;
		scope?: GigaChatScope;
		signal?: AbortSignal;
	},
): Promise<GigaChatStoredCredentials> {
	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const normalizedUser = normalizeUser(user);
	const normalizedPassword = normalizePassword(password);
	const normalizedBaseUrl = normalizeBaseUrl(
		options.baseUrl ?? "",
		GIGACHAT_DEFAULT_BASE_URL,
	);
	const client = createPasswordClient(
		normalizedUser,
		normalizedPassword,
		normalizedBaseUrl,
	);

	try {
		await client.updateTokenQuietly();
	} catch (error) {
		if (options.signal?.aborted) {
			throw new Error("Login cancelled");
		}
		throw withCertificateHint(error);
	}

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const data = client.accessTokenData;
	if (
		!data ||
		typeof data.access_token !== "string" ||
		data.access_token.length === 0
	) {
		throw new Error("Invalid GigaChat token response: missing access_token");
	}

	return {
		access: data.access_token,
		refresh: "",
		expires: parseExpiresAt(data.expires_at),
		authMode: "basic",
		accountType: options.accountType,
		scope: normalizeScope(
			options.scope ?? "",
			getDefaultScope(options.accountType),
		),
		baseUrl: normalizedBaseUrl,
		user: normalizedUser,
		password: normalizedPassword,
	};
}

async function loginGigaChat(options: {
	onPrompt: (prompt: OAuthPrompt) => Promise<string>;
	onProgress?: (message: string) => void;
	signal?: AbortSignal;
}): Promise<GigaChatStoredCredentials> {
	const rawAccountType = await options.onPrompt({
		message: "GigaChat account type (personal/business)",
		placeholder: "personal",
		allowEmpty: true,
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const rawAuthMode = await options.onPrompt({
		message: "GigaChat auth mode (basic/token)",
		placeholder: GIGACHAT_DEFAULT_AUTH_MODE,
		allowEmpty: true,
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const accountType = normalizeAccountType(rawAccountType);
	const authMode = normalizeAuthMode(rawAuthMode);
	const defaultScope = getDefaultScope(accountType);

	const rawScope = await options.onPrompt({
		message:
			"GigaChat scope (GIGACHAT_API_PERS/GIGACHAT_API_B2B/GIGACHAT_API_CORP)",
		placeholder: defaultScope,
		allowEmpty: true,
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const scope = normalizeScope(rawScope, defaultScope);
	const rawBaseUrlChoice = await options.onPrompt({
		message: "GigaChat base URL (press enter for default, or type custom)",
		placeholder: GIGACHAT_DEFAULT_BASE_URL,
		allowEmpty: true,
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const baseUrlChoice = normalizeBaseUrlChoice(rawBaseUrlChoice);
	let baseUrl = normalizeBaseUrl(rawBaseUrlChoice, GIGACHAT_DEFAULT_BASE_URL);
	if (
		baseUrlChoice === "custom" &&
		!/^https?:\/\//i.test(rawBaseUrlChoice.trim())
	) {
		const rawBaseUrl = await options.onPrompt({
			message: "Custom GigaChat base URL",
			placeholder: GIGACHAT_DEFAULT_BASE_URL,
			allowEmpty: true,
		});

		if (options.signal?.aborted) {
			throw new Error("Login cancelled");
		}

		baseUrl = normalizeBaseUrl(rawBaseUrl, GIGACHAT_DEFAULT_BASE_URL);
	}

	if (authMode === "basic") {
		const rawUser = await options.onPrompt({
			message: "GigaChat username",
			placeholder: "username",
		});

		if (options.signal?.aborted) {
			throw new Error("Login cancelled");
		}

		const rawPassword = await options.onPrompt({
			message: "GigaChat password",
			placeholder: "password",
		});

		if (options.signal?.aborted) {
			throw new Error("Login cancelled");
		}

		options.onProgress?.("Requesting GigaChat access token...");
		return requestBasicAccessToken(rawUser, rawPassword, {
			accountType,
			baseUrl,
			scope,
			signal: options.signal,
		});
	}

	const rawTokenCredentials = await options.onPrompt({
		message: "GigaChat token credentials",
		placeholder: "Basic <authorization_key>",
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	options.onProgress?.("Requesting GigaChat access token...");
	const credentials = await requestAccessToken(rawTokenCredentials, scope, {
		baseUrl,
		signal: options.signal,
	});
	return {
		...credentials,
		accountType,
	};
}

export const gigachatOAuthProvider: Omit<OAuthProviderInterface, "id"> = {
	name: "GigaChat",

	async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
		return loginGigaChat({
			onPrompt: callbacks.onPrompt,
			onProgress: callbacks.onProgress,
			signal: callbacks.signal,
		});
	},

	async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
		const gigachatCredentials = credentials as GigaChatStoredCredentials;

		if (
			gigachatCredentials.authMode === "basic" ||
			(gigachatCredentials.user && gigachatCredentials.password)
		) {
			if (!gigachatCredentials.user || !gigachatCredentials.password) {
				throw new Error("GigaChat credentials missing username or password");
			}

			const accountType =
				gigachatCredentials.accountType === "business"
					? "business"
					: "personal";
			return requestBasicAccessToken(
				gigachatCredentials.user,
				gigachatCredentials.password,
				{
					accountType,
					baseUrl: gigachatCredentials.baseUrl,
					scope:
						typeof gigachatCredentials.scope === "string"
							? normalizeScope(
									gigachatCredentials.scope,
									getDefaultScope(accountType),
								)
							: undefined,
				},
			);
		}

		const authorizationKey =
			typeof gigachatCredentials.authorizationKey === "string" &&
			gigachatCredentials.authorizationKey.length > 0
				? gigachatCredentials.authorizationKey
				: gigachatCredentials.refresh;

		if (typeof authorizationKey !== "string" || authorizationKey.length === 0) {
			throw new Error(
				"GigaChat token login is missing the original credentials key and cannot be refreshed automatically. Run /login gigachat again.",
			);
		}

		const scope = normalizeScope(
			typeof gigachatCredentials.scope === "string"
				? gigachatCredentials.scope
				: getDefaultScope("personal"),
		);

		return requestAccessToken(authorizationKey, scope, {
			baseUrl: gigachatCredentials.baseUrl,
		});
	},

	getApiKey(credentials: OAuthCredentials): string {
		return credentials.access;
	},

	modifyModels(
		models: Model<Api>[],
		credentials: OAuthCredentials,
	): Model<Api>[] {
		const baseUrl = normalizeStoredBaseUrl(
			(credentials as GigaChatStoredCredentials).baseUrl,
		);
		if (!baseUrl) {
			return models;
		}

		return models.map((model) =>
			model.provider === "gigachat" ? { ...model, baseUrl } : model,
		);
	},
};
