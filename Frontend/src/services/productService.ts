import type { AxiosError } from 'axios';
import apiClient from './apiClient';
import type { Product, ProductAttribute } from '../types';
import type { ApiError } from '../types/error';

export interface ProductFilter {
  category_id?: string;
  search?: string;
  condition?: 'new' | 'used' | 'open_box';
  inStock?: boolean;
  minStock?: number;
  sortBy?: 'name' | 'stock' | 'price' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductData {
  name: string;
  sku?: string;
  brand?: string;
  description?: string;
  category_id: string;
  stock?: number;
  condition?: 'new' | 'used' | 'open_box';
  barcode?: string;
  attributes?: Omit<ProductAttribute, 'id' | 'product_id'>[];
  image_file?: File;
}

export interface UpdateProductData extends Partial<Omit<CreateProductData, 'image_file'>> {
  id: string;
  image_file?: File;
}

export class ProductService {
  private static createFormData(data: CreateProductData | UpdateProductData): FormData {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      // Skip undefined, null, and empty strings for required fields
      if (value === undefined || value === null) return;
      
      // For string fields, skip empty strings
      if (typeof value === 'string' && value.trim() === '') return;

      if (key === 'attributes') {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'image_file' && value instanceof File) {
        formData.append('image', value);
      } else {
        formData.append(key, value.toString());
      }
    });

    return formData;
  }
  static async getProducts(filters: ProductFilter = {}): Promise<ProductResponse> {
    try {
      // Filter out empty values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );
      
      // Convert page and limit to strings for backend validation
      const params: any = cleanFilters;
      if (params.page !== undefined) {
        params.page = String(params.page);
      }
      if (params.limit !== undefined) {
        params.limit = String(params.limit);
      }
      
      const response = await apiClient.get<ProductResponse>('/products', {
        params,
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getProductById(id: string): Promise<Product> {
    try {
      const response = await apiClient.get<Product>(`/products/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async createProduct(data: CreateProductData): Promise<Product> {
    try {
      const formData = this.createFormData(data);
      const response = await apiClient.post<Product>('/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async updateProduct(data: UpdateProductData): Promise<Product> {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'attributes') {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'image_file' && value instanceof File) {
          formData.append('image', value);
        } else if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      const response = await apiClient.put<Product>(`/products/${data.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    try {
      await apiClient.delete(`/products/${id}`);
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getProductAttributes(productId: string): Promise<ProductAttribute[]> {
    try {
      const response = await apiClient.get<ProductAttribute[]>(`/products/${productId}/attributes`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async updateProductStock(
    productId: string,
    quantity: number,
    operation: 'add' | 'subtract'
  ): Promise<Product> {
    try {
      const response = await apiClient.patch<Product>(`/products/${productId}/stock`, {
        quantity,
        operation,
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async bulkUpdateStock(
    updates: { productId: string; quantity: number; operation: 'add' | 'subtract' }[]
  ): Promise<void> {
    try {
      await apiClient.patch('/products/stock/bulk', { updates });
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  private static handleError(error: AxiosError<ApiError>): never {
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Token expired or invalid - will be handled by apiClient interceptor
      throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }

    // Handle authorization errors
    if (error.response?.status === 403) {
      throw new Error('No tiene permisos para realizar esta acción.');
    }

    // Handle not found
    if (error.response?.status === 404) {
      throw new Error('Producto no encontrado');
    }

    // Handle validation errors
    if (error.response?.status === 400) {
      const message = error.response.data?.message || 'Datos inválidos';
      throw new Error(message);
    }

    // Handle server errors
    if ((error.response?.status ?? 0) >= 500) {
      throw new Error('Error del servidor. Por favor, intente más tarde.');
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Error de conexión. Por favor, verifique su conexión a internet.');
    }

    // Default error
    throw new Error(error.response?.data?.message || 'Error inesperado');
  }
}

export const getCategoriesTree = async () => {
  try {
    const response = await apiClient.get('/categories/tree');
    return response.data;
  } catch (error) {
    if ((error as AxiosError).response?.status === 404) {
      throw new Error('No se encontraron categorías');
    }
    throw error;
  }
};
