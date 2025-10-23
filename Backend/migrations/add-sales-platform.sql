-- Migration: Add sales_platform column to sales table
-- Date: 2025-10-22
-- Description: Add sales_platform field to track which platform/channel the sale was made from

-- Add sales_platform column to sales table
ALTER TABLE IF EXISTS sales
ADD COLUMN sales_platform VARCHAR(50) DEFAULT 'direct' CHECK (sales_platform IN ('direct', 'amazon', 'ebay', 'shopify', 'facebook', 'instagram', 'tiktok', 'marketplace', 'otros','whatsapp'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(sales_platform);

-- Add comment to document the field
COMMENT ON COLUMN sales.sales_platform IS 'Platform where the sale was made: direct, amazon, ebay, shopify, facebook, instagram, tiktok, whatsapp, marketplace, otros';
