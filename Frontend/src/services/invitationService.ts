import apiClient from './apiClient';

export const createInvitation = async (invitationData: { companyId: string; role: 'admin' | 'seller' | 'inventory' | 'employee' }) => {
    const response = await apiClient.post('/invitations', invitationData);
    return response.data;
};

export const validateInvitation = async (code: string) => {
    const response = await apiClient.get(`/invitations/validate/${code}`);
    return response.data;
};

export const getInvitations = async () => {
    const response = await apiClient.get('/invitations');
    return response.data;
};

export const deleteInvitation = async (id: string) => {
    const response = await apiClient.delete(`/invitations/${id}`);
    return response.data;
};
