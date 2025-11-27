import React from 'react';
import { Upload, Layers, FileImage } from './Icons';
import { ImageState } from '../types';

interface LeftSidebarProps {
  imageState: ImageState;
  onImageChange: (key: keyof ImageState, value: number | boolean) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  seriesImages: string[];
  onSelectSeriesImage: (src: string) => void;
  currentImageSrc: string;
}

const SideTooltip: React.FC<{ 
  text: string; 
  sub: string;
  children: React.ReactNode 
}> = ({ text, sub, children }) => (
  <div className="group relative w-full">
    {children}
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-40 p-2 bg-neutral-800 border border-neutral-700 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
      <div className="text-[10px] font-bold text-gray-200">{text}</div>
      <div className="text-[9px] text-gray-400">{sub}</div>
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-neutral-800 border-l border-b border-neutral-700 rotate-45"></div>
    </div>
  </div>
);

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  imageState, 
  onImageChange, 
  onFileUpload,
  seriesImages,
  onSelectSeriesImage,
  currentImageSrc
}) => {
  return (
    <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col p-4 gap-6 text-gray-300 z-10 shrink-0 h-full overflow-y-auto custom-scrollbar">
      
      {/* Upload Area */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dados do Estudo</h3>
        <SideTooltip text="Abrir Arquivo" sub="Suporta JPG, PNG, DICOM (Simulado)">
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-700 rounded-lg hover:bg-neutral-800 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group-hover:border-neutral-600">
            <Upload size={24} className="mb-2 text-neutral-500 group-hover:text-blue-500" />
            <span className="text-xs text-neutral-400 group-hover:text-blue-400">Abrir DICOM/Imagem</span>
            <input type="file" className="hidden" accept="image/*" onChange={onFileUpload} />
          </label>
        </SideTooltip>
      </div>

      {/* DICOM Series Visualization */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <Layers size={14} />
          <span>Série DICOM</span>
        </div>
        
        <div className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
            {seriesImages.length > 0 ? (
                seriesImages.map((src, idx) => (
                    <button 
                        key={idx}
                        onClick={() => onSelectSeriesImage(src)}
                        className={`relative aspect-square rounded overflow-hidden border transition-all ${currentImageSrc === src ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-neutral-800 hover:border-gray-500'}`}
                    >
                        <img src={src} alt={`Slice ${idx}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 right-0 bg-black/70 text-[9px] text-white px-1">IMG-{idx+1}</span>
                    </button>
                ))
            ) : (
                <div className="col-span-2 text-center py-4 text-xs text-gray-600 flex flex-col items-center">
                    <FileImage size={20} className="mb-2 opacity-50" />
                    Nenhuma série carregada
                </div>
            )}
        </div>
      </div>

      {/* Adjustments */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ajuste de Janela</h3>
        
        <SideTooltip text="Brilho" sub="Ajustar luminância global">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Brilho</span>
              <span className="text-blue-400">{Math.round(imageState.brightness)}%</span>
            </div>
            <input 
              type="range" min="0" max="200" 
              value={imageState.brightness} 
              onChange={(e) => onImageChange('brightness', Number(e.target.value))}
              className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </SideTooltip>

        <SideTooltip text="Contraste" sub="Ajustar alcance dinâmico">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Contraste</span>
              <span className="text-blue-400">{Math.round(imageState.contrast)}%</span>
            </div>
            <input 
              type="range" min="0" max="300" 
              value={imageState.contrast} 
              onChange={(e) => onImageChange('contrast', Number(e.target.value))}
              className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </SideTooltip>

        <SideTooltip text="Inverter Polaridade" sub="Alternar visualização negativo/positivo">
          <button 
              onClick={() => onImageChange('invert', !imageState.invert)}
              className={`mt-2 w-full py-2 px-3 rounded text-xs font-semibold transition-colors
                  ${imageState.invert ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}
              `}
          >
              Inverter Cores
          </button>
        </SideTooltip>
      </div>

      <div className="mt-auto">
        <div className="p-3 bg-neutral-800 rounded text-[10px] text-gray-500 leading-relaxed border border-neutral-700">
          <strong className="text-gray-400">Privacidade:</strong><br/>
          As imagens são processadas localmente. A análise em nuvem só é realizada quando "IA Analyze" é clicado explicitamente.
        </div>
      </div>

    </div>
  );
};

export default LeftSidebar;