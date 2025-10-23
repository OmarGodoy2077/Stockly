import apiClient from './apiClient';

export const getProductAttributes = async (productId: string) => {
    const response = await apiClient.get(`/products/${productId}/attributes`);
    return response.data;
};

export const createProductAttribute = async (productId: string, attributeData: any) => {
    const response = await apiClient.post(`/products/${productId}/attributes`, attributeData);
    return response.data;
};

export const createBulkProductAttributes = async (productId: string, attributes: any[]) => {
    const response = await apiClient.post(`/products/${productId}/attributes/bulk`, { attributes });
    return response.data;
};

export const updateProductAttribute = async (productId: string, attributeId: string, attributeData: any) => {
    const response = await apiClient.put(`/products/${productId}/attributes/${attributeId}`, attributeData);
    return response.data;
};

export const deleteProductAttribute = async (productId: string, attributeId: string) => {
    const response = await apiClient.delete(`/products/${productId}/attributes/${attributeId}`);
    return response.data;
};
