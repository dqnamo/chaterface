import { streamText, CoreMessage, createDataStreamResponse } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { db } from '@/lib/instant-admin';

interface ChatRequest {
  messages: CoreMessage[];
  model: string;
}

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const ANONYMOUS_MESSAGE_LIMIT = 100;

const createErrorResponse = (message: string, status: number = 400) => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

const createOpenRouterStream = (model: string, messages: CoreMessage[], apiKey: string) => {
  const client = createOpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    compatibility: 'strict',
  });

  return createDataStreamResponse({
    execute: dataStream => {
      dataStream.writeMessageAnnotation({ model });
      const result = streamText({
        model: client(model),
        messages,
        temperature: 1,
      });
      result.mergeIntoDataStream(dataStream);
    },
    onError: (error: unknown) => {
      console.error('Error with OpenRouter:', error);
      return 'An error occurred while communicating with OpenRouter.';
    }
  });
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('Missing or invalid Authorization header', 401);
    }

    const apiKey = authHeader.substring('Bearer '.length);
    if (!apiKey) {
      return createErrorResponse('Invalid API key', 401);
    }

    const sessionId = req.headers.get('X-Session-Id');
    const token = req.headers.get('X-Token');

    let userId: string | null = null;
    if (token) {
      const user = await db.auth.verifyToken(token);
      if (user?.id) {
        userId = user.id;
      }
    }

    if (await usageLimitReached(sessionId, userId)) {
      return createErrorResponse('Usage limit reached');
    }

    const { messages, model }: ChatRequest = await req.json();
    if (!messages?.length || !model) {
      return createErrorResponse('Missing required fields in body (messages, model)');
    }

    return createOpenRouterStream(model, messages, apiKey);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON body');
    }

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorWithStatus = error as ErrorWithStatus;
    const errorStatus = errorWithStatus.status || errorWithStatus.statusCode || 500;
    return createErrorResponse(errorMessage, errorStatus);
  }
}

async function usageLimitReached(sessionId?: string | null, userId?: string | null): Promise<boolean> {
  if (userId) {
    return false;
  }

  if (!sessionId) {
    return true;
  }

  const data = await db.query({
    messages: {
      $: {
        where: {
          'conversation.sessionId': sessionId,
        }
      }
    },
  });

  return data.messages.length >= ANONYMOUS_MESSAGE_LIMIT;
}
