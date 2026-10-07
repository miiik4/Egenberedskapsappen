import { ApiError, GoogleGenAI, type Part } from '@google/genai';

import { ANALYSIS_SCHEMA, analysisPrompt, VERIFY_SCHEMA, verifyPrompt, type Scene } from './prompt.js';

/**
 * The model behind the analysis, kept behind this interface so it can be swapped, and faked
 * in tests. Both calls get JPEGs and return parsed JSON, or throw.
 */
export interface VisionModel {
  /** One pass over all the photos: the things in them, which photo each is clearest in, and where. */
  findItems(frames: Buffer[], scene: Scene): Promise<unknown>;
  /** Is the named thing actually in each crop? One verdict per crop, in order. */
  verifyCrops(crops: { name: string; image: Buffer }[]): Promise<unknown>;
}

export type GeminiOptions = {
  project: string;
  /** A Vertex AI region. Photos are processed where the model runs, so this must be in the EU. */
  location: string;
  /** Reasons over the photos; the bigger model, since this is where quality comes from. */
  analystModel: string;
  /** Checks the crops; a small, fast model is plenty. */
  verifierModel: string;
};

/**
 * Gemini on Vertex AI, as Idimy runs it: Pro finds the things, Flash checks the crops. Uses the
 * functions' service account, which needs the Vertex AI User role.
 */
export function gemini(options: GeminiOptions): VisionModel {
  const ai = new GoogleGenAI({ vertexai: true, project: options.project, location: options.location });

  const ask = async (model: string, parts: Part[], schema: object, temperature: number) => {
    const res = await withRetry(() =>
      ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: { temperature, responseMimeType: 'application/json', responseSchema: schema },
      }),
    );
    return JSON.parse(res.text ?? '') as unknown;
  };
  const image = (data: Buffer): Part => ({ inlineData: { mimeType: 'image/jpeg', data: data.toString('base64') } });

  return {
    findItems(frames, scene) {
      const parts: Part[] = frames.flatMap((frame, i) => [{ text: `Bilde ${i}:` }, image(frame)]);
      parts.push({ text: analysisPrompt(scene, frames.length) });
      return ask(options.analystModel, parts, ANALYSIS_SCHEMA, 0.2);
    },
    verifyCrops(crops) {
      const parts: Part[] = crops.flatMap((crop, i) => [{ text: `Bilde ${i}: forventet gjenstand: "${crop.name}".` }, image(crop.image)]);
      parts.push({ text: verifyPrompt(crops.length) });
      return ask(options.verifierModel, parts, VERIFY_SCHEMA, 0);
    },
  };
}

/** Retries when Vertex is busy or rate-limited (429, 503), with backoff. Anything else fails at once. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4, baseMs = 1000): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (attempt >= attempts || (status !== 429 && status !== 503)) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** (attempt - 1) * (0.75 + Math.random() / 2)));
    }
  }
}
