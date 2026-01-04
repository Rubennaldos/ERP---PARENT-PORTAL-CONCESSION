import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewAsState {
  isViewAsMode: boolean;
  viewAsRole: string | null;
  viewAsSchoolId: string | null;
  viewAsSchoolName: string | null;
  
  enableViewAs: (role: string, schoolId: string | null, schoolName: string | null) => void;
  disableViewAs: () => void;
}

export const useViewAsStore = create<ViewAsState>()(
  persist(
    (set) => ({
      isViewAsMode: false,
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
    }),
    {
      name: 'view-as-storage',
    }
  )
);

