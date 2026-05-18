import { create } from 'zustand';

const useAppStore = create((set) => ({
  step: 'landing',
  selectedDirection: null, // legend | brand | fury
  currentQuestionIdx: 0,
  answers: {},
  result: null,
  scriptCount: 30,

  setStep: (step) => set({ step }),
  setSelectedDirection: (id) => set({ selectedDirection: id }),
  setScriptCount: (n) => set({ scriptCount: n }),
  setAnswer: (qId, text) => set((s) => ({ answers: { ...s.answers, [qId]: text } })),
  nextQuestion: () => set((s) => ({ currentQuestionIdx: s.currentQuestionIdx + 1 })),
  prevQuestion: () => set((s) => ({ currentQuestionIdx: Math.max(0, s.currentQuestionIdx - 1) })),
  setCurrentQuestionIdx: (idx) => set({ currentQuestionIdx: idx }),
  setResult: (data) => set({ result: data }),

  reset: () => set({
    step: 'landing',
    selectedDirection: null,
    currentQuestionIdx: 0,
    answers: {},
    result: null,
    scriptCount: 30,
  }),
}));

export default useAppStore;
