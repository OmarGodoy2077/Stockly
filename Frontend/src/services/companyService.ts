import apiClient from './apiClient';

export const getCompanyDetails = async (id: string) => {
    const response = await apiClient.get(`/companies/${id}`);
    return response.data;
};

export const updateCompany = async (id: string, companyData: any) => {
    const response = await apiClient.put(`/companies/${id}`, companyData);
    return response.data;
};

export const getCompanyMembers = async (id: string) => {
    const response = await apiClient.get(`/companies/${id}/members`);
    return response.data;
};

export const createInvitation = async (invitationData: any) => {
    const response = await apiClient.post('/invitations', invitationData);
    return response.data;
};
