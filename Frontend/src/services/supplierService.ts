import apiClient from './apiClient';

export const getTopSuppliers = async (limit?: number) => {
    const response = await apiClient.get(`/suppliers/top/${limit || ''}`);
    return response.data;
};

export const getSuppliers = async (params: any) => {
    const response = await apiClient.get('/suppliers', { params });
    return response.data;
};

export const createSupplier = async (supplierData: any) => {
    const response = await apiClient.post('/suppliers', supplierData);
    return response.data;
};

export const getSupplierById = async (id: string) => {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
};

export const updateSupplier = async (id: string, supplierData: any) => {
    const response = await apiClient.put(`/suppliers/${id}`, supplierData);
    return response.data;
};

export const deleteSupplier = async (id: string) => {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
};
