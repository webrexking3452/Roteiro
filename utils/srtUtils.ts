export interface SrtBlock {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
  originalText?: string; // For comparison/preview
  isError?: boolean;
}

export const parseSRT = (data: string): SrtBlock[] => {
  const pattern = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n((?:(?!\d+\n\d{2}:\d{2}:\d{2},\d{3} -->).)*)/gs;
  const blocks: SrtBlock[] = [];
  let match;

  while ((match = pattern.exec(data)) !== null) {
    blocks.push({
      id: parseInt(match[1], 10),
      startTime: match[2],
      endTime: match[3],
      text: match[4].trim(),
      originalText: match[4].trim(),
    });
  }
  return blocks;
};

export const blocksToSRT = (blocks: SrtBlock[]): string => {
  return blocks
    .map((b) => `${b.id}\n${b.startTime} --> ${b.endTime}\n${b.text}\n`)
    .join('\n');
};

export const calculateDuration = (text: string): string => {
  const CHARS_PER_SECOND = 15;
  const seconds = Math.ceil(text.length / CHARS_PER_SECOND);
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const getSRTDuration = (blocks: SrtBlock[]): string => {
  if (blocks.length === 0) return "00:00:00";
  return blocks[blocks.length - 1].endTime.split(',')[0];
};

// New utility to split huge raw text into manageable chunks for the AI
export const chunkRawText = (text: string, maxChars: number = 5000): string[] => {
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by double newlines to preserve paragraphs if possible
  const paragraphs = text.split(/\n\s*\n/);

  for (const para of paragraphs) {
    if ((currentChunk.length + para.length) > maxChars) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  // Fallback: If a single paragraph is huge, split by sentences
  // (Simplified for this example, assuming paragraphs work for most)
  return chunks;
};

// Re-index blocks correctly after merging batches
export const reindexBlocks = (blocks: SrtBlock[]): SrtBlock[] => {
  return blocks.map((b, index) => ({
    ...b,
    id: index + 1
  }));
};
