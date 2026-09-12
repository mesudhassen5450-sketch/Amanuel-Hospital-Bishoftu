import { Response } from 'express';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/auth.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { deleteLinkedDoctorProfile, resolveStaffAccount } from '../utils/staffAccount.js';

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

        // Attach doctor profile fields from the same Prisma DB (not Supabase anon)
        let profileMap = new Map<string, any>();
        try {
            const doctorUsernames = staffAccounts
                .filter((s) => String(s.role || '').toLowerCase() === 'doctor')
                .map((s) => s.username);
            if (doctorUsernames.length > 0) {
                const profiles = await prisma.doctor.findMany({
                    where: { username: { in: doctorUsernames } },
                    select: {
                        username: true,
                        specialty: true,
                        experience: true,
                        experienceYears: true,
                        bio: true,
                    },
                });
                profileMap = new Map(
                    profiles.map((p) => [p.username.toLowerCase(), p])
                );
            }
        } catch (profileErr: any) {
            console.warn('[Staff Controller] Doctor profile join skipped:', profileErr.message);
        }

        const serializedStaff = staffAccounts.map((staff) => {
            const profile = profileMap.get(staff.username.toLowerCase());
            return {
                ...staff,
                id: staff.id.toString(),
                specialty: profile?.specialty,
                experience: profile?.experience,
                experienceYears: profile?.experienceYears ?? null,
                bio: profile?.bio,
            };
        });

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

        // Doctor accounts MUST also get a doctors row in the same DB (public page + admin bio)
        let doctorProfile: {
            specialty?: string;
            experience?: string;
            experienceYears?: number | null;
            bio?: string;
        } | null = null;

        if (formattedRole === 'doctor') {
            const specialty = req.body.specialty || req.body.specialization || 'General Practice';
            const experienceYears =
                req.body.experienceYears != null
                    ? Number(req.body.experienceYears)
                    : req.body.experience_years != null
                      ? Number(req.body.experience_years)
                      : null;
            const experience =
                req.body.experience
                    ? String(req.body.experience)
                    : experienceYears
                      ? `${experienceYears}+ years experience`
                      : '5+ years experience';
            const bio = req.body.bio || `Specialist physician at Dr. Amanuel Hospital.`;

            try {
                const upsertedDoctor = await prisma.doctor.upsert({
                    where: { username: newStaff.username },
                    update: {
                        specialty,
                        experience,
                        experienceYears: Number.isFinite(experienceYears) ? experienceYears : undefined,
                        bio,
                    },
                    create: {
                        username: newStaff.username,
                        specialty,
                        experience,
                        experienceYears: Number.isFinite(experienceYears) ? experienceYears : undefined,
                        bio,
                        isAvailable: true,
                    },
                    select: {
                        specialty: true,
                        experience: true,
                        experienceYears: true,
                        bio: true,
                    },
                });
                // Prisma nullable fields are `string | null`; normalize to `string | undefined`
                doctorProfile = {
                    specialty: upsertedDoctor.specialty,
                    experience: upsertedDoctor.experience ?? undefined,
                    experienceYears: upsertedDoctor.experienceYears ?? null,
                    bio: upsertedDoctor.bio ?? undefined,
                };
                console.log('[Staff Controller] Doctor profile created/updated for staff:', newStaff.username);
            } catch (docError: any) {
                console.error('[Staff Controller] Doctor record creation failed:', docError.message);
                // Roll back orphan login account so Admin never shows success without a public doctor
                try {
                    await prisma.staffAccount.delete({ where: { id: newStaff.id } });
                } catch (rollbackErr: any) {
                    console.error('[Staff Controller] Rollback staff after doctor failure:', rollbackErr.message);
                }
                return res.status(500).json({
                    success: false,
                    error:
                        docError.message ||
                        'Staff login was created but doctor profile failed. Nothing was kept — retry create.',
                });
            }
        }

        return res.status(201).json({
            success: true,
            data: {
                ...newStaff,
                id: newStaff.id.toString(),
                specialty: doctorProfile?.specialty,
                experience: doctorProfile?.experience,
                experienceYears: doctorProfile?.experienceYears ?? null,
                bio: doctorProfile?.bio,
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

const findStaffAccount = async (idParam?: string | null, username?: string | null) => {
    return resolveStaffAccount(prisma, { id: idParam, username });
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

        // Look up by ID only — do not pass the NEW username or we may resolve the wrong row
        const existingStaff = await findStaffAccount(rawId);

        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                error: 'Staff account not found',
            });
        }

        const previousUsername = existingStaff.username;

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

        // Keep doctors.username in sync when staff username changes
        if (previousUsername.toLowerCase() !== updatedStaff.username.toLowerCase()) {
            try {
                await prisma.doctor.updateMany({
                    where: {
                        username: {
                            equals: previousUsername,
                            mode: 'insensitive',
                        },
                    },
                    data: { username: updatedStaff.username },
                });
            } catch (renameErr: any) {
                console.warn('[Staff Controller] Doctor username rename notice:', renameErr.message);
            }
        }

        let doctorProfile: {
            specialty?: string;
            experience?: string;
            experienceYears?: number | null;
            bio?: string;
        } | null = null;

        if (formattedRole === 'doctor') {
            try {
                const experienceYears =
                    req.body.experienceYears != null
                        ? Number(req.body.experienceYears)
                        : req.body.experience_years != null
                          ? Number(req.body.experience_years)
                          : null;
                const upsertedDoctor = await prisma.doctor.upsert({
                    where: { username: updatedStaff.username },
                    update: {
                        specialty: specialty || 'General Practice',
                        experience: experience
                            ? String(experience)
                            : experienceYears
                              ? `${experienceYears}+ years experience`
                              : undefined,
                        experienceYears: Number.isFinite(experienceYears) ? experienceYears : undefined,
                        bio: bio || undefined,
                    },
                    create: {
                        username: updatedStaff.username,
                        specialty: specialty || 'General Practice',
                        experience: experience
                            ? String(experience)
                            : experienceYears
                              ? `${experienceYears}+ years experience`
                              : '5+ years experience',
                        experienceYears: Number.isFinite(experienceYears) ? experienceYears : undefined,
                        bio: bio || `Specialist physician at Dr. Amanuel Hospital.`,
                        isAvailable: true,
                    },
                    select: {
                        specialty: true,
                        experience: true,
                        experienceYears: true,
                        bio: true,
                    },
                });
                // Prisma nullable fields are `string | null`; normalize to `string | undefined`
                doctorProfile = {
                    specialty: upsertedDoctor.specialty,
                    experience: upsertedDoctor.experience ?? undefined,
                    experienceYears: upsertedDoctor.experienceYears ?? null,
                    bio: upsertedDoctor.bio ?? undefined,
                };
            } catch (docErr: any) {
                console.error('[Staff Controller] Doctor profile update failed:', docErr.message);
                return res.status(500).json({
                    success: false,
                    error: docErr.message || 'Staff updated but doctor profile failed. Retry the update.',
                });
            }
        }

        return res.json({
            success: true,
            data: {
                ...updatedStaff,
                id: updatedStaff.id.toString(),
                specialty: doctorProfile?.specialty,
                experience: doctorProfile?.experience,
                experienceYears: doctorProfile?.experienceYears ?? null,
                bio: doctorProfile?.bio,
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

        const existingStaff = await findStaffAccount(rawId, username || undefined);

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
        const existingStaff = await findStaffAccount(rawId, req.body?.username);

        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                error: 'Staff account not found',
            });
        }

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

        const { username } = req.body || {};

        if (!rawId && !username) {
            return res.status(400).json({
                success: false,
                error: 'Valid staff ID is required',
            });
        }

        const existingStaff = await findStaffAccount(rawId, username);

        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                error: 'Staff account not found',
            });
        }

        const roleKey = String(existingStaff.role || '').toLowerCase();
        if (roleKey === 'admin' || roleKey === 'administrator') {
            const admins = await prisma.staffAccount.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { role: { equals: 'admin', mode: 'insensitive' } },
                        { role: { equals: 'administrator', mode: 'insensitive' } },
                    ],
                },
                select: { id: true },
            });

            if (admins.length <= 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete the last active admin account',
                });
            }
        }

        await deleteLinkedDoctorProfile(prisma, existingStaff.username);

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
