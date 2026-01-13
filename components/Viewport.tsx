
import React, { useRef, useEffect, useState } from 'react';
import { Tool, ImageState, Measurement } from '../types';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface ViewportProps {
  imageSrc: string;
  tool: Tool;
  imageState: ImageState;
  setImageState: React.Dispatch<React.SetStateAction<ImageState>>;
  measurements: Measurement[];
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>;
}

interface AnchorPoint {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
  info: string;
}

interface ProcessedPaths {
    anchors: AnchorPoint[];
}

const Viewport: React.FC<ViewportProps> = ({ 
  imageSrc, 
  tool, 
  imageState, 
  setImageState,
  measurements,
  setMeasurements
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const segmentationCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeMeasurement, setActiveMeasurement] = useState<Measurement | null>(null);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedPaths | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorPoint | null>(null);

  useEffect(() => {
    setIsImgLoaded(false);
    setLoadError(false);
    setProcessedData(null);
  }, [imageSrc]);

  useEffect(() => {
    if (!imageState.showSegmentation || !isImgLoaded || !imgRef.current || loadError) {
        if (segmentationCanvasRef.current) {
            const ctx = segmentationCanvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, segmentationCanvasRef.current.width, segmentationCanvasRef.current.height);
        }
        return;
    }

    setIsProcessing(true);
    const timeout = setTimeout(() => {
        runAdvancedCanny();
        setIsProcessing(false);
    }, 100);
    return () => clearTimeout(timeout);
  }, [imageSrc, imageState.showSegmentation, isImgLoaded, imgDimensions, loadError]);

  const runAdvancedCanny = () => {
      const img = imgRef.current;
      const canvas = segmentationCanvasRef.current;
      if (!img || !canvas || img.naturalWidth === 0) return;

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let src: Uint8ClampedArray;
      try {
          ctx.drawImage(img, 0, 0, w, h);
          src = ctx.getImageData(0, 0, w, h).data;
      } catch (e) {
          console.warn("Segmentation Error: Context Tainted (CORS). Image processing skipped.", e);
          return;
      }
      
      const size = w * h;
      const gray = new Float32Array(size);
      const temp = new Float32Array(size);
      const blurred = new Float32Array(size);
      const gradient = new Float32Array(size);
      const theta = new Float32Array(size);
      const nms = new Float32Array(size);
      const edges = new Uint8Array(size);

      for (let i = 0; i < size; i++) {
          gray[i] = 0.299 * src[i*4] + 0.587 * src[i*4+1] + 0.114 * src[i*4+2];
      }

      const gKernel = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];
      for (let y = 0; y < h; y++) {
          for (let x = 2; x < w - 2; x++) {
              let sum = 0;
              for (let k = -2; k <= 2; k++) sum += gray[y * w + (x + k)] * gKernel[k + 2];
              temp[y * w + x] = sum;
          }
      }
      for (let x = 2; x < w - 2; x++) {
          for (let y = 2; y < h - 2; y++) {
              let sum = 0;
              for (let k = -2; k <= 2; k++) sum += temp[(y + k) * w + x] * gKernel[k + 2];
              blurred[y * w + x] = sum;
          }
      }

      let maxGrad = 0;
      for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              const gx = -1 * blurred[(y - 1) * w + (x - 1)] + 1 * blurred[(y - 1) * w + (x + 1)] +
                         -2 * blurred[y * w + (x - 1)] + 2 * blurred[y * w + (x + 1)] +
                         -1 * blurred[(y + 1) * w + (x - 1)] + 1 * blurred[(y + 1) * w + (x + 1)];
              const gy = -1 * blurred[(y - 1) * w + (x - 1)] + -2 * blurred[(y - 1) * w + x] + -1 * blurred[(y - 1) * w + (x + 1)] +
                          1 * blurred[(y + 1) * w + (x - 1)] + 2 * blurred[(y + 1) * w + x] + 1 * blurred[(y + 1) * w + (x + 1)];
              
              const mag = Math.sqrt(gx * gx + gy * gy);
              gradient[idx] = mag;
              if (mag > maxGrad) maxGrad = mag;
              theta[idx] = Math.atan2(gy, gx) * (180 / Math.PI);
          }
      }

      for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              let angle = theta[idx];
              if (angle < 0) angle += 180;
              const mag = gradient[idx];
              let q = 0, r = 0;
              if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
                  q = gradient[idx + 1]; r = gradient[idx - 1];
              } else if (angle >= 22.5 && angle < 67.5) {
                  q = gradient[(y + 1) * w + (x - 1)]; r = gradient[(y - 1) * w + (x + 1)];
              } else if (angle >= 67.5 && angle < 112.5) {
                  q = gradient[(y + 1) * w + x]; r = gradient[(y - 1) * w + x];
              } else {
                  q = gradient[(y - 1) * w + (x - 1)]; r = gradient[(y + 1) * w + (x + 1)];
              }
              nms[idx] = (mag >= q && mag >= r) ? mag : 0;
          }
      }

      const highThreshold = maxGrad * 0.15;
      const lowThreshold = highThreshold * 0.4;
      const strongEdges = [];
      for (let i = 0; i < size; i++) {
          if (nms[i] >= highThreshold) { edges[i] = 255; strongEdges.push(i); }
          else if (nms[i] >= lowThreshold) edges[i] = 100;
      }

      while (strongEdges.length > 0) {
          const curr = strongEdges.pop()!;
          const cx = curr % w; const cy = Math.floor(curr / w);
          for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                  const nx = cx + kx; const ny = cy + ky;
                  if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                      const nIdx = ny * w + nx;
                      if (edges[nIdx] === 100) { edges[nIdx] = 255; strongEdges.push(nIdx); }
                  }
              }
          }
      }

      const output = ctx.createImageData(w, h);
      const data32 = new Uint32Array(output.data.buffer);
      let minX = w, maxX = 0, minY = h, maxY = 0, hasEdges = false;
      
      for (let i = 0; i < size; i++) {
          if (edges[i] === 255) {
              const x = i % w; const y = Math.floor(i / w);
              data32[i] = 0xFFC8FF00; 
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
              hasEdges = true;
          } else {
              data32[i] = 0x00000000;
          }
      }
      ctx.putImageData(output, 0, 0);

      const newAnchors: AnchorPoint[] = [];
      if (hasEdges) {
          const bw = maxX - minX, bh = maxY - minY, cx = minX + bw / 2;
          newAnchors.push({ id: 'roi-a', x: cx, y: minY + bh * 0.2, color: '#facc15', label: 'Área de Contraste', info: 'Região com alta densidade detectada.' });
      }
      setProcessedData({ anchors: newAnchors });
  };

  const getLocalCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left) / imageState.scale, y: (clientY - rect.top) / imageState.scale };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (loadError) return;
    if ((e.target as HTMLElement).closest('.anchor-point')) return;
    if (selectedAnchor) setSelectedAnchor(null);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (tool === 'measure' || tool === 'calibrate') {
      const coords = getLocalCoords(e.clientX, e.clientY);
      setActiveMeasurement({ id: Date.now().toString(), x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y, lengthMm: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || loadError) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (tool === 'pan') {
      setImageState(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (tool === 'wl' || e.buttons === 2) {
      setImageState(prev => ({ ...prev, contrast: Math.max(0, Math.min(300, prev.contrast + dx * 0.5)), brightness: Math.max(0, Math.min(200, prev.brightness - dy * 0.5)) }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if ((tool === 'measure' || tool === 'calibrate') && activeMeasurement) {
      const coords = getLocalCoords(e.clientX, e.clientY);
      setActiveMeasurement(prev => prev ? ({ ...prev, x2: coords.x, y2: coords.y, lengthMm: Math.sqrt(Math.pow(coords.x - prev.x1, 2) + Math.pow(coords.y - prev.y1, 2)) * imageState.pixelSpacing }) : null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (activeMeasurement) {
      const distPixels = Math.sqrt(Math.pow(activeMeasurement.x2 - activeMeasurement.x1, 2) + Math.pow(activeMeasurement.y2 - activeMeasurement.y1, 2));
      if (distPixels > 5) {
        if (tool === 'measure') setMeasurements(prev => [...prev, activeMeasurement]);
        else if (tool === 'calibrate') {
          const input = window.prompt("Distância real em mm:", "10");
          if (input) {
            const realMm = parseFloat(input);
            if (!isNaN(realMm)) {
              setImageState(prev => ({ ...prev, pixelSpacing: realMm / distPixels }));
            }
          }
        }
      }
      setActiveMeasurement(null);
    }
  };

  let filterString = `brightness(${imageState.brightness}%) contrast(${imageState.contrast}%)`;
  if (imageState.invert) filterString += ' invert(1)';
  if (imageState.colormap !== 'none') filterString += ` url(#colormap-${imageState.colormap})`;

  return (
    <div 
      className={`relative flex-1 bg-black overflow-hidden flex items-center justify-center ${tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={(e) => setImageState(prev => ({ ...prev, scale: Math.min(Math.max(0.1, prev.scale * (e.deltaY > 0 ? 0.9 : 1.1)), 10) }))}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!isImgLoaded && !loadError && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Processando Imagem...</p>
          </div>
      )}

      {loadError && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 p-6 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-white font-bold mb-2">Erro de Carregamento</h3>
              <p className="text-gray-400 text-sm max-w-md">Não foi possível acessar a fonte da imagem. Isso pode ocorrer devido a restrições de CORS. Experimente carregar uma imagem local.</p>
          </div>
      )}

      <div 
        ref={containerRef}
        style={{
          transform: `translate(${imageState.panX}px, ${imageState.panY}px) scale(${imageState.scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          opacity: isImgLoaded ? 1 : 0
        }}
        className="relative"
      >
        <img 
          ref={imgRef}
          src={imageSrc} 
          alt="Medical Scan"
          draggable={false}
          crossOrigin="anonymous"
          onError={() => {
              setLoadError(true);
              setIsImgLoaded(true);
          }}
          onLoad={(e) => { 
            setImgDimensions({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
            setIsImgLoaded(true);
            setLoadError(false);
          }}
          style={{ filter: filterString }}
          className="max-w-[none] select-none block" 
        />
        
        <canvas 
            ref={segmentationCanvasRef}
            className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ${imageState.showSegmentation ? 'opacity-80' : 'opacity-0'}`}
            style={{ mixBlendMode: 'screen', filter: 'drop-shadow(0 0 1px #00ffc8)' }}
        />

        {isImgLoaded && !loadError && (
          <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none" viewBox={`0 0 ${imgDimensions.w} ${imgDimensions.h}`}>
            {imageState.showSegmentation && processedData?.anchors.map((anchor) => (
                <g key={anchor.id} className="anchor-point pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedAnchor(anchor); }}>
                    <circle cx={anchor.x} cy={anchor.y} r={12 / imageState.scale} fill={anchor.color} fillOpacity="0.2" className="animate-pulse" />
                    <circle cx={anchor.x} cy={anchor.y} r={6 / imageState.scale} fill={anchor.color} stroke="white" strokeWidth={2 / imageState.scale} />
                </g>
            ))}

            {measurements.map(m => (
              <g key={m.id}>
                <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#ef4444" strokeWidth={2 / imageState.scale} />
                <text x={(m.x1 + m.x2) / 2} y={(m.y1 + m.y2) / 2 - 10 / imageState.scale} fill="#ef4444" fontSize={14 / imageState.scale} fontWeight="bold" textAnchor="middle" style={{ textShadow: '1px 1px 2px black'}}>{m.lengthMm.toFixed(1)} mm</text>
              </g>
            ))}

            {activeMeasurement && (
              <line x1={activeMeasurement.x1} y1={activeMeasurement.y1} x2={activeMeasurement.x2} y2={activeMeasurement.y2} stroke="#3b82f6" strokeWidth={2 / imageState.scale} strokeDasharray="4" />
            )}
          </svg>
        )}
      </div>

      {selectedAnchor && (
          <div style={{ left: `${imageState.panX + (selectedAnchor.x * imageState.scale)}px`, top: `${imageState.panY + (selectedAnchor.y * imageState.scale)}px` }} className="absolute z-50 transform -translate-x-1/2 -translate-y-[130%]">
              <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 w-56 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-1 border-b border-neutral-800 pb-1">
                      <span className="font-bold text-xs text-blue-400">{selectedAnchor.label}</span>
                      <button onClick={() => setSelectedAnchor(null)} className="text-gray-500 hover:text-white"><X size={12} /></button>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight">{selectedAnchor.info}</p>
              </div>
          </div>
      )}

      <div className="absolute top-4 left-4 text-[#ffd700] text-[10px] font-mono leading-tight pointer-events-none z-10 bg-black/40 p-2 rounded backdrop-blur-sm border border-white/5 uppercase">
        <div>DIM: {imgDimensions.w} x {imgDimensions.h}</div>
        {isProcessing && <div className="text-blue-400 animate-pulse mt-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> ANALISANDO...</div>}
      </div>

      <div className="absolute bottom-4 right-4 text-[#ffd700] text-[10px] font-mono pointer-events-none text-right z-10 bg-black/40 p-2 rounded backdrop-blur-sm">
        <div>ZOOM: {(imageState.scale * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
};

export default Viewport;
