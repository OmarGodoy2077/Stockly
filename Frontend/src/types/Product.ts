export interface Product {
  id: string;
  company_id: string;
  category_id?: string;
  sku?: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  stock: number;
  condition: 'new' | 'used' | 'open_box';
  barcode?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  parent_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  children?: Category[];
}

export interface ProductAttribute {
  id: string;
  product_id: string;
  name: string;
  value: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}