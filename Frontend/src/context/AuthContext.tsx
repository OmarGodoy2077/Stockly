import { createContext, useContext, useEffect, useState } from 'react';
import type { AuthContextType, LoginCredentials, User, Company } from '../types/auth.types';
import * as authService from '../services/authService';

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authService.getStoredToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Check if token is expired
        if (authService.isTokenExpired()) {
          try {
            // Try to refresh the token
            const refreshResponse = await authService.refreshToken();
            if (refreshResponse && refreshResponse.user) {
              const userData: User = {
                id: refreshResponse.user.id,
                email: refreshResponse.user.email,
                name: refreshResponse.user.name,
                phone: refreshResponse.user.phone || '',
                companies: refreshResponse.user.companies || []
              };
              setUser(userData);
              if (userData.companies && userData.companies.length > 0) {
                setCurrentCompany(userData.companies[0]);
              }
            }
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr);
            authService.clearTokens();
            setUser(null);
            setCurrentCompany(null);
          }
        } else {
          // Token is valid, load user data from the token or make an API call
          // For now, we can decode the token if needed, or just set isAuthenticated flag
          // The user data will be populated when they login
          // This allows the Redux auth slice to be used for persisted user data
          console.log('Token is valid, user will be loaded from Redux store');
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.login(credentials);
      
      if (response && response.user) {
        // Crear objeto User con estructura completa
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          phone: response.user.phone || '',
          companies: response.user.companies || []
        };
        setUser(userData);
        
        // Establecer la compañía actual desde la respuesta 
        // El backend devuelve la compañía seleccionada en la respuesta
        if (userData.companies && userData.companies.length > 0) {
          // Usar la primera compañía como predeterminada
          setCurrentCompany(userData.companies[0]);
        }
      } else {
        setError('Login failed: Invalid response');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setCurrentCompany(null);
      setIsLoading(false);
    }
  };

  const switchCompany = async (companyId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user || !user.companies) {
        setError('No companies available to switch to');
        return;
      }
      
      const company = user.companies.find(c => c.id === companyId);
      if (!company) {
        setError('Company not found');
        return;
      }
      
      setCurrentCompany(company);
    } catch (err: any) {
      setError('Failed to switch company');
      console.error('Switch company error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    currentCompany,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    switchCompany
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}