import { AxiosError } from 'axios';
import apiClient from './apiClient';
import { config } from '../config/config';
import { jwtDecode } from 'jwt-decode';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface UserResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  companies?: Array<{
    id: string;
    name: string;
    role: string;
    ruc?: string;
  }>;
}

interface CompanyResponse {
  id: string;
  name: string;
  role: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
  expiresIn?: string;
}

interface AuthResponse {
  success?: boolean;
  message?: string;
  token?: string;
  refreshToken?: string;
  accessToken?: string;
  user?: UserResponse;
  data?: {
    user: UserResponse;
    company: CompanyResponse;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  expiresIn?: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
}

export class AuthError extends Error {
  public code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

const handleAuthError = (error: AxiosError): never => {
  if (error.response?.status === 401) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (error.response?.status === 404) {
    throw new AuthError('USER_NOT_FOUND', 'User not found');
  }
  throw new AuthError('UNKNOWN_ERROR', error.message);
};

export const saveTokens = (token: string, refreshToken: string) => {
  localStorage.setItem(config.auth.tokenKey, token);
  localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
  
  const decoded = jwtDecode<TokenPayload>(token);
  localStorage.setItem(config.auth.tokenExpiryKey, decoded.exp.toString());
};

export const clearTokens = () => {
  localStorage.removeItem(config.auth.tokenKey);
  localStorage.removeItem(config.auth.refreshTokenKey);
  localStorage.removeItem(config.auth.tokenExpiryKey);
};

export const getStoredToken = () => localStorage.getItem(config.auth.tokenKey);
export const getStoredRefreshToken = () => localStorage.getItem(config.auth.refreshTokenKey);

export const isTokenExpired = (): boolean => {
  const expiry = localStorage.getItem(config.auth.tokenExpiryKey);
  if (!expiry) return true;
  
  return Date.now() >= parseInt(expiry) * 1000;
};

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    // Manejar estructura de respuesta del backend que devuelve tokens en data
    const accessToken = response.data.data?.accessToken || response.data.accessToken || response.data.token;
    const refreshToken = response.data.data?.refreshToken || response.data.refreshToken;
    const userData = response.data.data?.user || response.data.user;
    
    if (!accessToken || !refreshToken) {
      throw new AuthError('INVALID_RESPONSE', 'Missing tokens in response');
    }
    
    if (!userData) {
      throw new AuthError('INVALID_RESPONSE', 'Missing user data in response');
    }
    
    saveTokens(accessToken, refreshToken);
    
    // Retornar estructura normalizada
    return {
      token: accessToken,
      refreshToken: refreshToken,
      user: userData,
      expiresIn: response.data.data?.expiresIn || response.data.expiresIn
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      throw handleAuthError(error);
    }
    throw error;
  }
};

export const register = async (userData: RegisterData): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);
    
    // Manejar estructura de respuesta del backend que devuelve tokens en data
    const accessToken = response.data.data?.accessToken || response.data.accessToken || response.data.token;
    const refreshToken = response.data.data?.refreshToken || response.data.refreshToken;
    const user = response.data.data?.user || response.data.user;
    
    if (!accessToken || !refreshToken) {
      throw new AuthError('INVALID_RESPONSE', 'Missing tokens in response');
    }
    
    if (!user) {
      throw new AuthError('INVALID_RESPONSE', 'Missing user data in response');
    }
    
    saveTokens(accessToken, refreshToken);
    
    // Retornar estructura normalizada
    return {
      token: accessToken,
      refreshToken: refreshToken,
      user: user,
      expiresIn: response.data.data?.expiresIn || response.data.expiresIn
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      throw handleAuthError(error);
    }
    throw error;
  }
};

export const refreshToken = async (): Promise<AuthResponse> => {
  const refreshTokenValue = getStoredRefreshToken();
  if (!refreshTokenValue) {
    throw new AuthError('NO_REFRESH_TOKEN', 'No refresh token available');
  }

  try {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken: refreshTokenValue });
    
    // Manejar estructura de respuesta del backend que devuelve tokens en data
    const accessToken = response.data.data?.accessToken || response.data.accessToken || response.data.token;
    const newRefreshToken = response.data.data?.refreshToken || response.data.refreshToken;
    const user = response.data.data?.user || response.data.user;
    
    if (!accessToken || !newRefreshToken) {
      throw new AuthError('INVALID_RESPONSE', 'Missing tokens in refresh response');
    }
    
    saveTokens(accessToken, newRefreshToken);
    
    // Retornar estructura normalizada
    return {
      token: accessToken,
      refreshToken: newRefreshToken,
      user: user,
      expiresIn: response.data.data?.expiresIn || response.data.expiresIn
    };
  } catch (error) {
    clearTokens();
    if (error instanceof AxiosError) {
      throw handleAuthError(error);
    }
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    clearTokens();
  }
};

export const joinCompany = async (invitationCode: string) => {
  try {
    const response = await apiClient.post('/auth/join', { code: invitationCode });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        throw new AuthError('INVALID_CODE', 'Invalid invitation code');
      }
      throw handleAuthError(error);
    }
    throw error;
  }
};
