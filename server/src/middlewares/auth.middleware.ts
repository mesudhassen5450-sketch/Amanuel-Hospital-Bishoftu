import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth.js';
import { prisma } from '../config/db.js';

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

function normalizeRole(role?: string | null): string {
    if (!role) return '';
    return role.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isAdminRole(role?: string | null): boolean {
    const normalized = normalizeRole(role);
    return (
        normalized === 'admin' ||
        normalized === 'administrator' ||
        normalized === 'system_admin' ||
        normalized === 'super_admin'
    );
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

export const authorizeRoles = (...roles: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated.'
            });
        }

        const jwtRole = req.user.role;
        const allowed = roles.map((r) => normalizeRole(r));
        const jwtNormalized = normalizeRole(jwtRole);

        if (isAdminRole(jwtRole) || allowed.includes(jwtNormalized)) {
            return next();
        }

        // Fallback: re-check live DB role (handles stale tokens / mixed-case legacy roles)
        try {
            const username = req.user.username?.toLowerCase?.() || req.user.username;
            if (username) {
                const staff = await prisma.staffAccount.findFirst({
                    where: { username },
                    select: { role: true, isActive: true },
                });

                if (staff && staff.isActive !== false) {
                    const dbNormalized = normalizeRole(staff.role);
                    if (isAdminRole(staff.role) || allowed.includes(dbNormalized)) {
                        req.user.role = staff.role;
                        return next();
                    }
                }
            }
        } catch (err: any) {
            console.error('[Auth] Role DB lookup failed:', err?.message || err);
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied: Insufficient permissions for this department. Sign out and sign in again as admin.'
        });
    };
};
