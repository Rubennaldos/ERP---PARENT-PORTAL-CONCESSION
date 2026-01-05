import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewAsState {
  isViewAsMode: boolean;
  isDemoMode: boolean;
  viewAsRole: string | null;
  viewAsSchoolId: string | null;
  viewAsSchoolName: string | null;
  
  enableViewAs: (role: string, schoolId: string | null, schoolName: string | null) => void;
  disableViewAs: () => void;
  setDemoMode: (enabled: boolean) => void;
}

export const useViewAsStore = create<ViewAsState>()(
  persist(
    (set) => ({
      isViewAsMode: false,
      isDemoMode: false,
      viewAsRole: null,
      viewAsSchoolId: null,
      viewAsSchoolName: null,

      enableViewAs: (role, schoolId, schoolName) => 
        set({ 
          isViewAsMode: true, 
          viewAsRole: role, 
          viewAsSchoolId: schoolId,
          viewAsSchoolName: schoolName 
        }),

      disableViewAs: () => 
        set({ 
          isViewAsMode: false, 
          viewAsRole: null, 
          viewAsSchoolId: null,
          viewAsSchoolName: null 
        }),

      setDemoMode: (enabled) => set({ isDemoMode: enabled }),
    }),
    {
      name: 'view-as-storage',
    }
  )
);

