export interface GigaChatModelDefinition {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
	};
	contextWindow: number;
	maxTokens: number;
}

export const GIGACHAT_DEFAULT_BASE_URL = "https://api.giga.chat/v1";
// "https://gigachat.devices.sberbank.ru/api/v1";  // https://api.giga.chat/

export const GIGACHAT_MODELS: GigaChatModelDefinition[] = [
	{
		id: "GigaChat-2",
		name: "GigaChat 2 Lite",
		reasoning: false,
		input: ["text"],
		cost: { input: 65, output: 65, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 8192,
	},
	{
		id: "GigaChat-2-Pro",
		name: "GigaChat 2 Pro",
		reasoning: false,
		input: ["text", "image"],
		cost: { input: 500, output: 500, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 8192,
	},
	{
		id: "GigaChat-2-Max",
		name: "GigaChat 2 Max",
		reasoning: false,
		input: ["text", "image"],
		cost: { input: 650, output: 650, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 8192,
	},
	{
		id: "GigaChat-3-Ultra",
		name: "GigaChat 3 Ultra",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 1200, output: 1200, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 256000,
		maxTokens: 32768,
	},
];
