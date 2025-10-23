import type { AxiosError } from 'axios';
import apiClient from './apiClient';
import type { Purchase } from '../types';
import type { ApiError } from '../types/error';

export interface CreatePurchaseData {
  supplier_id?: string;
  supplier_name?: string;
  invoice_number?: string;
  products: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    cost_per_unit: number;
    sell_price_per_unit: number;
  }>;
  purchase_date: string;
  notes?: string;
}

export interface UpdatePurchaseData extends Partial<CreatePurchaseData> {
  id: string;
}

export interface PurchaseFilter {
  supplier_id?: string;
  invoice_number?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'date' | 'total' | 'profit';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PurchaseResponse {
  data: Purchase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PurchaseService {
  static async getPurchases(filters: PurchaseFilter = {}): Promise<PurchaseResponse> {
    try {
      // Filter out empty values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );

      const response = await apiClient.get<PurchaseResponse>('/purchases', {
        params: cleanFilters,
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getPurchaseById(id: string): Promise<Purchase> {
    try {
      const response = await apiClient.get<Purchase>(`/purchases/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async createPurchase(data: CreatePurchaseData): Promise<Purchase> {
    try {
      const response = await apiClient.post<Purchase>('/purchases', data);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async updatePurchase(data: UpdatePurchaseData): Promise<Purchase> {
    try {
      const { id, ...updateData } = data;
      const response = await apiClient.put<Purchase>(`/purchases/${id}`, updateData);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async deletePurchase(id: string): Promise<void> {
    try {
      await apiClient.delete(`/purchases/${id}`);
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getPurchaseStatistics() {
    try {
      const response = await apiClient.get('/purchases/statistics');
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getPurchasesBySupplier(supplierId: string): Promise<Purchase[]> {
    try {
      const response = await apiClient.get<Purchase[]>(`/purchases/supplier/${supplierId}`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  private static handleError(error: AxiosError<ApiError>): never {
    if (error.response?.status === 404) {
      throw new Error('Compra no encontrada');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || 'Datos inválidos');
    }
    if (error.response?.status === 403) {
      throw new Error('No tienes permiso para realizar esta acción');
    }
    throw new Error(error.response?.data?.message || 'Error del servidor');
  }
}

// Export named functions for backward compatibility
export const getPurchases = (params: any) => PurchaseService.getPurchases(params);
export const getPurchaseById = (id: string) => PurchaseService.getPurchaseById(id);
export const createPurchase = (data: any) => PurchaseService.createPurchase(data);
export const updatePurchase = (id: string, data: any) => PurchaseService.updatePurchase({ ...data, id });
export const deletePurchase = (id: string) => PurchaseService.deletePurchase(id);
export const getPurchaseStatistics = () => PurchaseService.getPurchaseStatistics();
export const getPurchasesBySupplier = (supplierId: string) => PurchaseService.getPurchasesBySupplier(supplierId);
