import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** DMY = dd/MM/yyyy (default), MDY = US, YMD = ISO-style date only */
export type DatePattern = 'DMY' | 'MDY' | 'YMD';

interface DateDisplayState {
  datePattern: DatePattern;
  setDatePattern: (p: DatePattern) => void;
}

export const useDateDisplayStore = create<DateDisplayState>()(
  persist(
    (set) => ({
      datePattern: 'DMY',
      setDatePattern: (datePattern) => set({ datePattern }),
    }),
    { name: 'installops-date-display' }
  )
);
