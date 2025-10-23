import { logger } from '../config/logger.js';

/**
 * Role-based authorization middleware
 * Verifies that the user has the required role in their company
 */

/**
 * Authorize specific roles
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
export const authorizeRoles = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                logger.security('unauthorized_role_access', 'medium', {
                    ip: req.ip,
                    url: req.url,
                    requiredRoles: allowedRoles,
                    error: 'User not authenticated'
                });

                return res.status(401).json({
                    error: 'Authentication required'
                });
            }

            // Check if user has company context
            if (!req.user.companyId) {
                logger.security('missing_company_context', 'medium', {
                    ip: req.ip,
                    url: req.url,
                    userId: req.user.id,
                    requiredRoles: allowedRoles
                });

                return res.status(400).json({
                    error: 'Company context required'
                });
            }

            // Check if user has required role
            const userRole = req.user.role;
            const hasRequiredRole = allowedRoles.includes(userRole);

            if (!hasRequiredRole) {
                logger.security('insufficient_permissions', 'medium', {
                    ip: req.ip,
                    url: req.url,
                    userId: req.user.id,
                    userRole,
                    requiredRoles: allowedRoles,
                    companyId: req.user.companyId
                });

                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: allowedRoles,
                    current: userRole
                });
            }

            logger.business('role_authorized', 'user', req.user.id, {
                role: userRole,
                allowedRoles,
                url: req.url,
                companyId: req.user.companyId
            });

            next();

        } catch (error) {
            logger.error('Role authorization middleware error:', {
                error: error.message,
                userId: req.user?.id,
                requiredRoles: allowedRoles,
                url: req.url
            });

            res.status(500).json({
                error: 'Authorization error. Please try again.'
            });
        }
    };
};

/**
 * Authorize company ownership or admin
 * @returns {Function} Middleware function
 */
export const requireCompanyOwnerOrAdmin = authorizeRoles(['owner', 'admin']);

/**
 * Authorize company ownership only
 * @returns {Function} Middleware function
 */
export const requireCompanyOwner = authorizeRoles(['owner']);

/**
 * Authorize sellers and above (owner, admin, seller)
 * @returns {Function} Middleware function
 */
export const requireSellerOrAbove = authorizeRoles(['owner', 'admin', 'seller']);

/**
 * Authorize inventory management (owner, admin, inventory)
 * @returns {Function} Middleware function
 */
export const requireInventoryAccess = authorizeRoles(['owner', 'admin', 'inventory']);

/**
 * Middleware to check if user belongs to specific company
 * @param {string} companyId - Company ID to check against
 * @returns {Function} Middleware function
 */
export const requireCompanyMembership = (companyId) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required'
                });
            }

            if (!req.user.companyId) {
                return res.status(400).json({
                    error: 'Company context required'
                });
            }

            if (req.user.companyId !== companyId) {
                logger.security('wrong_company_access', 'medium', {
                    ip: req.ip,
                    url: req.url,
                    userId: req.user.id,
                    userCompanyId: req.user.companyId,
                    requestedCompanyId: companyId
                });

                return res.status(403).json({
                    error: 'Access denied to this company'
                });
            }

            next();

        } catch (error) {
            logger.error('Company membership middleware error:', error);
            res.status(500).json({
                error: 'Company verification error'
            });
        }
    };
};

/**
 * Middleware to extract and validate company context from request
 * Sets req.companyId and req.userRole for the request
 */
export const setCompanyContext = async (req, res, next) => {
    try {
        // Company ID can come from:
        // 1. URL parameter (req.params.companyId)
        // 2. Request body (req.body.companyId)
        // 3. User's token (req.user.companyId)

        let companyId = req.params.companyId || req.body?.companyId;

        if (!companyId && req.user?.companyId) {
            companyId = req.user.companyId;
        }

        // Log menos verboso - solo en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log('[COMPANY_CTX]', req.url, '- companyId:', companyId);
        }

        logger.debug('setCompanyContext debug:', {
            url: req.url,
            method: req.method,
            paramsCompanyId: req.params.companyId,
            bodyCompanyId: req.body?.companyId,
            userCompanyId: req.user?.companyId,
            finalCompanyId: companyId,
            requestUser: req.user
        });

        if (!companyId) {
            console.error('[COMPANY_CTX] MISSING companyId:', {
                url: req.url,
                hasUser: !!req.user,
                userCompanyId: req.user?.companyId,
                tokenCompanyId: req.token?.decoded?.company_id
            });
            logger.error('Company ID missing in setCompanyContext:', {
                url: req.url,
                user: req.user,
                params: req.params,
                body: req.body
            });
            return res.status(400).json({
                error: 'Company ID is required. Make sure you are logged in and have selected a company.',
                debug: {
                    hasUserCompanyId: !!req.user?.companyId,
                    hasParamsCompanyId: !!req.params.companyId,
                    hasBodyCompanyId: !!req.body?.companyId,
                    userCompanyIdValue: req.user?.companyId
                }
            });
        }

        // Validate UUID format (more permissive)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(companyId)) {
            logger.error('Invalid company ID format:', {
                companyId,
                url: req.url
            });
            return res.status(400).json({
                error: 'Invalid company ID format'
            });
        }

        // Set company context in request
        req.companyId = companyId;
        req.userRole = req.user?.role || null;

        logger.debug('Company context set successfully:', {
            companyId,
            userId: req.user?.id,
            userRole: req.userRole
        });

        next();

    } catch (error) {
        logger.error('Set company context middleware error:', error);
        res.status(500).json({
            error: 'Company context error'
        });
    }
};

/**
 * Middleware to check if user can access specific resource in company
 * This is a more granular permission check for specific resources
 */
export const checkResourcePermission = (resourceType, permission = 'read') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required'
                });
            }

            const userRole = req.user.role;
            const resourceId = req.params.id || req.params.productId || req.body.id;

            // Define permissions matrix
            const permissions = {
                // Resource type -> role -> permissions
                product: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['create', 'read', 'update'],
                    inventory: ['read', 'update'] // Can update stock but not delete
                },
                category: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['read'],
                    inventory: ['read']
                },
                sale: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['create', 'read', 'update'],
                    inventory: ['read'] // Can only view sales
                },
                purchase: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['create', 'read'],
                    inventory: ['create', 'read', 'update']
                },
                user: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['read'],
                    inventory: ['read']
                },
                invoice: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['create', 'read', 'update'],
                    inventory: ['read']
                },
                warranty: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['read', 'update'],
                    inventory: ['create', 'read', 'update']
                },
                supplier: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['read'],
                    inventory: ['read']
                },
                service: {
                    owner: ['create', 'read', 'update', 'delete'],
                    admin: ['create', 'read', 'update', 'delete'],
                    seller: ['create', 'read', 'update'],
                    inventory: ['read']
                }
            };

            const resourcePermissions = permissions[resourceType];
            if (!resourcePermissions) {
                logger.warn('Unknown resource type for permission check:', {
                    resourceType,
                    userId: req.user.id,
                    url: req.url
                });

                return res.status(400).json({
                    error: 'Unknown resource type'
                });
            }

            const allowedPermissions = resourcePermissions[userRole];
            
            // If role not found in permissions matrix, deny access
            if (!allowedPermissions) {
                logger.security('role_not_found_in_permissions', 'high', {
                    userRole,
                    resourceType,
                    userId: req.user.id,
                    companyId: req.companyId
                });

                return res.status(403).json({
                    error: 'Your role is not recognized in the permission system',
                    role: userRole,
                    resource: resourceType
                });
            }

            if (!allowedPermissions.includes(permission)) {
                logger.security('resource_permission_denied', 'medium', {
                    resourceType,
                    resourceId: req.params.id || req.params.productId || req.body.id,
                    permission,
                    userRole,
                    userId: req.user.id,
                    companyId: req.companyId
                });

                return res.status(403).json({
                    error: 'Insufficient permissions for this resource',
                    resource: resourceType,
                    required: permission,
                    currentRole: userRole
                });
            }

            // Attach permission info to request for use in controllers
            req.resourcePermission = {
                resourceType,
                permission,
                allowed: true
            };

            next();

        } catch (error) {
            logger.error('Resource permission middleware error:', error);
            res.status(500).json({
                error: 'Permission check error'
            });
        }
    };
};