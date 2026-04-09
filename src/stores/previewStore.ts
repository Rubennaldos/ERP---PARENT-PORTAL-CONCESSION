import { create } from 'zustand';

/**
 * PreviewStore — permite a un admin "ver el portal como" un padre o profesor.
 * Solo afecta las queries de lectura en Index.tsx y Teacher.tsx.
 * Las mutaciones (onboarding, etc.) están bloqueadas en modo preview.
 */
interface PreviewState {
  previewUserId: string | null;
  previewName: string;
  previewRole: 'parent' | 'teacher' | null;
  setPreview: (userId: string, name: string, role: 'parent' | 'teacher') => void;
  clearPreview: () => void;
}

export const usePreviewStore = create<PreviewState>(set => ({
  previewUserId: null,
  previewName: '',
  previewRole: null,
  setPreview: (userId, name, role) =>
    set({ previewUserId: userId, previewName: name, previewRole: role }),
  clearPreview: () =>
    set({ previewUserId: null, previewName: '', previewRole: null }),
}));
