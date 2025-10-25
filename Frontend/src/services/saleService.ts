import type { AxiosError } from 'axios';
import apiClient from './apiClient';
import type { Sale, SaleItem } from '../types';
import type { ApiError } from '../types/error';

export interface CreateSaleData {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    serial_number?: string;
  }>;
  warranty_months?: number;
  notes?: string;
  payment_method?: 'cash' | 'card' | 'check' | 'transfer';
  sales_platform?: 'direct' | 'amazon' | 'ebay' | 'shopify' | 'facebook' | 'instagram' | 'tiktok' | 'whatsapp' | 'marketplace' | 'otros';
  image_file?: File;
}

export interface UpdateSaleData extends Partial<Omit<CreateSaleData, 'items'>> {
  id: string;
  items?: Array<{
    id?: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    serial_number?: string;
  }>;
}

export interface SaleFilter {
  customer_name?: string;
  customer_email?: string;
  serial_number?: string;
  start_date?: string;
  end_date?: string;
  payment_status?: string;
  has_warranty?: boolean;
  sort_by?: 'date' | 'total' | 'customer';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SaleResponse {
  data: Sale[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OCRResult {
  serial_number: string;
  confidence: number;
  ocr_text?: string;
  candidates?: Array<{ value: string; confidence: number }>;
}

export class SaleService {
  static async getSales(filters: SaleFilter = {}): Promise<SaleResponse> {
    try {
      // Filter out empty values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );

      const response = await apiClient.get<{ data: Sale[]; pagination: any }>('/sales', {
        params: cleanFilters,
      });
      
      // Extract data and pagination from response wrapper
      const responseData = response.data;
      return {
        data: responseData.data || [],
        total: responseData.pagination?.total || 0,
        page: responseData.pagination?.page || 1,
        limit: responseData.pagination?.limit || 20,
        totalPages: responseData.pagination?.totalPages || 1,
      };
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getSaleById(id: string): Promise<Sale> {
    try {
      const response = await apiClient.get<{ data: Sale }>(`/sales/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async createSale(data: CreateSaleData): Promise<Sale> {
    try {
      // Extract serial_number from the first item if present
      const serialNumber = data.items?.length > 0 ? data.items[0].serial_number : undefined;

      // Send as JSON, not FormData
      const payload = {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        items: data.items,
        serial_number: serialNumber, // 🔧 FIXED: Extract serial_number from first item
        warranty_months: data.warranty_months,
        notes: data.notes,
        payment_method: data.payment_method,
        sales_platform: data.sales_platform,
      };

      const response = await apiClient.post<{ data: Sale }>('/sales', payload);
      // Extract the data from the response wrapper
      return response.data.data || response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async updateSale(data: UpdateSaleData): Promise<Sale> {
    try {
      const { id, ...updateData } = data;
      
      // If has file, use FormData
      if (updateData.image_file) {
        const formData = new FormData();
        Object.entries(updateData).forEach(([key, value]) => {
          if (key === 'items') {
            formData.append('items', JSON.stringify(value));
          } else if (key === 'image_file' && value instanceof File) {
            formData.append('image', value);
          } else if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });

        const response = await apiClient.put<Sale>(`/sales/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      }

      const response = await apiClient.put<Sale>(`/sales/${id}`, updateData);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async deleteSale(id: string): Promise<void> {
    try {
      await apiClient.delete(`/sales/${id}`);
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async extractSerialNumber(imageFile: File): Promise<OCRResult> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await apiClient.post<{ success: boolean; data: OCRResult }>('/sales/ocr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Backend returns { success: true, data: { serial_number, confidence, ... } }
      return response.data.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getSaleItems(saleId: string): Promise<SaleItem[]> {
    try {
      const response = await apiClient.get<SaleItem[]>(`/sales/${saleId}/items`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async generateReceipt(id: string): Promise<{ pdf_url: string }> {
    try {
      const response = await apiClient.post<{ pdf_url: string }>(`/sales/${id}/receipt`, {});
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async downloadReceipt(id: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/sales/${id}/receipt-pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getReceiptPreviewUrl(id: string): Promise<string> {
    try {
      const response = await apiClient.post<{ data: { pdf_url: string } }>(`/sales/${id}/receipt`, {});
      const pdfUrl = response.data.data?.pdf_url;
      
      if (!pdfUrl) {
        throw new Error('No se pudo obtener la URL del recibo');
      }
      
      // Si la URL es relativa, construir la URL completa
      if (pdfUrl.startsWith('/')) {
        const baseUrl = apiClient.defaults.baseURL || '';
        return baseUrl + pdfUrl;
      }
      
      return pdfUrl;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  private static handleError(error: AxiosError<ApiError>): never {
    if (error.response?.status === 404) {
      throw new Error('Venta no encontrada');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || 'Datos inválidos');
    }
    if (error.response?.status === 422) {
      throw new Error('Error al procesar la imagen. Intente con otra foto.');
    }
    if (error.response?.status === 403) {
      throw new Error('No tienes permiso para realizar esta acción');
    }
    throw new Error(error.response?.data?.message || 'Error del servidor');
  }
}
