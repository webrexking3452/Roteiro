import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import Select from './ui/Select';
import BlockList from './ui/BlockList';
import { enhanceBatch, regenerateSingleBlock } from '../services/geminiService';
import { GenerationState, ControlRedundancy, ControlEmotion, ControlHumor, ControlPacing, EnhancementParams } from '../types';
import { parseSRT, blocksToSRT, SrtBlock } from '../utils/srtUtils';

const EnhancementTab: React.FC = () => {
  const [blocks, setBlocks] = useState<SrtBlock[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [batchSize, setBatchSize] = useState(20); 
  
  // Range Processing State
  const [optimizeRange, setOptimizeRange] = useState({ start: 1, end: 0 });

  const [isReadingFile, setIsReadingFile] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const [params, setParams] = useState<EnhancementParams>({
    redundancy: ControlRedundancy.MEDIUM,
    emotion: ControlEmotion.NEUTRAL,
    humor: ControlHumor.NONE,
    pacing: ControlPacing.BALANCED,
    characterSubstitution: ''
  });

  const [genState, setGenState] = useState<GenerationState>({
    isLoading: false,
    output: null,
    error: null,
  });

  // Reset range when blocks are loaded
  useEffect(() => {
    if (blocks.length > 0) {
      setOptimizeRange({ start: 1, end: blocks.length });
    }
  }, [blocks.length]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsReadingFile(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const parsed = parseSRT(event.target.result as string);
          setBlocks(parsed);
          setProcessedCount(0);
          setErrorCount(0);
        }
        setIsReadingFile(false);
      };
      reader.onerror = () => setIsReadingFile(false);
      reader.readAsText(file);
    }
  };

  const handleOptimization = async () => {
    if (blocks.length === 0) return;
    if (optimizeRange.start > optimizeRange.end) return;

    setGenState({ isLoading: true, output: '', error: null });
    // Don't reset processed count completely, just track current session or cumulative?
    // Let's reset for clarity of current operation
    setProcessedCount(0);
    setErrorCount(0);
    
    // Determine subset of blocks to process
    // Arrays are 0-indexed, IDs are usually 1-indexed. 
    // Assuming optimizeRange refers to Block IDs if they are sequential, or just index positions.
    // Using index positions is safer if IDs are non-sequential.
    const startIdx = Math.max(0, optimizeRange.start - 1);
    const endIdx = Math.min(blocks.length, optimizeRange.end);
    
    const blocksSubset = blocks.slice(startIdx, endIdx);
    const totalSubset = blocksSubset.length;
    
    let currentBlocks = [...blocks];
    
    // Process in batches within the subset
    for (let i = 0; i < totalSubset; i += batchSize) {
      const batch = blocksSubset.slice(i, i + batchSize);
      
      try {
        const optimizedBatch = await enhanceBatch(batch, params);
        
        // Update the main list
        optimizedBatch.forEach((optBlock, idx) => {
           // Calculate true index in the main 'currentBlocks' array
           const trueIndex = startIdx + i + idx;
           if (currentBlocks[trueIndex]) {
             currentBlocks[trueIndex] = optBlock;
             if (optBlock.isError) setErrorCount(prev => prev + 1);
           }
        });
        
        setProcessedCount(Math.min(i + batchSize, totalSubset));
        setBlocks([...currentBlocks]); 

      } catch (err) {
        console.error("Batch Error", err);
        setErrorCount(prev => prev + batch.length);
      }
    }

    setGenState(prev => ({ ...prev, isLoading: false, output: blocksToSRT(currentBlocks) }));
  };

  const handleRegenerateBlock = async (block: SrtBlock) => {
    setRegeneratingId(block.id);
    try {
      const newText = await regenerateSingleBlock(block.text, block.startTime, block.endTime);
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, text: newText, isError: false } : b));
    } catch (error) {
       console.error(error);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleManualEdit = (id: number, text: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, text } : b));
  };

  const handleDownload = () => {
    if (blocks.length === 0) return;
    const blob = new Blob([blocksToSRT(blocks)], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Controls Sidebar */}
      <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-y-auto pr-1 custom-scrollbar">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <h3 className="text-sm font-bold text-slate-100 mb-4 uppercase tracking-wide">Narrative Controls</h3>
          
          <div className="space-y-4">
             <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-2">
                <label className="text-[10px] uppercase font-semibold text-slate-500 mb-1 block">Batch Size (Blocks)</label>
                <div className="flex items-center gap-2">
                   <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="10"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                   />
                   <span className="text-xs font-mono text-indigo-400">{batchSize}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">Lower size = more precision, slower speed.</p>
             </div>
            
            {/* Range Selection Control */}
             <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-2">
                <label className="text-[10px] uppercase font-semibold text-slate-500 mb-2 block flex justify-between">
                   <span>Target Range</span>
                   <span className="text-indigo-400">{optimizeRange.end - optimizeRange.start + 1} blocks</span>
                </label>
                <div className="flex items-center gap-2">
                   <input 
                     type="number" 
                     min={1}
                     max={blocks.length}
                     value={optimizeRange.start}
                     onChange={(e) => setOptimizeRange(prev => ({...prev, start: Math.max(1, parseInt(e.target.value)||1)}))}
                     className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white text-center"
                     placeholder="Start"
                     disabled={genState.isLoading || blocks.length === 0}
                   />
                   <span className="text-slate-500 text-xs">to</span>
                   <input 
                     type="number" 
                     min={optimizeRange.start}
                     max={blocks.length}
                     value={optimizeRange.end}
                     onChange={(e) => setOptimizeRange(prev => ({...prev, end: Math.min(blocks.length, parseInt(e.target.value)||blocks.length)}))}
                     className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white text-center"
                     placeholder="End"
                     disabled={genState.isLoading || blocks.length === 0}
                   />
                </div>
             </div>

            <Select 
              label="Redundancy"
              options={Object.values(ControlRedundancy).map(v => ({ value: v, label: v }))}
              value={params.redundancy}
              onChange={(e) => setParams({...params, redundancy: e.target.value as ControlRedundancy})}
              disabled={genState.isLoading}
            />
             <Select 
              label="Emotional Intensity"
              options={Object.values(ControlEmotion).map(v => ({ value: v, label: v }))}
              value={params.emotion}
              onChange={(e) => setParams({...params, emotion: e.target.value as ControlEmotion})}
              disabled={genState.isLoading}
            />
             <Select 
              label="Humor"
              options={Object.values(ControlHumor).map(v => ({ value: v, label: v }))}
              value={params.humor}
              onChange={(e) => setParams({...params, humor: e.target.value as ControlHumor})}
              disabled={genState.isLoading}
            />
             <Select 
              label="Pacing"
              options={Object.values(ControlPacing).map(v => ({ value: v, label: v }))}
              value={params.pacing}
              onChange={(e) => setParams({...params, pacing: e.target.value as ControlPacing})}
              disabled={genState.isLoading}
            />
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-700">
             <Button onClick={handleOptimization} isLoading={genState.isLoading} disabled={blocks.length === 0} className="w-full">
              {genState.isLoading ? 'Optimizing...' : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Optimization
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-9 flex flex-col h-full gap-4">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-full flex flex-col">
           {/* Header */}
           <div className="flex justify-between items-center mb-4 flex-shrink-0">
             <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-indigo-300">Target SRT</span>
                <label className={`cursor-pointer bg-slate-700 hover:bg-slate-600 text-xs text-white py-1 px-3 rounded flex items-center transition-colors ${genState.isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isReadingFile ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  Import SRT
                  <input type="file" accept=".srt" className="hidden" onChange={handleFileUpload} disabled={genState.isLoading} />
                </label>
             </div>

             <div className="flex gap-2 items-center">
                {errorCount > 0 && (
                   <span className="text-xs text-yellow-500 flex items-center bg-yellow-900/20 px-2 py-1 rounded">
                     <AlertTriangle className="w-3 h-3 mr-1" /> {errorCount} Errors
                   </span>
                )}
                <div className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                  Blocks: <span className="text-indigo-400 font-mono">{processedCount}/{(optimizeRange.end - optimizeRange.start + 1)}</span>
                </div>
                <Button variant="secondary" onClick={handleDownload} disabled={blocks.length === 0} className="!px-3 !py-1">
                  <Download className="w-4 h-4" />
                </Button>
             </div>
           </div>

           {/* Progress Bar */}
           {genState.isLoading && blocks.length > 0 && (
              <div className="w-full h-1 bg-slate-700 rounded-full mb-3 overflow-hidden">
                 <div 
                   className="h-full bg-indigo-500 transition-all duration-300"
                   style={{ width: `${(processedCount / (optimizeRange.end - optimizeRange.start + 1)) * 100}%` }}
                 />
              </div>
           )}

           {/* Dynamic Block List */}
           <div className="flex-grow bg-slate-900 border border-indigo-900/30 rounded-lg overflow-hidden flex flex-col relative min-h-0">
             {blocks.length > 0 ? (
                <BlockList 
                  blocks={blocks}
                  onUpdateBlock={handleManualEdit}
                  onRegenerateBlock={handleRegenerateBlock}
                  regeneratingId={regeneratingId}
                />
             ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm">
                   <Upload className="w-8 h-8 mb-2 opacity-50" />
                   <p>Import an SRT file to begin optimization.</p>
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancementTab;