-- =====================================================
-- Migration: Add Purchase Profit Tracking
-- Date: October 20, 2025
-- Description: Adds profit tracking fields to purchases table
--              for cost analysis and financial reporting
-- =====================================================

-- Add new columns to purchases table for cost and profit tracking
-- These columns store data at the purchase line item level (in products JSONB)
-- And summary at the purchase level for quick access

ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sell_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Comment on new columns
COMMENT ON COLUMN purchases.cost_amount IS 'Total cost of purchase (sum of cost_per_unit * quantity for all items)';
COMMENT ON COLUMN purchases.sell_amount IS 'Potential revenue if all items are sold at recorded sell price (optional)';
COMMENT ON COLUMN purchases.profit_amount IS 'Calculated profit (sell_amount - cost_amount), or projected profit';
COMMENT ON COLUMN purchases.profit_margin_percent IS 'Profit margin percentage ((profit_amount / cost_amount) * 100)';

-- Create trigger to automatically calculate profit when purchases are updated
CREATE OR REPLACE FUNCTION calculate_purchase_profit()
RETURNS TRIGGER AS $$
BEGIN
    -- If cost_amount and sell_amount are both set, calculate profit
    IF NEW.cost_amount > 0 AND NEW.sell_amount > 0 THEN
        NEW.profit_amount := NEW.sell_amount - NEW.cost_amount;
        -- Profit margin = (profit / sell_amount) * 100
        -- Example: cost=70, sell=100, profit=30 → margin = (30/100)*100 = 30%
        NEW.profit_margin_percent := (NEW.profit_amount / NEW.sell_amount) * 100;
    ELSIF NEW.cost_amount > 0 THEN
        NEW.profit_amount := 0;
        NEW.profit_margin_percent := 0;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF NOT EXISTS trigger_calculate_purchase_profit ON purchases;

-- Create trigger
CREATE TRIGGER trigger_calculate_purchase_profit
BEFORE INSERT OR UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION calculate_purchase_profit();

-- Create index for profit queries
CREATE INDEX IF NOT EXISTS idx_purchases_profit_amount ON purchases(profit_amount);
CREATE INDEX IF NOT EXISTS idx_purchases_profit_margin ON purchases(profit_margin_percent);
CREATE INDEX IF NOT EXISTS idx_purchases_cost_amount ON purchases(cost_amount);
CREATE INDEX IF NOT EXISTS idx_purchases_updated_at ON purchases(updated_at);

-- Create view for purchase profitability analysis
CREATE OR REPLACE VIEW purchase_profit_analysis AS
SELECT
    p.id,
    p.company_id,
    p.user_id,
    p.supplier_id,
    p.supplier_name,
    p.invoice_number,
    p.cost_amount,
    p.sell_amount,
    p.profit_amount,
    p.profit_margin_percent,
    p.total_amount,
    p.purchase_date,
    p.created_at,
    u.name as buyer_name,
    u.email as buyer_email,
    s.name as supplier_full_name,
    c.name as company_name,
    -- Calculate days since purchase
    EXTRACT(DAYS FROM (NOW() - p.purchase_date)) as days_since_purchase,
    -- Status indicator
    CASE 
        WHEN p.profit_margin_percent > 30 THEN 'Excellent'
        WHEN p.profit_margin_percent > 15 THEN 'Good'
        WHEN p.profit_margin_percent > 0 THEN 'Fair'
        ELSE 'Poor or No Profit'
    END as profit_status
FROM purchases p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.purchase_date DESC;

-- Create summary view for monthly profit analysis
CREATE OR REPLACE VIEW monthly_purchase_profit_summary AS
SELECT
    p.company_id,
    DATE_TRUNC('month', p.purchase_date)::DATE as month,
    COUNT(p.id) as total_purchases,
    SUM(p.cost_amount) as total_cost,
    SUM(p.sell_amount) as total_sell_value,
    SUM(p.profit_amount) as total_profit,
    AVG(p.profit_margin_percent) as avg_profit_margin,
    MAX(p.profit_amount) as max_profit_purchase,
    MIN(p.profit_amount) as min_profit_purchase
FROM purchases p
GROUP BY p.company_id, DATE_TRUNC('month', p.purchase_date)
ORDER BY month DESC;

-- =====================================================
-- SUCCESS VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Purchase profit tracking migration completed successfully!';
    RAISE NOTICE 'New columns added: cost_amount, sell_amount, profit_amount, profit_margin_percent, updated_at';
    RAISE NOTICE 'Triggers and views created for profit analysis';
END $$;
