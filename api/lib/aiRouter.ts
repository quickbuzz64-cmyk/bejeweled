/**
 * AI Router — multi-layer fallback architecture
 *
 * Priority chain:
 *   1. Groq API  (3 internal models via openrouter.ts middleware)
 *   2. HuggingFace Inference API  (2 models with timeout)
 *   3. Static safe fallback  (per request type)
 *
 * All provider details (API keys, model IDs) stay server-side only.
 */

import { generateText } from 'ai';
import { llm } from './openrouter';

// ── Types ────────────────────────────────────────────────────────────────────

export type AIRequestType = 'chatbot' | 'seo' | 'analytics';

export interface AIRouterResult {
  text: string;
  provider: 'groq' | 'huggingface' | 'static';
}

// ── HuggingFace config ────────────────────────────────────────────────────────

// Models tried in order; first successful response wins.
const HF_MODELS = [
  'meta-llama/Llama-3.1-8B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
] as const;

const HF_TIMEOUT_MS = 9_000;
const HF_API_BASE = 'https://api-inference.huggingface.co/v1/chat/completions';

// ── Static fallbacks ──────────────────────────────────────────────────────────

const STATIC_FALLBACKS: Record<AIRequestType, string> = {
  chatbot:
    'Thank you for reaching out! Our AI assistant is temporarily unavailable. Please browse our shop, check your order status, or contact us directly for help.',
  seo: JSON.stringify({
    title: 'Premium Jewelry Online | Bejeweled Pakistan',
    metaDescription:
      'Shop premium rings, necklaces, bracelets & earrings at Bejeweled Pakistan. Perfect for gifting & special occasions. Fast delivery across Pakistan. Order online today!',
    keywords: [
      'premium jewelry Pakistan',
      'buy rings online Pakistan',
      'best necklaces Pakistan',
      'gold rings Karachi',
      'gift jewelry Lahore',
      'online shopping Pakistan jewelry',
      'Bejeweled store Pakistan',
      'premium earrings Pakistan',
      'buy bracelets online',
      'best jewelry for gifting Pakistan',
    ],
    tags: ['rings', 'necklaces', 'jewelry', 'pakistan', 'earrings'],
    ogTitle: '\u2728 Premium Jewelry Delivered Across Pakistan | Bejeweled',
    ogDescription:
      'Discover Bejeweled — Pakistan\'s top destination for premium rings, necklaces, bracelets & earrings. Gifting made easy with fast nationwide delivery. Shop now!',
  }),
  analytics:
    'AI insights are temporarily unavailable. Please review the charts and metrics for current performance data.',
};

// ── HuggingFace layer ─────────────────────────────────────────────────────────

async function callHuggingFace(prompt: string): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) throw new Error('HUGGINGFACE_API_TOKEN not configured');

  // Truncate prompt to avoid exceeding free-tier context limits
  const safePrompt = prompt.slice(0, 3_500);

  for (const model of HF_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HF_TIMEOUT_MS);

    try {
      const res = await fetch(HF_API_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: safePrompt }],
          max_tokens: 900,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[aiRouter] HuggingFace ${model} HTTP ${res.status}`);
        continue;
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };

      const text = json.choices?.[0]?.message?.content?.trim();
      if (text) {
        console.info(`[aiRouter] HuggingFace success: ${model}`);
        return text;
      }
    } catch (err) {
      clearTimeout(timer);
      console.warn(`[aiRouter] HuggingFace ${model} error:`, err);
    }
  }

  throw new Error('All HuggingFace models failed');
}

// ── Core router ───────────────────────────────────────────────────────────────

/**
 * Generate an AI response with automatic multi-provider fallback.
 *
 * @param prompt  The full prompt to send to the AI provider.
 * @param type    Request type — controls static fallback content.
 * @returns       `{ text, provider }` — always resolves, never rejects.
 */
export async function generateAIResponse(
  prompt: string,
  type: AIRequestType,
): Promise<AIRouterResult> {
  // ── Layer 1: Groq (primary + 2 internal fallbacks via openrouter.ts) ──────
  try {
    const { text } = await generateText({
      model: llm,
      prompt,
      maxTokens: 1_500,
    });
    if (text?.trim()) {
      return { text: text.trim(), provider: 'groq' };
    }
  } catch (err) {
    console.warn('[aiRouter] Groq layer exhausted:', (err as Error).message ?? err);
  }

  // ── Layer 2: HuggingFace ──────────────────────────────────────────────────
  try {
    const text = await callHuggingFace(prompt);
    return { text, provider: 'huggingface' };
  } catch (err) {
    console.warn('[aiRouter] HuggingFace layer failed:', (err as Error).message ?? err);
  }

  // ── Layer 3: Static fallback ──────────────────────────────────────────────
  console.warn('[aiRouter] All providers exhausted, using static fallback for type:', type);
  return { text: STATIC_FALLBACKS[type], provider: 'static' };
}
