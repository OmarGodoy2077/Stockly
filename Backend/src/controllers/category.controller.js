import CategoryModel from '../models/category.model.js';
import { logger } from '../config/logger.js';
import ResponseHandler from '../utils/responseHandler.js';

/**
 * Category controller - Handles category-related HTTP requests
 */
class CategoryController {

    /**
     * Get all categories
     * GET /api/v1/categories
     */
    static async getAll(req, res) {
        try {
            const categories = await CategoryModel.getByCompany(req.companyId);

            logger.business('categories_listed', 'category', req.user.id, {
                companyId: req.companyId,
                count: categories.length
            });

            ResponseHandler.success(res, categories);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'CategoryController.getAll');
        }
    }

    /**
     * Get category hierarchy as tree
     * GET /api/v1/categories/tree
     */
    static async getTree(req, res) {
        try {
            const categories = await CategoryModel.getByCompany(req.companyId);
            
            // Build tree structure
            const tree = this.buildCategoryTree(categories);

            logger.business('category_tree_viewed', 'category', req.user.id, {
                companyId: req.companyId,
                count: categories.length
            });

            ResponseHandler.success(res, {
                tree,
                total: categories.length
            }, 'Category tree retrieved successfully');

        } catch (error) {
            ResponseHandler.handleError(res, error, 'CategoryController.getTree');
        }
    }

    /**
     * Build category tree from flat list
     * @private
     */
    static buildCategoryTree(categories) {
        const categoryMap = new Map();
        const roots = [];

        // Create a map for quick lookup
        categories.forEach(cat => {
            categoryMap.set(cat.id, {
                ...cat,
                children: []
            });
        });

        // Build tree relationships
        categories.forEach(cat => {
            if (cat.parent_id) {
                const parent = categoryMap.get(cat.parent_id);
                if (parent) {
                    parent.children.push(categoryMap.get(cat.id));
                }
            } else {
                roots.push(categoryMap.get(cat.id));
            }
        });

        return roots;
    }

    /**
     * Get category by ID
     * GET /api/v1/categories/:id
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const category = await CategoryModel.findById(id, req.companyId);

            if (!category) {
                return ResponseHandler.notFound(res, 'Category');
            }

            logger.business('category_viewed', 'category', req.user.id, {
                categoryId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(res, category);

        } catch (error) {
            ResponseHandler.handleError(res, error, 'CategoryController.getById');
        }
    }

    /**
     * Create new category
     * POST /api/v1/categories
     */
    static async create(req, res) {
        try {
            const { name, description, parent_id } = req.body;

            if (!name || name.trim() === '') {
                return ResponseHandler.badRequest(res, 'Category name is required');
            }

            const categoryData = {
                companyId: req.companyId,
                name: name.trim(),
                description: description || null,
                parentId: parent_id || null
            };

            const category = await CategoryModel.create(categoryData);

            logger.business('category_created', 'category', req.user.id, {
                categoryId: category.id,
                companyId: req.companyId,
                name,
                parentId: parent_id
            });

            ResponseHandler.created(
                res,
                category,
                'Category created successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'CategoryController.create');
        }
    }

    /**
     * Update category
     * PUT /api/v1/categories/:id
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { name, description, parent_id } = req.body;

            const updates = {};
            if (name !== undefined) updates.name = name.trim();
            if (description !== undefined) updates.description = description;
            if (parent_id !== undefined) updates.parent_id = parent_id;

            if (Object.keys(updates).length === 0) {
                return ResponseHandler.badRequest(res, 'No fields to update');
            }

            const category = await CategoryModel.update(id, req.companyId, updates);

            logger.business('category_updated', 'category', req.user.id, {
                categoryId: id,
                companyId: req.companyId,
                updates
            });

            ResponseHandler.success(
                res,
                category,
                'Category updated successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'CategoryController.update');
        }
    }

    /**
     * Delete category (soft delete)
     * DELETE /api/v1/categories/:id
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;

            await CategoryModel.delete(id, req.companyId);

            logger.business('category_deleted', 'category', req.user.id, {
                categoryId: id,
                companyId: req.companyId
            });

            ResponseHandler.success(
                res,
                null,
                'Category deleted successfully'
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'CategoryController.delete');
        }
    }

    /**
     * Get products by category
     * GET /api/v1/categories/:id/products
     */
    static async getProducts(req, res) {
        try {
            const { id } = req.params;

            const products = await CategoryModel.getProducts(id, req.companyId);

            logger.business('category_products_viewed', 'category', req.user.id, {
                categoryId: id,
                companyId: req.companyId,
                count: products.length
            });

            ResponseHandler.success(
                res,
                products,
                `Found ${products.length} products in this category`
            );

        } catch (error) {
            ResponseHandler.handleError(res, error, 'CategoryController.getProducts');
        }
    }
}

export default CategoryController;
