import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { init, id } from '@instantdb/admin';
import { DateTime } from 'luxon';
import schema from '@/instant.schema';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
  schema: schema,
});

export async function POST(req: Request) {
  const { messages, model, conversationId }: { messages: UIMessage[]; model: string; conversationId: string } = await req.json();

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const result = streamText({
    model: openrouter(model),
    messages: convertToModelMessages(messages),
    onFinish: async ({text}) => {
      await db.transact(
        db.tx.messages[id()]
          .update({
            content: text,
            role: "assistant",
            createdAt: DateTime.now().toISO(),
            model: model,
          })
          .link({ conversation: conversationId }),
      );
    },
  });

  return result.toUIMessageStreamResponse();
}