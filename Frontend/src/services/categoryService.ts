import type { AxiosError } from 'axios';
import apiClient from './apiClient';
import type { Category } from '../types';
import type { ApiError } from '../types/error';

export interface CreateCategoryData {
  name: string;
  parent_id?: string;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}

export class CategoryService {
  static async getCategories(): Promise<Category[]> {
    try {
      const response = await apiClient.get('/categories');
      // La respuesta tiene formato { success: true, data: [...], message: "...", timestamp: "..." }
      return response.data.data || [];
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getCategoryTree(): Promise<CategoryTree[]> {
    try {
      const response = await apiClient.get('/categories/tree');
      // La respuesta tiene formato { success: true, data: [...], message: "...", timestamp: "..." }
      console.log('getCategoryTree response:', response.data);
      return response.data.data || [];
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async getCategoryById(id: string): Promise<Category> {
    try {
      const response = await apiClient.get(`/categories/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
      const response = await apiClient.post('/categories', data);
      return response.data.data || response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async updateCategory(data: UpdateCategoryData): Promise<Category> {
    try {
      const response = await apiClient.put(`/categories/${data.id}`, data);
      return response.data.data || response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  static async deleteCategory(id: string): Promise<void> {
    try {
      await apiClient.delete(`/categories/${id}`);
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
      throw error;
    }
  }

  private static handleError(error: AxiosError<ApiError>): never {
    if (error.response?.status === 404) {
      throw new Error('Categoría no encontrada');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || 'Datos inválidos');
    }
    if (error.response?.status === 409) {
      // El backend devuelve "Duplicate entry. This record already exists." para categorías duplicadas
      throw new Error('Esta categoría ya existe. Por favor, elige otro nombre.');
    }
    throw new Error(error.response?.data?.message || 'Error del servidor');
  }
}