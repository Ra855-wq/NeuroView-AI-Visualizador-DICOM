import React, { useState, useEffect } from 'react';
import { Tool, ColormapType, ImageState } from '../types';
import { Move, Search, SunMedium, Ruler, RotateCcw, BrainCircuit, Scale, Palette, Download, ArrowRightLeft, ScanLine, Command } from './Icons';

interface ToolbarProps {
  activeTool: Tool;
  setTool: (t: Tool) => void;
  imageState: ImageState;
  onImageChange: (key: keyof ImageState, value: any) => void;
  onReset: () => void;
  onAnalyze: () => void;
  onExport: () => void;
  isAnalyzing: boolean;
}

// Enhanced Tooltip Component
const Tooltip: React.FC<{ 
  title: string; 
  desc: string; 
  interaction?: string; 
  shortcut?: string;
  isActive?: boolean;
  children: React.ReactNode 
}> = ({ title, desc, interaction, shortcut, isActive, children }) => (
  <div className="group relative flex flex-col items-center">
    {children}
    <div className="absolute top-full mt-3 w-56 p-3 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold ${isActive ? 'text-blue-400' : 'text-gray-100'}`}>{title}</span>
        {shortcut && (
          <span className="flex items-center gap-0.5 text-[9px] font-mono bg-neutral-800 border border-neutral-600 px-1.5 py-0.5 rounded text-gray-400">
            <span className="text-[8px] opacity-70">Key</span> {shortcut}
          </span>
        )}
      </div>
      <div className="text-[10px] text-gray-400 leading-snug mb-2 border-b border-neutral-800 pb-2">
        {desc}
      </div>
      {interaction && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider">Ação:</span>
          <span className="text-[10px] text-gray-300">{interaction}</span>
        </div>
      )}
      {/* Arrow */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-neutral-900 border-t border-l border-neutral-700 rotate-45"></div>
    </div>
  </div>
);

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  setTool, 
  imageState,
  onImageChange,
  onReset, 
  onAnalyze, 
  onExport,
  isAnalyzing 
}) => {
  const [showPalette, setShowPalette] = useState(false);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case 'p': setTool('pan'); break;
        case 'z': setTool('zoom'); break;
        case 'w': setTool('wl'); break;
        case 'm': setTool('measure'); break;
        case 'c': setTool('calibrate'); break;
        case 'r': onReset(); break;
        case 's': onImageChange('showSegmentation', !imageState.showSegmentation); break;
        case 'i': onImageChange('invert', !imageState.invert); break;
        case 'e': onExport(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, onReset, onImageChange, imageState, onExport]);

  const getBtnClass = (tool: Tool) => `
    flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-all duration-200 relative
    ${activeTool === tool 
      ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400' 
      : 'text-gray-400 hover:bg-neutral-800 hover:text-gray-200 border border-transparent'}
  `;

  const getActionBtnClass = () => `
    flex flex-col items-center justify-center w-16 h-14 rounded-lg text-gray-400 hover:bg-neutral-800 hover:text-blue-400 transition-colors border border-transparent
  `;

  return (
    <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 gap-2 select-none relative z-30 shadow-md">
      
      <Tooltip 
        title="Mover (Pan)" 
        desc="Arraste a imagem para navegar por áreas ocultas pelo zoom." 
        interaction="Clique + Arraste"
        shortcut="P"
        isActive={activeTool === 'pan'}
      >
        <button className={getBtnClass('pan')} onClick={() => setTool('pan')}>
          <Move size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Mover</span>
        </button>
      </Tooltip>

      <Tooltip 
        title="Zoom" 
        desc="Aproxime para ver detalhes finos ou afaste para visão geral." 
        interaction="Roda do Mouse ou Arraste"
        shortcut="Z"
        isActive={activeTool === 'zoom'}
      >
        <button className={getBtnClass('zoom')} onClick={() => setTool('zoom')}>
          <Search size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Zoom</span>
        </button>
      </Tooltip>

      <Tooltip 
        title="Janela / Nível" 
        desc="Ajuste o contraste (eixo X) e brilho (eixo Y) dinamicamente." 
        interaction="Clique + Arraste na tela"
        shortcut="W"
        isActive={activeTool === 'wl'}
      >
        <button className={getBtnClass('wl')} onClick={() => setTool('wl')}>
          <SunMedium size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">W / L</span>
        </button>
      </Tooltip>

      <div className="w-px h-8 bg-neutral-700 mx-1" />

      {/* Quick Actions */}
      <Tooltip 
        title={imageState.showSegmentation ? "Ocultar Segmentação" : "Ativar Segmentação"} 
        desc={imageState.showSegmentation ? "Desativa a camada de detecção de bordas." : "Usa algoritmo Canny para desenhar bordas anatômicas."}
        shortcut="S"
        interaction="Clique para alternar"
        isActive={imageState.showSegmentation}
      >
        <button 
          className={`${getActionBtnClass()} ${imageState.showSegmentation ? 'text-green-400 bg-neutral-800 border-green-900/30 shadow-[inset_0_0_10px_rgba(74,222,128,0.1)]' : ''}`}
          onClick={() => onImageChange('showSegmentation', !imageState.showSegmentation)}
        >
          <ScanLine size={20} className={`mb-1 ${imageState.showSegmentation ? 'drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : ''}`} />
          <span className="text-[10px] font-medium tracking-wide">Segm.</span>
        </button>
      </Tooltip>

      <Tooltip 
        title={imageState.invert ? "Restaurar Cores" : "Inverter Cores"} 
        desc="Inverte a escala de cinza. Útil para identificar micro-nódulos." 
        shortcut="I"
        isActive={imageState.invert}
      >
        <button 
          className={`${getActionBtnClass()} ${imageState.invert ? 'text-blue-400' : ''}`}
          onClick={() => onImageChange('invert', !imageState.invert)}
        >
          <ArrowRightLeft size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Inv.</span>
        </button>
      </Tooltip>

      <div className="relative">
        <Tooltip 
          title="Mapa de Cores" 
          desc={`Atual: ${imageState.colormap === 'none' ? 'Escala de Cinza' : imageState.colormap}. Aplica falso-cor para realçar densidades.`}
          interaction="Clique para abrir menu"
          isActive={imageState.colormap !== 'none'}
        >
          <button 
            className={`${getActionBtnClass()} ${imageState.colormap !== 'none' ? 'text-purple-400' : ''}`}
            onClick={() => setShowPalette(!showPalette)}
          >
            <Palette size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-wide">Cor</span>
          </button>
        </Tooltip>
        
        {showPalette && (
          <div className="absolute top-full left-0 mt-2 w-32 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden flex flex-col z-50 animate-in slide-in-from-top-2 duration-150">
            {(['none', 'hot', 'jet', 'purples'] as ColormapType[]).map((cm) => (
              <button
                key={cm}
                onClick={() => {
                  onImageChange('colormap', cm);
                  setShowPalette(false);
                }}
                className={`px-3 py-2 text-xs text-left hover:bg-neutral-700 capitalize flex items-center justify-between ${imageState.colormap === cm ? 'text-blue-400 font-bold bg-neutral-700/50' : 'text-gray-300'}`}
              >
                {cm === 'none' ? 'Original' : cm}
                {imageState.colormap === cm && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-8 bg-neutral-700 mx-1" />

      <Tooltip 
        title="Régua de Medição" 
        desc="Clique e arraste entre dois pontos para medir a distância euclidiana." 
        shortcut="M"
        interaction="Clique + Arraste"
        isActive={activeTool === 'measure'}
      >
        <button className={getBtnClass('measure')} onClick={() => setTool('measure')}>
          <Ruler size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Régua</span>
        </button>
      </Tooltip>
      
      <Tooltip 
        title="Ferramenta de Calibração" 
        desc="Defina um segmento de tamanho conhecido para ajustar a escala (mm/px)." 
        shortcut="C"
        interaction="Arraste + Digite valor"
        isActive={activeTool === 'calibrate'}
      >
        <button className={getBtnClass('calibrate')} onClick={() => setTool('calibrate')}>
          <Scale size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Calib.</span>
        </button>
      </Tooltip>

      <div className="w-px h-8 bg-neutral-700 mx-1" />

      <Tooltip title="Resetar Visualização" desc="Restaura zoom, posição e filtros para o padrão original." shortcut="R">
        <button className={getActionBtnClass()} onClick={onReset}>
          <RotateCcw size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Reset</span>
        </button>
      </Tooltip>

      <Tooltip title="Salvar Imagem" desc="Baixa a visualização atual (com filtros e anotações) como JPG." shortcut="E">
        <button className={getActionBtnClass()} onClick={onExport}>
          <Download size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Salvar</span>
        </button>
      </Tooltip>

      <div className="flex-1" />

      <Tooltip 
        title="Análise IA Gemini" 
        desc={isAnalyzing ? "Processando imagem..." : "Envia a imagem atual para o Gemini 3 Pro gerar um laudo preliminar."}
        interaction="Requer Internet"
      >
        <button 
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className={`
            flex items-center gap-2 px-4 h-10 rounded-full font-semibold text-sm transition-all
            ${isAnalyzing 
              ? 'bg-neutral-800 text-gray-500 cursor-not-allowed border border-neutral-700' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95 border border-blue-500/30'}
          `}
        >
          <BrainCircuit size={18} className={isAnalyzing ? 'animate-pulse' : ''} />
          {isAnalyzing ? 'Analisando...' : 'IA Analyze'}
        </button>
      </Tooltip>

    </div>
  );
};

export default Toolbar;