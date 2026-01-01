import { UIMessage } from "./types";

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: UIMessage[],
  onChunk: (content: string, reasoning: string, usage?: any) => void,
  systemPrompt?: string
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

              onChunk(contentChunk, reasoningChunk, usage);
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

