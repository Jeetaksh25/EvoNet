import { create } from 'zustand'

export const usePredictionStore = create((set, get) => ({
  excalidrawData: null,
  excalidrawThumbnail: null,
  drawnImageBase64: null,
  predictionStep: 'raw',
  result: null,
  fitnessHistory: [],
  modelMeta: null,

  setExcalidrawData: (data) => set({ excalidrawData: data }),
  setExcalidrawThumbnail: (thumbnail) => set({ excalidrawThumbnail: thumbnail }),
  setDrawnImageBase64: (img) => set({ drawnImageBase64: img }),
  getDrawnImageBase64: () => get().drawnImageBase64,

  setResult: (result) => set({ result }),

  setFitnessHistory: (history) => set({ fitnessHistory: history }),

  setModelMeta: (meta) => set({ modelMeta: meta }),

  clearDrawing: () =>
    set({ excalidrawData: null, excalidrawThumbnail: null, drawnImageBase64: null, result: null }),

  setPredictionStep: (step) => set({ predictionStep: step })
}))
