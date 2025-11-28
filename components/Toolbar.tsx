
import React, { useState } from 'react';
import { Tool, ColormapType, ImageState } from '../types';
import { Move, Search, SunMedium, Ruler, RotateCcw, BrainCircuit, Scale, Palette, Download, ArrowRightLeft, ScanLine } from './Icons';

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

const Tooltip: React.FC<{ 
  title: string; 
  desc: string; 
  interaction: string; 
  children: React.ReactNode 
}> = ({ title, desc, interaction, children }) => (
  <div className="group relative flex flex-col items-center">
    {children}
    <div className="absolute top-full mt-4 w-48 p-3 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
      <div className="text-xs font-semibold text-gray-100 mb-1">{title}</div>
      <div className="text-[10px] text-gray-400 leading-snug mb-2">{desc}</div>
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-700">
        <span className="text-[9px] uppercase text-neutral-500 font-bold tracking-wider">Ação</span>
        <span className="text-[10px] font-mono text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30">{interaction}</span>
      </div>
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

  const getBtnClass = (tool: Tool) => `
    flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-all duration-200
    ${activeTool === tool 
      ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400' 
      : 'text-gray-400 hover:bg-neutral-800 hover:text-gray-200 border border-transparent'}
  `;

  const getActionBtnClass = () => `
    flex flex-col items-center justify-center w-16 h-14 rounded-lg text-gray-400 hover:bg-neutral-800 hover:text-blue-400 transition-colors border border-transparent
  `;

  return (
    <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 gap-2 select-none relative z-30">
      
      <Tooltip title="Mover (Pan)" desc="Mova a imagem livremente dentro da área de visualização." interaction="Clique + Arraste">
        <button className={getBtnClass('pan')} onClick={() => setTool('pan')}>
          <Move size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Mover</span>
        </button>
      </Tooltip>

      <Tooltip title="Zoom" desc="Aumente áreas específicas de interesse." interaction="Scroll / Arraste">
        <button className={getBtnClass('zoom')} onClick={() => setTool('zoom')}>
          <Search size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Zoom</span>
        </button>
      </Tooltip>

      <Tooltip title="Janela / Nível" desc="Ajuste brilho e contraste para melhor visibilidade." interaction="Arraste Eixo X/Y">
        <button className={getBtnClass('wl')} onClick={() => setTool('wl')}>
          <SunMedium size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">W / L</span>
        </button>
      </Tooltip>

      <div className="w-px h-8 bg-neutral-700 mx-1" />

      {/* Quick Actions */}
      <Tooltip title="Segmentação" desc="Detectar bordas e estruturas anatômicas (Verde/Roxo/Azul)." interaction="Clique">
        <button 
          className={`${getActionBtnClass()} ${imageState.showSegmentation ? 'text-green-400 bg-neutral-800 border-green-900/30' : ''}`}
          onClick={() => onImageChange('showSegmentation', !imageState.showSegmentation)}
        >
          <ScanLine size={20} className={`mb-1 ${imageState.showSegmentation ? 'drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : ''}`} />
          <span className="text-[10px] font-medium tracking-wide">Segm.</span>
        </button>
      </Tooltip>

      <Tooltip title="Inverter Cores" desc="Alternar rapidamente entre negativo e positivo." interaction="Clique">
        <button 
          className={`${getActionBtnClass()} ${imageState.invert ? 'text-blue-400' : ''}`}
          onClick={() => onImageChange('invert', !imageState.invert)}
        >
          <ArrowRightLeft size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Inv.</span>
        </button>
      </Tooltip>

      <div className="relative">
        <Tooltip title="Colorização" desc="Aplicar mapas de cores (Hot, Jet, etc) para análise térmica/densidade." interaction="Menu">
          <button 
            className={`${getActionBtnClass()} ${imageState.colormap !== 'none' ? 'text-purple-400' : ''}`}
            onClick={() => setShowPalette(!showPalette)}
          >
            <Palette size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-wide">Cor</span>
          </button>
        </Tooltip>
        
        {showPalette && (
          <div className="absolute top-full left-0 mt-2 w-32 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden flex flex-col z-50">
            {(['none', 'hot', 'jet', 'purples'] as ColormapType[]).map((cm) => (
              <button
                key={cm}
                onClick={() => {
                  onImageChange('colormap', cm);
                  setShowPalette(false);
                }}
                className={`px-3 py-2 text-xs text-left hover:bg-neutral-700 capitalize ${imageState.colormap === cm ? 'text-blue-400 font-bold' : 'text-gray-300'}`}
              >
                {cm === 'none' ? 'Original' : cm}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-8 bg-neutral-700 mx-1" />

      <Tooltip title="Medição" desc="Meça distâncias na imagem." interaction="Clique + Arraste">
        <button className={getBtnClass('measure')} onClick={() => setTool('measure')}>
          <Ruler size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Régua</span>
        </button>
      </Tooltip>
      
      <Tooltip title="Calibrar" desc="Defina a distância real de um segmento conhecido." interaction="Arraste + Entrada">
        <button className={getBtnClass('calibrate')} onClick={() => setTool('calibrate')}>
          <Scale size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Calib.</span>
        </button>
      </Tooltip>

      <div className="w-px h-8 bg-neutral-700 mx-1" />

      <Tooltip title="Resetar" desc="Restaure a visualização original." interaction="Clique">
        <button className={getActionBtnClass()} onClick={onReset}>
          <RotateCcw size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Reset</span>
        </button>
      </Tooltip>

      <Tooltip title="Salvar" desc="Baixar captura da tela atual." interaction="Clique">
        <button className={getActionBtnClass()} onClick={onExport}>
          <Download size={20} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Salvar</span>
        </button>
      </Tooltip>

      <div className="flex-1" />

      <Tooltip title="Análise IA Gemini" desc="Enviar visão atual para o Google Gemini interpretar radiologicamente." interaction="Clique">
        <button 
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className={`
            flex items-center gap-2 px-4 h-10 rounded-full font-semibold text-sm transition-all
            ${isAnalyzing 
              ? 'bg-neutral-800 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95'}
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
