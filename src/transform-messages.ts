import type {
	Api,
	AssistantMessage,
	Message,
	Model,
	ToolCall,
	ToolResultMessage,
} from "@mariozechner/pi-ai";

/**
 * Local copy of pi-ai's message normalizer so the extension can preserve
 * provider replay semantics without importing internal files.
 */
export function transformMessages<TApi extends Api>(
	messages: Message[],
	model: Model<TApi>,
	normalizeToolCallId?: (
		id: string,
		model: Model<TApi>,
		source: AssistantMessage,
	) => string,
): Message[] {
	const toolCallIdMap = new Map<string, string>();

	const transformed = messages.map((message) => {
		if (message.role === "user") {
			return message;
		}

		if (message.role === "toolResult") {
			const normalizedId = toolCallIdMap.get(message.toolCallId);
			if (normalizedId && normalizedId !== message.toolCallId) {
				return { ...message, toolCallId: normalizedId };
			}
			return message;
		}

		if (message.role === "assistant") {
			const assistantMessage = message as AssistantMessage;
			const isSameModel =
				assistantMessage.provider === model.provider &&
				assistantMessage.api === model.api &&
				assistantMessage.model === model.id;

			const transformedContent = assistantMessage.content.flatMap((block) => {
				if (block.type === "thinking") {
					if (block.redacted) {
						return isSameModel ? block : [];
					}
					if (isSameModel && block.thinkingSignature) return block;
					if (!block.thinking || block.thinking.trim() === "") return [];
					if (isSameModel) return block;
					return {
						type: "text" as const,
						text: block.thinking,
					};
				}

				if (block.type === "text") {
					return isSameModel
						? block
						: {
								type: "text" as const,
								text: block.text,
							};
				}

				if (block.type === "toolCall") {
					const toolCall = block as ToolCall;
					let normalizedToolCall: ToolCall = toolCall;

					if (!isSameModel && toolCall.thoughtSignature) {
						normalizedToolCall = { ...toolCall };
						delete (normalizedToolCall as { thoughtSignature?: string })
							.thoughtSignature;
					}

					if (!isSameModel && normalizeToolCallId) {
						const normalizedId = normalizeToolCallId(
							toolCall.id,
							model,
							assistantMessage,
						);
						if (normalizedId !== toolCall.id) {
							toolCallIdMap.set(toolCall.id, normalizedId);
							normalizedToolCall = { ...normalizedToolCall, id: normalizedId };
						}
					}

					return normalizedToolCall;
				}

				return block;
			});

			return {
				...assistantMessage,
				content: transformedContent,
			};
		}

		return message;
	});

	const result: Message[] = [];
	let pendingToolCalls: ToolCall[] = [];
	let existingToolResultIds = new Set<string>();

	for (const message of transformed) {
		if (message.role === "assistant") {
			if (pendingToolCalls.length > 0) {
				for (const toolCall of pendingToolCalls) {
					if (!existingToolResultIds.has(toolCall.id)) {
						result.push({
							role: "toolResult",
							toolCallId: toolCall.id,
							toolName: toolCall.name,
							content: [{ type: "text", text: "No result provided" }],
							isError: true,
							timestamp: Date.now(),
						} as ToolResultMessage);
					}
				}
				pendingToolCalls = [];
				existingToolResultIds = new Set();
			}

			const assistantMessage = message as AssistantMessage;
			if (
				assistantMessage.stopReason === "error" ||
				assistantMessage.stopReason === "aborted"
			) {
				continue;
			}

			const toolCalls = assistantMessage.content.filter(
				(block) => block.type === "toolCall",
			) as ToolCall[];
			if (toolCalls.length > 0) {
				pendingToolCalls = toolCalls;
				existingToolResultIds = new Set();
			}

			result.push(message);
			continue;
		}

		if (message.role === "toolResult") {
			existingToolResultIds.add(message.toolCallId);
			result.push(message);
			continue;
		}

		if (message.role === "user" && pendingToolCalls.length > 0) {
			for (const toolCall of pendingToolCalls) {
				if (!existingToolResultIds.has(toolCall.id)) {
					result.push({
						role: "toolResult",
						toolCallId: toolCall.id,
						toolName: toolCall.name,
						content: [{ type: "text", text: "No result provided" }],
						isError: true,
						timestamp: Date.now(),
					} as ToolResultMessage);
				}
			}
			pendingToolCalls = [];
			existingToolResultIds = new Set();
		}

		result.push(message);
	}

	return result;
}
