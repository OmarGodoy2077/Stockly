import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config } from '../config/config';
import { getStoredToken, refreshToken, clearTokens } from './authService';
import toast from 'react-hot-toast';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

const apiClient = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;
    
    // Evitar bucles infinitos
    if (!originalRequest || (originalRequest as any)._retry) {
      return Promise.reject(error);
    }

    // Si es error 401 y tenemos el originalRequest, intentamos refresh
    if (error.response?.status === 401 && originalRequest) {
      try {
        (originalRequest as any)._retry = true;
        
        // Intentar refresh token
        const authResponse = await refreshToken();
        
        // Si el refresh fue exitoso, reintentar la request original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${authResponse.token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Si falla el refresh, limpiamos tokens y mostramos error
        clearTokens();
        toast.error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Manejo de errores generales
    const errorMessage = error.response?.data?.message || 'Ha ocurrido un error';
    
    // No mostrar toast para errores 401 (ya manejados arriba) ni para errores de validación
    if (error.response?.status !== 401 && error.response?.status !== 422) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
