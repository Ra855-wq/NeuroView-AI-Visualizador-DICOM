import React, { useRef, useEffect, useState } from 'react';
import { Tool, ImageState, Measurement } from '../types';

interface ViewportProps {
  imageSrc: string;
  tool: Tool;
  imageState: ImageState;
  setImageState: React.Dispatch<React.SetStateAction<ImageState>>;
  measurements: Measurement[];
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>;
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
  
  // Interaction Internal State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeMeasurement, setActiveMeasurement] = useState<Measurement | null>(null);

  // --- Helpers to map screen to image coordinates ---
  const getLocalCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    
    return {
      x: (clientX - rect.left) / imageState.scale,
      y: (clientY - rect.top) / imageState.scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
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
      // W/L: Horizontal = Contrast, Vertical = Brightness
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
        // Calculate length based on current spacing
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

      // Filter out accidental clicks
      if (distPixels > 5) {
        if (tool === 'measure') {
            setMeasurements(prev => [...prev, activeMeasurement]);
        } else if (tool === 'calibrate') {
            // Translated prompt to Portuguese
            const input = window.prompt("Insira a distância real deste segmento em mm:", "10");
            if (input !== null) {
                const realMm = parseFloat(input);
                if (!isNaN(realMm) && realMm > 0) {
                    const newSpacing = realMm / distPixels;
                    
                    // Update global state with new spacing
                    setImageState(prev => ({ ...prev, pixelSpacing: newSpacing }));
                    
                    // Recalculate all existing measurements with new spacing
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

  return (
    <div 
      className={`relative flex-1 bg-black overflow-hidden flex items-center justify-center ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()} // Disable native context menu
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
          style={{
            filter: filterString
          }}
          className="max-w-[1024px] pointer-events-none select-none block" 
        />
        
        {/* SVG Overlay for Measurements */}
        {imgRef.current && (
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
            viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
          >
            {/* Completed Measurements */}
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
                {/* Endpoints */}
                <circle cx={m.x1} cy={m.y1} r={3 / imageState.scale} fill="#ef4444" />
                <circle cx={m.x2} cy={m.y2} r={3 / imageState.scale} fill="#ef4444" />
              </g>
            ))}

            {/* Active Measurement (Being Drawn) */}
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

      {/* HUD Info */}
      <div className="absolute top-4 left-4 text-[#ffd700] text-sm font-mono drop-shadow-md pointer-events-none space-y-1 z-10">
        <div>MOD: CT</div>
        <div>SER: 001</div>
        <div>POS: {Math.round(imageState.panX)}, {Math.round(imageState.panY)}</div>
      </div>

      <div className="absolute bottom-4 right-4 text-[#ffd700] text-sm font-mono drop-shadow-md pointer-events-none space-y-1 text-right z-10">
        <div>Zoom: {imageState.scale.toFixed(2)}x</div>
        {/* Translated HUD labels */}
        <div className="text-gray-400 text-xs">Escala: {imageState.pixelSpacing.toFixed(3)} mm/px</div>
        {imageState.colormap !== 'none' && <div className="text-purple-400 text-xs uppercase">MAPA: {imageState.colormap}</div>}
      </div>
    </div>
  );
};

export default Viewport;