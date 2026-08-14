import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null })
      },
    }),
    {
      name: 'synthesis-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

export const useAppStore = create((set) => ({
  selectedFolderId: null,
  selectedChatId: null,
  sidebarCollapsed: false,
  setSelectedFolder: (id) => set({ selectedFolderId: id }),
  setSelectedChat: (id) => set({ selectedChatId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
