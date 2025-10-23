import { database } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Category model - Handles category-related database operations
 */
class CategoryModel {

    /**
     * Create a new category
     * @param {Object} categoryData - Category data
     * @returns {Promise<Object>} Created category
     */
    static async create({ companyId, name, description, parentId = null }) {
        try {
            const { data, error } = await database.supabase
                .from('categories')
                .insert({
                    company_id: companyId,
                    name,
                    description,
                    parent_id: parentId
                })
                .select('*')
                .single();

            if (error) {
                logger.error('Supabase error creating category:', error);
                if (error.code === '23505') { // Unique violation
                    throw new Error('Category name already exists in this company');
                }
                throw error;
            }

            logger.business('category_created', 'category', data.id, {
                companyId,
                name,
                parentId
            });

            return {
                id: data.id,
                name: data.name,
                description: data.description,
                parentId: data.parent_id,
                companyId: data.company_id,
                isActive: data.is_active,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (error) {
            logger.error('Error creating category:', error);
            throw error;
        }
    }

    /**
     * Find category by ID
     * @param {string} categoryId - Category ID
     * @param {string} companyId - Company ID (for security)
     * @returns {Promise<Object|null>} Category data or null
     */
    static async findById(categoryId, companyId) {
        try {
            const { data, error } = await database.supabase
                .from('categories')
                .select('*')
                .eq('id', categoryId)
                .eq('company_id', companyId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // Not found
                    return null;
                }
                logger.error('Supabase error finding category:', error);
                throw error;
            }

            // Get product count separately
            const { data: productsData, error: productsError } = await database.supabase
                .from('products')
                .select('category_id')
                .eq('category_id', categoryId)
                .eq('is_active', true);

            const productCount = productsError ? 0 : productsData.length;

            return {
                id: data.id,
                name: data.name,
                description: data.description,
                parentId: data.parent_id,
                companyId: data.company_id,
                isActive: data.is_active,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                product_count: productCount
            };
        } catch (error) {
            logger.error('Error finding category by ID:', error);
            throw error;
        }
    }

    /**
     * Get all categories for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Categories with product counts
     */
    static async getByCompany(companyId) {
        try {
            const { data, error } = await database.supabase
                .from('categories')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) {
                logger.error('Supabase error getting categories:', error);
                throw error;
            }

            // Get product counts separately
            const categoryIds = data.map(cat => cat.id);
            let productCounts = {};

            if (categoryIds.length > 0) {
                const { data: productsData, error: productsError } = await database.supabase
                    .from('products')
                    .select('category_id')
                    .in('category_id', categoryIds)
                    .eq('is_active', true);

                if (!productsError && productsData) {
                    productCounts = productsData.reduce((acc, product) => {
                        acc[product.category_id] = (acc[product.category_id] || 0) + 1;
                        return acc;
                    }, {});
                }
            }

            // Transform data to include product counts and convert to camelCase
            return data.map(category => ({
                id: category.id,
                name: category.name,
                description: category.description,
                parentId: category.parent_id,
                companyId: category.company_id,
                isActive: category.is_active,
                createdAt: category.created_at,
                updatedAt: category.updated_at,
                product_count: productCounts[category.id] || 0,
                low_stock_count: 0 // This would require a more complex query
            }));
        } catch (error) {
            logger.error('Error getting categories by company:', error);
            throw error;
        }
    }

    /**
     * Update category
     * @param {string} categoryId - Category ID
     * @param {string} companyId - Company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated category
     */
    static async update(categoryId, companyId, updates) {
        try {
            const updateData = {};

            // Map camelCase to snake_case
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.parent_id !== undefined) updateData.parent_id = updates.parent_id;
            if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;

            const { data, error } = await database.supabase
                .from('categories')
                .update(updateData)
                .eq('id', categoryId)
                .eq('company_id', companyId)
                .select('*')
                .single();

            if (error) {
                logger.error('Supabase error updating category:', error);
                if (error.code === '23505') {
                    throw new Error('Category name already exists in this company');
                }
                throw error;
            }

            if (!data) {
                throw new Error('Category not found');
            }

            logger.business('category_updated', 'category', categoryId, {
                companyId,
                updatedFields: Object.keys(updateData)
            });

            return {
                id: data.id,
                name: data.name,
                description: data.description,
                parentId: data.parent_id,
                companyId: data.company_id,
                isActive: data.is_active,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (error) {
            logger.error('Error updating category:', error);
            throw error;
        }
    }

    /**
     * Delete category (soft delete)
     * @param {string} categoryId - Category ID
     * @param {string} companyId - Company ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(categoryId, companyId) {
        try {
            // Check if category has products using Supabase
            const { count: productCount, error: countError } = await database.supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', categoryId)
                .eq('company_id', companyId)
                .eq('is_active', true);

            if (countError) {
                logger.error('Supabase error checking products:', countError);
                throw countError;
            }

            if (productCount > 0) {
                throw new Error('Cannot delete category with existing products. Please move or delete products first.');
            }

            const { data, error } = await database.supabase
                .from('categories')
                .update({ is_active: false })
                .eq('id', categoryId)
                .eq('company_id', companyId)
                .select('*')
                .single();

            if (error) {
                logger.error('Supabase error deleting category:', error);
                throw error;
            }

            if (!data) {
                throw new Error('Category not found');
            }

            logger.business('category_deleted', 'category', categoryId, {
                companyId
            });

            return true;
        } catch (error) {
            logger.error('Error deleting category:', error);
            throw error;
        }
    }

    /**
     * Get category statistics
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Category statistics
     */
    static async getStatistics(companyId) {
        try {
            // Get all categories for the company
            const { data: categories, error: categoriesError } = await database.supabase
                .from('categories')
                .select('id')
                .eq('company_id', companyId)
                .eq('is_active', true);

            if (categoriesError) {
                logger.error('Supabase error getting categories for stats:', categoriesError);
                throw categoriesError;
            }

            const totalCategories = categories.length;

            // Get product counts per category
            const categoryIds = categories.map(cat => cat.id);
            let categoriesWithProducts = 0;
            let totalProducts = 0;
            let productCounts = [];

            if (categoryIds.length > 0) {
                const { data: products, error: productsError } = await database.supabase
                    .from('products')
                    .select('category_id')
                    .in('category_id', categoryIds)
                    .eq('is_active', true);

                if (!productsError && products) {
                    const counts = products.reduce((acc, product) => {
                        acc[product.category_id] = (acc[product.category_id] || 0) + 1;
                        return acc;
                    }, {});

                    productCounts = Object.values(counts);
                    categoriesWithProducts = Object.keys(counts).length;
                    totalProducts = products.length;
                }
            }

            const averageProducts = productCounts.length > 0 ? totalProducts / totalCategories : 0;
            const maxProducts = productCounts.length > 0 ? Math.max(...productCounts) : 0;
            const minProducts = productCounts.length > 0 ? Math.min(...productCounts) : 0;

            return {
                total_categories: totalCategories,
                categories_with_products: categoriesWithProducts,
                average_products_per_category: averageProducts,
                max_products_in_category: maxProducts,
                min_products_in_category: minProducts
            };
        } catch (error) {
            logger.error('Error getting category statistics:', error);
            throw error;
        }
    }

    /**
     * Get categories with low stock products
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Categories with low stock issues
     */
    static async getCategoriesWithLowStock(companyId) {
        try {
            // Get all categories
            const { data: categories, error: categoriesError } = await database.supabase
                .from('categories')
                .select('id, name, description')
                .eq('company_id', companyId)
                .eq('is_active', true);

            if (categoriesError) {
                logger.error('Supabase error getting categories:', categoriesError);
                throw categoriesError;
            }

            // Get products with stock info
            const categoryIds = categories.map(cat => cat.id);
            let result = [];

            if (categoryIds.length > 0) {
                const { data: products, error: productsError } = await database.supabase
                    .from('products')
                    .select('category_id, stock, min_stock')
                    .in('category_id', categoryIds)
                    .eq('is_active', true);

                if (!productsError && products) {
                    // Group products by category
                    const categoryStats = products.reduce((acc, product) => {
                        const catId = product.category_id;
                        if (!acc[catId]) {
                            acc[catId] = {
                                total_products: 0,
                                low_stock_products: 0,
                                out_of_stock_products: 0
                            };
                        }
                        acc[catId].total_products++;
                        if (product.stock <= product.min_stock) {
                            acc[catId].low_stock_products++;
                        }
                        if (product.stock === 0) {
                            acc[catId].out_of_stock_products++;
                        }
                        return acc;
                    }, {});

                    // Filter categories with low stock and combine with category info
                    result = categories
                        .filter(cat => categoryStats[cat.id] && categoryStats[cat.id].low_stock_products > 0)
                        .map(cat => ({
                            id: cat.id,
                            name: cat.name,
                            description: cat.description,
                            ...categoryStats[cat.id]
                        }))
                        .sort((a, b) => {
                            if (b.low_stock_products !== a.low_stock_products) {
                                return b.low_stock_products - a.low_stock_products;
                            }
                            return b.out_of_stock_products - a.out_of_stock_products;
                        });
                }
            }

            return result;
        } catch (error) {
            logger.error('Error getting categories with low stock:', error);
            throw error;
        }
    }

    /**
     * Search categories by name
     * @param {string} companyId - Company ID
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array>} Matching categories
     */
    static async search(companyId, searchTerm) {
        try {
            // Search categories by name or description
            const { data: categories, error: categoriesError } = await database.supabase
                .from('categories')
                .select('id, name, description, parent_id, company_id, is_active, created_at, updated_at')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .order('name', { ascending: true });

            if (categoriesError) {
                logger.error('Supabase error searching categories:', categoriesError);
                throw categoriesError;
            }

            // Get product counts for each category
            const categoryIds = categories.map(cat => cat.id);
            let productCounts = {};

            if (categoryIds.length > 0) {
                const { data: products, error: productsError } = await database.supabase
                    .from('products')
                    .select('category_id')
                    .in('category_id', categoryIds)
                    .eq('is_active', true);

                if (!productsError && products) {
                    productCounts = products.reduce((acc, product) => {
                        acc[product.category_id] = (acc[product.category_id] || 0) + 1;
                        return acc;
                    }, {});
                }
            }

            // Convert to camelCase and add product counts
            return categories.map(category => ({
                id: category.id,
                name: category.name,
                description: category.description,
                parentId: category.parent_id,
                companyId: category.company_id,
                isActive: category.is_active,
                createdAt: category.created_at,
                updatedAt: category.updated_at,
                product_count: productCounts[category.id] || 0
            }));
        } catch (error) {
            logger.error('Error searching categories:', error);
            throw error;
        }
    }
}

export default CategoryModel;