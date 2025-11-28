
import React, { useState } from 'react';
import Toolbar from './components/Toolbar';
import LeftSidebar from './components/LeftSidebar';
import ChatInterface from './components/ChatInterface';
import Viewport from './components/Viewport';
import { Tool, ImageState, Measurement, ChatMessage } from './types';
import { geminiService } from './services/geminiService';
import { Activity } from './components/Icons';

// Demo Series
const SERIES_IMAGES = [
  "https://picsum.photos/1024/1024?random=1",
  "https://picsum.photos/1024/1024?random=2",
  "https://picsum.photos/1024/1024?random=3",
  "https://picsum.photos/1024/1024?random=4"
];

const DEFAULT_IMAGE = SERIES_IMAGES[0];

function App() {
  const [activeTool, setActiveTool] = useState<Tool>('pan');
  const [imageSrc, setImageSrc] = useState<string>(DEFAULT_IMAGE);
  const [seriesImages, setSeriesImages] = useState<string[]>(SERIES_IMAGES);
  
  const [imageState, setImageState] = useState<ImageState>({
    scale: 1,
    panX: 0,
    panY: 0,
    brightness: 100,
    contrast: 100,
    invert: false,
    pixelSpacing: 0.5, // Default: 1 pixel = 0.5mm
    colormap: 'none',
    showSegmentation: false
  });

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'Olá. Sou a IA de auxílio diagnóstico. Carregue uma imagem ou faça uma pergunta para começar.' }
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Handlers ---
  const handleReset = () => {
    setImageState({
      scale: 1,
      panX: 0,
      panY: 0,
      brightness: 100,
      contrast: 100,
      invert: false,
      pixelSpacing: 0.5,
      colormap: 'none',
      showSegmentation: false
    });
    setMeasurements([]);
  };

  const handleImageChange = (key: keyof ImageState, value: any) => {
    // If enabling segmentation, perform a simulated "adjustment" to the image processing
    if (key === 'showSegmentation' && value === true) {
       // Slight contrast boost to simulate "edge detection processing"
       setImageState(prev => ({ 
           ...prev, 
           [key]: value,
           contrast: prev.contrast < 110 ? 120 : prev.contrast,
           brightness: prev.brightness > 95 ? 90 : prev.brightness
       }));
       // Optional: Add a system message
       if (!imageState.showSegmentation) {
           setMessages(prev => [...prev, {
               id: Date.now().toString(),
               role: 'model',
               text: 'Segmentação ativada: Processando bordas anatômicas e alinhamento axial.'
           }]);
       }
    } else {
       setImageState(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (typeof evt.target?.result === 'string') {
          const newSrc = evt.target.result;
          setImageSrc(newSrc);
          setSeriesImages([newSrc]); // Clear demo series for uploaded file
          handleReset();
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Novo estudo carregado: ${file.name}` }]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    // Simple download of the underlying source for this demo version
    // In a real app, this would use html2canvas or canvas.toDataURL on a composite canvas
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `neuroview-export-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Notify user
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'model', 
      text: "Imagem salva com sucesso (exportação do arquivo original)." 
    }]);
  };

  const handleAIAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    
    // Create a temporary User message
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: "Iniciando varredura e leitura automática da imagem..." };
    setMessages(prev => [...prev, userMsg]);

    try {
        // We need to get the image data.
        let imageData = imageSrc;
        
        if (!imageSrc.startsWith('data:')) {
            // Fallback for demo images if not data URI
            const msg: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'model', 
                text: "Eu só posso realizar uma análise visual profunda em imagens carregadas localmente (Data URI). Por favor, faça o upload de um arquivo." 
            };
            setMessages(prev => [...prev, msg]);
            setIsAnalyzing(false);
            return;
        }

        // Construct a context-aware prompt
        let contextInfo = "";
        if (imageState.colormap !== 'none') {
          contextInfo += ` NOTA: Uma paleta de cores falsa (${imageState.colormap}) foi aplicada pelo usuário para realçar densidades.`;
        }
        if (imageState.showSegmentation) {
          contextInfo += ` NOTA: A segmentação anatômica está ativa, destacando pulmões (azul), costelas (roxo) e eixo central (verde).`;
        }
        if (measurements.length > 0) {
          contextInfo += ` NOTA: O usuário realizou ${measurements.length} medições na imagem.`;
        }

        // Prompt specifically designed for "reading" the image like a scanner/report
        const prompt = `Realize uma leitura técnica completa desta imagem.${contextInfo} 1. Identifique a modalidade (ex: TC, RM, Raio-X). 2. Descreva a região anatômica e o plano. 3. Liste observações principais como um radiologista faria. 4. Destaque qualquer área de interesse clínico.`;

        const response = await geminiService.analyzeImage(imageData, prompt);
        
        const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: response };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Falha na análise." }]);
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-gray-100 overflow-hidden">
      
      {/* SVG Filters Definition (Hidden) */}
      <svg className="hidden">
        <defs>
          {/* HOT MAP: Black -> Red -> Yellow -> White */}
          <filter id="colormap-hot">
             <feColorMatrix type="matrix" values="
                3 0 0 0 -1 
                3 3 0 0 -1 
                0 0 0 0 0 
                0 0 0 1 0" />
          </filter>
          
          {/* JET MAP Simulation (Approximation via Hue Rotate in Matrix) */}
          <filter id="colormap-jet">
            <feColorMatrix type="hueRotate" values="180"/>
            <feColorMatrix type="saturate" values="5"/>
          </filter>

           {/* PURPLES MAP */}
           <filter id="colormap-purples">
             <feColorMatrix type="matrix" values="
                0.3 0 0 0 0
                0 0.8 0 0 0
                0 0 1.2 0 0
                0 0 0 1 0" />
           </filter>
        </defs>
      </svg>

      {/* Header */}
      <header className="h-12 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2 text-blue-500 font-bold text-lg">
          <Activity />
          <span>NeuroView<span className="text-gray-400 font-light text-sm ml-1">AI Pro v2.0 (BR)</span></span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
            PACIENTE: ANÔNIMO | ID: 93847-XF
        </div>
      </header>

      {/* Main Toolbar */}
      <Toolbar 
        activeTool={activeTool} 
        setTool={setActiveTool} 
        imageState={imageState}
        onImageChange={handleImageChange}
        onReset={handleReset}
        onAnalyze={handleAIAnalyze}
        onExport={handleExport}
        isAnalyzing={isAnalyzing}
      />

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Controls */}
        <LeftSidebar 
            imageState={imageState} 
            onImageChange={handleImageChange}
            onFileUpload={handleFileUpload}
            seriesImages={seriesImages}
            onSelectSeriesImage={(src) => {
              setImageSrc(src);
              handleReset();
            }}
            currentImageSrc={imageSrc}
        />

        {/* Center Viewport */}
        <Viewport 
          imageSrc={imageSrc} 
          tool={activeTool}
          imageState={imageState}
          setImageState={setImageState}
          measurements={measurements}
          setMeasurements={setMeasurements}
        />

        {/* Right Chat */}
        <ChatInterface 
          messages={messages} 
          setMessages={setMessages}
        />

      </div>
    </div>
  );
}

export default App;
