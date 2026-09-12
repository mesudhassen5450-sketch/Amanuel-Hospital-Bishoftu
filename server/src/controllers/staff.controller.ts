import { Response } from 'express';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/auth.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

/**
 * GET /api/staff
 * Retrieve all staff accounts
 * @access Admin only
 */
export const getAllStaffAccounts = async (req: AuthRequest, res: Response) => {
    try {
        const staffAccounts = await prisma.staffAccount.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                displayName: true,
                isActive: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Convert BigInt IDs to strings for JSON serialization
        const serializedStaff = staffAccounts.map(staff => ({
            ...staff,
            id: staff.id.toString(),
        }));

        return res.json({
            success: true,
            staff: serializedStaff,
            count: serializedStaff.length,
        });
    } catch (error: any) {
        console.error('[Staff Controller] Get all staff error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch staff accounts',
        });
    }
};

/**
 * POST /api/staff
 * Create new staff account
 * @access Admin only
 */
export const createStaffAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { username, password, role, displayName, isActive } = req.body;

        // Validation
        if (!username || !password || !role || !displayName) {
            return res.status(400).json({
                success: false,
                error: 'Username, password, role, and display name are required',
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Username must be at least 3 characters',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters',
            });
        }

        const validRoles = ['admin', 'reception', 'cashier', 'doctor', 'laboratory', 'pharmacy', 'staff'];
        if (!validRoles.includes(String(role).toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
            });
        }

        const formattedRole = String(role).toLowerCase();

        // Check if username already exists
        const existingUser = await prisma.staffAccount.findUnique({
            where: { username: username.toLowerCase().trim() },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Username already exists',
            });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create staff account
        const newStaff = await prisma.staffAccount.create({
            data: {
                username: username.toLowerCase().trim(),
                passwordHash,
                role: formattedRole,
                displayName: displayName.trim(),
                isActive: isActive !== undefined ? isActive : true,
                isOnline: false,
            },
            select: {
                id: true,
                username: true,
                role: true,
                displayName: true,
                isActive: true,
                createdAt: true,
            },
        });

        // If role is doctor, attempt to create linked doctor record safely
        if (formattedRole === 'doctor') {
            try {
                const specialty = req.body.specialty || req.body.specialization || 'General Practice';
                const experience = req.body.experience ? String(req.body.experience) : '5+ years';
                const bio = req.body.bio || `Specialist physician at Dr. Amanuel Hospital.`;

                await prisma.doctor.upsert({
                    where: { username: newStaff.username },
                    update: {
                        specialty,
                        experience,
                        bio,
                    },
                    create: {
                        username: newStaff.username,
                        specialty,
                        experience,
                        bio,
                        isAvailable: true,
                    },
                });
                console.log('[Staff Controller] Doctor profile created/updated for staff:', newStaff.username);
            } catch (docError: any) {
                console.warn('[Staff Controller] Doctor record creation error:', docError.message);
            }
        }

        return res.status(201).json({
            success: true,
            data: {
                ...newStaff,
                id: newStaff.id.toString(),
            },
            message: 'Staff account created successfully',
        });
    } catch (error: any) {
        console.error('[Staff Controller] Create staff error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create staff account',
        });
    }
};

/**
 * Helper to safely find a staff account by numeric ID (BigInt), string ID, or username
 */
const findStaffAccount = async (idParam: string) => {
    if (!idParam) return null;

    let targetId: any = idParam;
    try {
        targetId = BigInt(idParam);
    } catch {
        // Keep original string if BigInt conversion fails
    }

    try {
        const found = await prisma.staffAccount.findFirst({
            where: {
                OR: [
                    { id: targetId },
                    { username: idParam.toLowerCase().trim() },
                ],
            },
        });
        return found;
    } catch (err: any) {
        console.error('[Staff Controller] findStaffAccount error:', err.message);
        return null;
    }
};

/**
 * PUT /api/staff/:id
 * Update staff account details
 * @access Admin only
 */
export const updateStaffAccount = async (req: AuthRequest, res: Response) => {
    try {
        const rawId = Array.isArray(req.params.id) 
            ? req.params.id[0] 
            : req.params.id;
        const { username, role, displayName, isActive, specialty, experience, bio } = req.body;

        if (!rawId) {
            return res.status(400).json({
                success: false,
                error: 'Valid staff ID is required',
            });
        }

        // Validation
        if (!username || !role || !displayName) {
            return res.status(400).json({
                success: false,
                error: 'Username, role, and display name are required',
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Username must be at least 3 characters',
            });
        }

        const validRoles = ['admin', 'reception', 'cashier', 'doctor', 'laboratory', 'pharmacy', 'staff'];
        if (!validRoles.includes(role.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
            });
        }

        const formattedRole = role.toLowerCase();

        // Check if staff exists safely via BigInt or username
        const existingStaff = await findStaffAccount(rawId);

        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                error: 'Staff account not found',
            });
        }

        // Check if new username conflicts with another account
        if (username.toLowerCase() !== existingStaff.username.toLowerCase()) {
            const usernameConflict = await prisma.staffAccount.findUnique({
                where: { username: username.toLowerCase().trim() },
            });

            if (usernameConflict) {
                return res.status(409).json({
                    success: false,
                    error: 'Username already exists',
                });
            }
        }

        // Update staff account using primary key BigInt
        const updatedStaff = await prisma.staffAccount.update({
            where: { id: existingStaff.id },
            data: {
                username: username.toLowerCase().trim(),
                role: formattedRole,
                displayName: displayName.trim(),
                isActive: isActive !== undefined ? isActive : existingStaff.isActive,
                updatedAt: new Date(),
            },
            select: {
                id: true,
                username: true,
                role: true,
                displayName: true,
                isActive: true,
                updatedAt: true,
            },
        });

        // Update or create Doctor profile if role is doctor
        if (formattedRole === 'doctor') {
            try {
                await prisma.doctor.upsert({
                    where: { username: updatedStaff.username },
                    update: {
                        specialty: specialty || 'General Practice',
                        experience: experience ? String(experience) : undefined,
                        bio: bio || undefined,
                    },
                    create: {
                        username: updatedStaff.username,
                        specialty: specialty || 'General Practice',
                        experience: experience ? String(experience) : '5+ years',
                        bio: bio || `Specialist physician at Dr. Amanuel Hospital.`,
                        isAvailable: true,
                    },
                });
            } catch (docErr: any) {
                console.warn('[Staff Controller] Doctor profile update notice:', docErr.message);
            }
        }

        return res.json({
            success: true,
            data: {
                ...updatedStaff,
                id: updatedStaff.id.toString(),
            },
            message: 'Staff account updated successfully',
        });
    } catch (error: any) {
        console.error('[Staff Controller] Update staff error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to update staff account',
        });
    }
};

/**
 * PUT /api/staff/:id/password
 * Reset staff password
 * @access Admin only
 */
export const resetStaffPassword = async (req: AuthRequest, res: Response) => {
    try {
        const rawId = Array.isArray(req.params.id) 
            ? req.params.id[0] 
            : req.params.id;
        const { newPassword, username } = req.body;

        if (!rawId && !username) {
            return res.status(400).json({
                success: false,
                error: 'Valid staff ID is required',
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                error: 'New password is required',
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters',
            });
        }

        // ID first, then username so reset updates the same row login checks
        let existingStaff = rawId ? await findStaffAccount(rawId) : null;
        if (!existingStaff && username) {
            existingStaff = await prisma.staffAccount.findFirst({
                where: {
                    username: {
                        equals: String(username).trim(),
                        mode: 'insensitive',
                    },
                },
            });
        }

        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                error: 'Staff account not found',
            });
        }

        // Hash new password
        const passwordHash = await hashPassword(newPassword);

        // Update password
        await prisma.staffAccount.update({
            where: { id: existingStaff.id },
            data: {
                passwordHash,
                updatedAt: new Date(),
            },
        });

        return res.json({
            success: true,
            message: 'Password reset successfully',
        });
    } catch (error: any) {
        console.error('[Staff Controller] Reset password error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to reset password',
        });
    }
};

/**
 * PATCH /api/staff/:id/status
 * Toggle staff active status
 * @access Admin only
 */
export const toggleStaffStatus = async (req: AuthRequest, res: Response) => {
    try {
        const rawId = Array.isArray(req.params.id) 
            ? req.params.id[0] 
            : req.params.id;
        const { isActive } = req.body;

        if (!rawId) {
            return res.status(400).json({
                success: false,
                error: 'Valid staff ID is required',
            });
        }

        // Check if staff exists
        const existingStaff = await findStaffAccount(rawId);

        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                error: 'Staff account not found',
            });
        }

        // Determine new status (toggle if not provided)
        const newStatus = isActive !== undefined ? isActive : !existingStaff.isActive;

        // Prevent deactivating the last admin
        if (existingStaff.role?.toLowerCase() === 'admin' && !newStatus) {
            const activeAdminCount = await prisma.staffAccount.count({
                where: {
                    role: { in: ['ADMIN', 'admin'] },
                    isActive: true,
                },
            });

            if (activeAdminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot deactivate the last active admin account',
                });
            }
        }

        // Update status
        const updatedStaff = await prisma.staffAccount.update({
            where: { id: existingStaff.id },
            data: {
                isActive: newStatus,
                updatedAt: new Date(),
            },
            select: {
                id: true,
                username: true,
                role: true,
                displayName: true,
                isActive: true,
            },
        });

        return res.json({
            success: true,
            data: {
                ...updatedStaff,
                id: updatedStaff.id.toString(),
            },
            message: `Staff account ${newStatus ? 'activated' : 'deactivated'} successfully`,
        });
    } catch (error: any) {
        console.error('[Staff Controller] Toggle status error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to update staff status',
        });
    }
};

/**
 * DELETE /api/staff/:id
 * Delete staff account with cascading cleanup
 * @access Admin only
 */
export const deleteStaffAccount = async (req: AuthRequest, res: Response) => {
    try {
        const rawId = Array.isArray(req.params.id) 
            ? req.params.id[0] 
            : req.params.id;

        if (!rawId) {
            return res.status(400).json({
                success: false,
                error: 'Valid staff ID is required',
            });
        }

        // Check if staff exists
        const existingStaff = await findStaffAccount(rawId);

        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                error: 'Staff account not found',
            });
        }

        // Prevent deleting the last admin
        if (existingStaff.role?.toLowerCase() === 'admin') {
            const activeAdminCount = await prisma.staffAccount.count({
                where: {
                    role: { in: ['ADMIN', 'admin'] },
                    isActive: true,
                },
            });

            if (activeAdminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete the last active admin account',
                });
            }
        }

        // If staff is doctor, delete linked doctor record first
        if (existingStaff.role?.toLowerCase() === 'doctor') {
            try {
                await prisma.doctor.deleteMany({
                    where: { username: existingStaff.username },
                });
            } catch (docErr: any) {
                console.warn('[Staff Controller] Cleaned up doctor profile:', docErr.message);
            }
        }

        // Delete staff account
        await prisma.staffAccount.delete({
            where: { id: existingStaff.id },
        });

        return res.json({
            success: true,
            message: 'Staff account deleted successfully',
        });
    } catch (error: any) {
        console.error('[Staff Controller] Delete staff error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete staff account',
        });
    }
};
