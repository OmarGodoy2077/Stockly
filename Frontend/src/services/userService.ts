import apiClient from './apiClient';

export const getProfile = async () => {
    const response = await apiClient.get('/users/profile');
    return response.data;
};

export const updateProfile = async (profileData: { name?: string; phone?: string }) => {
    const response = await apiClient.put('/users/profile', profileData);
    return response.data;
};

export const getUserCompanies = async () => {
    const response = await apiClient.get('/users/companies');
    return response.data;
};

export const switchCompany = async (companyId: string) => {
    const response = await apiClient.post(`/users/switch-company/${companyId}`);
    return response.data;
};

export const getUsers = async (params: any) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
};

export const getUserById = async (id: string) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
};

export const updateUserRole = async (id: string, role: string) => {
    const response = await apiClient.patch(`/users/${id}/role`, { role });
    return response.data;
};

export const removeUserFromCompany = async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
};
