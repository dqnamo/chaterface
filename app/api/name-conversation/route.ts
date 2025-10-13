import { db } from "@/lib/instant-admin";

interface NameConversationRequest {
  conversationId: string;
  firstMessageContent: string;
}

const MAX_TITLE_LENGTH = 40;

const formatTitle = (message: string) => {
  const sanitized = message.replace(/\s+/g, ' ').trim();
  if (!sanitized) {
    return 'New Conversation';
  }

  const words = sanitized.split(' ');
  const preview = words.slice(0, 6).join(' ');
  const truncated = preview.length > MAX_TITLE_LENGTH
    ? preview.slice(0, MAX_TITLE_LENGTH).trimEnd()
    : preview;

  return truncated
    .replace(/\.?$/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export async function POST(request: Request) {
  const data: NameConversationRequest = await request.json();
  const title = formatTitle(data.firstMessageContent ?? '');

  await db.transact(
    db.tx.conversations[data.conversationId].update({ name: title })
  );

  return Response.json({ success: true });
}
