import apiClient from './apiClient';

export const getServiceStatistics = async () => {
    const response = await apiClient.get('/services/statistics');
    return response.data;
};

export const getServiceHistoriesBySerialNumber = async (serialNumber: string) => {
    const response = await apiClient.get(`/services/serial/${serialNumber}`);
    return response.data;
};

export const getServiceHistories = async (params: any) => {
    const response = await apiClient.get('/services', { params });
    return response.data;
};

export const createServiceHistory = async (serviceData: FormData) => {
    const response = await apiClient.post('/services', serviceData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getServiceHistoryById = async (id: string) => {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
};

export const updateServiceHistory = async (id: string, serviceData: FormData) => {
    const response = await apiClient.put(`/services/${id}`, serviceData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const updateServiceStatus = async (id: string, status: string) => {
    const response = await apiClient.patch(`/services/${id}/status`, { status });
    return response.data;
};

export const deleteServiceHistory = async (id: string) => {
    const response = await apiClient.delete(`/services/${id}`);
    return response.data;
};

export const addPhotosToService = async (id: string, photos: FormData) => {
    const response = await apiClient.post(`/services/${id}/photos`, photos, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const deletePhotoFromService = async (id: string, photoId: string) => {
    const response = await apiClient.delete(`/services/${id}/photos/${photoId}`);
    return response.data;
};
