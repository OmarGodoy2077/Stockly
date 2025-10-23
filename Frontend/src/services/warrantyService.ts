import apiClient from './apiClient';

export const getWarrantyStatistics = async () => {
    const response = await apiClient.get('/warranties/statistics');
    return response.data;
};

export const getExpiringWarranties = async (days?: number) => {
    const response = await apiClient.get(`/warranties/expiring/${days || ''}`);
    return response.data;
};

export const getWarrantyBySerialNumber = async (serialNumber: string) => {
    const response = await apiClient.get(`/warranties/serial/${serialNumber}`);
    return response.data;
};

export const getWarranties = async (params: any) => {
    const response = await apiClient.get('/warranties', { params });
    return response.data;
};

export const getWarrantyById = async (id: string) => {
    const response = await apiClient.get(`/warranties/${id}`);
    return response.data;
};

export const updateWarranty = async (id: string, warrantyData: any) => {
    const response = await apiClient.put(`/warranties/${id}`, warrantyData);
    return response.data;
};

export const deactivateWarranty = async (id: string) => {
    const response = await apiClient.delete(`/warranties/${id}`);
    return response.data;
};
