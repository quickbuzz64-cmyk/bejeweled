// @xenova/transformers uses onnxruntime-node (native binary) which is 137 MB
// and can't run in Vercel Lambda or Edge. In production, tools fall back to
// keyword search. The embedding pipeline is only used in local dev.

export async function generateEmbedding(_text: string): Promise<number[] | null> {
  // Always return null — keyword fallback is used on Vercel.
  // Local dev: run scripts/indexProducts.ts directly if you need embeddings.
  return null;
}
