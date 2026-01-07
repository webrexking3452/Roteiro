import { GoogleGenAI } from "@google/genai";
import { EnhancementParams } from "../types";
import { SrtBlock, blocksToSRT, parseSRT } from "../utils/srtUtils";

const API_KEY = process.env.API_KEY || '';

// System instruction based on the "agent_profile" from the JSON
const SYSTEM_INSTRUCTION = `
You are an expert specialist in transcription, semantic revision, narrative validation, and stylistic adaptation of long scripts.

Role Profile:
- Expertise: Absolute mastery of SRT format, Multilingual support, Long-form scripts (5-10+ hours).
- Primary Directive: NEVER invent content. Flag inconsistency risks. Preserve factual veracity.
- Length Constraint: The output content volume MUST strictly match the input volume (Tolerance +/- 10%).

Format Requirements for SRT:
- Standard SRT format with index, timestamp (00:00:00,000 --> 00:00:00,000), and text.
- Interval duration: Average 2 to 3 seconds per block.
- Max lines per block: 2.

Safety Protocol:
- If you detect a context error or potential hallucination in the source text, mark the block content with: [⚠ POSSÍVEL ERRO DE CONTEXTO — REGERAR ESTE BLOCO]
`;

const handleGeminiError = (error: any): string => {
  console.error("Gemini API Error Details:", error);
  let errorMessage = error.message || "An unknown error occurred.";
  if (errorMessage.includes("429")) return "Rate limit exceeded. Waiting...";
  return `AI Service Error: ${errorMessage}`;
};

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const generateCorrection = async (
  rawTextChunk: string,
  startId: number = 1
): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
  TASK: CORREÇÃO + DIVISÃO TEMPORAL SRT
  
  Instructions:
  1. Correct grammar/semantics of the text below.
  2. Split into SRT blocks (2-3 seconds each).
  3. IMPORTANT: Start numbering blocks at ID ${startId}.
  4. Return ONLY the valid SRT output.

  Input Text:
  """
  ${rawTextChunk}
  """
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Faster for raw correction
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      }
    });
    return response.text || "";
  } catch (error: any) {
    throw new Error(handleGeminiError(error));
  }
};

export const regenerateSingleBlock = async (
  blockText: string,
  startTime: string,
  endTime: string
): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `
  TASK: REGENERATE SPECIFIC SRT BLOCK
  
  Timestamp: ${startTime} --> ${endTime}
  Original Flawed Text: "${blockText}"

  Instruction: Rewrite the text to be semantically correct and natural. Return ONLY the text lines.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { temperature: 0.3 }
    });
    return response.text?.trim() || blockText;
  } catch (error: any) {
    throw new Error(handleGeminiError(error));
  }
};

// New Batch Enhancement Function
export const enhanceBatch = async (
  blocks: SrtBlock[],
  params: EnhancementParams
): Promise<SrtBlock[]> => {
  if (!API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const srtInput = blocksToSRT(blocks);

  const prompt = `
  TASK: OTIMIZAÇÃO NARRATIVA EM LOTE (SRT)
  
  Objective: Rewrite the subtitle text to be more engaging and fluid based on parameters, BUT KEEP EXACT TIMESTAMPS AND IDs.
  
  Parameters:
  - Redundancy: ${params.redundancy}
  - Emotion: ${params.emotion}
  - Pacing: ${params.pacing}
  
  Strict Rules:
  1. You must return exactly ${blocks.length} blocks.
  2. Use the exact same IDs: ${blocks[0].id} to ${blocks[blocks.length-1].id}.
  3. Use the exact same Timestamps.
  4. Only change the text content.
  
  Input SRT Chunk:
  """
  ${srtInput}
  """

  Output: Provide valid SRT format for these blocks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const outputText = response.text || "";
    const parsedBlocks = parseSRT(outputText);

    // Validation: If AI drops blocks, we fallback to original for the missing ones to prevent breaking the chain
    if (parsedBlocks.length !== blocks.length) {
       console.warn(`Batch mismatch: Sent ${blocks.length}, received ${parsedBlocks.length}. Attempting to merge.`);
    }

    // Map new text to original blocks to ensure integrity
    return blocks.map(original => {
      const newBlock = parsedBlocks.find(p => p.id === original.id);
      return newBlock ? { ...original, text: newBlock.text } : { ...original, isError: true };
    });

  } catch (error: any) {
    console.error("Batch failed", error);
    // Return originals marked as error on failure
    return blocks.map(b => ({ ...b, isError: true }));
  }
};

export const generateStyleTransfer = async (
  srtContent: string,
  styleReference: string,
  onStream: (chunk: string) => void
): Promise<string> => {
   // Kept simpler for brevity, but logically should follow the batch pattern if content is huge
   // For now, using the stream approach
  if (!API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `
  TASK: STYLE TRANSFER
  Style: "${styleReference.substring(0, 500)}..."
  
  Apply this style to the SRT below. Maintain strict SRT format.
  
  Input SRT:
  """
  ${srtContent}
  """
  `;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { temperature: 0.6 }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onStream(text);
      }
    }
    return fullText;
  } catch (error: any) {
    throw new Error(handleGeminiError(error));
  }
};
