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
  desc?: string;
  valueContext?: string;
  children: React.ReactNode 
}> = ({ text, desc, valueContext, children }) => (
  <div className="group relative w-full">
    {children}
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-48 p-3 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none transform -translate-x-2 group-hover:translate-x-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-gray-100">{text}</span>
        {valueContext && <span className="text-[9px] font-mono text-blue-400 bg-blue-900/20 px-1 rounded">{valueContext}</span>}
      </div>
      {desc && <div className="text-[9px] text-gray-400 leading-snug border-t border-neutral-800 pt-1 mt-1">{desc}</div>}
      {/* Arrow */}
      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-neutral-900/95 border-l border-b border-neutral-700 rotate-45"></div>
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
    <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col p-4 gap-6 text-gray-300 z-10 shrink-0 h-full overflow-y-auto custom-scrollbar shadow-lg">
      
      {/* Upload Area */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-1">Dados do Estudo</h3>
        <SideTooltip text="Carregar Imagem" desc="Abra arquivos locais. Formatos suportados: JPG, PNG, WEBP. A imagem é processada localmente no navegador.">
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-700 rounded-lg hover:bg-neutral-800 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group hover:shadow-[inset_0_0_10px_rgba(37,99,235,0.1)]">
            <Upload size={24} className="mb-2 text-neutral-500 group-hover:text-blue-500 transition-colors" />
            <span className="text-xs text-neutral-400 group-hover:text-blue-400 font-medium">Abrir DICOM/Imagem</span>
            <input type="file" className="hidden" accept="image/*" onChange={onFileUpload} />
          </label>
        </SideTooltip>
      </div>

      {/* DICOM Series Visualization */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
          <Layers size={14} />
          <span>Série DICOM</span>
        </div>
        
        <div className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
            {seriesImages.length > 0 ? (
                seriesImages.map((src, idx) => (
                    <SideTooltip 
                        key={idx} 
                        text={`Slice ${idx + 1}`} 
                        desc={currentImageSrc === src ? "Imagem atualmente em visualização" : "Clique para carregar este corte"}
                        valueContext={currentImageSrc === src ? "ATIVO" : undefined}
                    >
                        <button 
                            onClick={() => onSelectSeriesImage(src)}
                            className={`relative w-full aspect-square rounded overflow-hidden border transition-all ${currentImageSrc === src ? 'border-blue-500 ring-2 ring-blue-500/20 opacity-100' : 'border-neutral-800 hover:border-gray-500 opacity-70 hover:opacity-100'}`}
                        >
                            <img src={src} alt={`Slice ${idx}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 right-0 bg-black/70 text-[9px] text-white px-1 font-mono">IMG-{idx+1}</span>
                        </button>
                    </SideTooltip>
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
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Ajuste de Janela</h3>
        
        <SideTooltip 
            text="Brilho (Window Level)" 
            desc="Controla a luminosidade média da imagem."
            valueContext={`${Math.round(imageState.brightness)}%`}
        >
          <div className="space-y-2 bg-neutral-800/50 p-2 rounded border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="flex justify-between text-xs items-center">
              <span className="text-gray-400">Brilho</span>
              <span className="text-blue-400 font-mono text-[10px]">{Math.round(imageState.brightness)}%</span>
            </div>
            <input 
              type="range" min="0" max="200" 
              value={imageState.brightness} 
              onChange={(e) => onImageChange('brightness', Number(e.target.value))}
              className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
            />
          </div>
        </SideTooltip>

        <SideTooltip 
            text="Contraste (Window Width)" 
            desc="Controla a diferença entre áreas claras e escuras."
            valueContext={`${Math.round(imageState.contrast)}%`}
        >
          <div className="space-y-2 bg-neutral-800/50 p-2 rounded border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="flex justify-between text-xs items-center">
              <span className="text-gray-400">Contraste</span>
              <span className="text-blue-400 font-mono text-[10px]">{Math.round(imageState.contrast)}%</span>
            </div>
            <input 
              type="range" min="0" max="300" 
              value={imageState.contrast} 
              onChange={(e) => onImageChange('contrast', Number(e.target.value))}
              className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
            />
          </div>
        </SideTooltip>

        <SideTooltip text="Inversão" desc="Troca branco por preto e vice-versa. Atalho: I">
          <button 
              onClick={() => onImageChange('invert', !imageState.invert)}
              className={`mt-1 w-full py-2 px-3 rounded text-xs font-semibold transition-all duration-200 border
                  ${imageState.invert 
                      ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                      : 'bg-neutral-800 text-gray-400 border-neutral-700 hover:bg-neutral-700 hover:text-gray-200'}
              `}
          >
              {imageState.invert ? 'Modo Negativo (Ativo)' : 'Inverter Cores'}
          </button>
        </SideTooltip>
      </div>

      <div className="mt-auto">
        <div className="p-3 bg-neutral-800/80 rounded text-[10px] text-gray-500 leading-relaxed border border-neutral-700/50 backdrop-blur-sm">
          <strong className="text-gray-400">Privacidade:</strong><br/>
          As imagens são processadas localmente. A análise em nuvem só é realizada quando "IA Analyze" é clicado explicitamente.
        </div>
      </div>

    </div>
  );
};

export default LeftSidebar;