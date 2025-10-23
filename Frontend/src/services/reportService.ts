import apiClient from './apiClient';

export const getDashboardReport = async () => {
    const response = await apiClient.get('/reports/dashboard');
    // Backend devuelve: { success: true, message: "...", data: {...}, timestamp: "..." }
    // Retornar el data anidado
    return response.data.data;
};

export const getCostVsRevenueReport = async () => {
    const response = await apiClient.get('/reports/cost-vs-revenue');
    // Backend devuelve: { success: true, message: "...", data: {...}, timestamp: "..." }
    // Retornar el data anidado
    return response.data.data;
};
