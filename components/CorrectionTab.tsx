import React, { useState, useEffect, useMemo } from 'react';
import { Play, Copy, Download, AlertTriangle, Loader2, List, RotateCcw } from 'lucide-react';
import Button from './ui/Button';
import TextArea from './ui/TextArea';
import BlockList from './ui/BlockList';
import { generateCorrection, regenerateSingleBlock } from '../services/geminiService';
import { GenerationState } from '../types';
import { parseSRT, blocksToSRT, SrtBlock, calculateDuration, getSRTDuration, chunkRawText } from '../utils/srtUtils';

const CorrectionTab: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [batchSizeChars, setBatchSizeChars] = useState(5000); 
  const [blocks, setBlocks] = useState<SrtBlock[]>([]);
  const [regeneratingBlockId, setRegeneratingBlockId] = useState<number | null>(null);
  
  // Range State
  const [processRange, setProcessRange] = useState({ start: 1, end: 10 });
  
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [genState, setGenState] = useState<GenerationState>({
    isLoading: false,
    output: null,
    error: null,
  });

  const inputCharCount = inputText.length;
  const inputDuration = calculateDuration(inputText);
  
  // Memoize chunks so we don't recalculate constantly
  const chunks = useMemo(() => {
    if (!inputText) return [];
    return chunkRawText(inputText, batchSizeChars);
  }, [inputText, batchSizeChars]);

  // Auto-update range end when chunks change
  useEffect(() => {
    if (chunks.length > 0) {
      setProcessRange(prev => ({ 
        start: prev.start, 
        end: Math.min(chunks.length, prev.start + 19) // Default to next 20 chunks
      }));
    }
  }, [chunks.length]);

  const handleProcessRange = async () => {
    if (!inputText.trim()) return;
    if (processRange.start > processRange.end || processRange.start < 1) return;

    setGenState({ isLoading: true, output: '', error: null });
    
    // We only process the slice determined by the user
    // Convert 1-based index to 0-based
    const startIdx = processRange.start - 1;
    const endIdx = Math.min(processRange.end, chunks.length);
    const chunksToProcess = chunks.slice(startIdx, endIdx);
    
    setProgress({ current: 0, total: chunksToProcess.length });

    // Important: We append to existing blocks if we are continuing, 
    // BUT we need to be careful about IDs. 
    // Ideally, we find the last ID of the current blocks list to start numbering.
    let currentIdStart = blocks.length > 0 ? blocks[blocks.length - 1].id + 1 : 1;
    
    // If the user skipped chunks (e.g., processed 1-5, then jumped to 10-15), 
    // the ID continuity might break logic visually, but we will maintain SRT validity.
    // However, usually users process sequentially. 
    
    // Safety check: If processing from start (chunk 1), clear previous blocks
    let currentBlocks = processRange.start === 1 ? [] : [...blocks];
    if (processRange.start === 1) {
        setBlocks([]);
        currentIdStart = 1;
    }

    try {
      for (let i = 0; i < chunksToProcess.length; i++) {
        const chunk = chunksToProcess[i];
        
        // Generate SRT for this chunk
        const srtChunk = await generateCorrection(chunk, currentIdStart);
        const parsedChunk = parseSRT(srtChunk);
        
        if (parsedChunk.length > 0) {
           currentBlocks = [...currentBlocks, ...parsedChunk];
           // Determine next ID based on the last one received
           currentIdStart = parsedChunk[parsedChunk.length - 1].id + 1;
        }

        // Update UI progressively
        setBlocks(currentBlocks); 
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }
      
      setGenState(prev => ({ ...prev, isLoading: false, output: blocksToSRT(currentBlocks) }));

      // Auto-advance range for next batch
      if (endIdx < chunks.length) {
         const nextStart = endIdx + 1;
         setProcessRange({
            start: nextStart,
            end: Math.min(chunks.length, nextStart + 19)
         });
      }

    } catch (err: any) {
      setGenState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  const handleRegenerateBlock = async (block: SrtBlock) => {
    setRegeneratingBlockId(block.id);
    try {
      const newText = await regenerateSingleBlock(block.text, block.startTime, block.endTime);
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, text: newText, isError: false } : b));
    } catch (error) {
      console.error("Failed to regenerate block", error);
    } finally {
      setRegeneratingBlockId(null);
    }
  };

  const handleManualEdit = (id: number, newText: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, text: newText } : b));
  };

  const handleDownload = () => {
    if (blocks.length === 0) return;
    const finalSrt = blocksToSRT(blocks);
    const blob = new Blob([finalSrt], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corrected.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
      {/* Input Column */}
      <div className="flex flex-col gap-4 h-full">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col h-full">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-medium text-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold">1</span>
                Raw Transcription
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Split large files into ranges to avoid timeout.</p>
            </div>
             <div className="flex flex-col items-end">
               <label className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Batch Size (Chars)</label>
               <input 
                 type="number" 
                 className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-24 text-right text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                 value={batchSizeChars}
                 onChange={(e) => setBatchSizeChars(Number(e.target.value))}
                 step={1000}
                 min={1000}
                 disabled={genState.isLoading}
               />
            </div>
          </div>
          
          <div className="flex gap-4 text-xs text-slate-400 mb-4 bg-slate-800 p-2 rounded border border-slate-700 items-center">
            <div className="flex flex-col">
               <span className="uppercase tracking-wider font-semibold opacity-70">Length</span>
               <span className="text-indigo-400 font-mono">{inputCharCount.toLocaleString()}</span>
            </div>
            <div className="w-px h-6 bg-slate-700"></div>
            <div className="flex flex-col">
               <span className="uppercase tracking-wider font-semibold opacity-70">Batches</span>
               <span className="text-indigo-400 font-mono">{chunks.length}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
               <span className="uppercase tracking-wider font-semibold opacity-70 text-[10px]">Process Batches:</span>
               <input 
                 type="number" 
                 min={1} 
                 max={chunks.length}
                 value={processRange.start}
                 onChange={(e) => setProcessRange(prev => ({ ...prev, start: parseInt(e.target.value) || 1 }))}
                 className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-center text-white"
               />
               <span className="text-slate-500">-</span>
               <input 
                 type="number" 
                 min={processRange.start}
                 max={chunks.length}
                 value={processRange.end}
                 onChange={(e) => setProcessRange(prev => ({ ...prev, end: parseInt(e.target.value) || 1 }))}
                 className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-center text-white"
               />
            </div>
          </div>

          <TextArea
            placeholder="Paste raw text here (supports 10h+ scripts)..."
            className="flex-grow min-h-0 resize-none"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={genState.isLoading}
          />
          <div className="mt-4 flex justify-between items-center">
             <div className="text-xs text-slate-500">
                {chunks.length > 0 && `Processing ${processRange.end - processRange.start + 1} batches`}
             </div>
            <Button onClick={handleProcessRange} isLoading={genState.isLoading} disabled={!inputText.trim() || chunks.length === 0}>
              {genState.isLoading ? `Processing ${progress.current}/${progress.total}` : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {processRange.start === 1 ? 'Start Processing' : 'Resume Processing'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Output Column */}
      <div className="flex flex-col gap-4 h-full">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-full flex flex-col">
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <h3 className="text-lg font-medium text-slate-100 flex items-center gap-2">
               <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">2</span>
              SRT Blocks
              {genState.isLoading && (
                <span className="text-xs font-normal text-emerald-500/80 flex items-center ml-2">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> 
                  Generating...
                </span>
              )}
            </h3>
            <div className="flex gap-2 items-center">
                {blocks.length > 0 && (
                  <button 
                    onClick={() => setBlocks([])}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    title="Clear All Blocks"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
               <div className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700 flex items-center">
                  Total: <span className="text-emerald-400 ml-1 font-mono">{blocks.length}</span>
               </div>
              <Button variant="secondary" onClick={handleDownload} disabled={blocks.length === 0} className="!px-3 !py-1">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {genState.error && (
             <div className="mb-4 bg-red-900/20 border border-red-500/30 p-3 rounded text-red-400 text-sm flex items-center gap-2">
               <AlertTriangle className="w-4 h-4" />
               {genState.error}
             </div>
          )}

          {/* Progress Bar */}
          {genState.isLoading && progress.total > 0 && (
            <div className="w-full h-1 bg-slate-700 rounded-full mb-4 overflow-hidden">
               <div 
                 className="h-full bg-emerald-500 transition-all duration-300"
                 style={{ width: `${(progress.current / progress.total) * 100}%` }}
               />
            </div>
          )}

          {/* New Dynamic Vertical Block List */}
          <div className="flex-grow bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col relative min-h-0">
             {blocks.length > 0 ? (
               <BlockList 
                 blocks={blocks}
                 onUpdateBlock={handleManualEdit}
                 onRegenerateBlock={handleRegenerateBlock}
                 regeneratingId={regeneratingBlockId}
               />
             ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm p-4 text-center">
                   <List className="w-8 h-8 mb-2 opacity-20" />
                   <p>Blocks will appear here.</p> 
                   <p className="text-xs mt-1 opacity-60">Use the batch controls to process large files in steps.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrectionTab;