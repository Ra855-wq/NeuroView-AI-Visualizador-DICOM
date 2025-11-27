export type Tool = 'pan' | 'zoom' | 'wl' | 'measure' | 'calibrate';

export type ColormapType = 'none' | 'hot' | 'jet' | 'purples';

export interface Measurement {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthMm: number;
}

export interface ImageState {
  scale: number;
  panX: number;
  panY: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  pixelSpacing: number; // mm per pixel
  colormap: ColormapType;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}