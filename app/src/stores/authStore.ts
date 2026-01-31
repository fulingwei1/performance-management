import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee, LoginCredentials } from '@/types';
import { authApi } from '@/services/api';

interface AuthState {
  user: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          // 调用后端API登录
          const response = await authApi.login(
            credentials.username,
            credentials.password,
            credentials.role
          );
          
          if (response.success) {
            const { user, token } = response.data;
            localStorage.setItem('token', token);
            set({ 
              user, 
              token,
              isAuthenticated: true, 
              isLoading: false,
              error: null
            });
            return true;
          } else {
            set({ 
              isLoading: false, 
              error: response.error || '登录失败' 
            });
            return false;
          }
        } catch (error: any) {
          set({ 
            isLoading: false, 
            error: error.message || '网络错误，请稍后重试' 
          });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ 
          user: null, 
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      },
      
      setToken: (token: string) => {
        localStorage.setItem('token', token);
        set({ token });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        token: state.token
      })
    }
  )
);
