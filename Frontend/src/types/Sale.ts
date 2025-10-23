import type { Product } from './Product';

export interface Sale {
  id: string;
  company_id: string;
  user_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal: number;
  tax: number;
  total: number;
  warranty_months?: number;
  warranty_expiry?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: SaleItem[];
  image_url?: string;
  payment_method?: 'cash' | 'card' | 'check' | 'transfer';
  payment_status?: 'pending' | 'completed' | 'cancelled';
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  line_total: number;
  discount?: number;
  serial_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  sale_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  is_draft: boolean;
  pdf_url?: string;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_type: 'product' | 'shipping' | 'commission' | 'discount' | 'tax';
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_taxable: boolean;
}