import express from 'express';
import InvitationController from '../controllers/invitation.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { z } from 'zod';

const router = express.Router();

/**
 * Invitation Routes - Company onboarding with invitation codes
 */

// Validation schemas
const createInvitationSchema = z.object({
    companyId: z.string().uuid('Invalid company ID'),
    role: z.enum(['admin', 'seller', 'inventory', 'employee'])
});

const validateInvitationSchema = z.object({
    code: z.string().min(6).max(12).toUpperCase()
});

/**
 * @route   POST /api/v1/invitations
 * @desc    Create a new invitation code (owner only)
 * @access  Private - Owner
 */
router.post(
    '/',
    authenticateJWT,
    validate(createInvitationSchema, 'body'),
    InvitationController.createInvitation
);

/**
 * @route   GET /api/v1/invitations
 * @desc    Get active invitations for a company (owner only)
 * @access  Private - Owner
 * @query   companyId - Company ID
 */
router.get(
    '/',
    authenticateJWT,
    InvitationController.getInvitations
);

/**
 * @route   GET /api/v1/invitations/validate/:code
 * @desc    Validate an invitation code (public)
 * @access  Public
 */
router.get(
    '/validate/:code',
    InvitationController.validateInvitation
);

/**
 * @route   DELETE /api/v1/invitations/:code
 * @desc    Deactivate an invitation code (owner only)
 * @access  Private - Owner
 */
router.delete(
    '/:code',
    authenticateJWT,
    InvitationController.deactivateInvitation
);

/**
 * @route   GET /api/v1/companies/:companyId/invitations
 * @desc    Get all invitations for a company (owner only)
 * @access  Private - Owner
 */
router.get(
    '/company/:companyId',
    authenticateJWT,
    InvitationController.getCompanyInvitations
);

export default router;
