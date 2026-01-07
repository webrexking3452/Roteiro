import React, { useState } from 'react';
import { Palette, Copy, Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import TextArea from './ui/TextArea';
import { generateStyleTransfer } from '../services/geminiService';
import { GenerationState } from '../types';

const StyleTab: React.FC = () => {
  const [inputSrt, setInputSrt] = useState('');
  const [styleRef, setStyleRef] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [genState, setGenState] = useState<GenerationState>({
    isLoading: false,
    output: null,
    error: null,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsReadingFile(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setInputSrt(event.target.result as string);
        }
        setIsReadingFile(false);
      };
      reader.onerror = () => setIsReadingFile(false);
      reader.readAsText(file);
    }
  };

  const handleProcess = async () => {
    if (!inputSrt.trim() || !styleRef.trim()) return;
    setGenState({ isLoading: true, output: '', error: null });
    try {
      await generateStyleTransfer(inputSrt, styleRef, (chunk) => {
        setGenState((prev) => ({ ...prev, output: (prev.output || '') + chunk }));
      });
      setGenState((prev) => ({ ...prev, isLoading: false }));
    } catch (err: any) {
      setGenState({ isLoading: false, output: null, error: err.message });
    }
  };

  const handleCopy = () => {
    if (genState.output) navigator.clipboard.writeText(genState.output);
  };

  const handleDownload = () => {
    if (!genState.output) return;
    const blob = new Blob([genState.output], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'styled.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Inputs Column */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        
        {/* Style Reference Input */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
          <h3 className="text-sm font-bold text-pink-400 mb-3 uppercase tracking-wide flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Style Reference
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Paste a text that represents the tone, rhythm, and narrative voice you want to apply.
          </p>
          <TextArea
            placeholder="e.g. A noir detective novel excerpt, a scientific abstract, a casual blog post..."
            className="min-h-[150px] border-pink-900/50 focus:ring-pink-500"
            value={styleRef}
            onChange={(e) => setStyleRef(e.target.value)}
            disabled={genState.isLoading || isReadingFile}
          />
        </div>

        {/* SRT Input */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex-grow flex flex-col">
           <div className="flex justify-between items-center mb-3">
             <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Target SRT</h3>
             <label className={`cursor-pointer bg-slate-700 hover:bg-slate-600 text-xs text-white py-1 px-3 rounded flex items-center transition-colors ${genState.isLoading || isReadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                {isReadingFile ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                {isReadingFile ? 'Reading...' : 'Load'}
                <input type="file" accept=".srt" className="hidden" onChange={handleFileUpload} disabled={genState.isLoading || isReadingFile} />
              </label>
           </div>
           <TextArea
             placeholder="Paste SRT content here..."
             className="flex-grow min-h-[150px]"
             value={inputSrt}
             onChange={(e) => setInputSrt(e.target.value)}
             disabled={genState.isLoading || isReadingFile}
           />
        </div>

        <Button onClick={handleProcess} isLoading={genState.isLoading} disabled={!inputSrt.trim() || !styleRef.trim() || isReadingFile} className="w-full bg-pink-600 hover:bg-pink-500 focus:ring-pink-500 shadow-pink-500/20">
          {genState.isLoading ? (
            <span>{!genState.output ? 'Thinking...' : 'Applying Style...'}</span>
          ) : (
            <>
              <Palette className="w-4 h-4 mr-2" />
              Apply Style Transfer
            </>
          )}
        </Button>
      </div>

      {/* Output Column */}
      <div className="lg:col-span-2 flex flex-col">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-slate-100 flex items-center gap-2">
               <span className="w-2 h-6 rounded bg-pink-500 block"></span>
              Stylized Output
              {genState.isLoading && (
                 <span className="text-xs font-normal text-pink-300/70 flex items-center ml-2 animate-pulse">
                   <Loader2 className="w-3 h-3 mr-1 animate-spin" /> 
                   {!genState.output ? 'Thinking...' : 'Writing...'}
                 </span>
              )}
            </h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCopy} disabled={!genState.output} className="!px-3 !py-1">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="secondary" onClick={handleDownload} disabled={!genState.output} className="!px-3 !py-1">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-grow relative bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
             {genState.error ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6 text-center bg-slate-900/90 z-10">
                 <AlertTriangle className="w-10 h-10 mb-3 opacity-80" />
                 <p className="font-medium max-w-md">{genState.error}</p>
                 <Button variant="secondary" onClick={() => setGenState(prev => ({...prev, error: null}))} className="mt-4">
                   Dismiss
                 </Button>
               </div>
             ) : (
              <>
               <textarea
                 readOnly
                 className="w-full h-full bg-slate-900 p-4 text-pink-300 font-mono text-sm focus:outline-none resize-none"
                 value={genState.output || ''}
                 placeholder="The stylized narrative will flow here..."
               />
               {genState.isLoading && !genState.output && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-20 backdrop-blur-sm transition-all duration-300">
                     <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
                        <span className="text-pink-500/80 text-sm font-medium animate-pulse">Extracting Style...</span>
                     </div>
                  </div>
               )}
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleTab;