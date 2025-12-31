import { init } from '@instantdb/admin';
import schema from '@/instant.schema';
import { UIMessage } from '@/lib/types';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID as string,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
  schema: schema,
});

type Part = { type: 'text'; text: string } | { type: 'image'; image: string };

export async function POST(req: Request) {
  const { messages, model, apiKey: userApiKey }: { 
    messages: UIMessage[]; 
    model: string; 
    conversationId: string;
    apiKey?: string;
  } = await req.json();

  const apiKey = userApiKey || process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'No OpenRouter API key provided. Please add your API key in Settings.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Convert to intermediate format for processing
  const intermediateMessages = messages.map(m => {
    let parts: Part[] = [];

    // Start with parts if they exist
    if (m.parts && m.parts.length > 0) {
      parts = m.parts.map(p => {
        if (p.type === 'text') return { type: 'text', text: p.text };
        if (p.type === 'image') return { type: 'image', image: p.image };
        return null;
      }).filter((p): p is Part => p !== null);
    } else {
      // Fallback: Use content as text part
      parts = [{ type: 'text', text: m.content }];
    }

    // Check if experimental_attachments exist and append them if we don't have images yet
    // This handles the case where parts only contains text but attachments has images
    const hasImages = parts.some(p => p.type === 'image');

    if (!hasImages && m.experimental_attachments && m.experimental_attachments.length > 0) {
        m.experimental_attachments.forEach(a => {
            if (a.contentType?.startsWith('image/')) {
                // We use the URL or path here. The processor expects 'image' property.
                parts.push({ type: 'image', image: a.url });
            }
        });
    }

    return {
        role: m.role,
        content: parts
    };
  });

  // 2. Process images (resolve InstantDB paths)
  const processedMessages = await Promise.all(intermediateMessages.map(async msg => {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
        const processedContent = await Promise.all(msg.content.map(async (part) => {
             if (part.type === 'image' && typeof part.image === 'string') {
                const imageStr = part.image;
                if (!imageStr.startsWith('http') && !imageStr.startsWith('data:')) {
                     // It is likely a storage path. Query InstantDB for the file URL.
                     const result = await db.query({
                         $files: {
                             $: {
                                 where: { path: imageStr }
                             }
                         }
                     });

                     console.log('result for image', imageStr, result);
                     
                     const file = result.$files?.[0];
                     if (file && file.url) {
                         return { ...part, image: file.url };
                     } else {
                         console.warn(`Could not find file URL for path: ${imageStr}`);
                     }
                }
             }
             return part;
        }));
        
        return {
            ...msg,
            content: processedContent
        };
    }
    return msg;
  }));

  // 3. Convert to OpenRouter format
  const openRouterMessages = processedMessages.map(msg => {
      if (Array.isArray(msg.content)) {
          return {
              role: msg.role,
              content: msg.content.map((part) => {
                  if (part.type === 'image') {
                      return {
                          type: 'image_url',
                          image_url: {
                              url: part.image
                          }
                      };
                  }
                  return part;
              })
          };
      }
      return msg;
  });

  try {
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
        messages: openRouterMessages,
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
