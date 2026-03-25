import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { GIGACHAT_DEFAULT_BASE_URL, GIGACHAT_MODELS } from "./models.js";
import { gigachatOAuthProvider } from "./oauth.js";
import { streamSimpleGigaChat } from "./stream.js";

const GIGACHAT_API = "gigachat-extension-api";

export default function (pi: ExtensionAPI) {
	pi.registerProvider("gigachat", {
		baseUrl: GIGACHAT_DEFAULT_BASE_URL,
		apiKey: "GIGACHAT_CREDENTIALS",
		api: GIGACHAT_API,
		models: GIGACHAT_MODELS,
		oauth: gigachatOAuthProvider,
		streamSimple: streamSimpleGigaChat,
	});
}
