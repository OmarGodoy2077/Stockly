import { database } from '../config/database.js';
import { logger } from '../config/logger.js';
import DateUtils from '../utils/dateUtils.js';
import ProductModel from './product.model.js';

class SaleModel {

    static async create({
        companyId,
        userId,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        products,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        serialNumber,
        serialImageUrl,
        warrantyMonths,
        paymentMethod,
        salesPlatform = 'direct',
        notes,
        saleDate
    }) {
        try {
            const { data, error } = await database.supabase
                .from('sales')
                .insert([{
                    company_id: companyId,
                    user_id: userId,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    customer_address: customerAddress,
                    products: products,
                    subtotal: subtotal,
                    tax_amount: taxAmount,
                    discount_amount: discountAmount,
                    total_amount: totalAmount,
                    serial_number: serialNumber,
                    serial_image_url: serialImageUrl,
                    warranty_months: warrantyMonths,
                    payment_method: paymentMethod,
                    sales_platform: salesPlatform,
                    sale_date: saleDate || DateUtils.getCurrentDateGuatemala(),
                    notes: notes
                }])
                .select()
                .single();

            if (error) throw error;

            logger.business('sale_created', 'sale', data.id, {
                companyId,
                userId,
                customerName,
                totalAmount,
                serialNumber,
                salesPlatform
            });

            return data;
        } catch (error) {
            logger.error('Error creating sale:', error);
            throw error;
        }
    }

    static async findById(saleId, companyId) {
        try {
            const { data: sale, error } = await database.supabase
                .from('sales')
                .select('*, users!sales_user_id_fkey (name, email)')
                .eq('id', saleId)
                .eq('company_id', companyId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!sale) return null;

            return {
                ...sale,
                seller_name: sale.users?.name,
                seller_email: sale.users?.email
            };
        } catch (error) {
            logger.error('Error finding sale by ID:', error);
            throw error;
        }
    }

    static async getByCompany({
        companyId,
        startDate,
        endDate,
        customerName,
        serialNumber,
        userId,
        paymentMethod,
        page = 1,
        limit = 20,
        sortBy = 'sale_date',
        sortOrder = 'DESC'
    }) {
        try {
            const offset = (page - 1) * limit;

            let query = database.supabase
                .from('sales')
                .select('*, users!sales_user_id_fkey (name, email)', { count: 'exact' })
                .eq('company_id', companyId);

            if (startDate) query = query.gte('sale_date', startDate);
            if (endDate) query = query.lte('sale_date', endDate);
            if (customerName) query = query.ilike('customer_name', `%${customerName}%`);
            if (serialNumber) query = query.ilike('serial_number', `%${serialNumber}%`);
            if (userId) query = query.eq('user_id', userId);
            if (paymentMethod) query = query.eq('payment_method', paymentMethod);

            const validSortFields = ['sale_date', 'customer_name', 'total_amount', 'created_at'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'sale_date';
            const ascending = sortOrder.toUpperCase() !== 'DESC';

            query = query.order(sortField, { ascending }).range(offset, offset + limit - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            const sales = (data || []).map(sale => ({
                ...sale,
                seller_name: sale.users?.name,
                seller_email: sale.users?.email
            }));

            const total = count || 0;
            const totalPages = Math.ceil(total / limit);

            return {
                sales,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Error getting sales by company:', error);
            throw error;
        }
    }

    static async update(saleId, companyId, updates) {
        try {
            const allowedFields = [
                'customer_name', 'customer_email', 'customer_phone', 'customer_address',
                'products', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
                'serial_number', 'serial_image_url', 'warranty_months', 'payment_method',
                'notes', 'sale_date'
            ];

            const updateData = {};
            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = updates[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            const { data, error } = await database.supabase
                .from('sales')
                .update(updateData)
                .eq('id', saleId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('Sale not found');

            logger.business('sale_updated', 'sale', saleId, { companyId, updates });
            return data;
        } catch (error) {
            logger.error('Error updating sale:', error);
            throw error;
        }
    }

    static async delete(saleId, companyId) {
        try {
            // First, get the sale details to retrieve products
            const { data: sale, error: fetchError } = await database.supabase
                .from('sales')
                .select('*')
                .eq('id', saleId)
                .eq('company_id', companyId)
                .single();

            if (fetchError) throw fetchError;
            if (!sale) throw new Error('Sale not found');

            // Parse products array if it's a JSON string
            let products = sale.products || [];
            if (typeof products === 'string') {
                try {
                    products = JSON.parse(products);
                } catch (e) {
                    logger.warn('Could not parse products JSON:', e);
                    products = [];
                }
            }

            // Delete the sale
            const { error: deleteError } = await database.supabase
                .from('sales')
                .delete()
                .eq('id', saleId)
                .eq('company_id', companyId);

            if (deleteError) throw deleteError;

            // Return stock for each product
            for (const product of products) {
                try {
                    await ProductModel.updateStock(
                        product.product_id,
                        companyId,
                        product.quantity,
                        'add'
                    );

                    logger.business('stock_updated', 'product', product.product_id, {
                        companyId,
                        operation: 'add',
                        quantity: product.quantity,
                        reason: 'sale_deleted',
                        saleId
                    });
                } catch (stockError) {
                    logger.error('Error returning stock for product:', stockError);
                    // Continue with other products even if one fails
                }
            }

            logger.business('sale_deleted', 'sale', saleId, { companyId, productsCount: products.length });
            return true;
        } catch (error) {
            logger.error('Error deleting sale:', error);
            throw error;
        }
    }

    static async getStatistics(companyId, dateRange = null) {
        try {
            let query = database.supabase
                .from('sales')
                .select('total_amount, subtotal, tax_amount, discount_amount, payment_method')
                .eq('company_id', companyId);

            if (dateRange && dateRange.startDate) {
                query = query.gte('sale_date', dateRange.startDate);
            }
            if (dateRange && dateRange.endDate) {
                query = query.lte('sale_date', dateRange.endDate);
            }

            const { data, error } = await query;
            if (error) throw error;

            const totalSales = data.length;
            const totalRevenue = data.reduce((sum, s) => sum + (s.total_amount || 0), 0);
            const totalSubtotal = data.reduce((sum, s) => sum + (s.subtotal || 0), 0);
            const totalTax = data.reduce((sum, s) => sum + (s.tax_amount || 0), 0);
            const totalDiscount = data.reduce((sum, s) => sum + (s.discount_amount || 0), 0);
            const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

            const paymentMethodCounts = {};
            data.forEach(s => {
                const method = s.payment_method || 'unknown';
                paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
            });

            const amounts = data.map(s => s.total_amount || 0).filter(a => a > 0);
            const largestSale = amounts.length > 0 ? Math.max(...amounts) : 0;
            const smallestSale = amounts.length > 0 ? Math.min(...amounts) : 0;

            return {
                total_sales: totalSales,
                total_revenue: totalRevenue,
                total_subtotal: totalSubtotal,
                total_tax: totalTax,
                total_discount: totalDiscount,
                average_sale: avgSale,
                largest_sale: largestSale,
                smallest_sale: smallestSale,
                payment_methods: paymentMethodCounts
            };
        } catch (error) {
            logger.error('Error getting sale statistics:', error);
            throw error;
        }
    }

    static async getByDateRange(companyId, startDate, endDate) {
        try {
            const { data, error } = await database.supabase
                .from('sales')
                .select('*, users!sales_user_id_fkey (name)')
                .eq('company_id', companyId)
                .gte('sale_date', startDate)
                .lte('sale_date', endDate)
                .order('sale_date', { ascending: false });

            if (error) throw error;

            return (data || []).map(sale => ({
                ...sale,
                seller_name: sale.users?.name
            }));
        } catch (error) {
            logger.error('Error getting sales by date range:', error);
            throw error;
        }
    }

    static async getTopSellingProducts(companyId, limit = 10, dateRange = null) {
        try {
            let query = database.supabase
                .from('sales')
                .select('products')
                .eq('company_id', companyId);

            if (dateRange && dateRange.startDate) {
                query = query.gte('sale_date', dateRange.startDate);
            }
            if (dateRange && dateRange.endDate) {
                query = query.lte('sale_date', dateRange.endDate);
            }

            const { data, error } = await query;
            if (error) throw error;

            const productCounts = {};
            data.forEach(sale => {
                const products = sale.products || [];
                products.forEach(p => {
                    const id = p.product_id || p.id;
                    if (!id) return;
                    if (!productCounts[id]) {
                        productCounts[id] = {
                            product_id: id,
                            product_name: p.name || p.product_name || 'Unknown',
                            total_quantity: 0,
                            total_revenue: 0
                        };
                    }
                    productCounts[id].total_quantity += p.quantity || 0;
                    productCounts[id].total_revenue += (p.price || 0) * (p.quantity || 0);
                });
            });

            const topProducts = Object.values(productCounts)
                .sort((a, b) => b.total_quantity - a.total_quantity)
                .slice(0, limit);

            return topProducts;
        } catch (error) {
            logger.error('Error getting top selling products:', error);
            throw error;
        }
    }

    static async getSalesBySeller(companyId, dateRange = null) {
        try {
            let query = database.supabase
                .from('sales')
                .select('user_id, total_amount, users!sales_user_id_fkey (name, email)')
                .eq('company_id', companyId);

            if (dateRange && dateRange.startDate) {
                query = query.gte('sale_date', dateRange.startDate);
            }
            if (dateRange && dateRange.endDate) {
                query = query.lte('sale_date', dateRange.endDate);
            }

            const { data, error } = await query;
            if (error) throw error;

            const sellerStats = {};
            data.forEach(sale => {
                const userId = sale.user_id;
                if (!sellerStats[userId]) {
                    sellerStats[userId] = {
                        user_id: userId,
                        seller_name: sale.users?.name || 'Unknown',
                        seller_email: sale.users?.email,
                        total_sales: 0,
                        total_revenue: 0
                    };
                }
                sellerStats[userId].total_sales += 1;
                sellerStats[userId].total_revenue += sale.total_amount || 0;
            });

            return Object.values(sellerStats)
                .sort((a, b) => b.total_revenue - a.total_revenue);
        } catch (error) {
            logger.error('Error getting sales by seller:', error);
            throw error;
        }
    }

    static async findBySerialNumber(companyId, serialNumber) {
        try {
            const { data, error } = await database.supabase
                .from('sales')
                .select('*, users!sales_user_id_fkey (name, email)')
                .eq('company_id', companyId)
                .ilike('serial_number', `%${serialNumber}%`)
                .order('sale_date', { ascending: false });

            if (error) throw error;

            return (data || []).map(sale => ({
                ...sale,
                seller_name: sale.users?.name,
                seller_email: sale.users?.email
            }));
        } catch (error) {
            logger.error('Error finding sales by serial number:', error);
            throw error;
        }
    }
}

export default SaleModel;
