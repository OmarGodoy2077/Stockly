export interface PurchaseItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  cost_per_unit: number;
  sell_price_per_unit: number;
  profit_per_unit: number;
}

export interface Purchase {
  id: string;
  company_id: string;
  user_id: string;
  supplier_id?: string;
  supplier_name?: string;
  invoice_number?: string;
  products: PurchaseItem[];
  total_amount: number;
  cost_amount: number;
  sell_amount: number;
  profit_amount: number;
  profit_margin_percent: number;
  purchase_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}