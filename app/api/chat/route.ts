import { init } from '@instantdb/admin';
import schema from '@/instant.schema';
import { UIMessage } from '@/lib/types';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
  schema: schema,
});

export async function POST(req: Request) {
  const { messages, model }: { 
    messages: UIMessage[]; 
    model: string; 
    conversationId: string;
  } = await req.json();

  const apiKey = req.headers.get('Authorization')?.split(' ')[1];
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'No OpenRouter API key provided. Please add your API key in Settings.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log("messages", messages);
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Chaterface',
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
        include_reasoning: true, // Request reasoning if available
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API Error:", errorText);
        return new Response(errorText, { status: response.status });
    }

    return new Response(response.body, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    });
  } catch (error) {
      console.error("Fetch error:", error);
      return new Response(JSON.stringify({ error: 'Failed to fetch from OpenRouter' }), { status: 500 });
  }
}
