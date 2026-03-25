import type { OAuthCredentials } from "@mariozechner/pi-ai";
import GigaChat, { type GigaChatClientConfig } from "gigachat";
import type {
	ChatCompletionChunk,
	Chat as GigaChatChat,
} from "gigachat/interfaces";
import { GIGACHAT_DEFAULT_BASE_URL } from "./models.js";

export const GIGACHAT_CERTIFICATES_URL =
	"https://developers.sber.ru/docs/ru/gigachat/certificates";
export const GIGACHAT_VALID_SCOPES = [
	"GIGACHAT_API_PERS",
	"GIGACHAT_API_B2B",
	"GIGACHAT_API_CORP",
] as const;
export const GIGACHAT_DEFAULT_SCOPE = "GIGACHAT_API_PERS";
export const GIGACHAT_DEFAULT_BUSINESS_SCOPE = "GIGACHAT_API_B2B";
export const GIGACHAT_DEFAULT_AUTH_MODE = "basic";
export const GIGACHAT_EXPIRY_BUFFER_MS = 60 * 1000;
const EVENT_STREAM_CONTENT_TYPE = "text/event-stream";

export type GigaChatScope = (typeof GIGACHAT_VALID_SCOPES)[number];
export type GigaChatAuthMode = "basic" | "token";
export type GigaChatAccountType = "personal" | "business";
export type GigaChatBaseUrlChoice = "default" | "custom";

export type GigaChatStoredCredentials = OAuthCredentials & {
	authMode?: GigaChatAuthMode;
	accountType?: GigaChatAccountType;
	authorizationKey?: string;
	scope?: GigaChatScope;
	baseUrl?: string;
	user?: string;
	password?: string;
};

export function normalizeAuthorizationKey(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new Error("GigaChat authorization key is required");
	}
	return trimmed.replace(/^Basic\s+/i, "");
}

export function normalizeUser(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new Error("GigaChat username is required");
	}
	return trimmed;
}

export function normalizePassword(input: string): string {
	if (!input.trim()) {
		throw new Error("GigaChat password is required");
	}
	return input;
}

export function normalizeScope(
	input: string,
	fallbackScope: GigaChatScope = GIGACHAT_DEFAULT_SCOPE,
): GigaChatScope {
	const trimmed = input.trim();
	if (!trimmed) {
		return fallbackScope;
	}

	const upper = trimmed.toUpperCase();
	const exactMatch = GIGACHAT_VALID_SCOPES.find((scope) => scope === upper);
	if (exactMatch) {
		return exactMatch;
	}

	const lower = trimmed.toLowerCase();
	if (["personal", "pers", "individual"].includes(lower)) {
		return "GIGACHAT_API_PERS";
	}
	if (["b2b", "prepaid", "business-b2b"].includes(lower)) {
		return "GIGACHAT_API_B2B";
	}
	if (["corp", "corporate", "postpaid", "business-corp"].includes(lower)) {
		return "GIGACHAT_API_CORP";
	}

	const containedScopes = GIGACHAT_VALID_SCOPES.filter((scope) =>
		upper.includes(scope),
	);
	if (containedScopes.length === 1) {
		return containedScopes[0];
	}
	if (containedScopes.length > 1) {
		throw new Error(
			`Invalid GigaChat scope: ${trimmed}. Set exactly one of ${GIGACHAT_VALID_SCOPES.join(", ")}.`,
		);
	}

	throw new Error(
		`Invalid GigaChat scope: ${trimmed}. Use ${GIGACHAT_VALID_SCOPES.join(", ")}, or aliases personal, b2b, or corp.`,
	);
}

export function getDefaultScope(
	accountType: GigaChatAccountType,
): GigaChatScope {
	return accountType === "business"
		? GIGACHAT_DEFAULT_BUSINESS_SCOPE
		: GIGACHAT_DEFAULT_SCOPE;
}

export function normalizeAccountType(input: string): GigaChatAccountType {
	const trimmed = input.trim().toLowerCase();
	if (!trimmed) {
		return "personal";
	}

	if (
		["personal", "pers", "individual", "gigachat_api_pers"].includes(trimmed)
	) {
		return "personal";
	}

	if (["business", "biz", "company"].includes(trimmed)) {
		return "business";
	}

	throw new Error(
		`Invalid GigaChat account type: ${input.trim()}. Use personal or business.`,
	);
}

export function normalizeAuthMode(input: string): GigaChatAuthMode {
	const trimmed = input.trim().toLowerCase();
	if (!trimmed) {
		return GIGACHAT_DEFAULT_AUTH_MODE;
	}

	if (
		[
			"basic",
			"password",
			"username/password",
			"username-password",
			"login",
			"userpass",
		].includes(trimmed)
	) {
		return "basic";
	}

	if (["token", "credentials", "authorization-key"].includes(trimmed)) {
		return "token";
	}

	throw new Error(
		`Invalid GigaChat auth mode: ${input.trim()}. Use basic or token.`,
	);
}

export function normalizeBaseUrlChoice(input: string): GigaChatBaseUrlChoice {
	const trimmed = input.trim().toLowerCase();
	if (!trimmed || trimmed.startsWith("default")) {
		return "default";
	}

	if (trimmed === "custom") {
		return "custom";
	}

	return "custom";
}

export function normalizeBaseUrl(
	input: string,
	fallbackBaseUrl: string = GIGACHAT_DEFAULT_BASE_URL,
): string {
	const trimmed = input.trim();
	if (!trimmed || trimmed.toLowerCase().startsWith("default")) {
		return fallbackBaseUrl;
	}

	if (!/^https?:\/\//i.test(trimmed)) {
		throw new Error(
			`Invalid GigaChat base URL: ${trimmed}. Use an absolute http(s) URL.`,
		);
	}

	return trimmed.replace(/\/+$/, "");
}

export function normalizeStoredBaseUrl(input: unknown): string | undefined {
	if (typeof input !== "string" || input.trim().length === 0) {
		return undefined;
	}

	try {
		return normalizeBaseUrl(input);
	} catch {
		return undefined;
	}
}

export function parseExpiresAt(expiresAt: unknown): number {
	let expiresAtNumber: number | undefined;
	if (typeof expiresAt === "number") {
		expiresAtNumber = expiresAt;
	} else if (typeof expiresAt === "string" && expiresAt.trim()) {
		expiresAtNumber = Number(expiresAt);
	}

	if (expiresAtNumber === undefined || !Number.isFinite(expiresAtNumber)) {
		throw new Error("Invalid GigaChat token response: missing expires_at");
	}

	const expiresAtMs =
		expiresAtNumber > 1e12 ? expiresAtNumber : expiresAtNumber * 1000;
	return Math.max(Date.now(), expiresAtMs - GIGACHAT_EXPIRY_BUFFER_MS);
}

export function withCertificateHint(error: unknown): Error {
	const message = error instanceof Error ? error.message : String(error);
	if (!message.toLowerCase().includes("certificate")) {
		return error instanceof Error ? error : new Error(message);
	}

	return new Error(
		`${message}. GigaChat token exchange may require the Russian Trusted Root CA. See ${GIGACHAT_CERTIFICATES_URL}`,
	);
}

export class PiGigaChatClient extends GigaChat {
	get accessTokenData():
		| { access_token?: unknown; expires_at?: unknown }
		| undefined {
		return this._accessToken;
	}

	get accessToken(): string | undefined {
		return this._accessToken?.access_token;
	}

	async updateTokenQuietly(): Promise<void> {
		const originalConsoleInfo = console.info;
		console.info = () => {};
		try {
			await this.updateToken();
		} finally {
			console.info = originalConsoleInfo;
		}
	}

	async *streamRobust(
		payload: GigaChatChat,
		abortSignal?: AbortSignal,
	): AsyncGenerator<ChatCompletionChunk> {
		if (this.useAuth) {
			if (this.checkValidityToken()) {
				try {
					yield* this.requestStreamBody(payload, abortSignal);
					return;
				} catch (error) {
					if (isAuthenticationError(error)) {
						this.resetToken();
					} else {
						throw error;
					}
				}
			}

			await this.updateTokenQuietly();
		}

		yield* this.requestStreamBody(payload, abortSignal);
	}

	private async *requestStreamBody(
		payload: GigaChatChat,
		abortSignal?: AbortSignal,
	): AsyncGenerator<ChatCompletionChunk> {
		const headers: Record<string, string> = {
			Accept: EVENT_STREAM_CONTENT_TYPE,
			"Cache-Control": "no-store",
		};

		if (this.accessToken) {
			headers.Authorization = `Bearer ${this.accessToken}`;
		}

		const response = (await this._client.request({
			method: "POST",
			url: "/chat/completions",
			responseType: "stream",
			data: { ...payload, stream: true },
			headers,
			signal: abortSignal,
		})) as {
			status?: number;
			headers?: Record<string, string | string[] | undefined>;
			data?: unknown;
		};

		ensureSuccessfulStreamResponse(response);

		if (!response.data) {
			throw new Error("GigaChat returned an empty streaming response body");
		}

		yield* parseGigaChatStream(response.data);
	}
}

export function createTokenClient(
	authorizationKey: string,
	scope: GigaChatScope,
	baseUrl: string,
): PiGigaChatClient {
	const config = {
		credentials: authorizationKey,
		scope,
		baseUrl,
	} satisfies GigaChatClientConfig;

	return new PiGigaChatClient(config);
}

export function createPasswordClient(
	user: string,
	password: string,
	baseUrl: string,
): PiGigaChatClient {
	const config = {
		user,
		password,
		baseUrl,
	} satisfies GigaChatClientConfig;

	return new PiGigaChatClient(config);
}

export function isAccessToken(value: string): boolean {
	return value.split(".").length >= 3;
}

function ensureSuccessfulStreamResponse(response: {
	status?: number;
	headers?: Record<string, string | string[] | undefined>;
}): void {
	if (response.status === 200) {
		const contentType = getHeaderValue(response.headers, "content-type")?.split(
			";",
		)[0];
		if (contentType !== EVENT_STREAM_CONTENT_TYPE) {
			throw createGigaChatResponseError(
				response,
				`Expected response Content-Type to be '${EVENT_STREAM_CONTENT_TYPE}', got '${contentType ?? "unknown"}'`,
			);
		}
		return;
	}

	if (response.status === 401) {
		throw createGigaChatAuthenticationError(response);
	}

	throw createGigaChatResponseError(
		response,
		`GigaChat streaming request failed with status ${response.status ?? "unknown"}`,
	);
}

function createGigaChatAuthenticationError(response: {
	status?: number;
	headers?: Record<string, string | string[] | undefined>;
}): Error & {
	response: {
		status?: number;
		headers?: Record<string, string | string[] | undefined>;
	};
} {
	const error = new Error("GigaChat authentication failed") as Error & {
		response: {
			status?: number;
			headers?: Record<string, string | string[] | undefined>;
		};
	};
	error.response = response;
	return error;
}

function createGigaChatResponseError(
	response: {
		status?: number;
		headers?: Record<string, string | string[] | undefined>;
	},
	message: string,
): Error & {
	response: {
		status?: number;
		headers?: Record<string, string | string[] | undefined>;
	};
} {
	const error = new Error(message) as Error & {
		response: {
			status?: number;
			headers?: Record<string, string | string[] | undefined>;
		};
	};
	error.response = response;
	return error;
}

function isAuthenticationError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}

	const response = asRecord(asRecord(error)?.response);
	return (
		response?.status === 401 ||
		error.message === "GigaChat authentication failed"
	);
}

async function* parseGigaChatStream(
	body: unknown,
): AsyncGenerator<ChatCompletionChunk> {
	const webStream = asReadableStream(body);
	if (webStream) {
		yield* parseSSEJsonChunks(readWebStream(webStream));
		return;
	}

	const nodeStream = asNodeReadable(body);
	if (nodeStream) {
		yield* parseSSEJsonChunks(readNodeStream(nodeStream));
		return;
	}

	throw new Error("Unsupported GigaChat streaming response body");
}

async function* readWebStream(
	stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			if (value) {
				yield decoder.decode(value, { stream: true });
			}
		}

		const tail = decoder.decode();
		if (tail) {
			yield tail;
		}
	} finally {
		try {
			await reader.cancel();
		} catch {}
		try {
			reader.releaseLock();
		} catch {}
	}
}

async function* readNodeStream(
	stream: AsyncIterable<Uint8Array | string>,
): AsyncGenerator<string> {
	for await (const chunk of stream) {
		yield typeof chunk === "string"
			? chunk
			: Buffer.from(chunk).toString("utf-8");
	}
}

async function* parseSSEJsonChunks(
	chunks: AsyncIterable<string>,
): AsyncGenerator<ChatCompletionChunk> {
	let buffer = "";

	for await (const chunk of chunks) {
		buffer += chunk;

		let boundary = findSSEBoundary(buffer);
		while (boundary) {
			const eventBlock = buffer.slice(0, boundary.index);
			buffer = buffer.slice(boundary.index + boundary.length);

			const eventData = extractSSEData(eventBlock);
			if (eventData && eventData !== "[DONE]") {
				yield parseSSEJsonChunk(eventData);
			}

			boundary = findSSEBoundary(buffer);
		}
	}

	const trailingData = extractSSEData(buffer);
	if (trailingData && trailingData !== "[DONE]") {
		yield parseSSEJsonChunk(trailingData);
	}
}

function findSSEBoundary(
	buffer: string,
): { index: number; length: number } | undefined {
	const lf = buffer.indexOf("\n\n");
	const crlf = buffer.indexOf("\r\n\r\n");

	if (lf === -1 && crlf === -1) {
		return undefined;
	}

	if (lf === -1 || (crlf !== -1 && crlf < lf)) {
		return { index: crlf, length: 4 };
	}

	return { index: lf, length: 2 };
}

function extractSSEData(eventBlock: string): string | undefined {
	const dataLines = eventBlock
		.split(/\r?\n/)
		.filter((line) => line.startsWith("data:"))
		.map((line) => line.slice(5).trimStart());

	if (dataLines.length === 0) {
		return undefined;
	}

	const data = dataLines.join("\n").trim();
	return data.length > 0 ? data : undefined;
}

function parseSSEJsonChunk(data: string): ChatCompletionChunk {
	try {
		return JSON.parse(data) as ChatCompletionChunk;
	} catch (error) {
		const preview = data.length > 400 ? `${data.slice(0, 400)}...` : data;
		throw new Error(`Failed to parse GigaChat SSE chunk: ${preview}`, {
			cause: error instanceof Error ? error : undefined,
		});
	}
}

function getHeaderValue(
	headers: Record<string, string | string[] | undefined> | undefined,
	name: string,
): string | undefined {
	if (!headers) {
		return undefined;
	}

	const value = headers[name.toLowerCase()] ?? headers[name];
	if (Array.isArray(value)) {
		return value[0];
	}
	return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function asReadableStream(
	value: unknown,
): ReadableStream<Uint8Array> | undefined {
	if (typeof ReadableStream === "undefined") {
		return undefined;
	}

	return value instanceof ReadableStream ? value : undefined;
}

function asNodeReadable(
	value: unknown,
): AsyncIterable<Uint8Array | string> | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}

	return Symbol.asyncIterator in value
		? (value as AsyncIterable<Uint8Array | string>)
		: undefined;
}
