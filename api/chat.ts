import { streamText, StreamData } from 'ai';
import { agentTools } from './lib/tools';
import { llm, MODEL_ID } from './lib/openrouter';
import { getSupabaseAdmin } from './lib/supabaseServer';

function extractLatestUserText(messages: import('ai').CoreMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'user') continue;
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.content)) {
      const text = msg.content
        .map((part) => (typeof part === 'object' && part && 'text' in part ? String(part.text ?? '') : ''))
        .join(' ')
        .trim();
      if (text) return text;
    }
  }
  return '';
}

function looksLikeDetailRequest(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(tell me more|more about|details? (about|of|on|for)|describe|what is it|how big|how heavy|what'?s? it made of|made of|care instructions?|specs? (of|for|about)|specifications?)\b/.test(s);
}

function looksLikeProductRequest(text: string): boolean {
  const s = text.toLowerCase();
  // Order-tracking queries take priority even when product words appear
  if (/\b(track|my order|where is my|order status|order number|when will|has been delivered|shipment|parcel)\b/.test(s)) return false;
  // Detail queries use their own path (no tool calls, no cards)
  if (looksLikeDetailRequest(s)) return false;
  return /(product|products|catalog|shop|item|items|recommend|suggest|available|price|cost|mug|cup|glass|tableware|ceramic|drinkware)/.test(s);
}

function extractPriceBounds(text: string): { minPrice?: number; maxPrice?: number } {
  const normalized = text.toLowerCase();

  const underMatch = normalized.match(/(?:under|below|less than|max(?:imum)? of?)\s*(?:rs\.?\s*)?(\d{2,6})/i);
  const aboveMatch = normalized.match(/(?:above|over|more than|min(?:imum)? of?)\s*(?:rs\.?\s*)?(\d{2,6})/i);
  const betweenMatch = normalized.match(/between\s*(?:rs\.?\s*)?(\d{2,6})\s*(?:and|to)\s*(?:rs\.?\s*)?(\d{2,6})/i);

  if (betweenMatch) {
    const first = Number(betweenMatch[1]);
    const second = Number(betweenMatch[2]);
    const minPrice = Math.min(first, second);
    const maxPrice = Math.max(first, second);
    return { minPrice, maxPrice };
  }

  return {
    minPrice: aboveMatch ? Number(aboveMatch[1]) : undefined,
    maxPrice: underMatch ? Number(underMatch[1]) : undefined,
  };
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Bejeweled Assistant — the AI shopping helper for Bejeweled, a modern ecommerce store selling curated rings, necklaces, bracelets, and earrings sourced from trusted suppliers.
You help customers find products, track orders, manage their cart, and answer questions about the store.

STORE POLICIES:
- All prices are in Pakistani Rupees (PKR / Rs).
- Delivery charge: Rs 250 flat rate. FREE delivery on orders above Rs 2,000.
- Payment methods: Cash on Delivery (COD) only.
- COD orders include a 4% government tax applied to subtotal + delivery. Card orders have no additional tax.
- Estimated delivery: 5 business days.

RULES:
- ALWAYS use tools to get real data. Never invent product names, prices, order numbers, or stock levels.
- For ANY product search or recommendation request, call the search_products or get_recommendations tool.
- For product requests, do not call FAQ tools.
- For product requests, call search_products once, then provide the final user-facing response using that result.
- For order inquiries, ALWAYS call track_order — never guess order status.
- For viewing cart contents ('what's in my cart?', 'show my cart', 'cart summary'), ALWAYS call get_cart — never use modify_cart for reading.
- For cart mutations (add/remove/update quantity), call modify_cart. Always confirm success before telling the user.
- For shipping/returns/refund questions, call answer_faq first.
- For product detail queries ('tell me more about X', 'describe X', 'what is X made of', 'specs of X'), call search_products with the product name as the query, then provide a detailed formatted text response covering: description, material, capacity, dimensions, weight, and care instructions. Use **bold** labels. Do NOT respond with just product cards for detail requests.
- Never mention internal tools, function calls, or backend implementation details in user-facing replies.
- Keep responses concise, friendly, and under 3 sentences unless showing a product list.
- When showing products, format each as: **Name** — Rs [Price] ([category])
- If a user is not logged in (no user_id in context), kindly ask them to log in for cart and order features.
- NEVER wrap your response in XML tags like <response>, <thinking>, or similar. Write the response directly.
- Use markdown formatting: **bold** for product names and key info, bullet lists for multiple items.`;

// ---------------------------------------------------------------------------
// CORS headers (for local dev + cross-origin requests)
// ---------------------------------------------------------------------------
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ---------------------------------------------------------------------------
// Edge runtime — all deps (Groq, Supabase-js, AI SDK) work on Edge.
// Embeddings return null on Vercel anyway, so no native module needed.
// ---------------------------------------------------------------------------
export const config = { runtime: 'edge' };

export default async function POST(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const streamData = new StreamData();
  let streamClosed = false;

  const closeStream = () => {
    if (!streamClosed) {
      streamClosed = true;
      streamData.close();
    }
  };

  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      closeStream();
      return new Response(JSON.stringify({ error: 'Invalid request body — messages[] required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const { messages, userId, cartItemIds } = body as {
      messages: import('ai').CoreMessage[];
      userId?: string;
      cartItemIds?: string[];
    };

    // Inject user context into system prompt so the LLM knows login state
    const systemWithContext = userId
      ? `${SYSTEM_PROMPT}\n\nCURRENT USER: logged in (user_id: ${userId}).${
          cartItemIds?.length
            ? ` Cart item IDs: ${cartItemIds.join(', ')}.`
            : ' Cart is empty.'
        }`
      : `${SYSTEM_PROMPT}\n\nCURRENT USER: not logged in. Remind them to log in for cart and order features.`;

    // Keep only the last 10 messages to reduce token usage
    const trimmedMessages = messages.slice(-10);

    const latestUserText = extractLatestUserText(trimmedMessages);
    const forceRealProductData = looksLikeProductRequest(latestUserText);
    const forceDetailResponse = !forceRealProductData && looksLikeDetailRequest(latestUserText);

    let systemForTurn = systemWithContext;
    let toolsForTurn: typeof agentTools | undefined = agentTools;
    let maxStepsForTurn = 3;

    if (forceRealProductData) {
      const { minPrice, maxPrice } = extractPriceBounds(latestUserText);

      const { data: products, error } = await getSupabaseAdmin()
        .from('products')
        .select('id,name,price,category,stock,images,is_featured,created_at,description,material,capacity,dimensions,weight,care')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[api/chat] product context query error:', error.message);
      }

      // Score products by keyword overlap with the query so the most relevant
      // items are presented first in the product-card carousel.
      const queryWords = latestUserText.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

      const safeProducts = (products ?? [])
        .filter((p) => (p.stock ?? 0) > 0)
        .filter((p) => (minPrice == null ? true : Number(p.price) >= minPrice))
        .filter((p) => (maxPrice == null ? true : Number(p.price) <= maxPrice))
        .sort((a, b) => {
          const scoreA = queryWords.filter(
            (w) =>
              (a.name ?? '').toLowerCase().includes(w) ||
              (a.description ?? '').toLowerCase().includes(w) ||
              (a.category ?? '').toLowerCase().includes(w),
          ).length;
          const scoreB = queryWords.filter(
            (w) =>
              (b.name ?? '').toLowerCase().includes(w) ||
              (b.description ?? '').toLowerCase().includes(w) ||
              (b.category ?? '').toLowerCase().includes(w),
          ).length;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
        })
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: p.category,
          stock: p.stock,
          image: Array.isArray(p.images) ? (p.images[0] ?? '') : '',
        }));

      streamData.append({
        type: 'PRODUCT_RESULTS',
        requestId: crypto.randomUUID(),
        products: safeProducts,
      });

      systemForTurn = `You are Bejeweled Assistant, the AI shopping helper for Bejeweled — a store selling curated rings, necklaces, bracelets, and earrings.
The products below were fetched directly from the database. Do NOT call any tools — all data is already provided.
Respond with ONE short, friendly sentence confirming the matching products are shown as cards below.
If the products list is empty, respond with: "Sorry, no matching products are available right now."
All prices are in Pakistani Rupees (PKR). Never invent product details.

PRODUCTS (authoritative):
${JSON.stringify(safeProducts)}`;

      toolsForTurn = undefined;
      maxStepsForTurn = 1;
    }

    if (forceDetailResponse) {
      // Pre-fetch all products, score by keyword match, take the best one.
      const queryWords = latestUserText.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const { data: allProducts } = await getSupabaseAdmin()
        .from('products')
        .select('id,name,price,category,stock,description,material,capacity,dimensions,weight,care')
        .limit(20);

      const best = (allProducts ?? []).sort((a, b) => {
        const score = (p: typeof a) =>
          queryWords.filter(
            (w) =>
              (p.name ?? '').toLowerCase().includes(w) ||
              (p.description ?? '').toLowerCase().includes(w),
          ).length;
        return score(b) - score(a);
      })[0];

      if (best) {
        systemForTurn = `You are Bejeweled Assistant. The user asked for details about a product. Write a helpful, friendly, detailed response using only the fields provided below. Format using **bold** labels. Include all non-null fields: Description, Material, Capacity, Dimensions, Weight, Care Instructions, Price. Do NOT call any tools.

PRODUCT:
${JSON.stringify({
  name: best.name,
  price: `Rs ${Number(best.price).toLocaleString('en-PK')}`,
  category: best.category,
  description: best.description,
  material: best.material,
  capacity: best.capacity,
  dimensions: best.dimensions,
  weight: best.weight,
  care: best.care,
})}`;
      } else {
        systemForTurn = `You are Bejeweled Assistant. The user asked for details about a product but no matching product was found. Apologise briefly and suggest they browse the shop at /shop.`;
      }
      toolsForTurn = undefined;
      maxStepsForTurn = 1;
    }

    const result = streamText({
      model: llm,
      system: systemForTurn,
      messages: trimmedMessages,
      tools: toolsForTurn,
      toolChoice: 'auto',
      maxSteps: maxStepsForTurn,
      maxTokens: 512,
      temperature: 0.3, // lower = faster, more deterministic
      onError: ({ error }) => {
        console.error('[api/chat] streamText error:', JSON.stringify(error, null, 2));
        // Must close streamData on error so the chunked HTTP response is
        // properly terminated — otherwise the client gets ERR_INCOMPLETE_CHUNKED_ENCODING.
        closeStream();
      },
      onFinish: async ({ steps, text }) => {
        // --- Log conversation exchange to DB (non-blocking, failures are silent) ---
        try {
          const assistantText = (text ?? '').trim();
          if (latestUserText && assistantText) {
            const toolsUsed = steps
              .flatMap((s) => (s as { toolCalls?: { toolName?: string }[] }).toolCalls ?? [])
              .map((tc) => tc.toolName ?? '')
              .filter(Boolean);
            const primaryIntent = forceRealProductData
              ? 'product_search'
              : toolsUsed.includes('track_order')
                ? 'order_tracking'
                : toolsUsed.includes('modify_cart')
                  ? 'cart'
                  : toolsUsed.includes('answer_faq')
                    ? 'faq'
                    : toolsUsed.includes('search_products') || toolsUsed.includes('get_recommendations')
                      ? 'product_search'
                      : 'general';
            void getSupabaseAdmin()
              .from('chat_logs')
              .insert({
                user_id: userId ?? null,
                user_message: latestUserText.slice(0, 1000),
                assistant_message: assistantText.slice(0, 2000),
                intent: primaryIntent,
                tools_used: toolsUsed,
                model_used: MODEL_ID,
              })
              .then(({ error: logErr }) => {
                if (logErr) console.warn('[api/chat] Failed to log conversation:', logErr.message);
              });
          }
        } catch (logErr) {
          console.warn('[api/chat] Log error:', logErr);
        }

        // --- Walk steps for CART_UPDATED events ---
        try {
          for (const step of steps) {
            for (const toolResult of (step as { toolResults?: { result: unknown }[] }).toolResults ?? []) {
              const res = toolResult.result as Record<string, unknown> | null;
              if (res?.__event === 'CART_UPDATED') {
                streamData.append({ type: 'CART_UPDATED', ...res });
              }
            }
          }
        } catch (err) {
          console.error('[api/chat] onFinish error:', err);
        } finally {
          closeStream();
        }
      },
    });

    return result.toDataStreamResponse({ data: streamData, headers: CORS_HEADERS });
  } catch (e) {
    const err = e as Error;
    console.error('[api/chat] Error:', err.message);
    closeStream();
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
