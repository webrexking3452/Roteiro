import React, { useState } from 'react';
import { Edit, RefreshCw, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { SrtBlock } from '../../utils/srtUtils';
import { Loader2 } from 'lucide-react';

interface BlockListProps {
  blocks: SrtBlock[];
  onUpdateBlock: (id: number, text: string) => void;
  onRegenerateBlock: (block: SrtBlock) => void;
  regeneratingId: number | null;
}

const BlockList: React.FC<BlockListProps> = ({ 
  blocks, 
  onUpdateBlock, 
  onRegenerateBlock, 
  regeneratingId 
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);

  if (blocks.length === 0) return null;

  return (
    <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
      {blocks.map((block) => {
        const hasError = block.text.includes('POSSÍVEL ERRO') || block.isError;
        const isRegenerating = regeneratingId === block.id;

        return (
          <div 
            key={block.id} 
            className={`group flex flex-col bg-slate-800/40 border ${hasError ? 'border-yellow-600/50 bg-yellow-900/10' : 'border-slate-700/60'} hover:border-indigo-500/30 rounded-lg p-3 transition-all duration-200`}
          >
            {/* Header: ID, Time, Tools */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                  #{block.id}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {block.startTime} → {block.endTime}
                </span>
              </div>
              
              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {/* Preview Toggle (Compare) */}
                 <button 
                  onClick={() => setPreviewId(previewId === block.id ? null : block.id)}
                  className={`p-1.5 rounded transition-colors ${previewId === block.id ? 'bg-indigo-900/50 text-indigo-300' : 'hover:bg-slate-700 text-slate-400'}`}
                  title="Preview Original vs Current"
                >
                  {previewId === block.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {/* Edit */}
                <button 
                  onClick={() => setEditingId(editingId === block.id ? null : block.id)}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                  title="Edit manually"
                  disabled={isRegenerating}
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                
                {/* Regenerate */}
                <button 
                  onClick={() => onRegenerateBlock(block)}
                  disabled={isRegenerating}
                  className={`p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-400 transition-colors ${isRegenerating ? 'cursor-not-allowed' : ''}`}
                  title="Regenerate this block"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-emerald-500' : ''}`} />
                </button>
              </div>
            </div>
            
            {/* Comparison View */}
            {previewId === block.id && block.originalText && (
               <div className="mb-2 p-2 bg-slate-900/50 rounded border-l-2 border-slate-600 text-xs text-slate-400 font-mono italic">
                  <p className="opacity-70 mb-1 text-[10px] uppercase">Original:</p>
                  {block.originalText}
               </div>
            )}

            {/* Content Area */}
            {editingId === block.id ? (
                <div className="relative animate-in fade-in zoom-in-95 duration-200">
                  <textarea 
                    className="w-full bg-slate-900 border border-indigo-500/50 rounded p-2 text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={3}
                    value={block.text}
                    onChange={(e) => onUpdateBlock(block.id, e.target.value)}
                  />
                  <button 
                    onClick={() => setEditingId(null)}
                    className="absolute bottom-2 right-2 p-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 shadow-lg"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
            ) : (
              <p className={`text-sm font-mono whitespace-pre-wrap leading-relaxed ${
                isRegenerating ? 'text-slate-500 animate-pulse' : 
                hasError ? 'text-yellow-200' : 'text-slate-200'
              }`}>
                  {isRegenerating ? 'Regenerating...' : block.text}
              </p>
            )}

            {hasError && !isRegenerating && (
              <div className="mt-2 flex items-center text-[10px] text-yellow-500 gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                <span>Potential error detected. Verify content.</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BlockList;
