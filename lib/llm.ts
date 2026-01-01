import { UIMessage } from "./types";

export interface OpenRouterCredits {
  total_credits: number;
  total_usage: number;
}

export async function fetchCredits(apiKey: string): Promise<OpenRouterCredits> {
  const response = await fetch("https://openrouter.ai/api/v1/credits", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API key");
    }
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error: ${errorText}`);
  }

  const json = await response.json();
  return json.data;
}

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: UIMessage[],
  onChunk: (content: string, reasoning: string, annotations: any[], usage?: any) => void,
  systemPrompt?: string,
  webSearch: boolean = false
) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin, // Client-side origin
        "X-Title": "Chaterface",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
            // Note: If you have complex parts (images etc) you might need to format this
          })),
        ],
        stream: true,
        include_reasoning: true,
        plugins: webSearch ? [{ id: "web" }] : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error: ${errorText}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith(":")) continue;

        if (trimmedLine.startsWith("data: ")) {
          const dataStr = trimmedLine.replace("data: ", "");
          if (dataStr === "[DONE]") continue;

          try {
            const json = JSON.parse(dataStr);
            const delta = json.choices?.[0]?.delta;
            
            if (delta) {
              const contentChunk = delta.content || "";
              const reasoningChunk = delta.reasoning || delta.reasoning_content || "";
              const usage = json.usage; // Might come in final chunk or with chunks depending on provider
              
              // Annotations for web search (usually in the message object in final response or delta?)
              // OpenRouter standardizes this in the message.annotations field.
              // In streaming, it might be in delta or choices[0].message?
              // The docs say: "Web search results ... are available in the API and standardized ... in the OpenAI Chat Completion Message type"
              // For streaming, we might need to check if it comes in chunks or final.
              // Let's assume it might come in a chunk.
              // But usually annotations are sent when available.
              // Let's check for annotations in the delta or the choice object (some providers put it in different places, OpenRouter standardizes it)
              // OpenRouter docs: "annotations" field in the message.
              // In streaming, it might be in `delta.annotations`? Or maybe we need to wait for full response?
              // Let's try to grab it if it exists.
              const annotations = json.choices?.[0]?.message?.annotations || delta.annotations || [];

              onChunk(contentChunk, reasoningChunk, annotations, usage);
            }
          } catch (e) {
            console.error("Error parsing JSON line:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Chat completion error:", error);
    throw error;
  }
}
