import React, { useState } from 'react';
import { Layers, Wand2, Paintbrush, FileText } from 'lucide-react';
import CorrectionTab from './components/CorrectionTab';
import EnhancementTab from './components/EnhancementTab';
import StyleTab from './components/StyleTab';
import { WorkflowTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkflowTab>(WorkflowTab.CORRECTION);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">SubScript AI</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">SRT Studio</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Gemini 2.0 Flash / Pro
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
               <span className="text-xs font-bold text-slate-400">AI</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
        
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab(WorkflowTab.CORRECTION)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === WorkflowTab.CORRECTION
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 mr-2" />
            1. Correction & Splitting
          </button>
          
          <button
            onClick={() => setActiveTab(WorkflowTab.ENHANCEMENT)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === WorkflowTab.ENHANCEMENT
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            2. Narrative Enhancement
          </button>
          
          <button
            onClick={() => setActiveTab(WorkflowTab.STYLE_TRANSFER)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === WorkflowTab.STYLE_TRANSFER
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Paintbrush className="w-4 h-4 mr-2" />
            3. Style Transfer
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-grow min-h-0 pb-8">
          <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === WorkflowTab.CORRECTION && <CorrectionTab />}
            {activeTab === WorkflowTab.ENHANCEMENT && <EnhancementTab />}
            {activeTab === WorkflowTab.STYLE_TRANSFER && <StyleTab />}
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;