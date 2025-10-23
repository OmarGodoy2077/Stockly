export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  role: 'owner' | 'admin' | 'seller' | 'inventory';
  invitation_code?: string;
}
