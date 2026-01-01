export type MessageRole = 'system' | 'user' | 'assistant' | 'data';

export type TextPart = { type: 'text'; text: string };
export type ImagePart = { type: 'image'; image: string }; 
export type ReasoningPart = { type: 'reasoning'; text: string };

export type MessagePart = TextPart | ImagePart | ReasoningPart;

export type Attachment = {
    name?: string;
    contentType?: string;
    url: string;
};

export type UIMessage = {
    id: string;
    role: MessageRole;
    content: string;
    parts: MessagePart[];
    createdAt?: Date;
    experimental_attachments?: Attachment[];
    reasoning?: string;
    model?: string;
};

