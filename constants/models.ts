export const models = [
  { id: 'openai/gpt-4.1', name: 'GPT 4.1', speed: 132, intelligence: 53 },
  { id: 'openai/gpt-4.1-mini', name: 'GPT 4.1 Mini', speed: 229, intelligence: 53 },
  { id: 'openai/gpt-4.1-nano', name: 'GPT 4.1 Nano', speed: 293, intelligence: 41 },
  { id: 'openai/o3', name: 'o3', speed: 130, intelligence: 72 },
  { id: 'openai/o4-mini', name: 'o4 Mini', speed: 139, intelligence: 70 },
  { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', speed: 250, intelligence: 48 },
  { id: 'google/gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 Pro Experimental', speed: 162, intelligence: 68 },
  { id: 'xai/grok-3', name: 'Grok 3', speed: 80, intelligence: 51 },
  { id: 'xai/grok-3-mini', name: 'Grok 3 Mini', speed: 115, intelligence: 67 },
  { id: 'anthropic/claude-4-opus-20250514', name: 'Claude 4 Opus', speed: 65, intelligence: 64 },
  { id: 'anthropic/claude-4-sonnet-20250514', name: 'Claude 4 Sonnet', speed: 65, intelligence: 61 },
];

export const providers = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Bring your own OpenRouter API key to unlock any supported model.',
    models: models.map(model => model.id),
  },
];