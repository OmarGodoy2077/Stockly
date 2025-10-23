export interface Invitation {
    id: string;
    company_id: string;
    code: string;
    role: 'owner' | 'admin' | 'seller' | 'inventory';
    created_by: string;
    expires_at: string;
    is_active: boolean;
}