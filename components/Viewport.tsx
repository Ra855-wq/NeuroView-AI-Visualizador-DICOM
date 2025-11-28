
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Tool, ImageState, Measurement } from '../types';
import { X } from 'lucide-react';

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
    // We now use canvas for edges, so paths are just for bounding box debugging if needed
    debugBox?: {x: number, y: number, w: number, h: number};
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
  
  // Interaction Internal State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeMeasurement, setActiveMeasurement] = useState<Measurement | null>(null);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  
  // Segmentation State
  const [processedData, setProcessedData] = useState<ProcessedPaths | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Anchor Interaction
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorPoint | null>(null);

  useEffect(() => {
    if (imgRef.current) {
        setImgDimensions({
            w: imgRef.current.naturalWidth,
            h: imgRef.current.naturalHeight
        });
    }
  }, [imageSrc]);

  // --- Canny Edge Detection Pipeline ---
  useEffect(() => {
    const triggerSegmentation = async () => {
        if (!imageState.showSegmentation || !imgRef.current || !imgRef.current.complete) {
            // Clear canvas if disabled
            if (segmentationCanvasRef.current) {
                const ctx = segmentationCanvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, segmentationCanvasRef.current.width, segmentationCanvasRef.current.height);
            }
            setProcessedData(null);
            return;
        }

        setIsProcessing(true);
        
        // Use timeout to allow UI to render "Loading" state before heavy calculation
        setTimeout(() => {
            runTrueCannyAlgorithm();
            setIsProcessing(false);
        }, 100);
    };

    triggerSegmentation();
  }, [imageSrc, imageState.showSegmentation, imgDimensions]);


  const runTrueCannyAlgorithm = () => {
      const img = imgRef.current;
      const canvas = segmentationCanvasRef.current;
      if (!img || !canvas) return;

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw original image to get pixel data
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const src = imageData.data;
      
      // Buffers
      const gray = new Float32Array(w * h);
      const blurred = new Float32Array(w * h);
      const gradient = new Float32Array(w * h);
      const theta = new Float32Array(w * h); // Gradient direction
      const nms = new Float32Array(w * h); // Non-max suppression result
      const edges = new Uint8Array(w * h); // Final binary edges

      // --- STEP 1: Grayscale ---
      for (let i = 0; i < w * h; i++) {
          gray[i] = 0.299 * src[i*4] + 0.587 * src[i*4+1] + 0.114 * src[i*4+2];
      }

      // --- STEP 2: Gaussian Blur (5x5 Kernel Approximation) ---
      // Good Detection: Removes noise
      const kernel = [
          [2, 4, 5, 4, 2],
          [4, 9, 12, 9, 4],
          [5, 12, 15, 12, 5],
          [4, 9, 12, 9, 4],
          [2, 4, 5, 4, 2]
      ];
      const kernelWeight = 159;

      const half = 2; // Kernel radius
      for (let y = half; y < h - half; y++) {
          for (let x = half; x < w - half; x++) {
              let sum = 0;
              for (let ky = -half; ky <= half; ky++) {
                  for (let kx = -half; kx <= half; kx++) {
                      sum += gray[(y + ky) * w + (x + kx)] * kernel[ky + half][kx + half];
                  }
              }
              blurred[y * w + x] = sum / kernelWeight;
          }
      }

      // --- STEP 3: Sobel Operator (Gradient Magnitude & Direction) ---
      for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
              // Gx
              const gx = 
                  -1 * blurred[(y - 1) * w + (x - 1)] + 
                   1 * blurred[(y - 1) * w + (x + 1)] +
                  -2 * blurred[y * w + (x - 1)] + 
                   2 * blurred[y * w + (x + 1)] +
                  -1 * blurred[(y + 1) * w + (x - 1)] + 
                   1 * blurred[(y + 1) * w + (x + 1)];
              
              // Gy
              const gy = 
                  -1 * blurred[(y - 1) * w + (x - 1)] + 
                  -2 * blurred[(y - 1) * w + x] + 
                  -1 * blurred[(y - 1) * w + (x + 1)] +
                   1 * blurred[(y + 1) * w + (x - 1)] + 
                   2 * blurred[(y + 1) * w + x] + 
                   1 * blurred[(y + 1) * w + (x + 1)];

              const idx = y * w + x;
              gradient[idx] = Math.sqrt(gx * gx + gy * gy);
              theta[idx] = Math.atan2(gy, gx) * (180 / Math.PI);
          }
      }

      // --- STEP 4: Non-Maximum Suppression (NMS) ---
      // Good Localization: Thinning edges to 1px
      for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              const angle = theta[idx];
              const mag = gradient[idx];
              
              // Quantize angle to 4 directions (0, 45, 90, 135)
              // 0 deg (Horizontal) -> Check Left/Right
              // 90 deg (Vertical) -> Check Top/Bottom
              let q = 0, r = 0;
              
              if ((angle >= -22.5 && angle < 22.5) || (angle >= 157.5) || (angle < -157.5)) {
                  q = gradient[y * w + (x + 1)];
                  r = gradient[y * w + (x - 1)];
              } else if ((angle >= 22.5 && angle < 67.5) || (angle >= -157.5 && angle < -112.5)) {
                  q = gradient[(y + 1) * w + (x - 1)];
                  r = gradient[(y - 1) * w + (x + 1)];
              } else if ((angle >= 67.5 && angle < 112.5) || (angle >= -112.5 && angle < -67.5)) {
                  q = gradient[(y + 1) * w + x];
                  r = gradient[(y - 1) * w + x];
              } else {
                  q = gradient[(y - 1) * w + (x - 1)];
                  r = gradient[(y + 1) * w + (x + 1)];
              }

              if (mag >= q && mag >= r) {
                  nms[idx] = mag;
              } else {
                  nms[idx] = 0;
              }
          }
      }

      // --- STEP 5: Hysteresis Thresholding ---
      // Good Response: Double threshold to link weak edges to strong ones
      // Thresholds depend on image brightness, here we use heuristics
      const highThreshold = 40; 
      const lowThreshold = 15;
      
      const strongEdges = []; // Stack for recursion/loop
      
      // Pass 1: Identification
      for (let i = 0; i < w * h; i++) {
          if (nms[i] >= highThreshold) {
              edges[i] = 255; // Strong
              strongEdges.push(i);
          } else if (nms[i] >= lowThreshold) {
              edges[i] = 100; // Weak
          } else {
              edges[i] = 0; // Suppressed
          }
      }

      // Pass 2: Connectivity (Blob Analysis)
      while (strongEdges.length > 0) {
          const curr = strongEdges.pop()!;
          const cx = curr % w;
          const cy = Math.floor(curr / w);
          
          // Check 8 neighbors
          for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                  if (kx === 0 && ky === 0) continue;
                  
                  const nx = cx + kx;
                  const ny = cy + ky;
                  
                  if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                      const nIdx = ny * w + nx;
                      if (edges[nIdx] === 100) { // If weak
                          edges[nIdx] = 255; // Promote to strong
                          strongEdges.push(nIdx); // Add to stack
                      }
                  }
              }
          }
      }

      // --- RENDER & ANALYZE ---
      // We clear the canvas and draw ONLY the confirmed edges (Green/Cyan)
      // And calculate bounding box of edges for Anchors
      const output = ctx.createImageData(w, h);
      let minX = w, maxX = 0, minY = h, maxY = 0;
      let hasEdges = false;

      for (let i = 0; i < w * h; i++) {
          if (edges[i] === 255) {
              const x = i % w;
              const y = Math.floor(i / w);
              
              // Draw Edge Pixel (Green-Cyan for high visibility)
              // R=0, G=255, B=200, A=255
              const ptr = i * 4;
              output.data[ptr] = 0;
              output.data[ptr+1] = 255;
              output.data[ptr+2] = 200;
              output.data[ptr+3] = 255; // Fully opaque edge

              // Bounds calculation
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              hasEdges = true;
          } else {
              // Transparent
              output.data[i*4+3] = 0; 
          }
      }
      
      ctx.putImageData(output, 0, 0);

      // --- Generate Contextual Anchors based on Edge Bounding Box ---
      const newAnchors: AnchorPoint[] = [];
      if (hasEdges) {
          const bx = minX;
          const by = minY;
          const bw = maxX - minX;
          const bh = maxY - minY;
          const cx = bx + bw / 2;

          // Estimate anatomy positions relative to the detected "Edge Mass"
          newAnchors.push({
              id: 'top-roi', x: cx, y: by + bh * 0.15, color: '#facc15',
              label: 'Região Superior', info: 'Bordas de alta frequência detectadas (Ápice/Cranial).'
          });
          newAnchors.push({
              id: 'center-roi', x: cx, y: by + bh * 0.5, color: '#facc15',
              label: 'Eixo Central', info: 'Densidade estrutural central (Mediastino/Coluna).'
          });
          newAnchors.push({
              id: 'left-roi', x: bx + bw * 0.2, y: by + bh * 0.6, color: '#3b82f6',
              label: 'Campo Lateral Esq', info: 'Textura parenquimatosa.'
          });
          newAnchors.push({
              id: 'right-roi', x: bx + bw * 0.8, y: by + bh * 0.6, color: '#3b82f6',
              label: 'Campo Lateral Dir', info: 'Textura parenquimatosa.'
          });
          newAnchors.push({
              id: 'bottom-roi', x: cx, y: by + bh * 0.9, color: '#d946ef',
              label: 'Base', info: 'Limiar inferior (Diafragma/Abdômen).'
          });
      }

      setProcessedData({
          anchors: newAnchors,
          debugBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
      });

  };


  // --- Helpers ---
  const getLocalCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    
    return {
      x: (clientX - rect.left) / imageState.scale,
      y: (clientY - rect.top) / imageState.scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking an anchor (which stops propagation), don't drag
    if ((e.target as HTMLElement).closest('.anchor-point')) return;
    
    // Close popup on background click
    if (selectedAnchor) setSelectedAnchor(null);

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });

    if (tool === 'measure' || tool === 'calibrate') {
      const coords = getLocalCoords(e.clientX, e.clientY);
      const newMeasure: Measurement = {
        id: Date.now().toString(),
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
        lengthMm: 0
      };
      setActiveMeasurement(newMeasure);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (tool === 'pan') {
      setImageState(prev => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (tool === 'wl' || e.buttons === 2) {
      setImageState(prev => ({
        ...prev,
        contrast: Math.max(0, Math.min(300, prev.contrast + dx * 0.5)),
        brightness: Math.max(0, Math.min(200, prev.brightness - dy * 0.5))
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if ((tool === 'measure' || tool === 'calibrate') && activeMeasurement) {
      const coords = getLocalCoords(e.clientX, e.clientY);
      setActiveMeasurement(prev => prev ? ({
        ...prev,
        x2: coords.x,
        y2: coords.y,
        lengthMm: Math.sqrt(Math.pow(coords.x - prev.x1, 2) + Math.pow(coords.y - prev.y1, 2)) * imageState.pixelSpacing
      }) : null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    if (activeMeasurement) {
      const distPixels = Math.sqrt(
          Math.pow(activeMeasurement.x2 - activeMeasurement.x1, 2) + 
          Math.pow(activeMeasurement.y2 - activeMeasurement.y1, 2)
      );

      if (distPixels > 5) {
        if (tool === 'measure') {
            setMeasurements(prev => [...prev, activeMeasurement]);
        } else if (tool === 'calibrate') {
            const input = window.prompt("Insira a distância real deste segmento em mm:", "10");
            if (input !== null) {
                const realMm = parseFloat(input);
                if (!isNaN(realMm) && realMm > 0) {
                    const newSpacing = realMm / distPixels;
                    setImageState(prev => ({ ...prev, pixelSpacing: newSpacing }));
                    setMeasurements(prev => prev.map(m => {
                        const d = Math.sqrt(Math.pow(m.x2 - m.x1, 2) + Math.pow(m.y2 - m.y1, 2));
                        return { ...m, lengthMm: d * newSpacing };
                    }));
                }
            }
        }
      }
      setActiveMeasurement(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setImageState(prev => ({
      ...prev,
      scale: Math.min(Math.max(0.1, prev.scale * factor), 10)
    }));
  };

  // Cursor style
  let cursorClass = 'cursor-default';
  if (tool === 'pan') cursorClass = isDragging ? 'cursor-grabbing' : 'cursor-grab';
  if (tool === 'measure' || tool === 'calibrate') cursorClass = 'cursor-crosshair';
  if (tool === 'wl') cursorClass = 'cursor-ns-resize';

  // Build filter string
  let filterString = `brightness(${imageState.brightness}%) contrast(${imageState.contrast}%)`;
  if (imageState.invert) filterString += ' invert(1)';
  if (imageState.colormap === 'hot') filterString += ' url(#colormap-hot)';
  if (imageState.colormap === 'jet') filterString += ' url(#colormap-jet)';
  if (imageState.colormap === 'purples') filterString += ' url(#colormap-purples)';

  // Calculate Popup Position
  const popupStyle = selectedAnchor ? {
      left: `${imageState.panX + (selectedAnchor.x * imageState.scale)}px`,
      top: `${imageState.panY + (selectedAnchor.y * imageState.scale)}px`
  } : {};

  return (
    <div 
      className={`relative flex-1 bg-black overflow-hidden flex items-center justify-center ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()} 
      id="viewport-area"
    >
      {/* Transformation Container */}
      <div 
        ref={containerRef}
        style={{
          transform: `translate(${imageState.panX}px, ${imageState.panY}px) scale(${imageState.scale})`,
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 0.05s ease-out'
        }}
        className="relative shadow-2xl"
      >
        <img 
          ref={imgRef}
          src={imageSrc} 
          alt="Medical Scan"
          draggable={false}
          onLoad={(e) => setImgDimensions({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{
            filter: filterString
          }}
          className="max-w-[1024px] pointer-events-none select-none block" 
        />
        
        {/* Canny Edge Canvas Overlay */}
        <canvas 
            ref={segmentationCanvasRef}
            className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-300 ${imageState.showSegmentation ? 'opacity-100' : 'opacity-0'}`}
            style={{ mixBlendMode: 'screen' }}
        />

        {/* SVG Overlay (Anchors & Measurements) */}
        {imgDimensions.w > 0 && (
          <svg 
            className="absolute top-0 left-0 w-full h-full overflow-visible"
            viewBox={`0 0 ${imgDimensions.w} ${imgDimensions.h}`}
            style={{ pointerEvents: 'none' }} // Let clicks pass to image/container unless on an element
          >
            {/* ANCHOR POINTS LAYER */}
            {imageState.showSegmentation && processedData && processedData.anchors.map((anchor) => (
                <g 
                    key={anchor.id} 
                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnchor(anchor);
                    }}
                    className="anchor-point group"
                >
                    <circle 
                        cx={anchor.x} cy={anchor.y} r={10 / imageState.scale} 
                        fill={anchor.color} fillOpacity="0.4"
                        className="animate-ping origin-center"
                    />
                    <circle 
                        cx={anchor.x} cy={anchor.y} r={6 / imageState.scale} 
                        fill={anchor.color} stroke="white" strokeWidth={2 / imageState.scale}
                    />
                </g>
            ))}

            {/* MEASUREMENTS LAYER */}
            {measurements.map(m => (
              <g key={m.id}>
                <line 
                  x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} 
                  stroke="#ef4444" strokeWidth={2 / imageState.scale} 
                />
                <text 
                  x={(m.x1 + m.x2) / 2} y={(m.y1 + m.y2) / 2 - 10} 
                  fill="#ef4444" fontSize={14 / imageState.scale} fontWeight="bold"
                  textAnchor="middle" style={{ textShadow: '1px 1px 1px black'}}
                >
                  {m.lengthMm.toFixed(1)} mm
                </text>
                <circle cx={m.x1} cy={m.y1} r={3 / imageState.scale} fill="#ef4444" />
                <circle cx={m.x2} cy={m.y2} r={3 / imageState.scale} fill="#ef4444" />
              </g>
            ))}

            {/* Active Measurement */}
            {activeMeasurement && (
              <line 
                x1={activeMeasurement.x1} y1={activeMeasurement.y1} 
                x2={activeMeasurement.x2} y2={activeMeasurement.y2} 
                stroke={tool === 'calibrate' ? '#3b82f6' : "#fbbf24"}
                strokeWidth={2 / imageState.scale} 
                strokeDasharray="4"
              />
            )}
          </svg>
        )}
      </div>

      {/* ANCHOR POPUP (Absolute on top of everything) */}
      {selectedAnchor && (
          <div 
            style={popupStyle}
            className="absolute z-50 pointer-events-auto transform -translate-x-1/2 -translate-y-[120%]"
          >
              <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl p-4 w-64 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-start mb-2 border-b border-neutral-700 pb-2">
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedAnchor.color }}></div>
                          <span className="font-bold text-sm text-gray-100">{selectedAnchor.label}</span>
                      </div>
                      <button onClick={() => setSelectedAnchor(null)} className="text-gray-400 hover:text-white">
                          <X size={14} />
                      </button>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                      {selectedAnchor.info}
                  </p>
                  <div className="mt-3 flex items-center justify-end">
                      <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">
                          Análise IA
                      </span>
                  </div>
                  {/* Arrow */}
                  <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-neutral-900/95 border-b border-r border-neutral-700 rotate-45"></div>
              </div>
          </div>
      )}

      {/* HUD Info */}
      <div className="absolute top-4 left-4 text-[#ffd700] text-sm font-mono drop-shadow-md pointer-events-none space-y-1 z-10">
        <div>MOD: CT</div>
        <div>SER: 001</div>
        <div>POS: {Math.round(imageState.panX)}, {Math.round(imageState.panY)}</div>
        {isProcessing && <div className="text-blue-400 font-bold animate-pulse">PROCESSANDO CANNY...</div>}
        {imageState.showSegmentation && !isProcessing && processedData && (
             <div className="text-green-500 text-xs mt-1">BORDAS: DETECTADAS (Histerese)</div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 text-[#ffd700] text-sm font-mono drop-shadow-md pointer-events-none space-y-1 text-right z-10">
        <div>Zoom: {imageState.scale.toFixed(2)}x</div>
        <div className="text-gray-400 text-xs">Escala: {imageState.pixelSpacing.toFixed(3)} mm/px</div>
        {imageState.colormap !== 'none' && <div className="text-purple-400 text-xs uppercase">MAPA: {imageState.colormap}</div>}
        {imageState.showSegmentation && <div className="text-cyan-400 text-xs uppercase animate-pulse">SEGMENTAÇÃO: CANNY</div>}
      </div>
    </div>
  );
};

export default Viewport;
