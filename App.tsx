
import React, { useState, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import LeftSidebar from './components/LeftSidebar';
import ChatInterface from './components/ChatInterface';
import Viewport from './components/Viewport';
import { InstallWizard } from './components/InstallWizard';
import { Tool, ImageState, Measurement, ChatMessage } from './types';
import { geminiService } from './services/geminiService';
import { Activity, ShieldCheck } from './components/Icons';

const SERIES_IMAGES = [
  "https://picsum.photos/1024/1024?random=10",
  "https://picsum.photos/1024/1024?random=11",
  "https://picsum.photos/1024/1024?random=12"
];

const DEFAULT_IMAGE = SERIES_IMAGES[0];

const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const bootLogs = [
    "NeuroView Kernel v3.0.0 Global: OK",
    "DICOM Local Buffer: SINCRONIZADO",
    "Sessão Sem Credenciais: ATIVA",
    "Handshake Gemini 3 Pro: OK",
    "Ambiente Desbloqueado: PRONTO"
  ];

  useEffect(() => {
    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < bootLogs.length) {
        setLogs(prev => [...prev, `> ${bootLogs[currentLog]}`]);
        setProgress((currentLog + 1) * (100 / bootLogs.length));
        currentLog++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 400);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 font-mono">
      <div className="w-full max-w-md animate-in fade-in duration-700">
        <div className="flex items-center gap-3 mb-12 text-blue-500 justify-center">
          <Activity size={40} className="animate-pulse" />
          <span className="text-3xl font-bold tracking-tighter">NEUROVIEW v3</span>
        </div>
        <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6 mb-6 h-48 overflow-hidden flex flex-col justify-end backdrop-blur-md">
          {logs.map((log, i) => (
            <div key={i} className="text-blue-400 text-[10px] mb-1 opacity-80 animate-in slide-in-from-left-4">{log}</div>
          ))}
        </div>
        <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.5)]" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-3 text-[9px] text-neutral-600 uppercase tracking-widest font-bold">
          <span>Loading Global Instance</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [appState, setAppState] = useState<'checking' | 'uninstalled' | 'booting' | 'ready'>('checking');
  const [activeTool, setActiveTool] = useState<Tool>('pan');
  const [imageSrc, setImageSrc] = useState<string>(DEFAULT_IMAGE);
  const [seriesImages, setSeriesImages] = useState<string[]>(SERIES_IMAGES);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [imageState, setImageState] = useState<ImageState>({
    scale: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, invert: false,
    pixelSpacing: 0.5, colormap: 'none', showSegmentation: false
  });

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'Bem-vindo ao NeuroView AI v3.0 Global. Sistema desbloqueado e ferramentas IA Gemini 3 Pro prontas para uso.' }
  ]);

  useEffect(() => {
    const installed = localStorage.getItem('nv_installed');
    if (installed) {
      setAppState('booting');
    } else {
      setAppState('uninstalled');
    }
  }, []);

  const handleReset = () => {
    setImageState(prev => ({ ...prev, scale: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, invert: false, colormap: 'none', showSegmentation: false }));
    setMeasurements([]);
  };

  const handleAIAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: "Solicitando análise técnica da IA..." }]);
    try {
        const prompt = `Analise esta imagem médica. Descreva achados técnicos e anatômicos. Use terminologia médica brasileira formal.`;
        const response = await geminiService.analyzeImage(imageSrc, prompt);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: response }]);
    } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Falha na conexão com os servidores de IA v3." }]);
    } finally {
        setIsAnalyzing(false);
    }
  };

  if (appState === 'checking') return <div className="h-screen w-screen bg-black" />;
  if (appState === 'uninstalled') return <InstallWizard onComplete={() => setAppState('booting')} />;
  if (appState === 'booting') return <BootSequence onComplete={() => setAppState('ready')} />;

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-gray-100 overflow-hidden font-sans">
      <svg className="hidden">
        <defs>
          <filter id="colormap-hot"><feColorMatrix type="matrix" values="3 0 0 0 -1 3 3 0 0 -1 0 0 0 0 0 0 0 0 1 0" /></filter>
          <filter id="colormap-jet"><feColorMatrix type="hueRotate" values="180"/><feColorMatrix type="saturate" values="5"/></filter>
          <filter id="colormap-purples"><feColorMatrix type="matrix" values="0.3 0 0 0 0 0 0.8 0 0 0 0 0 1.2 0 0 0 0 0 1 0" /></filter>
        </defs>
      </svg>

      <header className="h-12 bg-[#050505] border-b border-neutral-800 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 text-blue-500 font-bold tracking-tighter">
            <Activity size={20} />
            <span className="text-base uppercase">NeuroView <span className="text-neutral-700 font-mono text-xs ml-1">v3.0 Global</span></span>
          </div>
          <div className="h-5 w-px bg-neutral-800 mx-2" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Acesso Público Irrestrito</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-neutral-900/50 px-3 py-1 rounded-full border border-neutral-800">
            <ShieldCheck size={14} className="text-blue-500" />
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-tighter">Sessão Ativa</span>
          </div>
        </div>
      </header>

      <Toolbar 
        activeTool={activeTool} setTool={setActiveTool} imageState={imageState}
        onImageChange={(k, v) => setImageState(prev => ({...prev, [k]: v}))} 
        onReset={handleReset} onAnalyze={handleAIAnalyze}
        onExport={() => {}} isAnalyzing={isAnalyzing}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar 
            imageState={imageState} 
            onImageChange={(k, v) => setImageState(prev => ({...prev, [k]: v}))} 
            onFileUpload={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const url = URL.createObjectURL(file);
                    handleReset();
                    setImageSrc(url);
                    setSeriesImages([url]);
                }
            }}
            seriesImages={seriesImages} onSelectSeriesImage={setImageSrc}
            currentImageSrc={imageSrc}
        />
        <Viewport 
          imageSrc={imageSrc} tool={activeTool} imageState={imageState} setImageState={setImageState}
          measurements={measurements} setMeasurements={setMeasurements}
        />
        <ChatInterface messages={messages} setMessages={setMessages} />
      </div>
    </div>
  );
}

export default App;
