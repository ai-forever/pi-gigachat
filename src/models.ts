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

export const GIGACHAT_DEFAULT_BASE_URL =
	"https://gigachat.devices.sberbank.ru/api/v1";

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
];
