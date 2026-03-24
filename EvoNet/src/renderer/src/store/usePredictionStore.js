import { create } from 'zustand'

export const usePredictionStore = create((set, get) => ({
  excalidrawData: null,
  excalidrawThumbnail: null,
  drawnImageBase64: null,

  predictionImage: null,
  showWorking: false,

  setPredictionImage: (img) => set({ predictionImage: img }),
  setShowWorking: (val) => set({ showWorking: val }),

  setExcalidrawData: (data) => set({ excalidrawData: data }),
  setExcalidrawThumbnail: (thumbnail) => set({ excalidrawThumbnail: thumbnail }),
  setDrawnImageBase64: (img) => set({ drawnImageBase64: img }),
  getDrawnImageBase64: () => get().drawnImageBase64,

  result: null,
  setResult: (result) => set({ result }),

  fitnessHistory: [],
  setFitnessHistory: (history) => set({ fitnessHistory: history }),

  modelMeta: null,
  setModelMeta: (meta) => set({ modelMeta: meta }),

  clearDrawing: () =>
    set({ excalidrawData: null, excalidrawThumbnail: null, drawnImageBase64: null, result: null })
}))
