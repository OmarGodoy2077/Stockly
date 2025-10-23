import type { AxiosError } from 'axios';
import apiClient from './apiClient';
import type { Invoice, InvoiceLineItem } from '../types';
import type { ApiError } from '../types/error';

export interface CreateInvoiceData {
  sale_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  items: Array<{
    item_type: 'product' | 'shipping' | 'commission' | 'discount' | 'tax';
    item_name: string;
    quantity: number;
    unit_price: number;
    is_taxable?: boolean;
  }>;
  notes?: string;
  is_draft?: boolean;
  payment_status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  id: string;
}

export interface InvoiceFilter {
  invoice_number?: string;
  customer_name?: string;
  payment_status?: string;
  start_date?: string;
  end_date?: string;
  is_draft?: boolean;
  sort_by?: 'date' | 'total' | 'customer';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface InvoiceResponse {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class InvoiceService {
  static async getInvoices(filters: InvoiceFilter = {}): Promise<InvoiceResponse> {
    try {
      // Filter out empty values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );

      const response = await apiClient.get<InvoiceResponse>('/invoices', {
        params: cleanFilters,
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getInvoiceById(id: string): Promise<Invoice> {
    try {
      const response = await apiClient.get<Invoice>(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    try {
      const response = await apiClient.post<Invoice>('/invoices', data);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async updateInvoice(data: UpdateInvoiceData): Promise<Invoice> {
    try {
      const { id, ...updateData } = data;
      const response = await apiClient.put<Invoice>(`/invoices/${id}`, updateData);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async deleteInvoice(id: string): Promise<void> {
    try {
      await apiClient.delete(`/invoices/${id}`);
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async generateInvoicePdf(id: string): Promise<{ pdf_url: string }> {
    try {
      const response = await apiClient.post<{ pdf_url: string }>(`/invoices/${id}/generate-pdf`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async downloadInvoicePdf(id: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/invoices/${id}/download-pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getInvoiceItems(id: string): Promise<InvoiceLineItem[]> {
    try {
      const response = await apiClient.get<InvoiceLineItem[]>(`/invoices/${id}/items`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  private static handleError(error: AxiosError<ApiError>): never {
    if (error.response?.status === 404) {
      throw new Error('Factura no encontrada');
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
export const getInvoices = (params: any) => InvoiceService.getInvoices(params);
export const createInvoice = (data: any) => InvoiceService.createInvoice(data);
export const generateInvoicePdf = (id: string) => InvoiceService.generateInvoicePdf(id);
export const downloadInvoicePdf = (id: string) => InvoiceService.downloadInvoicePdf(id);
