export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  companies: Company[];
}

export interface Company {
  id: string;
  name: string;
  role: string;
  ruc?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    company: Company;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  companyId?: string;
}

export interface AuthContextType {
  user: User | null;
  currentCompany: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
}