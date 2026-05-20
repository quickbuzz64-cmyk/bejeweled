import { createGroq } from '@ai-sdk/groq';
import { wrapLanguageModel, type LanguageModelV1, type LanguageModelV1Middleware } from 'ai';

// Do NOT throw at module load time — a module-level throw causes
// FUNCTION_INVOCATION_FAILED before any error response can be sent.
// The missing-key error surfaces naturally when streamText tries to call the API.
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? '',
});

// Primary model (set via GROQ_MODEL env var).
// llama-3.3-70b-versatile: best tool-calling quality on Groq free tier.
export const MODEL_ID = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

// Fallback model used when the primary hits its rate limit (429).
// mixtral-8x7b-32768: Mistral MoE model on Groq — reliable tool calling with
// a separate quota from the Llama models.
const FALLBACK_MODEL_ID = 'mixtral-8x7b-32768';

// Last-resort fallback if the primary AND first fallback are both rate-limited.
const FALLBACK2_MODEL_ID = 'llama-3.1-8b-instant';

function isRateLimitError(error: unknown): boolean {
  const e = error as { statusCode?: number; message?: string };
  return e?.statusCode === 429 || (typeof e?.message === 'string' && e.message.includes('Rate limit'));
}

function createFallbackMiddleware(fallback1: LanguageModelV1, fallback2: LanguageModelV1): LanguageModelV1Middleware {
  return {
    // Intercept stream calls and retry with fallback(s) on 429
    wrapStream: async ({ doStream, params }) => {
      try {
        return await doStream();
      } catch (error) {
        if (!isRateLimitError(error)) throw error;
        console.warn('[llm-fallback] Primary rate-limited, trying fallback:', FALLBACK_MODEL_ID);
        try {
          return await fallback1.doStream(params);
        } catch (error2) {
          if (!isRateLimitError(error2)) throw error2;
          console.warn('[llm-fallback] Fallback also rate-limited, trying last-resort:', FALLBACK2_MODEL_ID);
          return await fallback2.doStream(params);
        }
      }
    },
    // Intercept generate calls and retry with fallback(s) on 429
    wrapGenerate: async ({ doGenerate, params }) => {
      try {
        return await doGenerate();
      } catch (error) {
        if (!isRateLimitError(error)) throw error;
        console.warn('[llm-fallback] Primary rate-limited, trying fallback:', FALLBACK_MODEL_ID);
        try {
          return await fallback1.doGenerate(params);
        } catch (error2) {
          if (!isRateLimitError(error2)) throw error2;
          console.warn('[llm-fallback] Fallback also rate-limited, trying last-resort:', FALLBACK2_MODEL_ID);
          return await fallback2.doGenerate(params);
        }
      }
    },
  };
}

const primaryModel = groq(MODEL_ID);
const fallbackModel = groq(FALLBACK_MODEL_ID);
const fallback2Model = groq(FALLBACK2_MODEL_ID);

/**
 * Pre-configured LLM instance ready for use with the Vercel AI SDK.
 * Falls back automatically on HTTP 429:
 *   llama-3.3-70b-versatile → openai/gpt-oss-120b → llama-3.1-8b-instant
 *
 * Usage:
 *   import { llm } from '../lib/openrouter';
 *   const result = await generateText({ model: llm, prompt: '...' });
 */
export const llm: LanguageModelV1 =
  MODEL_ID === FALLBACK_MODEL_ID
    ? primaryModel
    : wrapLanguageModel({
        model: primaryModel,
        middleware: createFallbackMiddleware(
          fallbackModel as LanguageModelV1,
          fallback2Model as LanguageModelV1,
        ),
      });
